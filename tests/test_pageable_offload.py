import unittest
from types import SimpleNamespace
from unittest.mock import patch
import torch
from toolkit.memory_management.manager import MemoryManager
from toolkit.memory_management.manager_modules import _ensure_cpu_pinned

class PageableOffloadTests(unittest.TestCase):
    def test_h3_cuda_budget_is_validated_and_scoped(self):
        from extensions_built_in.diffusion_models.minimax_h3.minimax_h3_image import MinimaxH3ImageModel
        model=object.__new__(MinimaxH3ImageModel)
        model.model_config=SimpleNamespace(low_vram=True,model_kwargs={})
        model.device_torch=torch.device('cuda:0')
        model.print_and_status_update=lambda *a:None
        with patch.object(torch.cuda,'set_per_process_memory_fraction') as setter:
            model.configure_cuda_memory_budget()
            setter.assert_called_once_with(.85,0)
            model.device_torch=torch.device('cuda')
            with patch.object(torch.cuda,'current_device',return_value=2):
                model.configure_cuda_memory_budget()
                setter.assert_called_with(.85,2)
            for bad in (0,1.1,-1,True,'0.85'):
                model.model_config.model_kwargs['cuda_memory_fraction']=bad
                with self.assertRaises(ValueError):model.configure_cuda_memory_budget()
            model.model_config=SimpleNamespace(low_vram=False,model_kwargs={})
            model.configure_cuda_memory_budget()
            self.assertEqual(setter.call_count,2)

    @unittest.skipUnless(torch.cuda.is_available(),'CUDA unavailable')
    def test_checkpoint_offload_reduces_cuda_memory_and_preserves_gradients(self):
        from extensions_built_in.diffusion_models.minimax_h3.src.transformer import checkpoint_block
        def run(offload):
            torch.cuda.empty_cache()
            torch.manual_seed(17)
            x=torch.randn(1024,1024,device='cuda',requires_grad=True)
            scale=torch.nn.Parameter(torch.tensor(.8,device='cuda'))
            before=torch.cuda.memory_allocated()
            value=x
            for _ in range(8):
                value=checkpoint_block(lambda t: (t*scale).sin(),value,offload_inputs=offload)
            torch.cuda.synchronize()
            retained=torch.cuda.memory_allocated()-before
            output=value.detach().cpu()
            value.square().mean().backward()
            result=(output,x.grad.detach().cpu(),scale.grad.detach().cpu(),retained)
            return result
        resident=run(False);offloaded=run(True)
        for a,b in zip(resident[:3],offloaded[:3]):torch.testing.assert_close(a,b)
        self.assertLess(offloaded[3],resident[3]-12*1024**2)

    def test_pageable_preserves_cpu_storage(self):
        value=torch.arange(16,dtype=torch.float32)
        with patch.object(torch.Tensor,'pin_memory',side_effect=AssertionError('Unexpected host copy')):
            result=_ensure_cpu_pinned(value,pin_memory=False)
        self.assertEqual(value.data_ptr(),result.data_ptr())
        self.assertFalse(result.is_pinned())

    def test_h3_low_vram_default_and_explicit_override(self):
        from extensions_built_in.diffusion_models.minimax_h3.minimax_h3_image import MinimaxH3ImageModel
        from toolkit.models.base_model import BaseModel
        model=object.__new__(MinimaxH3ImageModel)
        model.model_config=SimpleNamespace(low_vram=True,model_kwargs={})
        with patch.object(BaseModel,'component_load_kwargs',return_value={}):
            self.assertFalse(model.component_load_kwargs()['offload_pin_memory'])
            model.model_config.model_kwargs['offload_pin_memory']=True
            self.assertTrue(model.component_load_kwargs()['offload_pin_memory'])

    @unittest.skipUnless(torch.cuda.is_available(),'CUDA unavailable')
    def test_pageable_forward_and_input_grad_match_resident(self):
        torch.manual_seed(1)
        module=torch.nn.Sequential(torch.nn.Linear(32,64),torch.nn.SiLU(),torch.nn.Linear(64,16)).requires_grad_(False)
        original={k:v.clone() for k,v in module.state_dict().items()}
        resident=torch.nn.Sequential(torch.nn.Linear(32,64),torch.nn.SiLU(),torch.nn.Linear(64,16)).cuda().requires_grad_(False)
        resident.load_state_dict(original)
        with patch.object(torch.Tensor,'pin_memory',side_effect=AssertionError('Unexpected host copy')):
            MemoryManager.attach(module,torch.device('cuda:0'),pin_memory=False)
        x=torch.randn(3,32,device='cuda',requires_grad=True)
        y=x.detach().clone().requires_grad_(True)
        actual=module(x);expected=resident(y)
        torch.testing.assert_close(actual,expected)
        actual.square().sum().backward();expected.square().sum().backward()
        torch.testing.assert_close(x.grad,y.grad)
        for param in module.parameters():
            self.assertEqual(param.device.type,'cpu')
            self.assertFalse(param.is_pinned())
        MemoryManager.detach(module)

if __name__=='__main__':unittest.main()
