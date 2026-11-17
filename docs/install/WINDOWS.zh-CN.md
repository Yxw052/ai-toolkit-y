# Windows 原生安装（CMD / PowerShell）

[English](WINDOWS.md) | **简体中文**

[返回项目说明](../../README.zh-CN.md) · [Linux](LINUX.zh-CN.md) · [Windows 的 WSL2 Ubuntu](WSL2_UBUNTU.zh-CN.md)

这里是在 Windows 内直接运行，不是 WSL。下方主流程全部使用 **命令提示符 CMD**；PowerShell 的区别放在最后。作者实际训练验证环境是 WSL2 Ubuntu，Windows 原生完整安装与各模型训练尚未独立验收；遇到平台专用依赖问题时可以改用 WSL2 教程。

## 1. 安装基础软件

1. 安装适合显卡的 [NVIDIA Windows 驱动](https://www.nvidia.com/drivers/)，安装器要求重启时完成重启。
2. 安装 [Git for Windows](https://git-scm.com/downloads/win)，安装时允许在命令行使用 Git。
3. 从 [Python Windows 下载页](https://www.python.org/downloads/windows/) 安装 **Python 3.12，64 位版本**，启用 Python Launcher，并勾选加入 PATH。不要因为系统已有其他 Python 版本就跳过版本检查。
4. 从 [Node.js 官网](https://nodejs.org/en/download) 选择 **Node.js 24 LTS 的 Windows Installer（.msi）**，安装 npm。这里固定使用 24，不要默认选择网页上的其他主版本。
5. 从 [FFmpeg 下载页](https://ffmpeg.org/download.html#build-windows) 进入其链接的 Windows 构建下载，解压并将包含 `ffmpeg.exe` 的 `bin` 目录加入用户 PATH。

全部安装后重新打开终端，让 PATH 生效。不需要照搬 Linux 的 `apt` 命令。

## 2. 打开 CMD 并检查工具

按 `Win+R`，输入 `cmd` 并回车。逐条执行：

```bat
git --version
py -3.12 --version
node --version
npm --version
ffmpeg -version
nvidia-smi
```

确认 Python 为 3.12、Node.js 为 24，并且显卡能被识别。任何命令提示“不是内部或外部命令”时，先修复软件安装或 PATH，再继续。

## 3. 下载源码

以下默认安装到 Windows 用户目录：

```bat
cd /d "%USERPROFILE%"
git clone https://github.com/Yxw052/ai-toolkit-y.git
cd ai-toolkit-y
```

如需安装到其他盘，可先执行例如 `cd /d D:\AI`（目录需要事先存在），再克隆。已有同名目录时改用新目录名，后面的启动路径也相应修改。

## 4. 创建并激活 Python 环境

仍在刚才的 CMD、项目根目录执行：

```bat
py -3.12 -m venv venv
venv\Scripts\activate.bat
python --version
python -c "import sys; print(sys.executable)"
```

应显示 Python 3.12，解释器路径应以 `ai-toolkit-y\venv\Scripts\python.exe` 结尾。新终端中需要重新激活，但不需要重建环境。

## 5. 安装 Python 训练依赖

先激活本项目的 `venv`，确认当前目录是 `ai-toolkit-y` 根目录，再逐条执行：

```bat
python -m pip install --upgrade pip setuptools wheel
python -m pip install torch==2.13.0 torchvision==0.28.0 torchaudio==2.11.0 --index-url https://download.pytorch.org/whl/cu130
python -m pip install -r requirements.txt
python -m pip check
python -c "import torch; print(torch.__version__); print('CUDA available:', torch.cuda.is_available())"
```

上面 PyTorch / CUDA 13.0 组合来自作者已运行的 WSL 环境，并不是任意系统、显卡和驱动的通用组合。安装器报告没有对应 wheel，或 CUDA 不可用时，先按 [PyTorch 官方安装页](https://pytorch.org/get-started/locally/) 核对该平台支持的匹配版本，不要直接忽略错误或随意只更换其中一个包。

最后应显示 `CUDA available: True`。`pip check` 若报告冲突，先解决再继续。下载 Python 依赖并不包含完整底模、训练适配器或训练数据。

若某个依赖提示需要 C++ 编译器，可按报错安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)，选择“使用 C++ 的桌面开发”和 Windows SDK。编译工具不会让原本只支持 Linux 的依赖自动支持 Windows；此类问题需核对具体依赖或改用 WSL2。

## 6. 第一次启动界面

在刚才已经激活环境的终端、项目根目录内执行：

```bat
cd ui
npm run build_and_start
```

**第一次启动使用 `npm run build_and_start`。** 它依次执行界面依赖安装、Prisma 客户端生成和数据库初始化/同步、界面构建、服务启动，无需预先手动执行 `npm install`。它不会代替前面的 Python 依赖安装。

保持终端开启，等待构建成功和服务就绪，再打开 **http://localhost:8676**。仅看到网页不等于模型已经可以训练，还需配置模型与数据。

首次运行会在本项目内创建 `aitk_db.db`；默认使用本项目的 `output`、`datasets`、`models` 目录，可在设置页调整。不要把其他训练器的数据库或虚拟环境复制进来。

## 7. 以后正常启动

新开 CMD，按默认安装路径执行：

```bat
cd /d "%USERPROFILE%\ai-toolkit-y"
venv\Scripts\activate.bat
cd ui
npm run start
```

如果安装在其他盘，把第一行换成自己的实际路径。浏览器打开 http://localhost:8676。

## 8. 更新项目后启动

先在界面停止相关训练并确认退出，再 `Ctrl+C` 结束本目录界面服务。备份 `aitk_db.db`、自己的任务配置与重要输出后，在 CMD 执行：

```bat
cd /d "%USERPROFILE%\ai-toolkit-y"
git pull --ff-only
venv\Scripts\activate.bat
python -m pip install -r requirements.txt
python -m pip check
cd ui
npm run build_and_start
```

每一步成功后再继续。不要在旧服务运行时覆盖构建文件，Git 提示个人修改冲突时不要强制覆盖。

## 9. 如果使用 PowerShell

PowerShell 的激活脚本是 `.ps1`，不是 CMD 的 `.bat`。以下是**已经安装和构建完成后**的普通启动：

```powershell
Set-Location "$env:USERPROFILE\ai-toolkit-y"
.\venv\Scripts\Activate.ps1
Set-Location ui
npm.cmd run start
```

首次启动时最后一行使用 `npm.cmd run build_and_start`。`npm.cmd` 可避免误执行受 PowerShell 脚本策略限制的 `npm.ps1`。如果 `Activate.ps1` 被策略阻止，可以直接使用上面的 CMD 流程，不必修改系统执行策略。两种终端使用同一个 Windows `venv`。

环境命令依据 [Python 官方 venv 文档](https://docs.python.org/3.12/library/venv.html)。

## 使用与停止

- 下一步：[准备模型与多参考图数据集](../../README.zh-CN.md#准备模型与数据集)。
- 普通重开终端时需要重新激活环境；不要每次重新创建 `venv`。
- `npm run start` 要求已经成功构建。它不会安装依赖、更新数据库或重新编译源码。
- 更新代码、变更界面依赖、删除构建产物后，应重新运行 `npm run build_and_start`。
- 只保留一个本目录的界面实例。`Ctrl+C` 结束前台界面服务，但独立训练进程可能继续运行；需要停止训练时，先在界面停止对应任务并确认退出。
- 端口占用时先检查已有的 Y 服务，不要直接结束其他训练器或其他程序。
- 可从 GitHub **Code → Download ZIP** 下载源码。解压后在含 `requirements.txt` 的目录继续创建环境；ZIP 下载方式不能直接用 `git pull` 更新。
