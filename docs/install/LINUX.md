# Linux 安装（以 Ubuntu 24.04 为例）

[返回项目说明](../../README.md) · [Windows 原生](WINDOWS.md) · [Windows 的 WSL2 Ubuntu](WSL2_UBUNTU.md)

本页用于原生 Linux，命令在 **Bash 终端**执行。以 Ubuntu 24.04 + NVIDIA GPU 为例；其他发行版需调整系统包安装。作者已使用的是 WSL2 Ubuntu，原生 Linux 全新机器安装尚未单独验收。

## 1. 确认显卡驱动

通过发行版提供的驱动管理方式安装适合显卡的 NVIDIA 驱动；Ubuntu 桌面可从“软件和更新 → 附加驱动”选择推荐驱动。按提示重启后执行：

```bash
nvidia-smi
```

确认显卡能被识别后再继续。本页用于原生 Linux，WSL 用户请使用单独的 WSL 教程。

## 2. 安装系统工具与 Python 3.12

```bash
sudo apt update
sudo apt install -y git curl ca-certificates python3.12 python3.12-venv python3-pip build-essential ffmpeg libgl1 libglib2.0-0
python3.12 --version
git --version
ffmpeg -version
```

这些包名以 **Ubuntu 24.04** 为例。其他 Linux 发行版需使用对应包管理器；Ubuntu 22.04 等环境可能没有系统自带 Python 3.12，请先准备独立的 Python 3.12，不要替换系统 Python。

## 3. 安装 Node.js 24 与 npm

在当前 Linux 的 Bash 终端安装 Node.js 24。已有 Linux 版 Node.js 24 和 npm 时，可直接执行版本检查并跳过安装。

以下安装脚本来自 [nvm 官方仓库](https://github.com/nvm-sh/nvm#installing-and-updating)，先下载再执行：

```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.41.0/install.sh -o /tmp/aitk-y-nvm-install.sh
bash /tmp/aitk-y-nvm-install.sh
source ~/.bashrc
nvm install 24
nvm use 24
node --version
npm --version
```

Node.js 应显示 `v24.x`。若当前窗口找不到 `nvm`，重新打开 Bash 终端后再执行 `nvm use 24`。也可从 [Node.js 官网](https://nodejs.org/en/download) 安装适合本机架构的 Linux 版本。

## 4. 下载项目到独立目录

```bash
cd ~
git clone https://github.com/Yxw052/ai-toolkit-y.git
cd ai-toolkit-y
```

以上安装到 `~/ai-toolkit-y`。已有同名目录时，请另选目录名，并同步修改后续 `cd` 命令，避免覆盖已有训练器。

## 5. 创建并激活 Python 环境

```bash
python3.12 -m venv venv
source venv/bin/activate
python --version
python -c "import sys; print(sys.executable)"
```

Python 路径应指向本项目的 `venv/bin/python`。这里是 Linux / Bash，激活命令是 `source venv/bin/activate`，不能使用 Windows 的 `Scripts` 路径。

## 6. 安装 Python 训练依赖

先激活本项目的 `venv`，确认当前目录是 `ai-toolkit-y` 根目录，再逐条执行：

```bash
python -m pip install --upgrade pip setuptools wheel
python -m pip install torch==2.13.0 torchvision==0.28.0 torchaudio==2.11.0 --index-url https://download.pytorch.org/whl/cu130
python -m pip install -r requirements.txt
python -m pip check
python -c "import torch; print(torch.__version__); print('CUDA available:', torch.cuda.is_available())"
```

上面 PyTorch / CUDA 13.0 组合来自作者已运行的 WSL 环境，并不是任意系统、显卡和驱动的通用组合。安装器报告没有对应 wheel，或 CUDA 不可用时，先按 [PyTorch 官方安装页](https://pytorch.org/get-started/locally/) 核对该平台支持的匹配版本，不要直接忽略错误或随意只更换其中一个包。

最后应显示 `CUDA available: True`。`pip check` 若报告冲突，先解决再继续。下载 Python 依赖并不包含完整底模、训练适配器或训练数据。

## 7. 第一次启动界面

在刚才已经激活环境的终端、项目根目录内执行：

```bash
cd ui
npm run build_and_start
```

**第一次启动使用 `npm run build_and_start`。** 它依次执行界面依赖安装、Prisma 客户端生成和数据库初始化/同步、界面构建、服务启动，无需预先手动执行 `npm install`。它不会代替前面的 Python 依赖安装。

保持终端开启，等待构建成功和服务就绪，再打开 **http://localhost:8676**。仅看到网页不等于模型已经可以训练，还需配置模型与数据。

首次运行会在本项目内创建 `aitk_db.db`；默认使用本项目的 `output`、`datasets`、`models` 目录，可在设置页调整。不要把其他训练器的数据库或虚拟环境复制进来。

## 8. 以后正常启动

新开 Bash 终端后执行：

```bash
cd ~/ai-toolkit-y
source venv/bin/activate
cd ui
npm run start
```

打开 http://localhost:8676。后续普通启动不必重复安装依赖和构建。

## 9. 更新项目后启动

先在界面停止相关训练并确认退出，再用 `Ctrl+C` 结束本目录界面服务。备份自己的 `aitk_db.db`、任务配置和重要输出后，在 Bash 终端执行：

```bash
cd ~/ai-toolkit-y
git pull --ff-only
source venv/bin/activate
python -m pip install -r requirements.txt
python -m pip check
cd ui
npm run build_and_start
```

任一步失败都先处理错误，不要继续启动旧构建。若 Git 提示有自己的修改或分支分歧，先保存并合并修改，不要强制覆盖。不要在旧服务运行时重新构建同一个目录。

## 使用与停止

- 下一步：[准备模型与多参考图数据集](../../README.md#准备模型与数据集)。
- 普通重开终端时需要重新激活环境；不要每次重新创建 `venv`。
- `npm run start` 要求已经成功构建。它不会安装依赖、更新数据库或重新编译源码。
- 更新代码、变更界面依赖、删除构建产物后，应重新运行 `npm run build_and_start`。
- 只保留一个本目录的界面实例。`Ctrl+C` 结束前台界面服务，但独立训练进程可能继续运行；需要停止训练时，先在界面停止对应任务并确认退出。
- 端口占用时先检查已有的 Y 服务，不要直接结束其他训练器或其他程序。
- 可从 GitHub **Code → Download ZIP** 下载源码。解压后在含 `requirements.txt` 的目录继续创建环境；ZIP 下载方式不能直接用 `git pull` 更新。
