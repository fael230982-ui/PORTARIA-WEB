'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Gauge, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

const playbackRates = [0.25, 0.5, 1, 2, 4] as const;

function getSearchParam(name: string) {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(name) ?? '';
}

export default function CameraReplayPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [rate, setRate] = useState<(typeof playbackRates)[number]>(1);
  const replayUrl = useMemo(() => getSearchParam('url'), []);
  const cameraName = useMemo(() => getSearchParam('camera') || 'Replay da câmera', []);

  useEffect(() => {
    const initialRate = Number(getSearchParam('rate'));
    if (playbackRates.includes(initialRate as (typeof playbackRates)[number])) {
      setRate(initialRate as (typeof playbackRates)[number]);
    }
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
  }, [rate]);

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-zinc-950 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Replay</p>
          <h1 className="mt-1 text-lg font-semibold">{cameraName}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.close()}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Fechar
          </Button>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-200">
            <Gauge className="h-4 w-4 text-cyan-200" />
            Velocidade
          </span>
          {playbackRates.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRate(item)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                rate === item
                  ? 'border-cyan-300/40 bg-cyan-300/20 text-cyan-50'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {item}x
            </button>
          ))}
        </div>

        {replayUrl ? (
          <video
            ref={videoRef}
            src={replayUrl}
            className="min-h-0 flex-1 rounded-2xl border border-white/10 bg-black object-contain"
            controls
            autoPlay
            playsInline
          />
        ) : (
          <div className="flex min-h-[50vh] flex-1 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950 text-center text-slate-400">
            <div>
              <Play className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p>Nenhuma URL de replay foi informada.</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
