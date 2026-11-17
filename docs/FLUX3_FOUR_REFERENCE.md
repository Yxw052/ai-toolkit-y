# FLUX.3 Image Klein Base 四参考验证

本次改动只在 `~/ai-toolkit-y`；界面为 http://localhost:8676 。原版训练器与 H3 任务保留。

## 输入和提示词

- 使用原 H3 测试集的 6 组图片，训练参考顺序为 m（人物）、z（服装正面）、f（服装背面）、c（场景）。
- 目标图复制到 `datasets/flux3-h3-test/mubiao`，像素文件与原目标一致；六个同名 txt 是独立的英文换装标注。原 H3 图片、标注和配置不覆盖。
- 采样使用 H3 任务的原四个文件，顺序为服装正面、服装背面、人物、场景，提示词按这个顺序重新书写。
- 训练目标为单人全身图，测试采样也使用同样构图；人物四视图拼图仍作为一张参考输入，不把拼图裁成四张。
- 依据 2026-11-15 核对的官方 i2i 模板，用一段英文描述改动、各参考的作用及需要保留的身份/服装属性；以 first/second/third/fourth image 指代，不使用 H3 的 Picture/Subject 标记。没有调用或下载额外 PUP 模型。

官方来源：https://huggingface.co/black-forest-labs/flux-3-image-klein-pup/blob/main/system_prompts.json

## 代码行为

训练端原有 `control_tensor_list` 已遍历全部参考图。现在 FLUX.3 采样也使用有序 `ctrl_imgs`，显式列表优先于旧三个字段，保留显式重复及顺序，并使用 EXIF 方向校正。每次出图记录实际参考路径和 SHA256 到 `.references.json`。

FLUX.3 复用 Y 的多参考目录、采样缩略图和配对预览；切换到只支持旧三字段的模型时阻止静默截断。缺失、重复配对或损坏的参考图报错；训练步 OOM 明确失败，不跳过失败批次后保存误导性的完成结果。

## 已验证的 512 配置

- 本地 `flux-3-image-klein-base` 和其 `text_encoder`；DiT/TE 均为 convrot8。
- batch 1，rank/alpha 8，学习率 0.0001，梯度检查点，TE 缓存后卸载；DiT 层卸载 60%，TE 层卸载 100%。
- 512 分辨率桶，四张参考按目标面积缩小并保留各自比例，6 个真实训练步。
- 6 次优化器更新均检测到有限非零梯度及非零参数变化。训练耗时约 22 秒，后续步约 3.9 秒；训练 PyTorch 分配峰值约 5.12 GiB（不是全部驱动显存）。
- 保存的 LoRA 共 516 个张量，258 个 B/up 张量全部非零。
- 同样四张参考完成 512×1024、30 步、CFG 3.5 的采样，约 120 秒；实际参考记录为 4 张。已检查图片和界面四参考预览。
- 验证包装器将单进程 CUDA 分配器预算设为 90%，记录梯度、权重变化和真实条件的四个位置编号；未修改系统或全局显存限制。

本机配置：`local-deployment/flux3-four-reference-validation.yaml`。证据：`local-deployment/logs/flux3-training-evidence.jsonl`、`output/flux3_four_reference_validation/log.txt` 及实际权重/采样文件。

## 1024 对照结果

同一组四参考、同样 rank 8、batch 1 和梯度检查点下，1024 桶先后测试 DiT 层卸载 60% 和 100%，均在第一个训练步 OOM，未发生优化器更新。真实参考条件包含四个位置编号，约 16191 个参考 token；该配置未完成 1024 训练，也没有生成相应完成权重。

失败任务保留在 `flux3_four_reference_1024_validation`，日志 `attempt1-60pct-oom.log` 和 `log.txt` 分别记录两次尝试。不要将 UI 已支持 1024/4096 选项理解为当前硬件上四参考必然能训练。当前完成的采样分辨率是 512×1024，训练桶为 512；二者不能混为一谈。

## 验证边界

两项 FLUX.3 结构回归测试通过：实际采样入口保留第四、第十参考和显式重复；实际训练条件打包方法的第四参考改变可传递到输出/梯度（测试使用小型替代 VAE/DiT）。原 13 项参考图回归测试、TypeScript 检查及 Next 构建通过。

六步只能证明这组配置完成了真实训练和采样，不能证明服装细节已收敛、第四张图的语义已被充分学习，或对新人物/服装具备稳定泛化。没有做 LoRA 开关对照，也没有验收 10 张真实参考训练或 4K 训练。
