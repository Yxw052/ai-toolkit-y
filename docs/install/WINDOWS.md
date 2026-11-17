# Native Windows installation (CMD / PowerShell)

**English** | [简体中文](WINDOWS.zh-CN.md)

[Project overview](../../README.md) · [Windows](WINDOWS.md) · [Linux](LINUX.md) · [WSL2 Ubuntu](WSL2_UBUNTU.md)

This guide runs the trainer directly on Windows, not inside WSL. The main workflow uses **Command Prompt (CMD)**; PowerShell differences are explained at the end. The author's training validation used WSL2 Ubuntu. A complete native Windows installation and model training have not been independently validated; use the WSL2 guide if you encounter platform-specific dependency limitations.

## 1. Install prerequisites

1. Install the appropriate [NVIDIA Windows driver](https://www.nvidia.com/drivers/) and restart if requested.
2. Install [Git for Windows](https://git-scm.com/downloads/win), allowing Git to be used from the command line.
3. Install **64-bit Python 3.12** from the [Python Windows downloads page](https://www.python.org/downloads/windows/). Enable the Python Launcher and add Python to PATH. Check the version even if another Python is already installed.
4. From the [Node.js website](https://nodejs.org/en/download), select the **Node.js 24 LTS Windows Installer (.msi)** and install npm. Select version 24 explicitly rather than accepting a different major version offered by the page.
5. Follow the Windows build links on the [FFmpeg downloads page](https://ffmpeg.org/download.html#build-windows), extract a build and add the `bin` directory containing `ffmpeg.exe` to your user PATH.

Open a new terminal after installation so PATH changes take effect. Do not use Linux `apt` commands on native Windows.

## 2. Open CMD and check tools

Press `Win+R`, enter `cmd`, then press Enter. Run each command:


```bat
git --version
py -3.12 --version
node --version
npm --version
ffmpeg -version
nvidia-smi
```

Confirm Python 3.12, Node.js 24 and a recognized GPU. If a command is not recognized, fix its installation or PATH before continuing.

## 3. Download the source

These commands install into your Windows user directory:


```bat
cd /d "%USERPROFILE%"
git clone https://github.com/Yxw052/ai-toolkit-y.git
cd ai-toolkit-y
```

For another drive, first enter an existing directory, for example `cd /d D:\AI`, then clone. If the target directory already exists, choose a new name and update the later startup paths.

## 4. Create and activate the Python environment

In the same CMD window, from the project root:


```bat
py -3.12 -m venv venv
venv\Scripts\activate.bat
python --version
python -c "import sys; print(sys.executable)"
```

Confirm Python 3.12 and an executable path ending in `ai-toolkit-y\venv\Scripts\python.exe`. Activate again in new terminals, but do not recreate the environment.

## 5. Install Python training dependencies

With this project's `venv` active, run the following from the `ai-toolkit-y` root, one command at a time:


```bat
python -m pip install --upgrade pip setuptools wheel
python -m pip install torch==2.13.0 torchvision==0.28.0 torchaudio==2.11.0 --index-url https://download.pytorch.org/whl/cu130
python -m pip install -r requirements.txt
python -m pip check
python -c "import torch; print(torch.__version__); print('CUDA available:', torch.cuda.is_available())"
```

The PyTorch / CUDA 13.0 combination above comes from the author's working WSL environment; it is not universal across operating systems, GPUs and drivers. If no matching wheel is available or CUDA is unavailable, check the [official PyTorch installation guidance](https://pytorch.org/get-started/locally/) for a compatible combination. Do not ignore the error or change just one package arbitrarily.

The final command should print `CUDA available: True`. Resolve any `pip check` conflicts before continuing. Installing Python packages does not download the complete base model, training adapter or dataset.

If a dependency requires a C++ compiler, install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the Desktop development with C++ workload and Windows SDK as directed by the error. Build tools cannot make a Linux-only dependency compatible with Windows; check the package or use WSL2 in that case.

## 6. First UI launch

From the project root in the activated terminal:


```bat
cd ui
npm run build_and_start
```

**Use `npm run build_and_start` for the first launch.** It installs UI dependencies, generates the Prisma client, initializes/synchronizes the database, builds the UI and starts the service. You do not need a separate `npm install` first. It does not replace Python dependency installation.

Keep the terminal open. Wait for a successful build and service startup, then open **http://localhost:8676**. A working page does not mean your model is ready to train; models and datasets still need configuration.

The database is created as `aitk_db.db` in the project root. Default directories are `output`, `datasets` and `models` inside this project and can be changed in Settings. Do not copy another trainer's database or virtual environment into this installation.

## 7. Later launches

Open a new CMD window and, for the default installation path, run:


```bat
cd /d "%USERPROFILE%\ai-toolkit-y"
venv\Scripts\activate.bat
cd ui
npm run start
```

Replace the first line with your actual path if installed elsewhere. Open http://localhost:8676 in your browser.

## 8. Update and rebuild

Stop relevant training jobs in the UI and confirm they have exited, then stop this project's UI service with `Ctrl+C`. Back up `aitk_db.db`, your job configurations and important output before running:
Use CMD:


```bat
cd /d "%USERPROFILE%\ai-toolkit-y"
git pull --ff-only
venv\Scripts\activate.bat
python -m pip install -r requirements.txt
python -m pip check
cd ui
npm run build_and_start
```

Resolve errors before continuing; do not start an old build after a failed update. If Git reports local changes or divergent branches, preserve and reconcile them rather than overwriting them. Never rebuild this directory while its old service is still running.

## 9. Using PowerShell

PowerShell activation uses the `.ps1` script instead of CMD's `.bat` script. After installation and the first successful build, a normal launch is:


```powershell
Set-Location "$env:USERPROFILE\ai-toolkit-y"
.\venv\Scripts\Activate.ps1
Set-Location ui
npm.cmd run start
```

For the first launch, use `npm.cmd run build_and_start` on the last line. Using `npm.cmd` avoids accidentally invoking `npm.ps1` under PowerShell script restrictions. If `Activate.ps1` is blocked by policy, use the CMD workflow above without changing system execution policy. Both terminals use the same Windows `venv`.

Activation commands follow the [Python venv documentation](https://docs.python.org/3.12/library/venv.html).

## Use and shutdown

- Next: [prepare models and multi-reference datasets](../../README.md#prepare-models-and-datasets).
- Activate the environment again when opening a new terminal; do not recreate `venv` each time.
- `npm run start` requires a successful build. It does not install dependencies, update the database or recompile the source.
- Run `npm run build_and_start` again after code updates, UI dependency changes or removal of build artifacts.
- Run only one UI instance per project directory. `Ctrl+C` stops the foreground UI service, but detached training jobs may continue. Stop relevant jobs in the UI first and confirm they have exited when needed.
- If the port is occupied, check for an existing Y service before stopping anything; do not terminate unrelated trainers or programs.
- You can also download source using GitHub **Code → Download ZIP**. Extract it, enter the directory containing `requirements.txt`, then continue from environment creation. ZIP downloads cannot be updated directly with `git pull`.
