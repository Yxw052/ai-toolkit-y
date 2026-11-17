"""Ordered reference inputs shared by training, sampling and the pairing preview."""
import hashlib
import json
from pathlib import Path

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
MAX_H3_REFERENCES = 16

def validate_paths(paths, field='references', maximum=None):
    if not isinstance(paths, list) or any(not isinstance(p, str) or not p.strip() for p in paths):
        raise ValueError(f'{field} must be an ordered list of non-empty paths')
    if maximum is not None and len(paths) > maximum:
        raise ValueError(f'{field}: at most {maximum} reference images, got {len(paths)}')
    return list(paths)

def sample_reference_paths(config):
    explicit = getattr(config, 'ctrl_imgs', None)
    if explicit is not None:
        return validate_paths(explicit, 'ctrl_imgs')
    first = getattr(config, 'ctrl_img', None)
    numbered = getattr(config, 'ctrl_img_1', None)
    # Only collapse the legacy alias, never duplicates in an explicit list.
    paths = ([first] if first else [])
    if numbered and numbered != first:
        paths.append(numbered)
    paths.extend(p for p in (getattr(config, 'ctrl_img_2', None), getattr(config, 'ctrl_img_3', None)) if p)
    return paths

def open_reference(path):
    from PIL import Image, ImageOps
    with Image.open(path) as image:
        return ImageOps.exif_transpose(image).convert('RGB')

def fingerprint_paths(paths):
    result = []
    for value in paths:
        path = Path(value)
        with path.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        result.append({'path': str(path.resolve()), 'sha256': digest})
    return result

def sample_reference_signature(config):
    return {'references': fingerprint_paths(sample_reference_paths(config)),
            'prompt': config.prompt, 'negative_prompt': config.negative_prompt,
            'width': config.width, 'height': config.height, 'version': 1}

def load_sample_controls(config, model):
    import torchvision.transforms.functional as TF
    paths = sample_reference_paths(config)
    if getattr(model, 'arch', None) == 'minimax_h3_image':
        validate_paths(paths, 'H3 Image sampling references', MAX_H3_REFERENCES)
    controls = []
    for path in paths:
        if Path(path).suffix.lower() in {'.mp4', '.avi', '.mov', '.webm', '.mkv', '.wmv', '.m4v', '.flv'}:
            if getattr(model, 'arch', None) == 'minimax_h3_image':
                raise ValueError(f'This model requires still reference images: {path}')
            controls.append(path)
        else:
            controls.append(TF.to_tensor(open_reference(path)).unsqueeze(0).to(model.device_torch, dtype=model.torch_dtype))
    return controls if model.has_multiple_control_images else (controls[0] if controls else None)

def pair_references(target, folders, verify=True):
    validate_paths(folders, 'control_path', MAX_H3_REFERENCES)
    target = Path(target)
    paths = []
    for index, folder in enumerate(folders, 1):
        directory = Path(folder)
        matches = sorted(p for p in directory.iterdir()
                         if p.is_file() and p.stem == target.stem and p.suffix.lower() in IMAGE_EXTENSIONS)
        if len(matches) != 1:
            raise ValueError(f'{target.name}: Picture {index} in {folder}: expected one match, found {len(matches)}')
        if matches[0].resolve() == target.resolve():
            raise ValueError(f'{target.name}: Picture {index} is the target image')
        if verify:
            try:
                open_reference(matches[0]).load()
            except Exception as exc:
                raise ValueError(f'{target.name}: Picture {index} cannot be decoded: {matches[0]}') from exc
        paths.append(str(matches[0]))
    return paths

def preview_dataset(target_folder, folders, caption_ext='txt', offset=0, limit=12):
    targets = sorted(p for p in Path(target_folder).iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS)
    items = []
    for target in targets[offset:offset + limit]:
        item = {'target': str(target), 'references': [], 'caption': '', 'error': None}
        try:
            if sum(p.stem == target.stem for p in targets) != 1:
                raise ValueError(f'{target.name}: duplicate target basename')
            open_reference(target).load()
            item['references'] = pair_references(target, folders)
            caption = target.with_suffix('.' + caption_ext)
            if caption.exists():
                item['caption'] = caption.read_text(encoding='utf-8')
        except Exception as exc:
            item['error'] = str(exc)
        items.append(item)
    return {'items': items, 'total': len(targets)}

if __name__ == '__main__':
    import sys
    request = json.load(sys.stdin)
    allowed = [Path(p).resolve() for p in request.pop('allowed_roots')]
    for value in [request['target_folder'], *request['folders']]:
        path = Path(value).resolve()
        if not any(path == root or root in path.parents for root in allowed):
            raise ValueError('Dataset path is outside allowed roots')
        # Reject escaping image symlinks too.
        for child in path.iterdir():
            resolved = child.resolve()
            if not any(resolved == root or root in resolved.parents for root in allowed):
                raise ValueError('Dataset contains a link outside allowed roots')
    print(json.dumps(preview_dataset(**request), ensure_ascii=False))
