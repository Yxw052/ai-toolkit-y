'use client';
import { T, useT } from '@/components/LanguageProvider';

import SamplePreviewDialog from '@/components/SamplePreviewDialog';
import { DatasetReferenceInputs, SampleReferenceInputs } from '@/components/MultiReferenceInputs';
import { useMemo } from 'react';
import {
  ModelArch,
  quantizationOptions,
  defaultQtype,
  jobTypeOptions,
  SampleTags,
} from './options';
import { useModelArchs } from '@/extensions/modelArchs';
import { defaultCompileOptions, defaultDatasetConfig } from './jobConfig';
import { GroupedSelectOption, JobConfig, SelectOption } from '@/types';
import { objectCopy, tagsToObj, objToTags } from '@/utils/basic';
import {
  TextInput,
  TextAreaInput,
  SelectInput,
  Checkbox,
  FormGroup,
  NumberInput,
  SliderInput,
  CreatableSelectInput,
} from '@/components/formInputs';
import Card from '@/components/Card';
import { X, Copy, Wand2, SquareDashed, Info } from 'lucide-react';
import { openDoc } from '@/components/DocModal';
import { openUpsamplePromptsModal, toAspectRatio } from '@/components/UpsamplePromptsModal';
import { openPromptBoxEditor } from '@/components/PromptBoxEditorModal';
import AddSingleImageModal, { openAddImageModal } from '@/components/AddSingleImageModal';
import SampleControlImage from '@/components/SampleControlImage';
import { FlipHorizontal2, FlipVertical2 } from 'lucide-react';
import { handleModelArchChange } from './utils';
import { IoFlaskSharp } from 'react-icons/io5';
import { isMac } from '@/helpers/basic';

type Props = {
  jobConfig: JobConfig;
  setJobConfig: (value: any, key: string) => void;
  status: 'idle' | 'saving' | 'success' | 'error';
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  runId: string | null;
  gpuIDs: string | null;
  setGpuIDs: (value: string | null) => void;
  gpuList: any;
  datasetOptions: any;
  isLoading?: boolean;
};

const isDev = process.env.NODE_ENV === 'development';

export default function SimpleJob({
  jobConfig,
  setJobConfig,
  handleSubmit,
  status,
  runId,
  gpuIDs,
  setGpuIDs,
  gpuList,
  datasetOptions,
  isLoading,
}: Props) {
  const t = useT();
  const { archs: modelArchs, groupedModelOptions } = useModelArchs();
  const modelArch = useMemo(() => {
    return modelArchs.find(a => a.name === jobConfig.config.process[0].model.arch) as ModelArch;
  }, [modelArchs, jobConfig.config.process[0].model.arch]);

  const jobType = useMemo(() => {
    return jobTypeOptions.find(j => j.value === jobConfig.config.process[0].type);
  }, [jobConfig.config.process[0].type]);

  const disableSections = useMemo(() => {
    let sections: string[] = [];
    if (modelArch?.disableSections) {
      sections = sections.concat(modelArch.disableSections);
    }
    if (jobType?.disableSections) {
      sections = sections.concat(jobType.disableSections);
    }
    return sections;
  }, [modelArch, jobType]);

  const isVideoModel = !!(modelArch?.group === 'video');
  const isAudioModel = !!(modelArch?.group === 'audio');
  // text-generating models: samples are media in, text out (no size)
  const isLlmModel = !!(modelArch?.group === 'llm');

  const taggedSampleArr: Record<string, any>[] | null = useMemo(() => {
    if (!modelArch) return null;
    if (!modelArch.sampleTags) return null;
    if (!jobConfig.config.process[0].sample.samples) return null;
    let sampleArr: any[] = [];
    for (let i = 0; i < jobConfig.config.process[0].sample.samples.length; i++) {
      const taggedPrompt = jobConfig.config.process[0].sample.samples[i].prompt;
      const tagsObj = tagsToObj(taggedPrompt);
      sampleArr.push(tagsObj);
    }
    return sampleArr;
  }, [modelArch, jobConfig.config.process[0].sample.samples]);

  const modelArchTagSections: SampleTags[] | null = useMemo(() => {
    if (!modelArch?.sampleTags) return null;
    const maxPerGroup = 5;
    let sections: SampleTags[] = [];
    let subSection: SampleTags = {};
    for (const [tagKey, tag] of Object.entries(modelArch.sampleTags)) {
      if ((tag.full && Object.keys(subSection).length > 0) || Object.keys(subSection).length >= maxPerGroup) {
        // reset the sub section build if the next tag is full or max per group is reached
        sections.push(subSection);
        subSection = {};
      }
      subSection[tagKey] = tag;
      if (tag.full) {
        // if the tag is full, push the section immediately and reset the sub section build
        sections.push(subSection);
        subSection = {};
      }
    }
    if (Object.keys(subSection).length > 0) {
      sections.push(subSection);
    }
    return sections.length > 0 ? sections : null;
  }, [modelArch]);

  const numTopCards = useMemo(() => {
    let count = 4; // job settings, model config, target config, save config
    if (modelArch?.additionalSections?.includes('model.multistage')) {
      count += 1; // add multistage card
    }
    if (!disableSections.includes('model.quantize')) {
      count += 1; // add quantization card
    }
    if (!disableSections.includes('slider')) {
      count += 1; // add slider card
    }
    return count;
  }, [modelArch, disableSections]);

  let topBarClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6';

  if (numTopCards == 5) {
    topBarClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6';
  }
  if (numTopCards == 6) {
    topBarClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 gap-6';
  }

  const numTrainingCols = useMemo(() => {
    let count = 4;
    if (!disableSections.includes('train.diff_output_preservation')) {
      count += 1;
    }
    return count;
  }, [disableSections]);

  let trainingBarClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6';

  if (numTrainingCols == 5) {
    trainingBarClass = 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6';
  }

  const transformerQuantizationOptions: GroupedSelectOption[] | SelectOption[] = useMemo(() => {
    const hasARA = modelArch?.accuracyRecoveryAdapters && Object.keys(modelArch.accuracyRecoveryAdapters).length > 0;
    if (!hasARA) {
      return quantizationOptions;
    }
    let newQuantizationOptions = [
      {
        label: 'Standard',
        options: [quantizationOptions[0], quantizationOptions[1]],
      },
    ];

    // add ARAs if they exist for the model
    let ARAs: SelectOption[] = [];
    if (modelArch.accuracyRecoveryAdapters) {
      for (const [label, value] of Object.entries(modelArch.accuracyRecoveryAdapters)) {
        ARAs.push({ value, label });
      }
    }
    if (ARAs.length > 0) {
      newQuantizationOptions.push({
        label: 'Accuracy Recovery Adapters',
        options: ARAs,
      });
    }

    let additionalQuantizationOptions: SelectOption[] = [];
    // add the quantization options if they are not already included
    for (let i = 2; i < quantizationOptions.length; i++) {
      const option = quantizationOptions[i];
      additionalQuantizationOptions.push(option);
    }
    if (additionalQuantizationOptions.length > 0) {
      newQuantizationOptions.push({
        label: 'Additional Quantization Options',
        options: additionalQuantizationOptions,
      });
    }
    return newQuantizationOptions;
  }, [modelArch]);

  const showGPUSelect = !isMac();

  const validationConfig = jobConfig.config.process[0].train.validation_config;

  let numDatasetCols = 4;
  let numSampleTopCols = 4;
  let datasetStyleClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6';
  let sampleTopStyleClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6';
  if (isVideoModel) {
    numSampleTopCols += 1;
  }
  if (isAudioModel) {
    numDatasetCols -= 1;
    numSampleTopCols -= 1;
  }
  if (isLlmModel) {
    numSampleTopCols -= 1;
  }
  if (numDatasetCols == 3) {
    datasetStyleClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  }
  if (numSampleTopCols == 5) {
    sampleTopStyleClass = 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6';
  }
  if (numSampleTopCols == 3) {
    sampleTopStyleClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  }
  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={`space-y-8 relative ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
      >
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-400 border-t-blue-500" />
              <span className="text-sm text-gray-400"><T text={"Loading..."} /></span>
            </div>
          </div>
        )}
        <div className={topBarClass}>
          <Card title={t("Job")}>
            <TextInput
              label={t("Training Name")}
              value={jobConfig.config.name}
              docKey="config.name"
              onChange={value => setJobConfig(value, 'config.name')}
              placeholder={t("Enter training name")}
              disabled={runId !== null}
              required
            />
            {showGPUSelect && (
              <SelectInput
                label={t("GPU ID")}
                value={`${gpuIDs}`}
                docKey="gpuids"
                onChange={value => setGpuIDs(value)}
                options={gpuList.map((gpu: any) => ({ value: `${gpu.index}`, label: `GPU #${gpu.index}` }))}
              />
            )}
            {disableSections.includes('trigger_word') ? null : (
              <TextInput
                label={t("Trigger Word")}
                value={jobConfig.config.process[0].trigger_word || ''}
                docKey="config.process[0].trigger_word"
                onChange={(value: string | null) => {
                  if (value?.trim() === '') {
                    value = null;
                  }
                  setJobConfig(value, 'config.process[0].trigger_word');
                }}
                placeholder=""
                required
              />
            )}
          </Card>

          {/* Model Configuration Section */}
          <Card title={t("Model")}>
            <SelectInput
              label={t("Model Architecture")}
              value={jobConfig.config.process[0].model.arch}
              onChange={value => {
                handleModelArchChange(modelArchs, jobConfig.config.process[0].model.arch, value, jobConfig, setJobConfig);
              }}
              options={groupedModelOptions}
            />
            <TextInput
              label={t("Name or Path")}
              value={jobConfig.config.process[0].model.name_or_path}
              docKey="config.process[0].model.name_or_path"
              onChange={(value: string | null) => {
                if (value?.trim() === '') {
                  value = null;
                }
                setJobConfig(value, 'config.process[0].model.name_or_path');
              }}
              placeholder=""
              required
            />
            {modelArch?.additionalSections?.includes('model.model_kwargs.instruction') && (
              <TextAreaInput
                label={t("LLM Prompt")}
                className="pt-2"
                rows={2}
                docKey="model.model_kwargs.instruction"
                value={jobConfig.config.process[0].model.model_kwargs?.instruction ?? ''}
                onChange={value => setJobConfig(value, 'config.process[0].model.model_kwargs.instruction')}
                placeholder="Describe this in detail."
                required
              />
            )}
            {modelArch?.additionalSections?.includes('model.assistant_lora_path') && (
              <TextInput
                label={t("Training Adapter Path")}
                value={jobConfig.config.process[0].model.assistant_lora_path ?? ''}
                docKey="config.process[0].model.assistant_lora_path"
                onChange={(value: string | undefined) => {
                  if (value?.trim() === '') {
                    value = undefined;
                  }
                  setJobConfig(value, 'config.process[0].model.assistant_lora_path');
                }}
                placeholder=""
              />
            )}
            {modelArch?.additionalSections?.includes('model.unconditional_lora_path') && (
              <TextInput
                label={t("Unconditional Adapter Path")}
                value={jobConfig.config.process[0].model.unconditional_lora_path ?? ''}
                docKey="config.process[0].model.unconditional_lora_path"
                onChange={(value: string | undefined) => {
                  if (value?.trim() === '') {
                    value = undefined;
                  }
                  setJobConfig(value, 'config.process[0].model.unconditional_lora_path');
                }}
                placeholder=""
              />
            )}
            {modelArch?.customModelSelectOptions?.map(customOption =>
              customOption.type === 'checkbox' ? (
                <Checkbox
                  key={customOption.label}
                  label={customOption.label}
                  checked={customOption.getValue(jobConfig)}
                  doc={customOption.doc}
                  onChange={value => customOption.onChange(value, jobConfig, setJobConfig)}
                />
              ) : (
                <SelectInput
                  key={customOption.label}
                  label={customOption.label}
                  value={customOption.getValue(jobConfig) ?? ''}
                  doc={customOption.doc}
                  onChange={value => customOption.onChange(value, jobConfig, setJobConfig)}
                  options={customOption.options}
                />
              ),
            )}
            {modelArch?.modelNotes && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const gateUrl = modelArch.gateUrl as string;
                    openDoc({
                      title: `Notes - ${modelArch.label}`,
                      description: <div className="space-y-3">{modelArch.modelNotes}</div>,
                    });
                  }}
                  className="w-full flex items-center gap-2 rounded-md bg-blue-950/60 border border-blue-800 px-3 py-2 text-sm text-blue-200 hover:bg-blue-900/60 text-left"
                >
                  <Info className="w-4 h-4 shrink-0 text-blue-400" />
                  <span><T text={"Model notes"} /></span>
                </button>
              </div>
            )}
            {modelArch?.gateUrl && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const gateUrl = modelArch.gateUrl as string;
                    openDoc({
                      title: 'Gated Model',
                      description: (
                        <div className="space-y-3">
                          <p><T text={"This model is gated on Huggingface. Before you can use it, you will need to accept the model terms on the model page:"} /></p>
                          <p>
                            <a
                              href={gateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 underline"
                            >
                              {gateUrl}
                            </a>
                          </p>
                          <p><T text={"You will also need to create a Huggingface"} />{' '}
                            <a
                              href="https://huggingface.co/settings/tokens"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 underline"
                            ><T text={"read token"} /></a>{' '}<T text={"and add it on the"} />{' '}
                            <a href="/settings" className="text-blue-400 hover:text-blue-300 underline"><T text={"settings page"} /></a>
                            .
                          </p>
                        </div>
                      ),
                    });
                  }}
                  className="w-full flex items-center gap-2 rounded-md bg-yellow-950/60 border border-yellow-800 px-3 py-2 text-sm text-yellow-200 hover:bg-yellow-900/60 text-left"
                >
                  <Info className="w-4 h-4 shrink-0 text-yellow-400" />
                  <span><T text={"Gated model."} /> <span className="underline"><T text={"Learn more."} /></span>
                  </span>
                </button>
              </div>
            )}
            {modelArch?.additionalSections?.includes('model.low_vram') && (
              <FormGroup label={t("Options")}>
                <Checkbox
                  label={t("Low VRAM")}
                  checked={jobConfig.config.process[0].model.low_vram}
                  onChange={value => setJobConfig(value, 'config.process[0].model.low_vram')}
                />
              </FormGroup>
            )}
            {modelArch?.additionalSections?.includes('model.model_kwargs.kv_cache') && (
              <Checkbox
                label={t("KV Cache")}
                docKey="model.model_kwargs.kv_cache"
                checked={jobConfig.config.process[0].model.model_kwargs.kv_cache || false}
                onChange={value => setJobConfig(value, 'config.process[0].model.model_kwargs.kv_cache')}
              />
            )}
            {modelArch?.additionalSections?.includes('model.qie.match_target_res') && (
              <Checkbox
                label={t("Match Target Res")}
                docKey="model.qie.match_target_res"
                checked={jobConfig.config.process[0].model.model_kwargs.match_target_res}
                onChange={value => setJobConfig(value, 'config.process[0].model.model_kwargs.match_target_res')}
              />
            )}
            {modelArch?.additionalSections?.includes('model.layer_offloading') && !isMac() && (
              <>
                <Checkbox
                  label={
                    <><T text={"Layer Offloading"} /> <IoFlaskSharp className="inline text-yellow-500" name="Experimental" />{' '}
                    </>
                  }
                  checked={jobConfig.config.process[0].model.layer_offloading || false}
                  onChange={value => setJobConfig(value, 'config.process[0].model.layer_offloading')}
                  docKey="model.layer_offloading"
                />
                {jobConfig.config.process[0].model.layer_offloading && (
                  <div className="pt-2">
                    <SliderInput
                      label={t("Transformer Offload %")}
                      value={Math.round(
                        (jobConfig.config.process[0].model.layer_offloading_transformer_percent ?? 1) * 100,
                      )}
                      onChange={value =>
                        setJobConfig(value * 0.01, 'config.process[0].model.layer_offloading_transformer_percent')
                      }
                      min={0}
                      max={100}
                      step={1}
                    />
                    <SliderInput
                      label={t("Text Encoder Offload %")}
                      value={Math.round(
                        (jobConfig.config.process[0].model.layer_offloading_text_encoder_percent ?? 1) * 100,
                      )}
                      onChange={value =>
                        setJobConfig(value * 0.01, 'config.process[0].model.layer_offloading_text_encoder_percent')
                      }
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                )}
              </>
            )}
          </Card>
          {disableSections.includes('model.quantize') ? null : (
            <Card title={t("Quantize / Compile")}>
              <SelectInput
                label="Transformer"
                value={jobConfig.config.process[0].model.quantize ? jobConfig.config.process[0].model.qtype : ''}
                onChange={value => {
                  if (value === '') {
                    setJobConfig(false, 'config.process[0].model.quantize');
                    value = defaultQtype;
                  } else {
                    setJobConfig(true, 'config.process[0].model.quantize');
                  }
                  setJobConfig(value, 'config.process[0].model.qtype');
                }}
                options={transformerQuantizationOptions}
              />
              {!disableSections.includes('model.quantize_te') && !isLlmModel && (
                <SelectInput
                  label={t("Text Encoder")}
                  value={
                    jobConfig.config.process[0].model.quantize_te ? jobConfig.config.process[0].model.qtype_te : ''
                  }
                  onChange={value => {
                    if (value === '') {
                      setJobConfig(false, 'config.process[0].model.quantize_te');
                      value = defaultQtype;
                    } else {
                      setJobConfig(true, 'config.process[0].model.quantize_te');
                    }
                    setJobConfig(value, 'config.process[0].model.qtype_te');
                  }}
                  options={quantizationOptions}
                />
              )}
              {!isLlmModel && (
                <>
                  <FormGroup label={t("Compile Options")}>
                    <></>
                  </FormGroup>
                  <Checkbox
                    label={t("Compile Model")}
                    checked={jobConfig.config.process[0].model.compile || false}
                    onChange={value => {
                      setJobConfig(value, 'config.process[0].model.compile');
                      if (value) {
                        for (const key in defaultCompileOptions) {
                          setJobConfig((defaultCompileOptions as any)[key], `config.process[0].model.${key}`);
                        }
                      } else {
                        for (const key in defaultCompileOptions) {
                          setJobConfig(undefined, `config.process[0].model.${key}`);
                        }
                      }
                    }}
                  />
                </>
              )}
            </Card>
          )}
          {modelArch?.additionalSections?.includes('model.multistage') && (
            <Card title={t("Multistage")}>
              <FormGroup label={t("Stages to Train")} docKey={'model.multistage'}>
                <Checkbox
                  label={t("High Noise")}
                  checked={jobConfig.config.process[0].model.model_kwargs?.train_high_noise || false}
                  onChange={value => setJobConfig(value, 'config.process[0].model.model_kwargs.train_high_noise')}
                />
                <Checkbox
                  label={t("Low Noise")}
                  checked={jobConfig.config.process[0].model.model_kwargs?.train_low_noise || false}
                  onChange={value => setJobConfig(value, 'config.process[0].model.model_kwargs.train_low_noise')}
                />
              </FormGroup>
              <NumberInput
                label={t("Switch Every")}
                value={jobConfig.config.process[0].train.switch_boundary_every}
                onChange={value => setJobConfig(value, 'config.process[0].train.switch_boundary_every')}
                placeholder="eg. 1"
                docKey={'train.switch_boundary_every'}
                min={1}
                required
              />
            </Card>
          )}
          <Card title={t("Target")}>
            <SelectInput
              label={t("Target Type")}
              value={jobConfig.config.process[0].network?.type ?? 'lora'}
              onChange={value => setJobConfig(value, 'config.process[0].network.type')}
              options={[
                { value: 'lora', label: 'LoRA' },
                { value: 'lokr', label: 'LoKr' },
              ]}
            />
            {jobConfig.config.process[0].network?.type == 'lokr' && (
              <SelectInput
                label={t("LoKr Factor")}
                value={`${jobConfig.config.process[0].network?.lokr_factor ?? -1}`}
                onChange={value => setJobConfig(parseInt(value), 'config.process[0].network.lokr_factor')}
                options={[
                  { value: '-1', label: 'Auto' },
                  { value: '4', label: '4' },
                  { value: '8', label: '8' },
                  { value: '16', label: '16' },
                  { value: '32', label: '32' },
                ]}
              />
            )}
            {jobConfig.config.process[0].network?.type == 'lora' && (
              <>
                <NumberInput
                  label={t("Linear Rank")}
                  value={jobConfig.config.process[0].network.linear}
                  onChange={value => {
                    console.log('onChange', value);
                    setJobConfig(value, 'config.process[0].network.linear');
                    setJobConfig(value, 'config.process[0].network.linear_alpha');
                  }}
                  placeholder="eg. 16"
                  min={0}
                  max={1024}
                  required
                />
                {disableSections.includes('network.conv') ? null : (
                  <NumberInput
                    label={t("Conv Rank")}
                    value={jobConfig.config.process[0].network.conv}
                    onChange={value => {
                      console.log('onChange', value);
                      setJobConfig(value, 'config.process[0].network.conv');
                      setJobConfig(value, 'config.process[0].network.conv_alpha');
                    }}
                    placeholder="eg. 16"
                    min={0}
                    max={1024}
                  />
                )}
              </>
            )}
          </Card>
          {!disableSections.includes('slider') && (
            <Card title={t("Slider")}>
              <TextInput
                label={t("Target Class")}
                className=""
                value={jobConfig.config.process[0].slider?.target_class ?? ''}
                onChange={value => setJobConfig(value, 'config.process[0].slider.target_class')}
                placeholder="eg. person"
              />
              <TextInput
                label={t("Positive Prompt")}
                className=""
                value={jobConfig.config.process[0].slider?.positive_prompt ?? ''}
                onChange={value => setJobConfig(value, 'config.process[0].slider.positive_prompt')}
                placeholder="eg. person who is happy"
              />
              <TextInput
                label={t("Negative Prompt")}
                className=""
                value={jobConfig.config.process[0].slider?.negative_prompt ?? ''}
                onChange={value => setJobConfig(value, 'config.process[0].slider.negative_prompt')}
                placeholder="eg. person who is sad"
              />
              <TextInput
                label={t("Anchor Class")}
                className=""
                value={jobConfig.config.process[0].slider?.anchor_class ?? ''}
                onChange={value => setJobConfig(value, 'config.process[0].slider.anchor_class')}
                placeholder=""
              />
            </Card>
          )}
          <Card title={t("Save")}>
            <SelectInput
              label={t("Data Type")}
              value={jobConfig.config.process[0].save.dtype}
              onChange={value => setJobConfig(value, 'config.process[0].save.dtype')}
              options={[
                { value: 'bf16', label: 'BF16' },
                { value: 'fp16', label: 'FP16' },
                { value: 'fp32', label: 'FP32' },
              ]}
            />
            <NumberInput
              label={t("Save Every")}
              value={jobConfig.config.process[0].save.save_every}
              onChange={value => setJobConfig(value, 'config.process[0].save.save_every')}
              placeholder="eg. 250"
              min={1}
              required
            />
            <NumberInput
              label={t("Max Step Saves to Keep")}
              value={jobConfig.config.process[0].save.max_step_saves_to_keep}
              onChange={value => setJobConfig(value, 'config.process[0].save.max_step_saves_to_keep')}
              placeholder="eg. 4"
              min={1}
              required
            />
          </Card>
        </div>
        <div>
          <Card title={t("Training")}>
            <div className={trainingBarClass}>
              <div>
                <NumberInput
                  label={t("Batch Size")}
                  docKey="train.batch_size"
                  value={jobConfig.config.process[0].train.batch_size}
                  onChange={value => setJobConfig(value, 'config.process[0].train.batch_size')}
                  placeholder="eg. 4"
                  min={1}
                  required
                />
                <NumberInput
                  label={t("Gradient Accumulation")}
                  docKey="train.gradient_accumulation"
                  className="pt-2"
                  value={jobConfig.config.process[0].train.gradient_accumulation}
                  onChange={value => setJobConfig(value, 'config.process[0].train.gradient_accumulation')}
                  placeholder="eg. 1"
                  min={1}
                  required
                />
                <NumberInput
                  label={t("Steps")}
                  docKey="train.steps"
                  className="pt-2"
                  value={jobConfig.config.process[0].train.steps}
                  onChange={value => setJobConfig(value, 'config.process[0].train.steps')}
                  placeholder="eg. 2000"
                  min={1}
                  required
                />
              </div>
              <div>
                <SelectInput
                  label={t("Optimizer")}
                  docKey="train.optimizer"
                  value={jobConfig.config.process[0].train.optimizer}
                  onChange={value => setJobConfig(value, 'config.process[0].train.optimizer')}
                  options={[
                    { value: 'adafactor', label: 'Adafactor' },
                    { value: 'adam', label: 'Adam' },
                    { value: 'adamw', label: 'AdamW' },
                    { value: 'adamw8bit', label: 'AdamW8Bit' },
                    { value: 'automagic', label: 'Automagic' },
                    { value: 'automagic2', label: 'Automagic v2' },
                    { value: 'automagic3', label: 'Automagic v3' },
                    { value: 'automagic4', label: 'Automagic v4' },
                    { value: 'prodigyopt', label: 'Prodigy' },
                    { value: 'prodigy8bit', label: 'Prodigy8Bit' },
                  ]}
                />
                <NumberInput
                  label={t("Learning Rate")}
                  docKey="train.lr"
                  className="pt-2"
                  value={jobConfig.config.process[0].train.lr}
                  onChange={value => setJobConfig(value, 'config.process[0].train.lr')}
                  placeholder="eg. 0.0001"
                  min={0}
                  required
                />
                <NumberInput
                  label={t("Weight Decay")}
                  docKey="train.optimizer_params.weight_decay"
                  className="pt-2"
                  value={jobConfig.config.process[0].train.optimizer_params.weight_decay}
                  onChange={value => setJobConfig(value, 'config.process[0].train.optimizer_params.weight_decay')}
                  placeholder="eg. 0.0001"
                  min={0}
                  required
                />
              </div>
              {!isLlmModel && (
                <div>
                  {disableSections.includes('train.timestep_type') ? null : (
                    <SelectInput
                      label={t("Timestep Type")}
                  docKey="train.timestep_type"
                      value={jobConfig.config.process[0].train.timestep_type}
                      disabled={disableSections.includes('train.timestep_type') || false}
                      onChange={value => setJobConfig(value, 'config.process[0].train.timestep_type')}
                      options={[
                        { value: 'sigmoid', label: 'Sigmoid' },
                        { value: 'linear', label: 'Linear' },
                        { value: 'shift', label: 'Shift' },
                        { value: 'weighted', label: 'Weighted' },
                      ]}
                    />
                  )}
                  <SelectInput
                    label={t("Timestep Bias")}
                  docKey="train.content_or_style"
                    className="pt-2"
                    value={jobConfig.config.process[0].train.content_or_style}
                    onChange={value => setJobConfig(value, 'config.process[0].train.content_or_style')}
                    options={[
                      { value: 'balanced', label: 'Balanced' },
                      { value: 'content', label: 'High Noise' },
                      { value: 'style', label: 'Low Noise' },
                    ]}
                  />
                  <SelectInput
                    label={t("Loss Type")}
                  docKey="train.loss_type"
                    className="pt-2"
                    value={jobConfig.config.process[0].train.loss_type}
                    onChange={value => setJobConfig(value, 'config.process[0].train.loss_type')}
                    options={[
                      { value: 'mse', label: 'Mean Squared Error' },
                      { value: 'mae', label: 'Mean Absolute Error' },
                      { value: 'wavelet', label: 'Wavelet' },
                      { value: 'stepped', label: 'Stepped Recovery' },
                    ]}
                  />
                  {modelArch?.additionalSections?.includes('train.audio_loss_multiplier') && (
                    <NumberInput
                      label={t("Audio Loss Multiplier")}
                      className="pt-2"
                      value={jobConfig.config.process[0].train.audio_loss_multiplier ?? 1.0}
                      onChange={value => setJobConfig(value, 'config.process[0].train.audio_loss_multiplier')}
                      placeholder="eg. 1.0"
                      docKey={'train.audio_loss_multiplier'}
                      min={0}
                    />
                  )}
                </div>
              )}
              <div>
                <FormGroup label={t("EMA (Exponential Moving Average)")}>
                  <Checkbox
                    label={t("Use EMA")}
                  docKey="train.ema_config.use_ema"
                    className="pt-1"
                    checked={jobConfig.config.process[0].train.ema_config?.use_ema || false}
                    onChange={value => setJobConfig(value, 'config.process[0].train.ema_config.use_ema')}
                  />
                </FormGroup>
                {jobConfig.config.process[0].train.ema_config?.use_ema && (
                  <NumberInput
                    label={t("EMA Decay")}
                  docKey="train.ema_config.ema_decay"
                    className="pt-2"
                    value={jobConfig.config.process[0].train.ema_config?.ema_decay as number}
                    onChange={value => setJobConfig(value, 'config.process[0].train.ema_config.ema_decay')}
                    placeholder="eg. 0.99"
                    min={0}
                  />
                )}

                {!isLlmModel && (
                  <FormGroup label={t("Text Encoder Optimizations")} className="pt-2">
                    {!disableSections.includes('train.unload_text_encoder') && (
                      <Checkbox
                        label={t("Unload TE")}
                        checked={jobConfig.config.process[0].train.unload_text_encoder || false}
                        docKey={'train.unload_text_encoder'}
                        onChange={value => {
                          setJobConfig(value, 'config.process[0].train.unload_text_encoder');
                          if (value) {
                            setJobConfig(false, 'config.process[0].train.cache_text_embeddings');
                          }
                        }}
                      />
                    )}
                    <Checkbox
                      label={t("Cache Text Embeddings")}
                      checked={jobConfig.config.process[0].train.cache_text_embeddings || false}
                      docKey={'train.cache_text_embeddings'}
                      onChange={value => {
                        setJobConfig(value, 'config.process[0].train.cache_text_embeddings');
                        if (value) {
                          setJobConfig(false, 'config.process[0].train.unload_text_encoder');
                        }
                      }}
                    />
                  </FormGroup>
                )}
              </div>
              <div>
                {disableSections.includes('train.diff_output_preservation') ||
                disableSections.includes('train.blank_prompt_preservation') ? null : (
                  <FormGroup label={t("Regularization")}>
                    <></>
                  </FormGroup>
                )}
                {disableSections.includes('train.diff_output_preservation') ? null : (
                  <>
                    <Checkbox
                      label={t("Differential Output Preservation")}
                      docKey={'train.diff_output_preservation'}
                      className="pt-1"
                      checked={jobConfig.config.process[0].train.diff_output_preservation || false}
                      onChange={value => {
                        setJobConfig(value, 'config.process[0].train.diff_output_preservation');
                        if (value && jobConfig.config.process[0].train.blank_prompt_preservation) {
                          // only one can be enabled at a time
                          setJobConfig(false, 'config.process[0].train.blank_prompt_preservation');
                        }
                      }}
                    />
                    {jobConfig.config.process[0].train.diff_output_preservation && (
                      <>
                        <NumberInput
                          label={t("DOP Loss Multiplier")}
                          className="pt-2"
                          value={jobConfig.config.process[0].train.diff_output_preservation_multiplier as number}
                          onChange={value =>
                            setJobConfig(value, 'config.process[0].train.diff_output_preservation_multiplier')
                          }
                          placeholder="eg. 1.0"
                          min={0}
                        />
                        <TextInput
                          label={t("DOP Preservation Class")}
                          className="pt-2 pb-4"
                          value={jobConfig.config.process[0].train.diff_output_preservation_class as string}
                          onChange={value =>
                            setJobConfig(value, 'config.process[0].train.diff_output_preservation_class')
                          }
                          placeholder="eg. woman"
                        />
                      </>
                    )}
                  </>
                )}
                {disableSections.includes('train.blank_prompt_preservation') ? null : (
                  <>
                    <Checkbox
                      label={t("Blank Prompt Preservation")}
                      docKey={'train.blank_prompt_preservation'}
                      className="pt-1"
                      checked={jobConfig.config.process[0].train.blank_prompt_preservation || false}
                      onChange={value => {
                        setJobConfig(value, 'config.process[0].train.blank_prompt_preservation');
                        if (value && jobConfig.config.process[0].train.diff_output_preservation) {
                          // only one can be enabled at a time
                          setJobConfig(false, 'config.process[0].train.diff_output_preservation');
                        }
                      }}
                    />
                    {jobConfig.config.process[0].train.blank_prompt_preservation && (
                      <>
                        <NumberInput
                          label={t("BPP Loss Multiplier")}
                          className="pt-2"
                          value={
                            (jobConfig.config.process[0].train.blank_prompt_preservation_multiplier as number) || 1.0
                          }
                          onChange={value =>
                            setJobConfig(value, 'config.process[0].train.blank_prompt_preservation_multiplier')
                          }
                          placeholder="eg. 1.0"
                          min={0}
                        />
                      </>
                    )}
                  </>
                )}
                {!isLlmModel && (
                  <FormGroup label={t("Other")} className="pt-2">
                    <>
                      <Checkbox
                        label={t("Contrastive Guidance Loss")}
                        docKey={'train.do_guidance_loss'}
                        className="pt-1"
                        checked={jobConfig.config.process[0].train.do_guidance_loss || false}
                        onChange={value => {
                          if (value) {
                            setJobConfig(true, 'config.process[0].train.do_guidance_loss');
                            if (!jobConfig.config.process[0].train.guidance_loss_target) {
                              setJobConfig(4.0, 'config.process[0].train.guidance_loss_target');
                            }
                          } else {
                            setJobConfig(undefined, 'config.process[0].train.do_guidance_loss');
                            setJobConfig(undefined, 'config.process[0].train.guidance_loss_target');
                          }
                        }}
                      />
                      {jobConfig.config.process[0].train.do_guidance_loss && (
                        <>
                          <NumberInput
                            label={t("Guidance Loss Target")}
                            docKey={'train.guidance_loss_target'}
                            value={(jobConfig.config.process[0].train.guidance_loss_target as number) || 4.0}
                            onChange={value => setJobConfig(value, 'config.process[0].train.guidance_loss_target')}
                            placeholder="eg. 3.0"
                            min={0}
                          />
                        </>
                      )}
                    </>
                  </FormGroup>
                )}
              </div>
            </div>
          </Card>
        </div>
        <div>
          {!isLlmModel && (
            <Card
              title={t("Validation")}
              titleDocKey="train.validation_config"
              toggled={!!validationConfig}
              onToggle={value => {
                if (value) {
                  setJobConfig(
                    {
                      validation_items: [{ image_path: '', prompt: '' }],
                      resolution: 1024,
                      validate_every_n_steps: 1,
                      validation_sigmas: [0.5],
                    },
                    'config.process[0].train.validation_config',
                  );
                } else {
                  setJobConfig(undefined, 'config.process[0].train.validation_config');
                }
              }}
            >
              {validationConfig && (
                <>
                  <p className="text-sm text-gray-400 mb-4"><T text={"Validation runs a stable loss check on a fixed set of images. Each image is encoded once at startup and predicted at the selected sigmas with fixed seeds, so the result is always deterministic and comparable across the run. The average loss is logged as val/loss every time validation runs. The images need to match the concept of your dataset, but"} />{' '}
                    <span className="font-bold text-gray-300"><T text={"do not include the validation images in the dataset"} /></span><T text={". They must be images containing the concept you want to train, but not an image trained on."} /></p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <NumberInput
                      label={t("Validate Every")}
                      value={validationConfig.validate_every_n_steps}
                      onChange={value =>
                        setJobConfig(value, 'config.process[0].train.validation_config.validate_every_n_steps')
                      }
                      placeholder="eg. 10"
                      min={1}
                      required
                    />
                    <NumberInput
                      label={t("Validation Resolution")}
                      value={validationConfig.resolution}
                      onChange={value => setJobConfig(value, 'config.process[0].train.validation_config.resolution')}
                      placeholder="eg. 512"
                      min={64}
                      required
                    />
                    <SelectInput
                      label={t("Validation Sigmas")}
                      value={(validationConfig.validation_sigmas ?? [1.0, 0.75, 0.5, 0.25]).join(', ')}
                      onChange={value =>
                        setJobConfig(
                          value.split(',').map((v: string) => parseFloat(v)),
                          'config.process[0].train.validation_config.validation_sigmas',
                        )
                      }
                      options={[
                        { value: '0.5', label: '0.5' },
                        { value: '1, 0.5', label: '1.0, 0.5' },
                        { value: '1, 0.66, 0.33', label: '1.0, 0.66, 0.33' },
                        { value: '1, 0.75, 0.5, 0.25', label: '1.0, 0.75, 0.5, 0.25' },
                      ]}
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-xs text-gray-300 mb-2"><T text={"Validation Images ("} />{validationConfig.validation_items.length})
                    </label>
                    {validationConfig.validation_items.map((item, i) => (
                      <div key={i} className="rounded-lg pl-4 pr-1 py-3 mb-4 bg-gray-950">
                        <div className="flex items-center space-x-4">
                          <SampleControlImage
                            instruction={t("Add Image")}
                            src={item.image_path === '' ? null : item.image_path}
                            onNewImageSelected={imagePath => {
                              setJobConfig(
                                imagePath ?? '',
                                `config.process[0].train.validation_config.validation_items[${i}].image_path`,
                              );
                            }}
                          />
                          <div className="flex-1">
                            <TextInput
                              label={t("Prompt")}
                              value={item.prompt}
                              onChange={value =>
                                setJobConfig(
                                  value,
                                  `config.process[0].train.validation_config.validation_items[${i}].prompt`,
                                )
                              }
                              placeholder={t("Enter prompt")}
                            />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setJobConfig(
                                  validationConfig.validation_items.filter((_, index) => index !== i),
                                  'config.process[0].train.validation_config.validation_items',
                                )
                              }
                              className="rounded-full p-1 text-sm"
                            >
                              <X />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setJobConfig(
                          [...validationConfig.validation_items, { image_path: '', prompt: '' }],
                          'config.process[0].train.validation_config.validation_items',
                        )
                      }
                      className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    ><T text={"Add Validation Image"} /></button>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
        <div>
          {!isLlmModel && (
            <Card title={t("Advanced")} collapsible>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <Checkbox
                    label={t("Do Differential Guidance")}
                    docKey={'train.do_differential_guidance'}
                    className="pt-1"
                    checked={jobConfig.config.process[0].train.do_differential_guidance || false}
                    onChange={value => {
                      let newValue = value == false ? undefined : value;
                      setJobConfig(newValue, 'config.process[0].train.do_differential_guidance');
                      if (!newValue) {
                        setJobConfig(undefined, 'config.process[0].train.differential_guidance_scale');
                      } else if (
                        jobConfig.config.process[0].train.differential_guidance_scale === undefined ||
                        jobConfig.config.process[0].train.differential_guidance_scale === null
                      ) {
                        // set default differential guidance scale to 3.0
                        setJobConfig(3.0, 'config.process[0].train.differential_guidance_scale');
                      }
                    }}
                  />
                  {jobConfig.config.process[0].train.differential_guidance_scale && (
                    <>
                      <NumberInput
                        label={t("Differential Guidance Scale")}
                        className="pt-2"
                        value={(jobConfig.config.process[0].train.differential_guidance_scale as number) || 3.0}
                        onChange={value => setJobConfig(value, 'config.process[0].train.differential_guidance_scale')}
                        placeholder="eg. 3.0"
                        min={0}
                      />
                    </>
                  )}
                </div>
                <div>
                  <Checkbox
                    label={t("Pool Datasets")}
                    docKey={'train.pool_datasets'}
                    className="pt-1"
                    checked={jobConfig.config.process[0].train.pool_datasets || false}
                    onChange={value => {
                      setJobConfig(value ? true : undefined, 'config.process[0].train.pool_datasets');
                    }}
                  />
                </div>
              </div>
            </Card>
          )}
        </div>
        <div>
          <Card title={t("Datasets")}>
            <>
              {jobConfig.config.process[0].datasets.map((dataset, i) => (
                <div key={i} className="p-4 rounded-lg bg-gray-800 relative">
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const duplicated = objectCopy(dataset);
                        const datasets = [...jobConfig.config.process[0].datasets];
                        datasets.splice(i + 1, 0, duplicated);
                        setJobConfig(datasets, 'config.process[0].datasets');
                      }}
                      className="bg-gray-700 hover:bg-gray-600 rounded-full p-2 text-sm transition-colors"
                      title={t("Duplicate Dataset")}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setJobConfig(
                          jobConfig.config.process[0].datasets.filter((_, index) => index !== i),
                          'config.process[0].datasets',
                        )
                      }
                      className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2 text-sm transition-colors"
                      title={t("Remove Dataset")}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <h2 className="text-lg font-bold mb-4"><T text={"Dataset"} /> {i + 1}</h2>
                  <div className={datasetStyleClass}>
                    <div>
                      {['minimax_h3_image', 'flux3'].includes(jobConfig.config.process[0].model.arch) && (
                        <DatasetReferenceInputs dataset={dataset} options={datasetOptions} onChange={next => setJobConfig(next, `config.process[0].datasets[${i}]`)} />
                      )}
                      {!['minimax_h3_image', 'flux3'].includes(jobConfig.config.process[0].model.arch) && (
                        <SelectInput label={t("Target Dataset")} value={dataset.folder_path}
                          onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].folder_path`)} options={datasetOptions} />
                      )}
                      {modelArch?.additionalSections?.includes('datasets.control_path') && (
                        <SelectInput
                          label={t("Control Dataset")}
                          docKey="datasets.control_path"
                          value={typeof dataset.control_path === 'string' ? dataset.control_path : ''}
                          className="pt-2"
                          onChange={value =>
                            setJobConfig(value == '' ? null : value, `config.process[0].datasets[${i}].control_path`)
                          }
                          options={[{ value: '', label: <>&nbsp;</> }, ...datasetOptions]}
                        />
                      )}
                      {!['minimax_h3_image', 'flux3'].includes(jobConfig.config.process[0].model.arch) && modelArch?.additionalSections?.includes('datasets.multi_control_paths') && (
                        <>
                          <SelectInput
                            label={t("Control Dataset 1")}
                            docKey="datasets.multi_control_paths"
                            value={dataset.control_path_1 ?? ''}
                            className="pt-2"
                            onChange={value =>
                              setJobConfig(
                                value == '' ? null : value,
                                `config.process[0].datasets[${i}].control_path_1`,
                              )
                            }
                            options={[{ value: '', label: <>&nbsp;</> }, ...datasetOptions]}
                          />
                          <SelectInput
                            label={t("Control Dataset 2")}
                            docKey="datasets.multi_control_paths"
                            value={dataset.control_path_2 ?? ''}
                            className="pt-2"
                            onChange={value =>
                              setJobConfig(
                                value == '' ? null : value,
                                `config.process[0].datasets[${i}].control_path_2`,
                              )
                            }
                            options={[{ value: '', label: <>&nbsp;</> }, ...datasetOptions]}
                          />
                          <SelectInput
                            label={t("Control Dataset 3")}
                            docKey="datasets.multi_control_paths"
                            value={dataset.control_path_3 ?? ''}
                            className="pt-2"
                            onChange={value =>
                              setJobConfig(
                                value == '' ? null : value,
                                `config.process[0].datasets[${i}].control_path_3`,
                              )
                            }
                            options={[{ value: '', label: <>&nbsp;</> }, ...datasetOptions]}
                          />
                        </>
                      )}
                      <NumberInput
                        label={t("LoRA Weight")}
                        value={dataset.network_weight}
                        className="pt-2"
                        onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].network_weight`)}
                        placeholder="eg. 1.0"
                      />
                      <NumberInput
                        label={t("Num Repeats")}
                        value={dataset.num_repeats || 1}
                        className="pt-2"
                        onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].num_repeats`)}
                        placeholder="eg. 1"
                        docKey={'dataset.num_repeats'}
                      />
                      <NumberInput
                        label={t("Batch Size")}
                        value={dataset.batch_size ?? null}
                        className="pt-2"
                        onChange={value =>
                          setJobConfig(value == null ? undefined : value, `config.process[0].datasets[${i}].batch_size`)
                        }
                        placeholder={`${jobConfig.config.process[0].train.batch_size}`}
                        min={1}
                        allowEmpty
                      />
                    </div>
                    <div>
                      <TextInput
                        label={t("Default Caption")}
                        value={dataset.default_caption}
                        onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].default_caption`)}
                        placeholder="eg. A photo of a cat"
                      />
                      <NumberInput
                        label={t("Caption Dropout Rate")}
                        className="pt-2"
                        docKey="datasets.caption_dropout_rate"
                        value={dataset.caption_dropout_rate}
                        onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].caption_dropout_rate`)}
                        placeholder="eg. 0.05"
                        min={0}
                        required
                      />
                      <CreatableSelectInput
                        label={t("Caption Extension")}
                        className="pt-2"
                        value={dataset.caption_ext || 'txt'}
                        onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].caption_ext`)}
                        options={[
                          { value: 'txt', label: 'txt' },
                          { value: 'json', label: 'json' },
                          { value: 'caption', label: 'caption' },
                        ]}
                      />

                      {modelArch?.additionalSections?.includes('datasets.num_frames') && !dataset.auto_frame_count && (
                        <NumberInput
                          label={t("Num Frames")}
                          className="pt-2"
                          docKey="datasets.num_frames"
                          value={dataset.num_frames}
                          onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].num_frames`)}
                          placeholder="eg. 41"
                          min={1}
                          required
                        />
                      )}
                    </div>
                    <div>
                      <FormGroup label={t("Settings")} className="">
                        <Checkbox
                          label={t("Cache Latents")}
                          docKey="datasets.cache_latents_to_disk"
                          checked={dataset.cache_latents_to_disk || false}
                          onChange={value =>
                            setJobConfig(value, `config.process[0].datasets[${i}].cache_latents_to_disk`)
                          }
                        />
                        <Checkbox
                          label={t("Is Regularization")}
                          docKey="datasets.is_reg"
                          checked={dataset.is_reg || false}
                          onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].is_reg`)}
                        />
                        {modelArch?.additionalSections?.includes('datasets.auto_frame_count') && (
                          <Checkbox
                            label={t("Auto Frame Count")}
                            checked={dataset.auto_frame_count || false}
                            onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].auto_frame_count`)}
                            docKey="datasets.auto_frame_count"
                          />
                        )}
                        {modelArch?.additionalSections?.includes('datasets.do_i2v') && (
                          <Checkbox
                            label={t("Do I2V")}
                            checked={dataset.do_i2v || false}
                            onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].do_i2v`)}
                            docKey="datasets.do_i2v"
                          />
                        )}
                        {modelArch?.additionalSections?.includes('datasets.do_audio') && (
                          <Checkbox
                            label={t("Do Audio")}
                            checked={dataset.do_audio || false}
                            onChange={value => {
                              if (!value) {
                                setJobConfig(undefined, `config.process[0].datasets[${i}].do_audio`);
                              } else {
                                setJobConfig(value, `config.process[0].datasets[${i}].do_audio`);
                              }
                            }}
                            docKey="datasets.do_audio"
                          />
                        )}
                        {modelArch?.additionalSections?.includes('datasets.audio_normalize') && (
                          <Checkbox
                            label={t("Audio Normalize")}
                            checked={dataset.audio_normalize || false}
                            onChange={value => {
                              if (!value) {
                                setJobConfig(undefined, `config.process[0].datasets[${i}].audio_normalize`);
                              } else {
                                setJobConfig(value, `config.process[0].datasets[${i}].audio_normalize`);
                              }
                            }}
                            docKey="datasets.audio_normalize"
                          />
                        )}
                        {modelArch?.additionalSections?.includes('datasets.audio_preserve_pitch') && (
                          <Checkbox
                            label={t("Audio Preserve Pitch")}
                            checked={dataset.audio_preserve_pitch || false}
                            onChange={value => {
                              if (!value) {
                                setJobConfig(undefined, `config.process[0].datasets[${i}].audio_preserve_pitch`);
                              } else {
                                setJobConfig(value, `config.process[0].datasets[${i}].audio_preserve_pitch`);
                              }
                            }}
                            docKey="datasets.audio_preserve_pitch"
                          />
                        )}
                      </FormGroup>
                      {!isAudioModel && !isLlmModel && (
                        <FormGroup label={t("Flipping")} docKey={'datasets.flip'} className="mt-2">
                          <Checkbox
                            label={
                              <><T text={"Flip X"} /> <FlipHorizontal2 className="inline-block w-4 h-4 ml-1" />
                              </>
                            }
                            checked={dataset.flip_x || false}
                            onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].flip_x`)}
                          />
                          <Checkbox
                            label={
                              <><T text={"Flip Y"} /> <FlipVertical2 className="inline-block w-4 h-4 ml-1" />
                              </>
                            }
                            checked={dataset.flip_y || false}
                            onChange={value => setJobConfig(value, `config.process[0].datasets[${i}].flip_y`)}
                          />
                        </FormGroup>
                      )}
                    </div>
                    {!isAudioModel && (
                      <div>
                        <FormGroup label={t("Resolutions")} className="pt-2">
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                            {[256, 512, 768, 1024, 1280, 1328, 1536, 2048, 2560, 3072, 3584, 4096].map(res => (
                              <Checkbox
                                key={res}
                                label={res.toString()}
                                checked={dataset.resolution.includes(res)}
                                onChange={value => {
                                  const resolutions = value
                                    ? [...new Set([...dataset.resolution, res])].sort((a, b) => a - b)
                                    : dataset.resolution.filter(r => r !== res);
                                  setJobConfig(resolutions, `config.process[0].datasets[${i}].resolution`);
                                }}
                              />
                            ))}
                          </div>
                          <details className="text-xs text-gray-500 mt-2">
                            <summary className="cursor-pointer"><T text={"Resolution notes"} /></summary>
                            <p className="mt-1"><T text={"4096 is the 4K bucket base resolution. Bucket dimensions follow the original aspect ratio; smaller images are not forcibly upscaled."} /></p>
                          </details>
                        </FormGroup>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newDataset = objectCopy(defaultDatasetConfig);
                  // automaticallt add the controls for a new dataset
                  const controls = modelArch?.controls ?? [];
                  newDataset.controls = controls;
                  // arch dataset defaults (datasets[x].*) apply to added datasets too, not just at arch switch
                  for (const key in modelArch?.defaults ?? {}) {
                    const marker = 'datasets[x].';
                    const idx = key.indexOf(marker);
                    if (idx !== -1) {
                      (newDataset as any)[key.slice(idx + marker.length)] = modelArch!.defaults![key][0];
                    }
                  }
                  setJobConfig([...jobConfig.config.process[0].datasets, newDataset], 'config.process[0].datasets');
                }}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              ><T text={"Add Dataset"} /></button>
            </>
          </Card>
        </div>
        <div>
          <Card title={t("Sample")}>
            <div className={sampleTopStyleClass}>
              <div>
                <NumberInput
                  label={t("Sample Every")}
                  value={jobConfig.config.process[0].sample.sample_every}
                  onChange={value => setJobConfig(value, 'config.process[0].sample.sample_every')}
                  placeholder="eg. 250"
                  min={1}
                  required
                />
                <NumberInput
                  label={t("Sample Start Step")}
                  value={jobConfig.config.process[0].sample.sample_start_step ?? 0}
                  onChange={value => setJobConfig(value, 'config.process[0].sample.sample_start_step')}
                  placeholder="eg. 0"
                  className="pt-2"
                  min={0}
                  required
                />
                {!isLlmModel && (
                  <>
                    <SelectInput
                      label={t("Sampler")}
                      className="pt-2"
                      value={jobConfig.config.process[0].sample.sampler}
                      onChange={value => setJobConfig(value, 'config.process[0].sample.sampler')}
                      options={[
                        { value: 'flowmatch', label: 'FlowMatch' },
                        { value: 'ddpm', label: 'DDPM' },
                      ]}
                    />
                    <NumberInput
                      label={t("Guidance Scale")}
                      value={jobConfig.config.process[0].sample.guidance_scale}
                      onChange={value => setJobConfig(value, 'config.process[0].sample.guidance_scale')}
                      placeholder="eg. 1.0"
                      className="pt-2"
                      min={0}
                      required
                    />
                    <NumberInput
                      label={t("Sample Steps")}
                      value={jobConfig.config.process[0].sample.sample_steps}
                      onChange={value => setJobConfig(value, 'config.process[0].sample.sample_steps')}
                      placeholder="eg. 1"
                      className="pt-2"
                      min={1}
                      required
                    />
                  </>
                )}
              </div>

              {!isAudioModel && !isLlmModel && (
                <div>
                  <NumberInput
                    label={t("Width")}
                    value={jobConfig.config.process[0].sample.width}
                    onChange={value => setJobConfig(value, 'config.process[0].sample.width')}
                    placeholder="eg. 1024"
                    min={0}
                    required
                  />
                  <NumberInput
                    label={t("Height")}
                    value={jobConfig.config.process[0].sample.height}
                    onChange={value => setJobConfig(value, 'config.process[0].sample.height')}
                    placeholder="eg. 1024"
                    className="pt-2"
                    min={0}
                    required
                  />
                  {isVideoModel && (
                    <div>
                      <NumberInput
                        label={t("Num Frames")}
                        value={jobConfig.config.process[0].sample.num_frames}
                        onChange={value => setJobConfig(value, 'config.process[0].sample.num_frames')}
                        placeholder="eg. 0"
                        className="pt-2"
                        min={0}
                        required
                      />
                      <NumberInput
                        label={t("FPS")}
                        value={jobConfig.config.process[0].sample.fps}
                        onChange={value => setJobConfig(value, 'config.process[0].sample.fps')}
                        placeholder="eg. 0"
                        className="pt-2"
                        min={0}
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {!isLlmModel && (
                <div>
                  <NumberInput
                    label={t("Seed")}
                    value={jobConfig.config.process[0].sample.seed}
                    onChange={value => setJobConfig(value, 'config.process[0].sample.seed')}
                    placeholder="eg. 0"
                    min={0}
                    required
                  />
                  {modelArch?.additionalSections?.includes('sample.duration') && (
                    <NumberInput
                      label={t("Duration (seconds)")}
                      value={jobConfig.config.process[0].sample.duration ?? 120}
                      onChange={value => setJobConfig(value, 'config.process[0].sample.duration')}
                      placeholder="eg. 120"
                      className="pt-2"
                      min={1}
                      required
                    />
                  )}
                  <Checkbox
                    label={t("Walk Seed")}
                    className="pt-4 pl-2"
                    checked={jobConfig.config.process[0].sample.walk_seed}
                    onChange={value => setJobConfig(value, 'config.process[0].sample.walk_seed')}
                  />
                </div>
              )}
              <div>
                <FormGroup label={t("Advanced Sampling")} className="pt-2">
                  <div>
                    <Checkbox
                      label={t("Skip First Sample")}
                      className="pt-4"
                      checked={jobConfig.config.process[0].train.skip_first_sample || false}
                      onChange={value => {
                        setJobConfig(value, 'config.process[0].train.skip_first_sample');
                        // cannot do both, so disable the other
                        if (value) {
                          setJobConfig(false, 'config.process[0].train.force_first_sample');
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Checkbox
                      label={t("Force First Sample")}
                      className="pt-1"
                      checked={jobConfig.config.process[0].train.force_first_sample || false}
                      docKey={'train.force_first_sample'}
                      onChange={value => {
                        setJobConfig(value, 'config.process[0].train.force_first_sample');
                        // cannot do both, so disable the other
                        if (value) {
                          setJobConfig(false, 'config.process[0].train.skip_first_sample');
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Checkbox
                      label={t("Disable Sampling")}
                      className="pt-1"
                      checked={jobConfig.config.process[0].train.disable_sampling || false}
                      onChange={value => {
                        setJobConfig(value, 'config.process[0].train.disable_sampling');
                        // cannot do both, so disable the other
                        if (value) {
                          setJobConfig(false, 'config.process[0].train.force_first_sample');
                        }
                      }}
                    />
                  </div>
                </FormGroup>
              </div>
            </div>
            <div className="relative pt-2 mb-2 flex flex-wrap gap-2 items-center justify-between">
              <label className="block text-xs text-gray-300"><T text={"Sample Prompts ("} />{jobConfig.config.process[0].sample.samples.length})
              </label>
              {['minimax_h3_image', 'flux3'].includes(jobConfig.config.process[0].model.arch) && (
                <div className="mx-auto sm:absolute sm:left-1/2 sm:-translate-x-1/2">
                  <SamplePreviewDialog config={jobConfig.config.process[0].sample} onChange={samples => setJobConfig(samples, 'config.process[0].sample.samples')} />
                </div>
              )}
              {modelArch?.additionalSections?.includes('ideogram_4_prompt') && (
                <button
                  type="button"
                  disabled={jobConfig.config.process[0].sample.samples.length === 0}
                  onClick={() => {
                    const sampleCfg = jobConfig.config.process[0].sample;
                    const items = sampleCfg.samples
                      .map((s, i) => ({
                        index: i,
                        prompt: s.prompt || '',
                        aspectRatio: toAspectRatio(s.width || sampleCfg.width, s.height || sampleCfg.height),
                      }))
                      .filter(it => it.prompt.trim() !== '');
                    if (items.length === 0) return;
                    openUpsamplePromptsModal(items, (index, newPrompt) => {
                      setJobConfig(newPrompt, `config.process[0].sample.samples[${index}].prompt`);
                    });
                  }}
                  className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md inline-flex items-center gap-2"
                >
                  <Wand2 className="w-4 h-4" /><T text={"Upsample Prompts"} /></button>
              )}
            </div>
            {jobConfig.config.process[0].sample.samples.map((sample, i) => (
              <div key={i} className="rounded-lg pl-4 pr-1 mb-4 bg-gray-950">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col xl:flex-row gap-4">
                      <div className="flex-1 min-w-0">
                        {modelArch?.sampleTags && taggedSampleArr && modelArchTagSections ? (
                          <>
                            {modelArchTagSections.map((sampleTagSection, sti) => (
                              <div key={sti} className="grid w-full lg:grid-flow-col lg:auto-cols-fr gap-4 mt-2">
                                {Object.entries(sampleTagSection).map(([tagKey, tag]) => (
                                  <div key={tagKey} className="mb-2">
                                    {tag.type === 'text' && (
                                      <TextInput
                                        label={tag.title}
                                        value={taggedSampleArr[i][tagKey] ?? ''}
                                        onChange={value => {
                                          let taggedSample = { ...taggedSampleArr[i] };
                                          taggedSample[tagKey] = value;
                                          setJobConfig(
                                            objToTags(taggedSample),
                                            `config.process[0].sample.samples[${i}].prompt`,
                                          );
                                        }}
                                        placeholder={`Enter ${tag.title.toLowerCase()}`}
                                      />
                                    )}
                                    {tag.type === 'multiline' && (
                                      <TextAreaInput
                                        label={tag.title}
                                        value={taggedSampleArr[i][tagKey] ?? ''}
                                        onChange={value => {
                                          let taggedSample = { ...taggedSampleArr[i] };
                                          taggedSample[tagKey] = value;
                                          setJobConfig(
                                            objToTags(taggedSample),
                                            `config.process[0].sample.samples[${i}].prompt`,
                                          );
                                        }}
                                        placeholder={`Enter ${tag.title.toLowerCase()}`}
                                      />
                                    )}
                                    {tag.type === 'number' && (
                                      <NumberInput
                                        label={tag.title}
                                        value={taggedSampleArr[i][tagKey] ?? ''}
                                        onChange={value => {
                                          let taggedSample = { ...taggedSampleArr[i] };
                                          taggedSample[tagKey] = value;
                                          setJobConfig(
                                            objToTags(taggedSample),
                                            `config.process[0].sample.samples[${i}].prompt`,
                                          );
                                        }}
                                        placeholder={`Enter ${tag.title.toLowerCase()}`}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </>
                        ) : (
                          <>
                            {modelArch?.hasMultiLinePrompts ? (
                              <TextAreaInput
                                label={`Prompt`}
                                value={sample.prompt}
                                onChange={value => setJobConfig(value, `config.process[0].sample.samples[${i}].prompt`)}
                                placeholder={t("Enter prompt")}
                                required
                              />
                            ) : (
                              <TextInput
                                label={`Prompt`}
                                value={sample.prompt}
                                onChange={value => setJobConfig(value, `config.process[0].sample.samples[${i}].prompt`)}
                                placeholder={isLlmModel ? 'blank = LLM Prompt' : 'Enter prompt'}
                                required={!isLlmModel}
                              />
                            )}
                          </>
                        )}

                        {modelArch?.additionalSections?.includes('ideogram_4_prompt') && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                const sampleCfg = jobConfig.config.process[0].sample;
                                openPromptBoxEditor({
                                  prompt: sample.prompt || '',
                                  aspectRatio: toAspectRatio(
                                    sample.width || sampleCfg.width,
                                    sample.height || sampleCfg.height,
                                  ),
                                  title: `Prompt #${i + 1}`,
                                  onApply: newPrompt =>
                                    setJobConfig(newPrompt, `config.process[0].sample.samples[${i}].prompt`),
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
                            >
                              <SquareDashed className="w-3.5 h-3.5" /><T text={"Edit caption & boxes"} /></button>
                          </div>
                        )}

                        <div className="grid w-full lg:grid-flow-col lg:auto-cols-fr gap-4 mt-2">
                          {!isAudioModel && !isLlmModel && (
                            <TextInput
                              label={`Width`}
                              value={sample.width ? `${sample.width}` : ''}
                              onChange={value => {
                                // remove any non-numeric characters
                                value = value.replace(/\D/g, '');
                                if (value === '') {
                                  // remove the key from the config if empty
                                  let newConfig = objectCopy(jobConfig);
                                  if (newConfig.config.process[0].sample.samples[i]) {
                                    delete newConfig.config.process[0].sample.samples[i].width;
                                    setJobConfig(
                                      newConfig.config.process[0].sample.samples,
                                      'config.process[0].sample.samples',
                                    );
                                  }
                                } else {
                                  const intValue = parseInt(value);
                                  if (!isNaN(intValue)) {
                                    setJobConfig(intValue, `config.process[0].sample.samples[${i}].width`);
                                  } else {
                                    console.warn('Invalid width value:', value);
                                  }
                                }
                              }}
                              placeholder={t('{value} (default)', { value: jobConfig.config.process[0].sample.width })}
                            />
                          )}
                          {!isAudioModel && !isLlmModel && (
                            <TextInput
                              label={`Height`}
                              value={sample.height ? `${sample.height}` : ''}
                              onChange={value => {
                                // remove any non-numeric characters
                                value = value.replace(/\D/g, '');
                                if (value === '') {
                                  // remove the key from the config if empty
                                  let newConfig = objectCopy(jobConfig);
                                  if (newConfig.config.process[0].sample.samples[i]) {
                                    delete newConfig.config.process[0].sample.samples[i].height;
                                    setJobConfig(
                                      newConfig.config.process[0].sample.samples,
                                      'config.process[0].sample.samples',
                                    );
                                  }
                                } else {
                                  const intValue = parseInt(value);
                                  if (!isNaN(intValue)) {
                                    setJobConfig(intValue, `config.process[0].sample.samples[${i}].height`);
                                  } else {
                                    console.warn('Invalid height value:', value);
                                  }
                                }
                              }}
                              placeholder={t('{value} (default)', { value: jobConfig.config.process[0].sample.height })}
                            />
                          )}
                          {!isLlmModel && (
                            <TextInput
                              label={`Seed`}
                              value={sample.seed !== undefined ? `${sample.seed}` : ''}
                              onChange={value => {
                                // remove any non-numeric characters
                                value = value.replace(/\D/g, '');
                                if (value === '') {
                                  // remove the key from the config if empty
                                  let newConfig = objectCopy(jobConfig);
                                  if (newConfig.config.process[0].sample.samples[i]) {
                                    delete newConfig.config.process[0].sample.samples[i].seed;
                                    setJobConfig(
                                      newConfig.config.process[0].sample.samples,
                                      'config.process[0].sample.samples',
                                    );
                                  }
                                } else {
                                  const intValue = parseInt(value);
                                  if (!isNaN(intValue)) {
                                    setJobConfig(intValue, `config.process[0].sample.samples[${i}].seed`);
                                  } else {
                                    console.warn('Invalid seed value:', value);
                                  }
                                }
                              }}
                              placeholder={t('{value} (default)', { value: jobConfig.config.process[0].sample.walk_seed ? jobConfig.config.process[0].sample.seed + i : jobConfig.config.process[0].sample.seed })}
                            />
                          )}
                          <TextInput
                            label={`LoRA Scale`}
                            value={sample.network_multiplier !== undefined ? `${sample.network_multiplier}` : ''}
                            onChange={value => {
                              // remove any non-numeric, - or . characters
                              value = value.replace(/[^0-9.-]/g, '');
                              if (value === '') {
                                // remove the key from the config if empty
                                let newConfig = objectCopy(jobConfig);
                                if (newConfig.config.process[0].sample.samples[i]) {
                                  delete newConfig.config.process[0].sample.samples[i].network_multiplier;
                                  setJobConfig(
                                    newConfig.config.process[0].sample.samples,
                                    'config.process[0].sample.samples',
                                  );
                                }
                              } else {
                                // set it as a string
                                setJobConfig(value, `config.process[0].sample.samples[${i}].network_multiplier`);
                                return;
                              }
                            }}
                            placeholder={`1.0 (default)`}
                          />
                        </div>
                      </div>
                      {['minimax_h3_image', 'flux3'].includes(jobConfig.config.process[0].model.arch) ? (
                        <SampleReferenceInputs sample={sample} onChange={next => setJobConfig(next, `config.process[0].sample.samples[${i}]`)} />
                      ) : modelArch?.additionalSections?.includes('datasets.multi_control_paths') && (
                        <FormGroup label={t("Control Images")} className="pt-2 ml-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 mt-2">
                            {['ctrl_img_1', 'ctrl_img_2', 'ctrl_img_3'].map((ctrlKey, ctrl_idx) => (
                              <SampleControlImage
                                key={ctrlKey}
                                instruction={`Add Control Image ${ctrl_idx + 1}`}
                                className=""
                                src={sample[ctrlKey as keyof typeof sample] as string}
                                onNewImageSelected={imagePath => {
                                  if (!imagePath) {
                                    let newSamples = objectCopy(jobConfig.config.process[0].sample.samples);
                                    delete newSamples[i][ctrlKey as keyof typeof sample];
                                    setJobConfig(newSamples, 'config.process[0].sample.samples');
                                  } else {
                                    setJobConfig(imagePath, `config.process[0].sample.samples[${i}].${ctrlKey}`);
                                  }
                                }}
                              />
                            ))}
                          </div>
                        </FormGroup>
                      )}
                      {modelArch?.additionalSections?.includes('sample.ctrl_img') && (
                        <SampleControlImage
                          className="mt-6 ml-4"
                          instruction={isLlmModel ? 'Add Media' : undefined}
                          allowAudio={isLlmModel}
                          src={sample.ctrl_img}
                          onNewImageSelected={imagePath => {
                            if (!imagePath) {
                              let newSamples = objectCopy(jobConfig.config.process[0].sample.samples);
                              delete newSamples[i].ctrl_img;
                              setJobConfig(newSamples, 'config.process[0].sample.samples');
                            } else {
                              setJobConfig(imagePath, `config.process[0].sample.samples[${i}].ctrl_img`);
                            }
                          }}
                        />
                      )}
                    </div>
                    <div className="pb-4"></div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setJobConfig(
                          jobConfig.config.process[0].sample.samples.filter((_, index) => index !== i),
                          'config.process[0].sample.samples',
                        )
                      }
                      className="rounded-full p-1 text-sm"
                    >
                      <X />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setJobConfig(
                  [...jobConfig.config.process[0].sample.samples, { prompt: '' }],
                  'config.process[0].sample.samples',
                )
              }
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            ><T text={"Add Prompt"} /></button>
          </Card>
        </div>

        {status === 'success' && <p className="text-green-500 text-center"><T text={"Training saved successfully!"} /></p>}
        {status === 'error' && <p className="text-red-500 text-center"><T text={"Error saving training. Please try again."} /></p>}
      </form>
      <AddSingleImageModal />
    </>
  );
}
