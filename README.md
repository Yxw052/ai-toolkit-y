# AI Toolkit Y

**这是我基于 [Ostris AI Toolkit](https://github.com/ostris/ai-toolkit) 为自己使用而修改的 LoRA 训练器。**

这个仓库用来分享我的自用版本和修改记录，不是 Ostris 官方发布，也不是一个从零开发的新训练框架。原项目的训练框架、模型支持和大量界面功能来自 Ostris 及原项目贡献者，感谢他们的工作。

- 原项目：[ostris/ai-toolkit](https://github.com/ostris/ai-toolkit)
- 本项目：[Yxw052/ai-toolkit-y](https://github.com/Yxw052/ai-toolkit-y)
- 原项目说明保留在 [README_UPSTREAM.md](README_UPSTREAM.md)。其中安装地址、端口和功能说明属于原项目；安装这个修改版请使用本页步骤。
- 源码沿用原项目的 [MIT License](LICENSE)，保留原版权声明。模型权重与数据集各自的使用条件不因训练器许可证而改变。

> 主要按我自己的 Windows + WSL2 Ubuntu + NVIDIA 显卡环境调整，不承诺覆盖所有模型、系统和训练配置，也不承诺持续跟进上游。遇到本修改版的问题，请在本仓库反馈，不要默认当作原项目的问题。

## 我改了什么

### 1. 有序多参考图

- 为 MiniMax-H3-Image 与 FLUX.3 Image Klein 接入、整理超过 3 张参考图的训练配置、采样输入及界面流程。
- 数据集使用有序的 `control_path` 目录列表，采样使用有序的 `ctrl_imgs` 图片列表；保留显式顺序和重复图片，兼容旧的三个参考字段。
- 增加缺图、损坏图片、配对歧义及目标误作参考的检查。参考图顺序变化时应同步检查标注和提示词。
- 增加数据集配对预览；采样保存实际参考路径、指纹等记录，方便核对真正使用了哪些参考图。指纹记录不是参考图备份。
- 多参考列表界面最多提供 16 个槽位；这不等于每个模型都能接受 16 张，也不等于这些数量全部完成了真实训练验证。

### 2. 采样、数据集与图片预览界面

- 采样参考图区默认显示 5 个槽位的宽度；空槽位不会被保存成真实参考图。
- 超出可见区域后可以横向滚动，不显示滚动条，也不会继续挤压提示词、宽高、种子和 LoRA 强度输入框。
- 添加参考图后自动滚动到添加位置，支持拖拽调整参考顺序。
- 增加总采样预览，可集中修改提示词、尺寸、种子、LoRA 强度和参考图，并调整采样组顺序。
- 数据集配对预览与采样预览中的图片可点击放大、保持比例缩放、拖动平移，左右方向键切换图片。
- 替换按钮只打开选图窗口；点击图片才打开图片预览。替换、移除按钮移出缩略图遮挡区域。

### 3. 中文 / English 与参数说明

- 设置页增加语言切换，并在浏览器中保存选择。
- 为主要界面和自定义预览补充中英文文本；用户提示词、路径、模型名称、配置值及训练日志保持原内容。
- 增加批次大小、梯度累积、训练步数、优化器、学习率、权重衰减、时间步、损失、EMA、引导损失等问号说明。
- 增加验证、缓存潜变量、正则化数据的说明，包含作用、选择建议与当前限制。

### 4. 分辨率与内存处理

- 分辨率选项扩展到 4096，并按数值顺序排列。桶分辨率表示像素面积基准，不是保证输出长边固定为该值。
- H3 低显存路径增加可分页 CPU 权重、激活卸载和单进程 CUDA 分配预算等处理，减少加载阶段的内存压力。
- H3 / FLUX.3 训练步遇到 OOM 时明确失败，避免跳过失败批次后仍给出具有误导性的完成结果。
- **4K 选项不代表 4K 多参考图训练已验证可用；卸载和缓存也不能消除反向传播的显存需求。**

### 5. 独立运行

- 生产界面端口为 **8676**，方便与常用 8675 端口的原版区分。
- 在单独目录中建立 Python 环境、数据库、数据集和输出，不需要覆盖已有的 AI Toolkit。
- 继承了我先前自用副本中的加载兼容调整；本仓库不是上游最新版本的自动镜像。
- 发布时去除了指向我电脑的 FLUX.2 Klein 文本编码器默认路径，恢复模型类的默认编码器来源；如需本地编码器，请配置自己的路径。

## 实际验证到什么程度

以下是截至 2026-11-17 的本机结果，显卡为 RTX 5070 Ti 16GB，系统内存约 32GB。不是硬件最低要求，也不是效果保证。

| 项目 | 已完成情况 | 仍未证明的部分 |
| --- | --- | --- |
| FLUX.3 Image Klein Base，4 张参考图 | 512 分辨率桶完成 6 次真实优化器更新，梯度和参数变化有效；完成四参考的 512×1024 采样 | 长训练收敛、服装细节质量、跨人物/服装泛化 |
| FLUX.3，4 张参考图，1024 桶 | 已尝试不同层卸载比例 | 首步 OOM，没有完成训练更新 |
| MiniMax-H3-Image，4 张参考图 | 模型加载、参考条件及采样路径通过 | 真实训练反向传播 OOM，不能宣称已成功训练出有效 LoRA |
| 10 张参考图 | 列表传递及结构回归测试覆盖 | 未完成真实大模型的 10 参考图训练验收 |
| 4096 分辨率桶 | 界面可配置 | 未完成 4K 真实训练验收 |
| 中英文界面、预览与问号说明 | 类型检查、构建及浏览器交互检查通过 | 并非所有继承模型和平台都做过完整测试 |

详细记录：[H3 多参考图](docs/H3_MULTI_REFERENCE.md)、[FLUX.3 四参考验证](docs/FLUX3_FOUR_REFERENCE.md)。文中提到的本机日志、任务、数据集与权重不随源码发布。

## 下载安装

请按实际运行环境选择一份教程，按其中编号从前往后执行。三份教程分别写明了基础软件安装、终端选择、下载源码、创建和激活环境、安装依赖、首次启动、日常启动以及更新方法。

| 安装方式 | 详细步骤 | 使用的终端 |
| --- | --- | --- |
| **Windows 原生** | [Windows 逐步安装教程](docs/install/WINDOWS.md) | CMD 主流程，另附 PowerShell 命令 |
| **Linux** | [Linux 逐步安装教程](docs/install/LINUX.md) | Linux Bash，以 Ubuntu 24.04 为例 |
| **Windows 的 WSL2 Ubuntu** | [WSL2 Ubuntu 逐步安装教程](docs/install/WSL2_UBUNTU.md) | 安装 WSL 时使用 Windows PowerShell，进入 Ubuntu 后使用 Bash |

本机已运行环境为 WSL2 Ubuntu、Python 3.12.3、Node.js 24.14.0、PyTorch 2.13.0+cu130、torchvision 0.28.0+cu130、torchaudio 2.11.0+cu130。教程以 Python 3.12、Node.js 24 为基准；驱动和 PyTorch 构建需匹配各自平台。三平台教程并不代表三平台都已完成全新安装或所有模型训练验证。

### 环境激活命令确实不同

以下均在项目根目录执行，前提是已经创建 `venv`：

| 环境 / 终端 | 激活命令 |
| --- | --- |
| Windows CMD | `venv\Scripts\activate.bat` |
| Windows PowerShell | `.\venv\Scripts\Activate.ps1` |
| Linux Bash | `source venv/bin/activate` |
| Windows 的 WSL2 Ubuntu Bash | `source venv/bin/activate` |

WSL2 里的训练器运行在 Linux 环境，所以使用 Linux 激活命令。每次打开新的终端需要重新激活环境，但无需重新创建。Windows 与 Linux 的 `venv` 不能互相复制使用。激活方式见 [Python 官方文档](https://docs.python.org/3.12/library/venv.html)。

### 首次启动与以后启动

完成相应平台教程中的 **Python 依赖安装**后，在 `ui` 目录执行：

```bash
# 第一次启动：安装界面依赖 → 初始化/同步数据库 → 构建 → 启动
npm run build_and_start
```

以后普通启动，在新终端先进入项目并激活环境，再进入 `ui`：

```bash
npm run start
```

两个命令的区别由本仓库 [ui/package.json](ui/package.json) 定义。`build_and_start` 不安装 Python 训练依赖；`start` 不更新数据库，也不重新构建。**更新代码、修改界面依赖或丢失构建产物后，要重新使用 `build_and_start`。** PowerShell 可使用 `npm.cmd run ...`，详细命令见 Windows 教程。

三种方式的生产界面均为 **http://localhost:8676**。一次只启动一个本目录实例；不要在旧服务仍运行时覆盖构建文件。退出界面不一定停止独立训练进程，需要停止训练时先在界面停止并确认退出。

## 准备模型与数据集

在设置页选择数据集、输出和模型目录，根据底模要求自行准备模型、文本编码器、VAE 以及训练适配器。受限模型需先在模型平台取得访问权限，再配置自己的令牌。

配对示例：

```text
datasets/my-edit/
  target/    001.jpg  001.txt  002.jpg  002.txt
  person/    001.png          002.png
  front/     001.jpg          002.jpg
  back/      001.jpg          002.jpg
  scene/     001.png          002.png
```

目标目录选 `target`，按提示词约定依次添加 `person`、`front`、`back`、`scene`。按文件名主体配对；标注 TXT 放在目标图旁。每个数据集配置内参考数量固定，不同数量可以拆成不同配置。一张四视图拼图仍算一张参考图。

采样也要按自己的提示词顺序添加参考图。先用配对预览和总采样预览核对，再创建任务。小分辨率、批次 1 是排查流程是否可运行的起点，不是对大模型显存可用性的保证。

**当前“验证”模块不传入多参考图**，不能用它完整评价多参考编辑能力；这类任务应额外使用独立参考组合、固定种子和提示词做采样对照。

## 更新项目

更新步骤按平台分别放在 [Windows 教程](docs/install/WINDOWS.md#8-更新项目后启动)、[Linux 教程](docs/install/LINUX.md#9-更新项目后启动)、[WSL2 Ubuntu 教程](docs/install/WSL2_UBUNTU.md#11-更新项目后启动) 中。

先停止相关任务和本目录服务，备份自己的数据库与配置，再拉取源码、更新依赖并重新构建。Git 提示有个人改动时先处理，不要强制覆盖。ZIP 下载方式不支持直接 `git pull`。原项目管理器和启动脚本保留，本修改版优先使用这三份手动教程。

## 来源与发布范围

当前修改版来源于本人的 AI Toolkit 自用副本，基于原项目 v0.13.42 时期代码。已核对的原项目基点为 [`4a7f28532ed6fe81d9f8c00718878bb3b8739015`](https://github.com/ostris/ai-toolkit/commit/4a7f28532ed6fe81d9f8c00718878bb3b8739015)，之后包含个人加载兼容修改、H3 / FLUX.3 多参考图改动及本仓库界面调整。

本仓库首次发布采用当前源码快照建立独立历史。保留原许可证和必要的上游源码资源；不包含私人 Git 历史、训练数据、个人模型和 LoRA、数据库、缓存、运行日志、虚拟环境及账号令牌。源码自带的 `toolkit/keymaps` 资源来自上游，属于加载所需资源，不是我的训练模型。

**这只是我自己改来用的训练器，公开是为了分享和交流。请按自己的模型、数据与硬件验证实际效果。**

## English summary

AI Toolkit Y is my personal-use modification of [Ostris AI Toolkit](https://github.com/ostris/ai-toolkit), not an official release or a new framework built from scratch. It adds ordered multi-reference workflows for H3 Image and FLUX.3, reference previews and editing, Chinese/English UI switching, parameter help, higher bucket options and local memory-handling changes. The production UI uses port **8676**.

The tested setup is WSL2 Ubuntu with an NVIDIA RTX 5070 Ti 16GB. FLUX.3 completed six real updates with four references at a 512 bucket and produced a 512×1024 sample. H3 training and FLUX.3 at a 1024 bucket ran out of memory. Ten-reference training, 4K training and final LoRA quality are not validated. Separate step-by-step installation guides are provided for native Windows, Linux and WSL2 Ubuntu. The working environment is WSL2; fresh-machine installation across all three platforms has not yet been verified. Use npm run build_and_start for initial setup or rebuilding after updates, and npm run start for later normal launches. Original MIT copyright and license are retained.
