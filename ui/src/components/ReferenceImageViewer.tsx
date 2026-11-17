'use client';
import { T } from '@/components/LanguageProvider';

import { useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { encodeFilePathForUrl } from '@/utils/basic';

export type PreviewImage = { path: string; label: string };
const button = 'rounded px-3 py-1.5 text-sm hover:bg-gray-700 disabled:opacity-30';

export default function ReferenceImageViewer({ images, index, onChange }: {
  images: PreviewImage[]; index: number | null; onChange: (index: number | null) => void;
}) {
  const current = index === null ? undefined : images[index];
  const [dimensions, setDimensions] = useState('');
  useEffect(() => { setDimensions(''); }, [current?.path]);
  useEffect(() => {
    if (index === null) return;
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest('input, textarea, [contenteditable=true]')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); event.stopPropagation();
        const next = index + (event.key === 'ArrowLeft' ? -1 : 1);
        if (next >= 0 && next < images.length) onChange(next);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [index, images.length, onChange]);
  return <Dialog open={Boolean(current)} onClose={() => onChange(null)} className="relative z-[80]">
    <div className="fixed inset-0 bg-black/90" aria-hidden="true" />
    <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
      <DialogPanel className="w-full h-full flex flex-col bg-gray-950 rounded-lg overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 shrink-0">
          <DialogTitle className="mr-auto text-sm">{current?.label} · {(index ?? 0) + 1} <T text={"of"} /> {images.length}</DialogTitle>
          <span className="text-xs text-gray-400">{dimensions} <T text={"· Aspect ratio locked · Scroll to zoom / Drag to pan"} /></span>
          <button type="button" className={button} disabled={index === 0} onClick={() => onChange((index ?? 0) - 1)}><T text={"← Previous"} /></button>
          <button type="button" className={button} disabled={index === images.length - 1} onClick={() => onChange((index ?? 0) + 1)}><T text={"Next →"} /></button>
          <button type="button" className={button} onClick={() => onChange(null)}><T text={"Close image"} /></button>
        </div>
        {current && <TransformWrapper key={`${index}:${current.path}`} initialScale={1} minScale={0.25} maxScale={12}
          centerOnInit limitToBounds={false} smooth={false} wheel={{ step: 0.15 }} doubleClick={{ disabled: true }}>
          {({ zoomIn, zoomOut, resetTransform }) => <>
            <div className="flex justify-center gap-2 bg-gray-900 py-1">
              <button type="button" className={button} onClick={() => zoomOut(0.14, 120, 'easeOut')}><T text={"Zoom out −"} /></button>
              <button type="button" className={button} onClick={() => resetTransform()}><T text={"Fit to window"} /></button>
              <button type="button" className={button} onClick={() => zoomIn(0.14, 120, 'easeOut')}><T text={"Zoom in +"} /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden cursor-grab active:cursor-grabbing" data-testid="image-pan-area">
              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
                <div className="w-full h-full flex items-center justify-center">
                  <img src={`/api/img/${encodeFilePathForUrl(current.path)}`} alt={current.label} draggable={false}
                    onLoad={e => setDimensions(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight}`)}
                    className="max-w-full max-h-full w-auto h-auto object-contain select-none" />
                </div>
              </TransformComponent>
            </div>
          </>}
        </TransformWrapper>}
      </DialogPanel>
    </div>
  </Dialog>;
}
