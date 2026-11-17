# WSL2 Ubuntu installation on Windows

**English** | [简体中文](WSL2_UBUNTU.zh-CN.md)

[Project overview](../../README.md) · [Windows](WINDOWS.md) · [Linux](LINUX.md) · [WSL2 Ubuntu](WSL2_UBUNTU.md)

Install WSL2 on Windows, run the trainer inside Ubuntu, and access it from a Windows browser. This is the author's working setup, but the complete fresh-install procedure below has not been validated on a new machine from start to finish.

**Use Windows PowerShell for steps 1–2. From step 3 onward, use Ubuntu Bash.** Windows and Ubuntu have separate Python/Node.js installations, paths and environments; do not mix them.

## 1. Prepare Windows and the GPU driver

Use Windows 10/11 with WSL2 GPU support and install the appropriate [NVIDIA driver](https://www.nvidia.com/drivers/) on **Windows**. An up-to-date Windows 11 installation is recommended for a new setup.

Check in Windows PowerShell:


```powershell
nvidia-smi
```


## 2. Install or check WSL2 Ubuntu

### If WSL is not installed

Open Windows PowerShell as administrator and list available distribution names:


```powershell
wsl --list --online
```

Install using a name from that list; this example uses `Ubuntu-24.04`:


```powershell
wsl --install -d Ubuntu-24.04
```

Restart Windows if prompted. Open Ubuntu 24.04 from the Start menu, wait for initialization, then create a Linux username and password. Password input is not echoed. See [Microsoft's WSL installation guide](https://learn.microsoft.com/en-us/windows/wsl/install) for installation commands and distribution choices.

### If WSL is already installed

Do not reinstall Ubuntu. Check it in Windows PowerShell:


```powershell
wsl --list --verbose
```

The intended distribution should show **2** under `VERSION`. Note its actual name, such as `Ubuntu` or `Ubuntu-24.04`. If it shows 1, exit tasks in that distribution before converting with `wsl --set-version Ubuntu 2`, replacing `Ubuntu` with the actual name.

For a new installation or a needed kernel update, run this when no related tasks are running:


```powershell
wsl --update
```

Enter the distribution from the Start menu or with `wsl -d Ubuntu-24.04` in PowerShell. For a distribution named `Ubuntu`, use `wsl -d Ubuntu`.

## 3. Check Ubuntu and GPU access

From this step onward, use **Ubuntu Bash**:


```bash
cat /etc/os-release
nvidia-smi
```

If only the command is missing, try `/usr/lib/wsl/lib/nvidia-smi`. If GPU access still fails, resolve the Windows driver and WSL2 setup first.

**Do not install NVIDIA Linux display drivers inside WSL.** It uses the driver interface provided by Windows. See the [NVIDIA CUDA on WSL guide](https://docs.nvidia.com/cuda/wsl-user-guide/index.html).

## 4. Install system dependencies and Python in Ubuntu


```bash
sudo apt update
sudo apt install -y git curl ca-certificates python3.12 python3.12-venv python3-pip build-essential ffmpeg libgl1 libglib2.0-0
python3.12 --version
git --version
ffmpeg -version
```

These package names target **Ubuntu 24.04**. Other Linux distributions require their own package manager. Older Ubuntu versions such as 22.04 may not provide Python 3.12 in the default repositories; prepare a separate Python 3.12 installation without replacing the system Python.

## 5. Install Node.js and npm in Ubuntu

Install Node.js 24 in the current Linux Bash terminal. If Linux-native Node.js 24 and npm are already installed, check their versions and skip installation.

The script below comes from the [official nvm repository](https://github.com/nvm-sh/nvm#installing-and-updating). Download it before running it:


```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.41.0/install.sh -o /tmp/aitk-y-nvm-install.sh
bash /tmp/aitk-y-nvm-install.sh
source ~/.bashrc
nvm install 24
nvm use 24
node --version
npm --version
```

Node.js should report `v24.x`. If `nvm` is not found, open a new Bash terminal and run `nvm use 24`. Alternatively, install the Linux build for your architecture from the [Node.js website](https://nodejs.org/en/download).

Also check the executable paths:


```bash
command -v node
command -v npm
```

They should point inside Ubuntu, for example `/home/your-user/.nvm/...`, rather than `/mnt/c/.../node.exe` or Windows npm. Installing Node.js on Windows does not install it in Ubuntu.

## 6. Download into Ubuntu's filesystem


```bash
cd ~
git clone https://github.com/Yxw052/ai-toolkit-y.git
cd ai-toolkit-y
```

This installs to `~/ai-toolkit-y`. If that directory already exists, choose a different directory name and adjust subsequent `cd` commands rather than overwriting an existing trainer.

Keep the source and environment under Ubuntu's home directory rather than `/mnt/c` to reduce cross-filesystem overhead. Windows File Explorer can access it at `\\wsl.localhost\distribution-name\home\linux-user\ai-toolkit-y`.

## 7. Create and activate the Ubuntu Python environment


```bash
python3.12 -m venv venv
source venv/bin/activate
python --version
python -c "import sys; print(sys.executable)"
```

The Python executable should point to this project's `venv/bin/python`. In Linux Bash, activate with `source venv/bin/activate`, not the Windows `Scripts` path.

Do not copy a Windows `venv` or another trainer's environment directory.

## 8. Install Python training dependencies

With this project's `venv` active, run each command from the `ai-toolkit-y` root:


```bash
python -m pip install --upgrade pip setuptools wheel
python -m pip install torch==2.13.0 torchvision==0.28.0 torchaudio==2.11.0 --index-url https://download.pytorch.org/whl/cu130
python -m pip install -r requirements.txt
python -m pip check
python -c "import torch; print(torch.__version__); print('CUDA available:', torch.cuda.is_available())"
```

The PyTorch / CUDA 13.0 combination above comes from the author's working WSL environment; it is not universal across operating systems, GPUs and drivers. If no matching wheel is available or CUDA is unavailable, check the [official PyTorch installation guidance](https://pytorch.org/get-started/locally/) for a compatible combination. Do not ignore the error or change just one package arbitrarily.

The final command should print `CUDA available: True`. Resolve any `pip check` conflicts before continuing. Installing Python packages does not download the complete base model, training adapter or dataset.

## 9. First UI launch

From the project root in the activated Ubuntu terminal:


```bash
cd ui
npm run build_and_start
```

**Use `npm run build_and_start` for the first launch.** It installs UI dependencies, generates the Prisma client, initializes/synchronizes the database, builds the UI and starts the service. You do not need a separate `npm install` first. It does not replace Python dependency installation.

Keep the terminal open. Wait for a successful build and service startup, then open **http://localhost:8676**. A working page does not mean your model is ready to train; models and datasets still need configuration.

The database is created as `aitk_db.db` in the project root. Default directories are `output`, `datasets` and `models` inside this project and can be changed in Settings. Do not copy another trainer's database or virtual environment into this installation.

Open http://localhost:8676 in your **Windows browser**, keeping the Ubuntu terminal running.

## 10. Later launches

Open the same Ubuntu distribution from the Windows Start menu, then run in Bash:


```bash
cd ~/ai-toolkit-y
source venv/bin/activate
cd ui
npm run start
```

Open http://localhost:8676. Normal later launches do not require reinstalling dependencies or rebuilding.

## 11. Update and rebuild

Stop relevant training jobs in the UI and confirm they have exited, then stop this project's UI service with `Ctrl+C`. Back up `aitk_db.db`, your job configurations and important output before running:
Use Ubuntu Bash:


```bash
cd ~/ai-toolkit-y
git pull --ff-only
source venv/bin/activate
python -m pip install -r requirements.txt
python -m pip check
cd ui
npm run build_and_start
```

Resolve errors before continuing; do not start an old build after a failed update. If Git reports local changes or divergent branches, preserve and reconcile them rather than overwriting them. Never rebuild this directory while its old service is still running.

## Use and shutdown

- Next: [prepare models and multi-reference datasets](../../README.md#prepare-models-and-datasets).
- Activate the environment again when opening a new terminal; do not recreate `venv` each time.
- `npm run start` requires a successful build. It does not install dependencies, update the database or recompile the source.
- Run `npm run build_and_start` again after code updates, UI dependency changes or removal of build artifacts.
- Run only one UI instance per project directory. `Ctrl+C` stops the foreground UI service, but detached training jobs may continue. Stop relevant jobs in the UI first and confirm they have exited when needed.
- If the port is occupied, check for an existing Y service before stopping anything; do not terminate unrelated trainers or programs.
- You can also download source using GitHub **Code → Download ZIP**. Extract it, enter the directory containing `requirements.txt`, then continue from environment creation. ZIP downloads cannot be updated directly with `git pull`.
