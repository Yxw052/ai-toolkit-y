import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from PIL import Image

from toolkit.reference_images import (sample_reference_paths, pair_references,
    fingerprint_paths, preview_dataset, validate_paths, sample_reference_signature, load_sample_controls)
from toolkit.config_modules import SampleConfig, SampleItem, GenerateImageConfig, DatasetConfig


class ReferencesTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='h3-多参 ')
        self.root = Path(self.temp.name)
        self.target = self.root / 'target'
        self.target.mkdir()
        Image.new('RGB', (32, 64), 'white').save(self.target / '1.jpg')
        self.folders = []
        for i in range(10):
            folder = self.root / f'ref {i}'
            folder.mkdir()
            Image.new('RGB', (32 + 2*i, 64), (20*i, 0, 0)).save(folder / '1.png')
            self.folders.append(str(folder))
        self.paths = pair_references(self.target / '1.jpg', self.folders)

    def tearDown(self):
        self.temp.cleanup()

    def test_counts_and_order(self):
        for n in (0, 1, 3, 4, 5, 10, 16):
            paths = (self.paths * 2)[:n]
            item = SampleItem(SampleConfig(), prompt='test', ctrl_imgs=paths, ctrl_img='legacy')
            config = GenerateImageConfig(prompt=item.prompt, output_path=str(self.root/'out.png'), ctrl_imgs=item.ctrl_imgs, ctrl_img=item.ctrl_img)
            self.assertEqual(sample_reference_paths(config), paths)

    def test_legacy_alias_and_intentional_duplicates(self):
        config = GenerateImageConfig(prompt='x', output_path=str(self.root/'out.png'), ctrl_img=self.paths[0], ctrl_img_2=self.paths[1])
        self.assertEqual(sample_reference_paths(config), self.paths[:2])
        config.ctrl_imgs = [self.paths[0]] * 4
        self.assertEqual(len(sample_reference_paths(config)), 4)

    def test_dataset_list_wins_over_legacy(self):
        for folders in [[],self.folders[:4],self.folders]:
            config = DatasetConfig(folder_path=str(self.target), control_path=folders, control_path_1='legacy')
            self.assertEqual(config.control_path, folders)

    def test_empty_slot_rejected(self):
        with self.assertRaises(ValueError): validate_paths(['good',''], 'control_path')
        with self.assertRaises(ValueError): validate_paths(['x']*17, maximum=16)

    def test_missing_fourth_not_skipped(self):
        Path(self.paths[3]).unlink()
        with self.assertRaisesRegex(ValueError,'Picture 4'):
            pair_references(self.target/'1.jpg', self.folders[:4])

    def test_duplicate_extensions_rejected(self):
        Image.new('RGB',(32,32)).save(Path(self.folders[3])/'1.jpg')
        with self.assertRaisesRegex(ValueError,'found 2'):
            pair_references(self.target/'1.jpg',self.folders[:4])

    def test_target_leak_rejected(self):
        with self.assertRaisesRegex(ValueError,'target image'):
            pair_references(self.target/'1.jpg',[str(self.target)])

    def test_corrupt_fourth_rejected(self):
        Path(self.paths[3]).write_bytes(b'not an image')
        report=preview_dataset(str(self.target),self.folders[:4])
        self.assertIn('Picture 4',report['items'][0]['error'])

    def test_replace_same_path_and_reorder_invalidate(self):
        before=fingerprint_paths(self.paths)
        Image.new('RGB',(38,64),'blue').save(self.paths[3])
        after=fingerprint_paths(self.paths)
        self.assertNotEqual(before,after)
        self.assertEqual(before[:3],after[:3])
        self.assertNotEqual(after,fingerprint_paths(list(reversed(self.paths))))

    def test_all_sampling_images_loaded(self):
        import torch
        model=SimpleNamespace(arch='minimax_h3_image',device_torch='cpu',torch_dtype=torch.float32,has_multiple_control_images=True)
        config=GenerateImageConfig(prompt='test',output_path=str(self.root/'sample.png'),ctrl_imgs=self.paths)
        controls=load_sample_controls(config,model)
        self.assertEqual(len(controls),10)
        self.assertEqual([c.shape[-1] for c in controls],[32+2*i for i in range(10)])
        before=sample_reference_signature(config)
        config.ctrl_imgs=config.ctrl_imgs[::-1]
        self.assertNotEqual(before,sample_reference_signature(config))

    def test_saved_reference_snapshot(self):
        config=GenerateImageConfig(prompt='test',output_path=str(self.root/'sample.png'),ctrl_imgs=self.paths)
        config.reference_snapshot={'ctrl_imgs':self.paths,'references':fingerprint_paths(self.paths),'version':1}
        config.save_image(Image.new('RGB',(32,32)))
        saved=json.loads(Path(config.get_image_path()+'.references.json').read_text())
        self.assertEqual(saved['ctrl_imgs'],self.paths)
        self.assertEqual(saved['prompt'],'test')

    def test_real_h3_condition_builder_preserves_fourth_and_tenth_blocks(self):
        # Exercise the actual H3 packing code with a small stand-in VAE;
        # this is a structural regression test, not pretrained-model learning proof.
        import torch
        from extensions_built_in.diffusion_models.minimax_h3.minimax_h3_image import MinimaxH3ImageModel
        model=object.__new__(MinimaxH3ImageModel)
        model._reference_pixel_size=lambda *args:(32,32)
        model.encode_keyframe_latents=lambda frames: frames.mean(dim=1,keepdim=True)[:,:,:,:2,:2].expand(-1,24,-1,-1,-1).clone()
        for count in (4,10):
            controls=[torch.full((3,32,32),i/count) for i in range(count)]
            batch=SimpleNamespace(control_tensor_list=[controls],file_items=[SimpleNamespace(control_path=self.paths[:count])])
            torch.manual_seed(12)
            rows,_,_,blocks=model._build_condition(batch,(1,2,2),'cpu',torch.float32)
            self.assertEqual(len(blocks),count)
            self.assertEqual(rows.shape[1],count)
            controls[-1]=torch.zeros_like(controls[-1])
            torch.manual_seed(12)
            changed,_,_,_=model._build_condition(batch,(1,2,2),'cpu',torch.float32)
            self.assertTrue(torch.equal(rows[:,:-1],changed[:,:-1]))
            self.assertFalse(torch.equal(rows[:,-1],changed[:,-1]))

    def test_4k_bucket_geometry(self):
        from toolkit.buckets import get_bucket_for_image_size
        square=get_bucket_for_image_size(4096,4096,4096,32)
        self.assertEqual(square,{'width':4096,'height':4096})
        for w,h in [(6000,4000),(4000,6000),(2400,3000)]:
            bucket=get_bucket_for_image_size(w,h,4096,32)
            self.assertEqual(bucket['width']%32,0)
            self.assertEqual(bucket['height']%32,0)
            self.assertLessEqual(bucket['width']*bucket['height'],4096**2)

if __name__ == '__main__': unittest.main(verbosity=2)
