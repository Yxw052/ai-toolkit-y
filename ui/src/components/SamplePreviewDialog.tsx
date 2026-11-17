'use client';
import { T, useT } from '@/components/LanguageProvider';

import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import type { SampleConfig, SampleItem } from '@/types';
import SampleReferenceInputs from './SampleReferenceInputs';

const field = 'w-full min-w-0 rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm';
const button = 'rounded px-3 py-1.5 text-sm hover:bg-gray-700';
export default function SamplePreviewDialog({ config, onChange }: { config: SampleConfig; onChange: (samples: SampleItem[]) => void }) {
  const t = useT();
  const [opened, setOpened] = useState(false);
  const replace = (index: number, next: SampleItem) => onChange(config.samples.map((s, i) => i === index ? next : s));
  return <>
    <button type="button" className={`${button} border border-gray-600`} onClick={() => setOpened(true)}><T text={"Sample overview"} /></button>
    <Dialog open={opened} onClose={() => setOpened(false)} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto p-3 sm:p-6">
        <DialogPanel className="mx-auto max-w-6xl rounded-lg bg-gray-900 p-4 sm:p-6">
          <div className="flex justify-between items-center gap-3 mb-2">
            <DialogTitle className="font-medium"><T text={"Sample overview ·"} /> {config.samples.length} <T text={"groups"} /></DialogTitle>
            <button type="button" className={button} onClick={() => setOpened(false)}><T text={"Done previewing"} /></button>
          </div>
          <p className="text-xs text-gray-400 mb-5"><T text={"Changes sync to the form. Click Update Job / Create Job on the page to save. Drag a group title or reference image to reorder."} /></p>
          <div className="space-y-5">
            {config.samples.map((sample, i) => <section key={i} className="border-b border-gray-700 pb-5" data-testid="sample-preview-row"
              onDragOver={e => { if (e.dataTransfer.types.includes('application/x-toolkit-sample')) e.preventDefault(); }}
              onDrop={e => {
                const raw = e.dataTransfer.getData('application/x-toolkit-sample'); if (!raw) return;
                e.preventDefault(); const from = Number(raw); if (!Number.isInteger(from) || !config.samples[from]) return;
                const next = [...config.samples]; const [moved] = next.splice(from, 1); next.splice(i, 0, moved); onChange(next);
              }}>
              <div draggable onDragStart={e => { e.dataTransfer.setData('application/x-toolkit-sample', String(i)); e.dataTransfer.effectAllowed = 'move'; }}
                className="cursor-grab text-sm text-gray-300 mb-3" title={t("Drag to reorder sample groups")}><T text={"⠿ Sample"} /> {i + 1}</div>
              <SampleReferenceInputs expanded sample={sample} onChange={next => replace(i, next)} />
              <label className="block text-xs text-gray-300 mt-3"><T text={"Sample prompt"} /><textarea className={`${field} mt-1 resize-y`} rows={3} value={sample.prompt} onChange={e => replace(i, { ...sample, prompt: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {(['width', 'height', 'seed', 'network_multiplier'] as const).map(key => {
                  const label = { width: 'Width', height: 'Height', seed: 'Seed', network_multiplier: 'LoRA Scale' }[key];
                  const fallback = key === 'network_multiplier' ? 1 : key === 'seed' ? config.seed + (config.walk_seed ? i : 0) : config[key];
                  return <label key={key} className="text-xs text-gray-300">{t(label)}
                    <input className={`${field} mt-1`} type="number" step={key === 'network_multiplier' ? 'any' : 1}
                      min={key === 'width' || key === 'height' ? 1 : undefined} value={sample[key] ?? ''} placeholder={t('{value} (default)', { value: fallback })}
                      onChange={e => {
                        const next = { ...sample }; if (e.target.value === '') delete next[key];
                        else { const n = Number(e.target.value); if (!Number.isFinite(n) || ((key === 'width' || key === 'height') && n < 1)) return; next[key] = n; }
                        replace(i, next);
                      }} />
                  </label>;
                })}
              </div>
            </section>)}
          </div>
          {!config.samples.length && <p className="text-gray-400 py-8"><T text={"Add a sample first."} /></p>}
        </DialogPanel>
      </div>
    </Dialog>
  </>;
}
