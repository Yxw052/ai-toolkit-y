import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
import torch
from PIL import Image
from toolkit.config_modules import GenerateImageConfig
from extensions_built_in.diffusion_models.flux3.flux3 import Flux3Model


class Flux3ReferencesTest(unittest.TestCase):
    def test_sampling_keeps_fourth_tenth_and_explicit_duplicates(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            paths = []
            for i in range(10):
                p = root/f'{i}.png'
                Image.new('RGB', (32, 32), (i*20, 0, 0)).save(p)
                paths.append(str(p))
            model = SimpleNamespace(model=SimpleNamespace(device=torch.device('cuda')),
                text_encoder=None, model_config=SimpleNamespace(model_kwargs={}),
                get_bucket_divisibility=lambda:16, _fit_reference=lambda image,area:image)
            for refs in [paths[:4], paths, [paths[0]]*4]:
                captured = {}
                def pipeline(**kwargs):
                    captured.update(kwargs)
                    return [Image.new('RGB', (32,32))]
                config = GenerateImageConfig(prompt='test',output_path=str(root/'out.png'),
                    width=32,height=32,ctrl_imgs=refs,ctrl_img=paths[-1])
                Flux3Model.generate_single_image(model,pipeline,config,None,None,torch.Generator(),{})
                self.assertEqual(len(captured['ctrl_imgs']),len(refs))
                self.assertEqual(config.reference_snapshot['ctrl_imgs'],refs)
                actual=[round(float(t[0,0,0,0])*255) for t in captured['ctrl_imgs']]
                self.assertEqual(actual,[int(Path(p).stem)*20 for p in refs])

    def test_real_training_packer_retains_fourth_reference(self):
        # Real loader-to-packer method with tiny stand-in VAE/DiT; learning
        # evidence must come from the separate pretrained-model smoke run.
        weight=torch.nn.Parameter(torch.tensor(1.0))
        captured={}
        def transformer(**kwargs):
            captured.update(kwargs)
            return {'x_image':kwargs['x_image']+weight*kwargs['x_image_cond'].mean()}
        model=SimpleNamespace(device_torch='cpu',torch_dtype=torch.float32,
            model=SimpleNamespace(device=torch.device('cuda')),transformer=transformer,
            _fit_reference=lambda image,area:image,
            encode_images=lambda image,**kw:image.mean(dim=1,keepdim=True)[:,:,:2,:2].expand(-1,128,-1,-1))
        controls=[torch.full((3,32,32),i/4) for i in range(4)]
        batch=SimpleNamespace(control_tensor_list=[controls])
        embeds=SimpleNamespace(text_embeds=[torch.zeros(80,8)])
        def predict():
            return Flux3Model.get_noise_prediction(model,torch.zeros(1,128,2,2),torch.tensor([500]),embeds,batch)
        first=predict()
        self.assertEqual(set(captured['x_image_cond_ids'][0,:,-1].tolist()),{-1,-2,-3,-4})
        first.sum().backward(); grad=weight.grad.clone(); weight.grad=None
        controls[3]=torch.zeros_like(controls[3])
        second=predict(); second.sum().backward()
        self.assertFalse(torch.equal(first,second))
        self.assertFalse(torch.equal(grad,weight.grad))


if __name__=='__main__': unittest.main(verbosity=2)
