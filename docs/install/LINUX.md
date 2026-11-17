# Linux installation (Ubuntu 24.04 example)

**English** | [简体中文](LINUX.zh-CN.md)

[Project overview](../../README.md) · [Windows](WINDOWS.md) · [Linux](LINUX.md) · [WSL2 Ubuntu](WSL2_UBUNTU.md)

This guide is for native Linux, with commands run in a **Bash terminal**. Examples use Ubuntu 24.04 and an NVIDIA GPU; adjust system packages for other distributions. The author's working environment is WSL2 Ubuntu; a fresh native Linux installation has not been separately validated.

## 1. Check the GPU driver

Install the appropriate NVIDIA driver using your distribution's supported driver management method. On Ubuntu Desktop, use Software & Updates → Additional Drivers to select the recommended driver. Restart if requested, then run:


```bash
nvidia-smi
```

Continue once the GPU is recognized. WSL users should follow the separate WSL guide instead.

## 2. Install system tools and Python 3.12


```bash
sudo apt update
sudo apt install -y git curl ca-certificates python3.12 python3.12-venv python3-pip build-essential ffmpeg libgl1 libglib2.0-0
python3.12 --version
git --version
ffmpeg -version
```

These package names target **Ubuntu 24.04**. Other Linux distributions require their own package manager. Older Ubuntu versions such as 22.04 may not provide Python 3.12 in the default repositories; prepare a separate Python 3.12 installation without replacing the system Python.

## 3. Install Node.js 24 and npm

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

## 4. Download into a separate directory


```bash
cd ~
git clone https://github.com/Yxw052/ai-toolkit-y.git
cd ai-toolkit-y
```

This installs to `~/ai-toolkit-y`. If that directory already exists, choose a different directory name and adjust subsequent `cd` commands rather than overwriting an existing trainer.

## 5. Create and activate the Python environment


```bash
python3.12 -m venv venv
source venv/bin/activate
python --version
python -c "import sys; print(sys.executable)"
```

The Python executable should point to this project's `venv/bin/python`. In Linux Bash, activate with `source venv/bin/activate`, not the Windows `Scripts` path.

## 6. Install Python training dependencies

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

## 7. First UI launch

From the project root in the activated terminal:


```bash
cd ui
npm run build_and_start
```

**Use `npm run build_and_start` for the first launch.** It installs UI dependencies, generates the Prisma client, initializes/synchronizes the database, builds the UI and starts the service. You do not need a separate `npm install` first. It does not replace Python dependency installation.

Keep the terminal open. Wait for a successful build and service startup, then open **http://localhost:8676**. A working page does not mean your model is ready to train; models and datasets still need configuration.

The database is created as `aitk_db.db` in the project root. Default directories are `output`, `datasets` and `models` inside this project and can be changed in Settings. Do not copy another trainer's database or virtual environment into this installation.

## 8. Later launches

Open a new Bash terminal and run:


```bash
cd ~/ai-toolkit-y
source venv/bin/activate
cd ui
npm run start
```

Open http://localhost:8676. Normal later launches do not require reinstalling dependencies or rebuilding.

## 9. Update and rebuild

Stop relevant training jobs in the UI and confirm they have exited, then stop this project's UI service with `Ctrl+C`. Back up `aitk_db.db`, your job configurations and important output before running:
Use Bash:


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
