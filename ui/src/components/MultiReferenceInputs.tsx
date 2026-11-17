'use client';
import { T, useT } from '@/components/LanguageProvider';

import { useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import type { DatasetConfig, SampleItem, SelectOption, GroupedSelectOption } from '@/types';
import { datasetReferences, sampleReferences, withDatasetReferences, withSampleReferences, MAX_REFERENCES } from '@/utils/referenceImages';
import ReferenceImageViewer from './ReferenceImageViewer';
export { default as SampleReferenceInputs } from './SampleReferenceInputs';
import { CreatableSelectInput, FormGroup } from './formInputs';
import { apiClient } from '@/utils/api';
import { encodeFilePathForUrl } from '@/utils/basic';

const role = (path: string) => { const name = path.split('/').pop() || ''; return ({m: 'Model four-view', z: 'Garment front', f: 'Garment back', c: 'Scene'} as Record<string, string>)[name] || name; };
const button = 'rounded px-2 py-1 text-xs text-gray-400 hover:text-gray-100 hover:bg-gray-700 disabled:opacity-30';
function move(paths: string[], from: number, to: number) {
  const next = [...paths]; [next[from], next[to]] = [next[to], next[from]]; return next;
}
function OrderButtons({ paths, index, onChange }: { paths: string[]; index: number; onChange: (paths: string[]) => void }) {
  const t = useT();
  return <div className="flex items-center gap-0.5">
    <button type="button" aria-label={t('Move Picture {n} up', { n: index + 1 })} className={button} disabled={index === 0} onClick={() => onChange(move(paths, index, index - 1))}>↑</button>
    <button type="button" aria-label={t('Move Picture {n} down', { n: index + 1 })} className={button} disabled={index === paths.length - 1} onClick={() => onChange(move(paths, index, index + 1))}>↓</button>
    <button type="button" aria-label={t('Remove Picture {n}', { n: index + 1 })} className={button} onClick={() => onChange(paths.filter((_, i) => i !== index))} title={t("Remove reference image")}>×</button>
  </div>;
}
type Pair = { target: string; references: string[]; caption: string; error: string | null };
function PairPreview({ dataset, paths }: { dataset: DatasetConfig; paths: string[] }) {
  const t = useT();
  const [items, setItems] = useState<Pair[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(false);
  const [large, setLarge] = useState<number | null>(null);
  const previewImages = items.flatMap(item => [item.target, ...item.references].map((path, i) => ({ path, label: `${item.target.split('/').pop()} · ${i === 0 ? t('Target image') : t('Image {n}', { n: i })}` })));
  const [revision, setRevision] = useState(0);
  const folders = JSON.stringify(paths);
  useEffect(() => { setOffset(0); setItems([]); }, [dataset.folder_path, folders]);
  useEffect(() => {
    if (!opened) return;
    const controller = new AbortController();
    setBusy(true); setError(''); setItems([]);
    apiClient.post('/api/references/preview', { target_folder: dataset.folder_path, folders: JSON.parse(folders), caption_ext: dataset.caption_ext || 'txt', offset }, { signal: controller.signal })
      .then(response => { setItems(response.data.items); setTotal(response.data.total); })
      .catch(e => { if (!controller.signal.aborted) setError(e.response?.data?.error || e.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [opened, dataset.folder_path, dataset.caption_ext, folders, offset, revision]);
  return <>
    <button type="button" className={button} onClick={() => { setOpened(true); setRevision(v => v + 1); }}><T text={"Pair preview"} /></button>
    <Dialog open={opened} onClose={() => setOpened(false)} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto p-4 sm:p-8">
        <DialogPanel className="mx-auto max-w-5xl rounded-lg bg-gray-900 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-base font-medium"><T text={"Dataset pair preview"} /></DialogTitle>
            <button type="button" className={button} onClick={() => setOpened(false)}><T text={"Close"} /></button>
          </div>
          {busy && <p className="text-sm text-gray-400"><T text={"Checking image pairs…"} /></p>}
          {error && <p role="alert" className="text-red-400">{error}</p>}
          <div className="space-y-4">
            {items.map((item, rowIndex) => <div key={item.target} className="border-b border-gray-700 pb-4">
              <div className="text-sm mb-2">{item.target.split('/').pop()}</div>
              {item.error && <p role="alert" className="text-red-400 text-sm">{item.error}</p>}
              <div className="flex flex-wrap gap-3">
                {[item.target, ...item.references].map((p, i) => <button type="button" key={`${i}:${p}`} className="w-28" onClick={() => setLarge(items.slice(0, rowIndex).reduce((sum, row) => sum + 1 + row.references.length, 0) + i)}>
                  <img loading="lazy" src={`/api/img/${encodeFilePathForUrl(p)}`} alt={i === 0 ? t('Target image') : t('Image {n}', { n: i })} className="h-28 w-full object-contain bg-black rounded" />
                  <span className="text-xs text-gray-400">{i === 0 ? t("Target image") : `${t('Image {n}', { n: i })} · ${t(role(paths[i - 1] || ''))}`}</span>
                </button>)}
              </div>
              {item.caption && <details className="mt-2 text-sm text-gray-400"><summary className="cursor-pointer"><T text={"Caption"} /></summary><p className="whitespace-pre-wrap mt-1">{item.caption}</p></details>}
            </div>)}
          </div>
          <div className="flex items-center justify-end gap-2 text-sm mt-4">
            <button type="button" className={button} disabled={busy || offset === 0} onClick={() => setOffset(Math.max(0, offset - 6))}><T text={"Previous page"} /></button>
            <span className="text-gray-400">{total ? offset + 1 : 0}–{Math.min(offset + 6, total)} <T text={"of"} /> {total}</span>
            <button type="button" className={button} disabled={busy || offset + 6 >= total} onClick={() => setOffset(offset + 6)}><T text={"Next page"} /></button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
    <ReferenceImageViewer images={previewImages} index={large} onChange={setLarge} />
  </>;
}

function folderOptions(options: SelectOption[] | GroupedSelectOption[], paths: string[]): SelectOption[] {
  const flat = options.flatMap(option => 'options' in option ? option.options : [option]);
  const values = new Set(flat.map(option => option.value));
  const result = [...flat];
  for (const path of paths) {
    if (path && !values.has(path)) {
      result.push({ value: path, label: path.split('/').filter(Boolean).slice(-2).join('/') });
      values.add(path);
    }
  }
  return [{ value: '', label: 'Select dataset' }, ...result];
}

export function DatasetReferenceInputs({ dataset, options, onChange }: { dataset: DatasetConfig; options: SelectOption[] | GroupedSelectOption[]; onChange: (dataset: DatasetConfig) => void }) {
  const t = useT();
  const paths = datasetReferences(dataset);
  const [managing, setManaging] = useState(false);
  const update = (next: string[]) => onChange(withDatasetReferences(dataset, next));
  const choices = folderOptions(options, [dataset.folder_path, ...paths]);
  return <div className="space-y-2">
    <CreatableSelectInput label={t("Target Dataset")} value={dataset.folder_path} options={choices} onChange={path => onChange({ ...dataset, folder_path: path })} />
    {paths.map((p, i) => <div key={i}>
      <CreatableSelectInput label={t('Control Dataset {n}', { n: i + 1 })} value={p} options={choices} onChange={path => update(paths.map((v, j) => j === i ? path : v))} />
      {managing && <div className="flex justify-end mt-1"><OrderButtons paths={paths} index={i} onChange={update} /></div>}
    </div>)}
    <div className="flex flex-wrap items-center gap-1 pt-1">
      <button type="button" className={button} disabled={paths.length >= MAX_REFERENCES} onClick={() => update([...paths, ''])}><T text={"+ Add folder"} /></button>
      {paths.length > 0 && <button type="button" className={button} aria-pressed={managing} onClick={() => setManaging(v => !v)}>{managing ? t("Done") : t("Reorder / Remove")}</button>}
      <PairPreview dataset={dataset} paths={paths} />
    </div>
    {managing && <p className="text-xs text-gray-500"><T text={"Order follows the image numbers. Check captions after reordering."} /></p>}
  </div>;
}
