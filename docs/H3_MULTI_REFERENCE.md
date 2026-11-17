# H3 Image 多参考图（ai-toolkit-y）

这是独立实验分支。原 `~/ai-toolkit`、数据库、环境和端口保持独立。

## 启动与界面

Y 使用 http://localhost:8676 。`npm run start`、manager 启动入口和文件服务器默认端口统一为 8676。请只运行一个 Y 实例；构建前停止现有 Y 界面，构建后再启动，避免旧进程引用已经被替换的 Next 静态文件。manager 在端口已占用时会退出，不在运行中的界面目录重建。

公开版启动请使用仓库根目录 README 中的手动安装步骤，在 `ui` 中执行 `npm run start`。本机专用的 `local-deployment` 服务脚本、日志和任务配置不随源码发布。原版目录及其默认 8675 端口不作修改。

数据集沿用原版目标/控制目录下拉框，重排和删除按需展开；配对预览在独立弹窗展示。采样参考图采用紧凑缩略图行。分辨率选项按从左到右、从上到下的数值升序排列为两列，保留已选值；4K 说明折叠显示。

## 配置

数据集使用有序 `control_path` 目录列表，采样使用有序 `ctrl_imgs` 文件列表。每张独立图片对应一个 Picture 编号；一张四视图拼图仍算一张参考图。H3 Image 最多 16 个槽位，4–10 个槽位均通过同一列表路径传递。

```yaml
datasets:
  - folder_path: /path/to/mubiao
    control_path:
      - /path/to/m
      - /path/to/z
      - /path/to/f
      - /path/to/c
    resolution: [512]
sample:
  samples:
    - prompt: "Describe the desired output and each Picture's role."
      ctrl_imgs:
        - /path/to/m/1.png
        - /path/to/z/1.jpg
        - /path/to/f/1.jpg
        - /path/to/c/1.png
```

标注 txt 放在目标图旁。按文件名主体配对，参考图与目标可用不同扩展名。缺图、坏图、同槽位同名多文件及目标误作参考都会报错。每个数据集配置内参考数量固定；不同数量请用不同数据集配置。顺序以该条配置为准，重排后必须核对标注的 Picture 编号。

显式列表优先于旧三个字段，空列表代表不使用参考图。只用旧字段的任务仍可读取；不要同时维护两套字段。文本缓存包含有序参考图内容指纹，原路径替换图片后需要重新缓存。列表不会自动排序或去重。

## 界面与预览

- H3 数据集和采样可增加、删除和重排参考图。
- 数据集的“配对预览”按组展示目标、全部参考和现有标注，支持翻页及完整图片放大。
- 新采样输出 `.references.json`，记录实际参考列表、SHA256、提示词和种子。结果预览优先读取当次记录；旧输出明确标注回退到任务配置。
- 参考文件尚未归档为输出副本；生成后不要删除或覆盖这些原路径，指纹记录不等于原图片备份。
- 分辨率选项已扩展到 4096。4096 是约 4096² 像素面积的桶基准，尺寸随比例调整；不是保证长边固定 4096，也不是把小图强制放大。

## 32GB 内存机器的 H3 加载

H3 Image 在 `low_vram: true` 时默认关闭层卸载的权重锁页复制。保留可分页 CPU / 文件映射权重，逐层送入 GPU 计算，避免同时为约 21GB DiT 和约 15.7GB 文本编码器建立大量不可分页副本。其他模型默认策略保持不变。

可显式设置：

```yaml
model:
  low_vram: true
  layer_offloading: true
  layer_offloading_transformer_percent: 1.0
  layer_offloading_text_encoder_percent: 1.0
  model_kwargs:
    offload_pin_memory: false
    activation_offloading: true
    cuda_memory_fraction: 0.85
```

低显存模式还默认将梯度检查点保存的块输入放到 CPU（`activation_offloading: true`，需要训练配置 `gradient_checkpointing: true`）。这是在各层前向之间保留的中间激活，不能只靠卸载模型权重释放。GPU 负责重算及反向，参考图不因此删减或缩小。

低显存模式还默认限制当前进程的 PyTorch CUDA 缓存分配器预算为设备总显存的 85%（`cuda_memory_fraction`，可设为 (0, 1] 的数值；显式 null 不设置限制）。它限制分配器而不是所有驱动或桌面显存，超过预算会明确报 OOM，不能保证任何分辨率都装得下。此设置不会改变 WSL 或系统全局配置。

这会增加对系统分页、磁盘读取和 CPU/GPU 传输的依赖，速度可能下降。`offload_pin_memory: true` 恢复原锁页策略，仅适合内存足够的环境。不要把加载通过当作任意参考数量、任意分辨率都可训练；4K、多参考和大视觉编码序列仍有独立的显存开销。

## 验证边界

2026-11-14：13 项列表/配对/缓存/条件布局测试和 5 项不锁页/激活卸载/显存预算测试通过。卸载测试包含真实 CUDA 前向、输入和参数梯度对照，以及检查点保留显存降低的断言；条件布局测试使用小型替代 VAE，不等于预训练模型已学习。

真实本地 H3 主模型、文本编码器、VAE 和训练适配器加载通过，原先失败的主模型 `.to(device, dtype)` 也通过。此次全卸载验证加载后 PyTorch GPU 分配约 0.74GiB、系统可用内存约 13.5GiB。

真实四参考验证的模型加载和六步采样通过，但训练反向传播 OOM。旧通用循环跳过失败批次后仍保存文件，造成进程退出码为 0 的假成功；检查实际权重的 208 个 LoRA B/up 张量全部为零，不能作为有效训练结果。输出目录已添加 VALIDATION_FAILED.md。

H3 现在在训练步 OOM 时明确失败退出，不再沿用通用的跳过批次并继续保存逻辑。此保护已做语法检查，尚未重新跑完整真实训练；反向传播峰值显存问题仍待解决。

证据见本机 `local-deployment/logs/h3-pageable-training.log` 和 `h3-pageable-training-evidence.jsonl`。只有有限梯度、非零实际权重更新和对应采样产物才能支持有效学习结论。10 张真实训练、4K 训练和 LoRA 泛化效果尚未验收。
