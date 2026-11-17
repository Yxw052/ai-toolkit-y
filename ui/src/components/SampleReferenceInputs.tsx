'use client';
import { T, useT } from '@/components/LanguageProvider';

import { useEffect, useId, useRef, useState } from 'react';
import type { SampleItem } from '@/types';
import { sampleReferences, withSampleReferences, MAX_REFERENCES } from '@/utils/referenceImages';
import SampleControlImage from './SampleControlImage';
import ReferenceImageViewer from './ReferenceImageViewer';

const dragType = 'application/x-toolkit-reference';
export default function SampleReferenceInputs({ sample, onChange, expanded = false }: {
  sample: SampleItem; onChange: (sample: SampleItem) => void; expanded?: boolean;
}) {
  const t = useT();
  const paths = sampleReferences(sample);
  const group = useId();
  const scroll = useRef<HTMLDivElement>(null);
  const revealAdded = useRef(false);
  const [large, setLarge] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const update = (next: string[]) => onChange(withSampleReferences(sample, next));
  // A normal mouse wheel pans the compact strip; trackpads retain both axes.
  useEffect(() => {
    const node = scroll.current;
    if (!node) return;
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || node.scrollWidth <= node.clientWidth) return;
      const delta = e.deltaX || e.deltaY;
      const canScroll = delta < 0 ? node.scrollLeft > 0 : node.scrollLeft < node.scrollWidth - node.clientWidth;
      if (canScroll) { e.preventDefault(); node.scrollLeft += delta; }
    };
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  }, [expanded]);
  useEffect(() => {
    if (!revealAdded.current || !scroll.current) return;
    revealAdded.current = false;
    const node = scroll.current;
    if (expanded) {
      node.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    } else {
      node.scrollTo({ left: node.scrollWidth, behavior: 'smooth' });
    }
  }, [paths.length, expanded]);
  const slots = Math.max(5, Math.min(MAX_REFERENCES, paths.length + 1));
  return <div className={expanded ? 'w-full min-w-0' : 'pt-2 w-[432px] max-w-full shrink-0'} data-testid="sample-references">
    <div className="flex justify-between items-center text-xs text-gray-300 mb-2">
      <span><T text={"Control Images"} /> <span className="text-gray-500">({paths.length})</span></span>
      <span className="text-gray-500"><T text={"Drag to reorder · Click to preview"} /></span>
    </div>
    <div ref={scroll} data-testid="reference-scroll" className={expanded
      ? 'flex flex-wrap items-start gap-2 overflow-x-hidden overflow-y-hidden p-1'
      : 'flex items-start gap-2 h-[140px] overflow-x-auto overflow-y-hidden overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'}>
      {Array.from({ length: slots }, (_, i) => <div key={`${i}:${paths[i] || 'empty'}`}
        data-reference-index={i} className={`w-20 shrink-0 rounded ${over === i ? 'outline outline-2 outline-blue-400' : ''}`}
        draggable={Boolean(paths[i])}
        onDragStart={e => { e.dataTransfer.setData(dragType, JSON.stringify({ group, index: i })); e.dataTransfer.effectAllowed = 'move'; }}
        onDragEnd={() => setOver(null)}
        onDragOverCapture={e => {
          if (!e.dataTransfer.types.includes(dragType)) return;
          e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setOver(i);
          const node = scroll.current;
          if (node) { const r = node.getBoundingClientRect(); if (e.clientX > r.right - 32) node.scrollLeft += 24; if (e.clientX < r.left + 32) node.scrollLeft -= 24; }
        }}
        onDropCapture={e => {
          if (!e.dataTransfer.types.includes(dragType)) return;
          e.preventDefault(); e.stopPropagation(); setOver(null);
          try {
            const source = JSON.parse(e.dataTransfer.getData(dragType));
            if (source.group !== group || !Number.isInteger(source.index) || !paths[source.index]) return;
            const next = [...paths]; const [moved] = next.splice(source.index, 1);
            next.splice(Math.min(i, next.length), 0, moved); update(next);
          } catch { /* Ignore unrelated drag data. */ }
        }}>
        <SampleControlImage contain src={paths[i] || null} instruction={t('+ Reference {n}', { n: i + 1 })}
          onPreview={paths[i] ? () => setLarge(i) : undefined}
          onNewImageSelected={value => {
            if (value && i >= paths.length) revealAdded.current = true;
            update(value ? (i < paths.length ? paths.map((p, j) => j === i ? value : p) : [...paths, value]) : paths.filter((_, j) => j !== i));
          }} />
        <p className="text-[10px] text-gray-400 text-center mt-1"><T text={"Picture"} /> {i + 1}</p>
      </div>)}
    </div>
    <ReferenceImageViewer images={paths.map((path, i) => ({ path, label: t('Image {n}', { n: i + 1 }) }))} index={large} onChange={setLarge} />
  </div>;
}
