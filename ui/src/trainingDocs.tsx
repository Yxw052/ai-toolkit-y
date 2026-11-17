'use client';
import { T } from '@/components/LanguageProvider';
import type { ConfigDoc } from '@/types';

// Keep guidance aligned with the local training implementation.
export const trainingDocs: Record<string, ConfigDoc> = {
  "train.batch_size": {
    title: "Batch Size",
    description: <div className="space-y-3 leading-relaxed">
      <p><T text={"What it does: the number of training examples processed together in one forward/backward pass. A larger batch usually needs more VRAM; it does not automatically improve image quality."} /></p>
      <p><T text={"For multi-reference training, one example contains one target image and all its reference images. Batch size 1 with four references is still one example, not a batch of five."} /></p>
      <p><T text={"With a fixed batch size on one GPU and no extra advanced accumulation, effective batch size = batch size × gradient accumulation. For example, 1 × 4 and 2 × 2 both use four examples per optimizer update, but have different memory and speed costs. A dataset-specific batch size can override the global value."} /></p>
      <p><T text={"For large models or many references, start with batch size 1. If even one example runs out of memory, increasing gradient accumulation will not fix it; reduce resolution/reference cost or change the memory strategy."} /></p>
    </div>,
  },
  "train.gradient_accumulation": {
    title: "Gradient Accumulation",
    description: <div className="space-y-3 leading-relaxed">
      <p><T text={"What it does: process several small batches sequentially, accumulate their gradients, then update the trainable weights. This increases the effective batch without processing all examples at once."} /></p>
      <p><T text={"Example: batch size 1 and accumulation 4 processes four examples before one update. In the normal UI training setup, 1,000 steps therefore consumes about 4,000 example presentations, including repeated examples. More accumulation takes more work per displayed step; it does not make training four times faster."} /></p>
      <p><T text={"Start at 1 for a baseline. Try 2 or 4 when you want a larger effective batch under a memory limit. Compare samples at comparable data exposure, and do not automatically multiply the learning rate. Accumulation does not remove the memory needed by one example."} /></p>
    </div>,
  },
  "train.steps": {
    title: "Steps",
    description: <div className="space-y-3 leading-relaxed">
      <p><T text={"The configured training-loop length. In the normal UI setup, each step processes the selected number of accumulated batches and performs an optimizer update. Advanced accumulation settings can change the update frequency."} /></p>
      <p><T text={"Approximate example presentations = steps × batch size × gradient accumulation when batch size is fixed. This is not the number of unique images. More steps can improve learning or cause overfitting; compare saved samples and checkpoints rather than choosing only the lowest loss."} /></p>
    </div>,
  },
  "train.optimizer": {
    title: "Optimizer",
    description: <div className="space-y-3 leading-relaxed">
      <p><T text={"The optimizer decides how gradients change the trainable weights. For a first LoRA baseline, keep the model preset; AdamW8Bit is a practical starting point when available. Optimizer-state savings do not eliminate base-model or activation memory."} /></p>
      <p><T text={"AdamW / AdamW8Bit: AdamW separates weight decay from the gradient update. The 8-bit version compresses optimizer states to reduce memory, not the exported LoRA precision. Adam is another adaptive optimizer, but its default weight decay is coupled to the gradient; the same decay value is not directly equivalent to AdamW."} /></p>
      <p><T text={"Adafactor: factorizes second-moment states for suitable tensors to save memory. This trainer disables relative-step and parameter-scale behavior by default, so the configured learning rate still matters. It is an alternative to test, not an automatic quality upgrade."} /></p>
      <p><T text={"Prodigy / Prodigy8Bit: estimates an adaptive step size with a different learning-rate convention. In this checkout, a configured learning rate below 0.1 is replaced with 1.0 for these optimizers. Do not interpret 0.0001 as an AdamW-like small update after switching to Prodigy. The 8-bit variant reduces state memory."} /></p>
      <p><T text={"Automagic / v2 / v3 / v4: experimental toolkit optimizers with different adaptive-update rules. A higher version number is not a guarantee of better LoRA quality; their learning-rate behavior can differ. Use a tested recipe for the exact model, and compare one optimizer change at a time."} /></p>
    </div>,
  },
  "train.lr": {
    title: "Learning Rate",
    description: <div className="space-y-3 leading-relaxed">
      <p><T text={"Controls the scale of weight updates together with the optimizer. Too large can cause unstable loss, artifacts or rapid overfitting; too small can learn very slowly. Start from the selected model recipe and change one variable at a time."} /></p>
      <p><T text={"A value such as 0.0001 is an AdamW-family starting point in many LoRA recipes, not a universal setting. Prodigy and Automagic use different adaptation rules. Changing batch size or accumulation does not imply that the learning rate must be multiplied by the same factor."} /></p>
    </div>,
  },
  "train.optimizer_params.weight_decay": {
    title: "Weight Decay",
    description: <div className="space-y-3 leading-relaxed">
      <p><T text={"Encourages trainable weights to stay smaller during optimization. For a LoRA job, this normally acts on the trainable adapter parameters, not on every frozen base-model weight. It is regularization, not the learning-rate schedule or the inference LoRA strength."} /></p>
      <p><T text={"Zero disables weight decay. Start with the model preset; too much can suppress the intended adaptation, while increasing it cannot repair bad captions or guarantee prevention of overfitting. Its effect depends on the optimizer and learning rate, so do not copy the same value blindly between optimizers."} /></p>
    </div>,
  },
  "train.timestep_type": {
    title: "Timestep Type",
    description: <div className="space-y-3 leading-relaxed">
      <p><T text={"Controls the training noise schedule: how clean and noisy versions of an example are distributed across training. It is different from the number of sampling steps. These descriptions apply to the flow-matching scheduler used by many image models; a model-specific fixed schedule can override this choice."} /></p>
      <p><T text={"Linear: evenly spaced noise timesteps. Sigmoid: concentrates more timesteps around the middle noise range. Shift: shifts the schedule according to the model scheduler, sometimes using image size. Weighted: uses a linear timetable and additional timestep-dependent loss weighting."} /></p>
      <p><T text={"Keep the model preset for a baseline. Shift is appropriate when the model recipe uses a shifted schedule; Weighted is not simply a stronger or better version. Timestep Type defines the schedule, while Timestep Bias changes which parts are selected more often."} /></p>
    </div>,
  },
  "train.content_or_style": {
    title: "Timestep Bias",
    description: <div className="space-y-3 leading-relaxed">
      <p><T text={"Balanced samples schedule indices without the extra high/low-noise preference. It is the best starting point for general LoRAs, unfamiliar datasets, or edits that must learn both structure and detail. Balanced does not undo a Shift or Sigmoid schedule."} /></p>
      <p><T text={"High Noise selects noisy examples more often, where the model must recover more global content and structure. Consider an experiment when learning a new subject, pose, garment structure or large compositional change is weak; detail learning may receive less emphasis."} /></p>
      <p><T text={"Low Noise selects near-clean examples more often. Consider it for localized texture, material or subtle appearance changes when structure is already learned. It does not mean that all style LoRAs should use it, and it does not guarantee natural skin texture."} /></p>
      <p><T text={"These are tendencies, not separate structure/detail switches. Start balanced for multi-reference clothing edits, then compare the same validation prompts. Models with fixed training timesteps may bypass this preference."} /></p>
    </div>,
  },
  "train.loss_type": {
    title: "Loss Type",
    description: <div className="space-y-3 leading-relaxed">
      <p><T text={"Defines how prediction error becomes the learning signal. The ordinary loss compares model outputs with a training target in latent/noise/flow space; it is not a direct human judgment of image quality."} /></p>
      <p><T text={"Mean Squared Error (MSE): squares the error and penalizes large errors more strongly. Keep this as the initial baseline unless the model recipe requires another loss. Mean Absolute Error (MAE): uses absolute error and is less dominated by large residuals; it changes the gradient scale and may need learning-rate retuning."} /></p>
      <p><T text={"Wavelet: compares reconstructed latents through Haar wavelet components. In this implementation, reconstruction assumes noise minus model prediction, so it depends on the prediction convention; it is not a universal detail enhancer."} /></p>
      <p><T text={"Stepped Recovery: advances along the predicted flow, reconstructs the latent and compares it with the target. It relies on scheduler sigma values and its loss is scaled differently. Use Wavelet or Stepped Recovery only with a compatible, tested model recipe; do not choose the winner by comparing raw loss numbers across loss types."} /></p>
    </div>,
  },
  "train.ema_config.use_ema": {
    title: "Use EMA",
    description: <div className="space-y-3 leading-relaxed">
      <p><T text={"Maintains a smoothed copy of the trainable weights: average = decay × previous average + (1 − decay) × current weights. It can reduce checkpoint-to-checkpoint fluctuations, but does not add training data or guarantee better detail."} /></p>
      <p><T text={"In this trainer, EMA weights are used for sampling and saving when enabled; ordinary training weights are restored afterwards. This requires extra parameter storage and some work. For LoRA, the tracked parameters are usually much smaller than the full base model."} /></p>
      <p><T text={"For a first run or a very short test, leave it off to see direct learning progress. Consider enabling it for longer runs with fluctuating outputs. A high decay can lag behind newly learned changes, especially in short runs."} /></p>
    </div>,
  },
  "train.ema_config.ema_decay": {
    title: "EMA Decay",
    description: <div className="space-y-3 leading-relaxed">
      <p><T text={"The historical-weight fraction in EMA. Use a value from 0 up to, but below, 1 for a moving average that keeps updating. At 0 it follows the current weights; at 1 it never incorporates new weights."} /></p>
      <p><T text={"For intuition, 0.99 has a characteristic averaging timescale of roughly 100 updates and 0.999 roughly 1,000; these are not hard windows. Higher values smooth more and respond more slowly. Choose according to training length instead of always increasing it."} /></p>
    </div>,
  },
  "train.do_guidance_loss": {
    title: "Contrastive Guidance Loss",
    description: <div className="space-y-3 leading-relaxed">
      <p><T text={"Changes the training target using an extra prediction with an empty text prompt. In the basic form, target = empty-prompt prediction + guidance target × (original target − empty-prompt prediction). It encourages learning away from the empty-prompt prediction; it is not a comparison between your reference images."} /></p>
      <p><T text={"This adds an extra model forward pass, so it costs more time and can add memory pressure. It is different from the CFG value used during sampling, and stronger guidance is not always better: it can change contrast or introduce artifacts."} /></p>
      <p><T text={"Leave it off for a baseline, especially while resolving memory limits or testing a new model. Enable only after confirming the model recipe and empty-prompt path work, then compare fixed validation samples. It does not enable additional reference images or make an out-of-memory job trainable."} /></p>
    </div>,
  },
  "train.guidance_loss_target": {
    title: "Guidance Loss Target",
    description: <div className="space-y-3 leading-relaxed">
      <p><T text={"The target-amplification factor used by Contrastive Guidance Loss, not an extra loss multiplier or the sampling CFG setting. In the basic formula, 1 keeps the original target; values above 1 extrapolate away from the empty-prompt prediction. Advanced guidance schedules can vary its effective strength across noise levels."} /></p>
      <p><T text={"The UI initially fills 4 when enabling this feature; that is a starting value, not a universal optimum. Do not increase it to compensate for too few training steps or insufficient VRAM. Compare output quality as well as loss."} /></p>
    </div>,
  },
  "train.validation_config": {
    title: "Validation",
    description: <div className="space-y-3 leading-relaxed">
      <p><T text={"Checks prediction error on held-out images without updating LoRA weights. Use images of the same concept that are not included in training. Fixed noise, prompts and noise levels make successive val/loss measurements more comparable."} /></p>
      <p><T text={"If both training and validation loss improve, learning may be generalizing to the held-out examples. If training loss keeps falling while validation loss rises, overfitting is possible. Judge this together with sample images: lower validation loss alone does not guarantee better visual quality or automatically select the best checkpoint."} /></p>
      <p><T text={"Current limitation: this validation path accepts an image and a prompt but does not pass reference images to the model. It cannot fully evaluate multi-reference editing. For those tasks, also sample with held-out reference combinations, fixed prompts and seeds; models requiring reference conditioning may not support this validation path."} /></p>
      <p><T text={"Validation adds encoding and prediction work. More images, higher resolution and more sigma values increase cost; sigma values for each image are evaluated together and can increase peak VRAM. Leave it off while diagnosing memory limits, or begin with a small compatible validation set at a modest interval."} /></p>
    </div>,
  },
  "datasets.cache_latents_to_disk": {
    title: "Cache Latents",
    description: <div className="space-y-3 leading-relaxed">
      <p><T text={"Encodes training images with the VAE ahead of time and stores their latent representations on disk. Later steps read the cached representations instead of repeatedly performing the same VAE encoding."} /></p>
      <p><T text={"This usually speeds up subsequent training and reduces repeated encoding work, at the cost of initial cache-building time and disk space. It caches an image representation; it does not train the image content into the LoRA in advance."} /></p>
      <p><T text={"Caching does not remove the memory needed for the main model forward/backward pass, so it cannot guarantee that an out-of-memory job will run. Whether reference latents are also cached depends on the model and reference-loading path."} /></p>
      <p><T text={"For fixed paired or multi-reference image datasets, keeping this enabled is a practical starting point. If images, preprocessing or the VAE change, ensure the cached representations are rebuilt or invalidated appropriately."} /></p>
    </div>,
  },
  "datasets.is_reg": {
    title: "Is Regularization",
    description: <div className="space-y-3 leading-relaxed">
      <p><T text={"Marks this entire dataset as auxiliary regularization training data. Its purpose is to help retain broader model behavior instead of adapting only to the main concept. These examples participate in gradient updates; they are not a held-out validation set."} /></p>
      <p><T text={"Example: for a specific-person LoRA, the main dataset contains that person. A separate regularization dataset can contain other ordinary people with accurate captions, helping distinguish the specific identity from the general class. Incorrect or mismatched regularization data can weaken the intended learning."} /></p>
      <p><T text={"The trainer schedules regularization batches alongside ordinary batches and does not automatically add the job trigger word to regularization captions. They add training work and change how updates are distributed. For reference-based models, these examples still need compatible inputs and pairing."} /></p>
      <p><T text={"Leave this off for your main target-and-reference clothing dataset. Having many reference images is not a reason to enable regularization. Enable it only on a separately prepared auxiliary dataset when you want to test preservation of general behavior."} /></p>
    </div>,
  },
};
