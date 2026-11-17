# AI Toolkit Y

**English** | [简体中文](README.zh-CN.md)

**This is a LoRA trainer I modified from [Ostris AI Toolkit](https://github.com/ostris/ai-toolkit) for my own use.**

I am sharing my personal version and its changes. This is not an official Ostris release or a new training framework built from scratch. The training framework, model support and much of the interface come from Ostris and the upstream contributors. Thank you for their work.

- Upstream project: [ostris/ai-toolkit](https://github.com/ostris/ai-toolkit)
- This project: [Yxw052/ai-toolkit-y](https://github.com/Yxw052/ai-toolkit-y)
- The original documentation is preserved in [README_UPSTREAM.md](README_UPSTREAM.md). Its installation URLs, ports and feature descriptions refer to upstream; use the guides below for this version.
- The original [MIT License](LICENSE) and copyright notice are retained. Model weights and datasets remain subject to their own terms.

> This version is tailored to my Windows + WSL2 Ubuntu + NVIDIA setup. I cannot promise support for every model, platform or configuration, or ongoing synchronization with upstream. Please report issues with this version in this repository rather than assuming they are upstream bugs.

## What I changed

### 1. Ordered reference images

- Connected and organized training configuration, sampling inputs and UI workflows for more than three reference images with MiniMax-H3-Image and FLUX.3 Image Klein.
- Datasets use an ordered `control_path` directory list; samples use an ordered `ctrl_imgs` image list. Explicit order and duplicates are preserved, with compatibility for the three legacy reference fields.
- Added checks for missing or damaged images, ambiguous pairs and targets mistakenly used as references. Review captions and prompts whenever reference order changes.
- Added dataset pair previews and sampling records containing the actual reference paths and fingerprints. Fingerprints are not backups of the reference images.
- The list UI offers up to 16 slots. This does not mean every model accepts 16 references, or that every reference count has passed real training validation.

### 2. Sampling, datasets and image previews

- The sample reference strip reserves space for five slots. Empty placeholders are not saved as actual references.
- Additional images scroll horizontally with hidden scrollbars, without squeezing prompt, size, seed or LoRA scale fields.
- Adding an image scrolls to the add position; references can be reordered by dragging.
- A sample overview brings together prompts, dimensions, seeds, LoRA scales and references, and supports reordering sample groups.
- Images in dataset pair previews and sample previews can be opened, zoomed with their aspect ratio preserved, and panned. Left/right arrow keys navigate between images.
- Replace opens only the image picker; clicking the image opens its preview. Replace/remove controls sit outside the thumbnail image.

### 3. English / Chinese UI and parameter help

- Added a language switch in Settings, with the selection saved in the browser.
- Localized the main interface and custom previews. User prompts, paths, model names, configuration values and logs retain their original contents.
- Added help for batch size, gradient accumulation, steps, optimizers, learning rate, weight decay, timesteps, losses, EMA and guidance loss.
- Added validation, latent caching and regularization dataset help, covering purpose, selection guidance and current limitations.

### 4. Resolution and memory handling

- Extended resolution options to 4096 and sorted them numerically. Bucket resolution is an image-area baseline, not a fixed longest edge.
- Added pageable CPU weights, activation offloading and per-process CUDA allocation budgets to the H3 low-VRAM path to reduce loading pressure.
- H3 / FLUX.3 now fail explicitly on training-step OOM instead of skipping failed batches and producing misleading completion results.
- **A 4K option does not mean 4K multi-reference training has been validated. Offloading and caching do not remove backward-pass memory requirements.**

### 5. Separate deployment

- The production UI uses **port 8676**, separate from the commonly used upstream port 8675.
- A separate project directory holds its own Python environment, database, datasets and output; there is no need to overwrite another AI Toolkit installation.
- This version inherits loading compatibility changes from my earlier personal copy. It is not an automatic mirror of the latest upstream release.
- The published version removes my machine-specific FLUX.2 Klein text-encoder default path and uses the model class default source. Configure your own path if you want a local encoder.

## What has actually been tested

These are local results as of **2026-11-17**, on an RTX 5070 Ti 16GB with approximately 32GB system RAM. They are not minimum hardware requirements or quality guarantees.

| Configuration | Observed result | Not yet demonstrated |
| --- | --- | --- |
| FLUX.3 Image Klein Base, four references | Six real optimizer updates at a 512 bucket, with valid gradients and parameter changes; four-reference sampling at 512×1024 | Long-run convergence, clothing detail quality, generalization to new people/clothing |
| FLUX.3, four references, 1024 bucket | Tried different layer-offloading ratios | OOM on the first step; no completed training update |
| MiniMax-H3-Image, four references | Model loading, reference conditioning and sampling paths passed | Backward-pass OOM during real training; no claim of a successfully trained effective LoRA |
| Ten references | List propagation and structural regression tests | Real large-model training with ten references |
| 4096 bucket | Available in the UI | Real 4K training |
| Bilingual UI, previews and help | Type checks, build and browser interaction checks passed | Full testing of every inherited model and platform |

Detailed records (currently in Chinese): [H3 multi-reference](docs/H3_MULTI_REFERENCE.md) and [FLUX.3 four-reference validation](docs/FLUX3_FOUR_REFERENCE.md). Local logs, jobs, datasets and weights mentioned there are not included in the repository.

## Download and installation

Choose the guide for the environment where the trainer will run, then follow its numbered steps. Each guide covers prerequisites, terminal selection, downloading, environment creation and activation, dependencies, first launch, later launches and updates.

| Environment | Step-by-step guide | Terminal |
| --- | --- | --- |
| **Native Windows** | [Windows installation](docs/install/WINDOWS.md) | CMD main workflow; PowerShell differences included |
| **Linux** | [Linux installation](docs/install/LINUX.md) | Bash; Ubuntu 24.04 examples |
| **WSL2 Ubuntu on Windows** | [WSL2 Ubuntu installation](docs/install/WSL2_UBUNTU.md) | Windows PowerShell for WSL setup, then Ubuntu Bash |

My working setup uses WSL2 Ubuntu, Python 3.12.3, Node.js 24.14.0, PyTorch 2.13.0+cu130, torchvision 0.28.0+cu130 and torchaudio 2.11.0+cu130. The guides target Python 3.12 and Node.js 24. Drivers and PyTorch builds must match the platform. Providing three guides does not mean fresh installations or all models have been tested on all three platforms.

### Environment activation differs by terminal

Run these in the project root after creating `venv`:

| Environment / terminal | Activation command |
| --- | --- |
| Windows CMD | `venv\Scripts\activate.bat` |
| Windows PowerShell | `.\venv\Scripts\Activate.ps1` |
| Linux Bash | `source venv/bin/activate` |
| WSL2 Ubuntu Bash | `source venv/bin/activate` |

The trainer runs in Linux inside WSL2, so it uses Linux activation commands. Activate again in each new terminal; do not recreate the environment each time. Windows and Linux virtual environments cannot be copied interchangeably. See the [Python venv documentation](https://docs.python.org/3.12/library/venv.html).

### First launch and later launches

After installing **Python training dependencies** using your platform guide, run this inside `ui`:

```bash
# First launch: install UI dependencies, synchronize the database, build and start
npm run build_and_start
```

For subsequent normal launches, open a terminal, enter the project, activate its environment and enter `ui`, then run:

```bash
npm run start
```

These scripts are defined in [ui/package.json](ui/package.json). `build_and_start` does not install Python dependencies. `start` neither updates the database nor rebuilds the UI. **Run `build_and_start` again after code updates, UI dependency changes or removal of build artifacts.** PowerShell users can use `npm.cmd run ...`; see the Windows guide.

The production UI is **http://localhost:8676** for all three environments. Run only one instance per project directory, and stop the old service before rebuilding. Stopping the UI may leave detached training processes running; stop the relevant jobs in the UI and confirm they have exited when needed.

## Prepare models and datasets

Set dataset, output and model directories in Settings. Obtain the base model, text encoder, VAE and training adapter required by your chosen architecture. For gated models, obtain access from the model provider before configuring your own token.

Example paired dataset:

```text
datasets/my-edit/
  target/    001.jpg  001.txt  002.jpg  002.txt
  person/    001.png          002.png
  front/     001.jpg          002.jpg
  back/      001.jpg          002.jpg
  scene/     001.png          002.png
```

Select `target` as the target directory, then add `person`, `front`, `back` and `scene` in the order described by your prompts. Pairing uses filename stems; caption TXT files belong beside target images. Reference count is fixed within each dataset configuration; split different counts into separate configurations. A four-view collage is still one reference image.

Add sampling references in the order used by each sample prompt. Check dataset pairs and the sample overview before creating a job. Small resolutions and batch size 1 are useful for testing the workflow, but do not guarantee sufficient memory for a large model.

**The current validation module does not pass multiple reference images to the model.** It cannot fully evaluate multi-reference editing; also compare samples using held-out reference combinations, fixed seeds and prompts.

## Updating

See the update instructions for [Windows](docs/install/WINDOWS.md#8-update-and-rebuild), [Linux](docs/install/LINUX.md#9-update-and-rebuild) or [WSL2 Ubuntu](docs/install/WSL2_UBUNTU.md#11-update-and-rebuild).

Stop relevant jobs and this project's service, back up your database and configurations, then pull the source, update dependencies and rebuild. Preserve and resolve local changes if Git reports conflicts. ZIP downloads cannot be updated directly with `git pull`. Upstream manager and launcher files are retained; the three manual guides are the preferred instructions for this version.

## Source and publication scope

This version comes from my personal AI Toolkit checkout, based on upstream v0.13.42-era code. The verified upstream base is [`4a7f28532ed6fe81d9f8c00718878bb3b8739015`](https://github.com/ostris/ai-toolkit/commit/4a7f28532ed6fe81d9f8c00718878bb3b8739015), followed by personal loading compatibility changes, H3 / FLUX.3 multi-reference work and UI changes.

The initial publication starts a separate history from a current-source snapshot. It retains the original license and required upstream resources, without private Git history, training data, personal models or LoRAs, databases, caches, runtime logs, virtual environments or account tokens. The `toolkit/keymaps` files are upstream loading resources, not my trained models.

**This is simply the trainer I modified for my own use, shared for discussion and exchange. Validate results with your own models, datasets and hardware.**
