import type { DatasetConfig, SampleItem } from '@/types';

export const MAX_REFERENCES = 16;
export function datasetReferences(dataset: DatasetConfig): string[] {
  if (Array.isArray(dataset.control_path)) return dataset.control_path;
  const legacy = [dataset.control_path_1, dataset.control_path_2, dataset.control_path_3].filter(Boolean) as string[];
  return legacy.length ? legacy : dataset.control_path ? [dataset.control_path] : [];
}
export function sampleReferences(sample: SampleItem | null): string[] {
  if (!sample) return [];
  if (Array.isArray(sample.ctrl_imgs)) return sample.ctrl_imgs;
  const paths = sample.ctrl_img ? [sample.ctrl_img] : [];
  if (sample.ctrl_img_1 && sample.ctrl_img_1 !== sample.ctrl_img) paths.push(sample.ctrl_img_1);
  return [...paths, sample.ctrl_img_2, sample.ctrl_img_3].filter(Boolean) as string[];
}
export function withDatasetReferences(dataset: DatasetConfig, paths: string[]): DatasetConfig {
  const result = { ...dataset, control_path: paths };
  delete result.control_path_1; delete result.control_path_2; delete result.control_path_3;
  return result;
}
export function withSampleReferences(sample: SampleItem, paths: string[]): SampleItem {
  const result = { ...sample, ctrl_imgs: paths };
  delete result.ctrl_img; delete result.ctrl_img_1; delete result.ctrl_img_2; delete result.ctrl_img_3;
  return result;
}
