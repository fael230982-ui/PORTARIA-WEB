'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Maximize2, Minimize2, Play, RefreshCw, Search, Square, X } from 'lucide-react';
import { CameraFeed } from '@/components/camera-feed';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getPreferredImageStreamUrl,
  getPreferredSnapshotUrl,
  getPreferredVideoStreamUrl,
} from '@/features/cameras/camera-media';
import { useCameras } from '@/hooks/use-cameras';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import type { Camera as CameraRecord } from '@/types/camera';

const allowedRoles = ['OPERADOR', 'CENTRAL', 'MASTER'] as const;
const layoutOptions = [1, 4, 9, 16] as const;
type CameraLayout = (typeof layoutOptions)[number];
type BankFilter = 'all' | 'unassigned' | 'assigned' | 'online' | 'no_media';
type AutoRotateMode = 'presets' | 'pages';
type CameraPreset = {
  id: string;
  name: string;
  layout: CameraLayout;
  slots: Array<string | null>;
};

function readStoredLayout(): CameraLayout {
  if (typeof window === 'undefined') return 4;
  const savedLayout = Number(window.localStorage.getItem('operation-camera-layout'));
  return layoutOptions.includes(savedLayout as CameraLayout) ? (savedLayout as CameraLayout) : 4;
}

function readStoredSlotLayouts() {
  if (typeof window === 'undefined') return {};
  const savedSlots = window.localStorage.getItem('operation-camera-slots');
  if (!savedSlots) return {};

  try {
    const parsed = JSON.parse(savedSlots);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, Array<string | null>>) : {};
  } catch {
    return {};
  }
}

function readStoredPresets() {
  if (typeof window === 'undefined') return [] as CameraPreset[];
  const savedPresetsRaw = window.localStorage.getItem('operation-camera-presets');
  if (!savedPresetsRaw) return [] as CameraPreset[];

  try {
    const parsed = JSON.parse(savedPresetsRaw);
    if (!Array.isArray(parsed)) return [] as CameraPreset[];
    return parsed.filter((item): item is CameraPreset => {
      return (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        layoutOptions.includes(Number(item.layout) as CameraLayout) &&
        Array.isArray(item.slots)
      );
    });
  } catch {
    return [] as CameraPreset[];
  }
}

function readStoredAutoRotateSettings() {
  if (typeof window === 'undefined') {
    return { enabled: false, mode: 'presets' as AutoRotateMode, seconds: 15 };
  }

  const savedSettings = window.localStorage.getItem('operation-camera-autorotate');
  if (!savedSettings) {
    return { enabled: false, mode: 'presets' as AutoRotateMode, seconds: 15 };
  }

  try {
    const parsed = JSON.parse(savedSettings) as {
      enabled?: boolean;
      mode?: AutoRotateMode;
      seconds?: number;
    };

    return {
      enabled: Boolean(parsed.enabled),
      mode: parsed.mode === 'pages' || parsed.mode === 'presets' ? parsed.mode : ('presets' as AutoRotateMode),
      seconds: typeof parsed.seconds === 'number' && parsed.seconds >= 5 && parsed.seconds <= 60 ? parsed.seconds : 15,
    };
  } catch {
    return { enabled: false, mode: 'presets' as AutoRotateMode, seconds: 15 };
  }
}

function normalizeString(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function getGridClass(layout: CameraLayout) {
  if (layout === 1) return 'grid-cols-1 grid-rows-1';
  if (layout === 4) return 'grid-cols-2 grid-rows-2';
  if (layout === 9) return 'grid-cols-3 grid-rows-3';
  return 'grid-cols-4 grid-rows-4';
}

function getTilePadding(layout: CameraLayout) {
  if (layout === 1) return 'p-4';
  if (layout === 4) return 'p-3';
  if (layout === 9) return 'p-2';
  return 'p-1.5';
}

function getCameraTone(status: CameraRecord['status']) {
  return status === 'ONLINE'
    ? 'border-emerald-400/35 text-emerald-100'
    : 'border-red-400/45 text-red-100';
}

function getMediaLabel(camera: CameraRecord) {
  if (getPreferredVideoStreamUrl(camera)) return 'ao vivo';
  if (getPreferredImageStreamUrl(camera)) return 'preview';
  if (getPreferredSnapshotUrl(camera)) return 'snapshot';
  return 'sem imagem';
}

export default function OperacaoCâmerasPage() {
  const router = useRouter();
  const { user, canAccess, isChecking } = useProtectedRoute({
    allowedRoles: [...allowedRoles],
  });
  const { data: camerasData, isLoading, error, refetch, isFetching } = useCameras();
  const [layout, setLayout] = useState<CameraLayout>(readStoredLayout);
  const [search, setSearch] = useState('');
  const [focusedCameraId, setFocusedCameraId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slotLayouts, setSlotLayouts] = useState<Record<string, Array<string | null>>>(readStoredSlotLayouts);
  const [draggedSlotIndex, setDraggedSlotIndex] = useState<number | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [bankFilter, setBankFilter] = useState<BankFilter>('all');
  const [bankPage, setBankPage] = useState(0);
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState<CameraPreset[]>(readStoredPresets);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(readStoredAutoRotateSettings().enabled);
  const [autoRotateMode, setAutoRotateMode] = useState<AutoRotateMode>(readStoredAutoRotateSettings().mode);
  const [autoRotateSeconds, setAutoRotateSeconds] = useState(readStoredAutoRotateSettings().seconds);

  useEffect(() => {
    window.localStorage.setItem('operation-camera-layout', String(layout));
  }, [layout]);

  useEffect(() => {
    window.localStorage.setItem('operation-camera-slots', JSON.stringify(slotLayouts));
  }, [slotLayouts]);

  useEffect(() => {
    window.localStorage.setItem('operation-camera-presets', JSON.stringify(savedPresets));
  }, [savedPresets]);

  useEffect(() => {
    window.localStorage.setItem(
      'operation-camera-autorotate',
      JSON.stringify({
        enabled: autoRotateEnabled,
        mode: autoRotateMode,
        seconds: autoRotateSeconds,
      })
    );
  }, [autoRotateEnabled, autoRotateMode, autoRotateSeconds]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const focusAdjacentSlot = useCallback((direction: 'previous' | 'next') => {
    const baseIndex = selectedSlotIndex ?? (direction === 'next' ? -1 : layout);
    const nextIndex =
      direction === 'next'
        ? Math.min(layout - 1, baseIndex + 1)
        : Math.max(0, baseIndex - 1);
    setSelectedSlotIndex(nextIndex);
  }, [layout, selectedSlotIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (focusedCameraId) {
          setFocusedCameraId(null);
          return;
        }
        if (selectedSlotIndex !== null) {
          setSelectedSlotIndex(null);
        }
        return;
      }

      if (focusedCameraId) return;

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        focusAdjacentSlot('previous');
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        focusAdjacentSlot('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusAdjacentSlot, focusedCameraId, selectedSlotIndex]);

  const cameras = useMemo(() => camerasData?.data ?? [], [camerasData]);

  const filteredCâmeras = useMemo(() => {
    const term = normalizeString(search);
    if (!term) return cameras;

    return cameras.filter((camera) =>
      [camera.name, camera.location, camera.status, camera.unitId, getMediaLabel(camera)]
        .filter(Boolean)
        .some((value) => normalizeString(value).includes(term))
    );
  }, [cameras, search]);

  const onlineCount = useMemo(
    () => filteredCâmeras.filter((camera) => camera.status === 'ONLINE').length,
    [filteredCâmeras]
  );
  const noMediaCount = useMemo(
    () => filteredCâmeras.filter((camera) => getMediaLabel(camera) === 'sem imagem').length,
    [filteredCâmeras]
  );

  const activeLayout = focusedCameraId ? 1 : layout;
  const focusedCamera = focusedCameraId
    ? filteredCâmeras.find((camera) => camera.id === focusedCameraId) ?? null
    : null;

  const visibleSlots = useMemo(() => {
    const savedSlots = slotLayouts[String(layout)] ?? [];
    const availableIds = new Set(filteredCâmeras.map((camera) => camera.id));
    const fallbackIds = filteredCâmeras.slice(0, layout).map((camera) => camera.id);

    return Array.from({ length: layout }, (_, index) => {
      const savedId = savedSlots[index];
      if (savedId && availableIds.has(savedId)) return savedId;
      return fallbackIds[index] ?? null;
    });
  }, [filteredCâmeras, layout, slotLayouts]);
  const assignedCount = useMemo(
    () => new Set(visibleSlots.filter(Boolean)).size,
    [visibleSlots]
  );

  const slotCâmeras = focusedCamera
    ? [focusedCamera]
    : visibleSlots.map((cameraId) => filteredCâmeras.find((camera) => camera.id === cameraId) ?? null);

  const filledSlotsCount = useMemo(
    () => visibleSlots.filter(Boolean).length,
    [visibleSlots]
  );

  const availableBankCâmeras = useMemo(() => {
    const assignedIds = new Set(visibleSlots.filter(Boolean));
    return filteredCâmeras
      .filter((camera) => {
        if (bankFilter === 'unassigned') return !assignedIds.has(camera.id);
        if (bankFilter === 'assigned') return assignedIds.has(camera.id);
        if (bankFilter === 'online') return camera.status === 'ONLINE';
        if (bankFilter === 'no_media') return getMediaLabel(camera) === 'sem imagem';
        return true;
      })
      .sort((a, b) => {
        const aAssigned = assignedIds.has(a.id);
        const bAssigned = assignedIds.has(b.id);
        if (aAssigned !== bAssigned) return Number(aAssigned) - Number(bAssigned);
        if (a.status !== b.status) return a.status === 'ONLINE' ? -1 : 1;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
  }, [bankFilter, filteredCâmeras, visibleSlots]);

  const bankPageSize = layout <= 4 ? 8 : 10;
  const bankTotalPages = Math.max(1, Math.ceil(availableBankCâmeras.length / bankPageSize));
  const currentBankPage = Math.min(bankPage, bankTotalPages - 1);
  const pagedBankCâmeras = useMemo(
    () => availableBankCâmeras.slice(currentBankPage * bankPageSize, currentBankPage * bankPageSize + bankPageSize),
    [availableBankCâmeras, currentBankPage, bankPageSize]
  );

  function handleSetLayout(nextLayout: CameraLayout) {
    setLayout(nextLayout);
    setFocusedCameraId(null);
    setSelectedSlotIndex(null);
    setBankPage(0);
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  }

  function setSlotCamera(slotIndex: number, cameraId: string | null) {
    setSlotLayouts((current) => {
      const currentSlots = current[String(layout)] ?? visibleSlots;
      const nextSlots = Array.from({ length: layout }, (_, index) => currentSlots[index] ?? null);
      nextSlots[slotIndex] = cameraId;
      return {
        ...current,
        [String(layout)]: nextSlots,
      };
    });
    setSelectedSlotIndex(slotIndex);
  }

  function swapSlots(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;

    setSlotLayouts((current) => {
      const currentSlots = current[String(layout)] ?? visibleSlots;
      const nextSlots = Array.from({ length: layout }, (_, index) => currentSlots[index] ?? null);
      const fromValue = nextSlots[fromIndex] ?? null;
      nextSlots[fromIndex] = nextSlots[toIndex] ?? null;
      nextSlots[toIndex] = fromValue;
      return {
        ...current,
        [String(layout)]: nextSlots,
      };
    });
  }

  function resetCurrentLayoutSlots() {
    setSlotLayouts((current) => {
      const next = { ...current };
      delete next[String(layout)];
      return next;
    });
    setSelectedSlotIndex(null);
  }

  function fillLayoutSequentially() {
    const nextSlots = Array.from({ length: layout }, (_, index) => filteredCâmeras[index]?.id ?? null);
    setSlotLayouts((current) => ({
      ...current,
      [String(layout)]: nextSlots,
    }));
  }

  function fillLayoutWithOnlineCâmeras() {
    const onlineCâmeras = filteredCâmeras.filter((camera) => camera.status === 'ONLINE');
    const nextSlots = Array.from({ length: layout }, (_, index) => onlineCâmeras[index]?.id ?? null);
    setSlotLayouts((current) => ({
      ...current,
      [String(layout)]: nextSlots,
    }));
  }

  function fillOnlyEmptySlots() {
    const currentSlots = Array.from({ length: layout }, (_, index) => visibleSlots[index] ?? null);
    const assignedIds = new Set(currentSlots.filter(Boolean));
    const remainingCameras = filteredCâmeras.filter((camera) => !assignedIds.has(camera.id));
    let cameraIndex = 0;
    const nextSlots = currentSlots.map((slot) => {
      if (slot) return slot;
      const nextCameraId = remainingCameras[cameraIndex]?.id ?? null;
      cameraIndex += 1;
      return nextCameraId;
    });

    setSlotLayouts((current) => ({
      ...current,
      [String(layout)]: nextSlots,
    }));
  }

  function clearSelectedSlot() {
    if (selectedSlotIndex === null) return;
    setSlotCamera(selectedSlotIndex, null);
  }

  function getPreferredAssignmentSlot() {
    if (selectedSlotIndex !== null) return selectedSlotIndex;
    const emptyIndex = visibleSlots.findIndex((slot) => !slot);
    if (emptyIndex >= 0) return emptyIndex;
    return 0;
  }

  function assignCameraToSelectedSlot(cameraId: string) {
    const slotIndex = getPreferredAssignmentSlot();
    setSlotCamera(slotIndex, cameraId);
  }

  function saveCurrentPreset() {
    const name = presetName.trim();
    if (!name) return;

    const normalizedName = normalizeString(name);
    const existingPreset = savedPresets.find((preset) => normalizeString(preset.name) === normalizedName);

    const nextPreset: CameraPreset = {
      id: existingPreset?.id ?? `${Date.now()}`,
      name,
      layout,
      slots: Array.from({ length: layout }, (_, index) => visibleSlots[index] ?? null),
    };

    setSavedPresets((current) => [nextPreset, ...current.filter((item) => item.id !== nextPreset.id)].slice(0, 8));
    setPresetName('');
  }

  function applyPreset(preset: CameraPreset) {
    setLayout(preset.layout);
    setFocusedCameraId(null);
    setSelectedSlotIndex(null);
    setSlotLayouts((current) => ({
      ...current,
      [String(preset.layout)]: Array.from({ length: preset.layout }, (_, index) => preset.slots[index] ?? null),
    }));
  }

  function deletePreset(presetId: string) {
    setSavedPresets((current) => current.filter((preset) => preset.id !== presetId));
  }

  const activePresetId = useMemo(() => {
    const currentSlots = Array.from({ length: layout }, (_, index) => visibleSlots[index] ?? null);
    const currentSignature = JSON.stringify({ layout, slots: currentSlots });
    const activePreset = savedPresets.find((preset) => {
      const presetSignature = JSON.stringify({
        layout: preset.layout,
        slots: Array.from({ length: preset.layout }, (_, index) => preset.slots[index] ?? null),
      });
      return presetSignature === currentSignature;
    });
    return activePreset?.id ?? null;
  }, [layout, savedPresets, visibleSlots]);

  useEffect(() => {
    if (!autoRotateEnabled || focusedCameraId) return;

    const timer = window.setInterval(() => {
      if (autoRotateMode === 'presets' && savedPresets.length > 0) {
        const activeIndex = savedPresets.findIndex((preset) => preset.id === activePresetId);
        const nextPreset = savedPresets[(activeIndex + 1 + savedPresets.length) % savedPresets.length] ?? savedPresets[0];
        if (nextPreset) applyPreset(nextPreset);
        return;
      }

      if (bankTotalPages > 1) {
        setBankPage((current) => (current + 1) % bankTotalPages);
      }
    }, Math.max(5, autoRotateSeconds) * 1000);

    return () => window.clearInterval(timer);
  }, [
    activePresetId,
    autoRotateEnabled,
    autoRotateMode,
    autoRotateSeconds,
    bankTotalPages,
    focusedCameraId,
    savedPresets,
  ]);

  if (isChecking) {
    return <div className="flex min-h-screen items-center justify-center bg-black text-white">Carregando câmeras...</div>;
  }

  if (!canAccess || !user) {
    return null;
  }

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-black text-white">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-zinc-950 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/operacao')}
            className="h-9 border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Operação
          </Button>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Monitor de câmeras</p>
            <p className="text-xs text-zinc-500">
              {isLoading ? 'Carregando...' : `${onlineCount}/${filteredCâmeras.length} online`}
              {focusedCamera ? ` | foco em ${focusedCamera.name}` : ` | ${layout} posições configuráveis`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 min-w-[220px] items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-zinc-300">
            <Search className="h-4 w-4 text-zinc-500" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setFocusedCameraId(null);
                setBankPage(0);
              }}
              placeholder="Buscar câmera"
              className="w-full bg-transparent outline-none placeholder:text-zinc-600"
            />
          </label>

          <div className="flex rounded-lg border border-white/10 bg-white/5 p-1">
            {layoutOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleSetLayout(option)}
                className={`h-7 min-w-8 rounded-md px-2 text-xs font-semibold transition ${
                  !focusedCameraId && layout === option
                    ? 'bg-white text-black'
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() => refetch()}
            className="h-9 border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            variant="outline"
            onClick={resetCurrentLayoutSlots}
            className="h-9 border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
          >
            Restaurar padrão
          </Button>

          <Button
            variant="outline"
            onClick={fillLayoutSequentially}
            className="h-9 border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
          >
            Preencher layout
          </Button>

          <Button
            variant="outline"
            onClick={fillOnlyEmptySlots}
            className="h-9 border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
          >
            Completar vazios
          </Button>

          <Button
            variant="outline"
            onClick={fillLayoutWithOnlineCâmeras}
            className="h-9 border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
          >
            Só online
          </Button>

          <Button
            variant="outline"
            onClick={() => void toggleFullscreen()}
            className="h-9 border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
          >
            {isFullscreen ? <Minimize2 className="mr-2 h-4 w-4" /> : <Maximize2 className="mr-2 h-4 w-4" />}
            Tela cheia
          </Button>
        </div>
      </header>

      {error ? (
        <div className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-100">
          Não foi possível carregar as câmeras operacionais.
        </div>
      ) : null}

      <section className="flex min-h-0 flex-1 gap-1 bg-black p-1">
        <div className={`grid min-h-0 flex-1 gap-1 ${getGridClass(activeLayout)}`}>
          {isLoading ? (
            Array.from({ length: activeLayout }).map((_, index) => (
              <div key={`loading-${index}`} className="flex min-h-0 items-center justify-center border border-white/10 bg-zinc-950 text-sm text-zinc-500">
                Carregando câmera...
              </div>
            ))
          ) : slotCâmeras.length === 0 ? (
            <div className="col-span-full row-span-full flex items-center justify-center border border-white/10 bg-zinc-950 text-zinc-500">
              <div className="text-center">
                <Camera className="mx-auto mb-3 h-12 w-12 opacity-40" />
                <p>Nenhuma câmera encontrada.</p>
              </div>
            </div>
          ) : (
            slotCâmeras.map((camera, slotIndex) => (
              <div
                key={focusedCamera ? camera?.id ?? `focus-${slotIndex}` : `slot-${layout}-${slotIndex}`}
                draggable={!focusedCameraId}
                onDragStart={(event) => {
                  setDraggedSlotIndex(slotIndex);
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', String(slotIndex));
                }}
                onDragOver={(event) => {
                  if (!focusedCameraId) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const draggedIndex = Number(event.dataTransfer.getData('text/plain') || draggedSlotIndex);
                  if (Number.isInteger(draggedIndex)) {
                    swapSlots(draggedIndex, slotIndex);
                  }
                  setDraggedSlotIndex(null);
                }}
                onDragEnd={() => setDraggedSlotIndex(null)}
                className={`group relative min-h-0 overflow-hidden border bg-zinc-950 text-left transition ${
                  camera ? getCameraTone(camera.status) : 'border-white/10 text-zinc-500'
                } ${focusedCameraId ? 'cursor-zoom-out' : 'cursor-grab active:cursor-grabbing'} ${
                  draggedSlotIndex === slotIndex ? 'scale-[0.985] opacity-60' : ''
                } ${selectedSlotIndex === slotIndex && !focusedCameraId ? 'ring-2 ring-cyan-300/70 ring-inset' : ''}`}
              >
                {!focusedCameraId ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedSlotIndex(slotIndex)}
                      className={`absolute left-2 top-2 z-20 rounded-lg border px-2 py-1 text-xs font-semibold backdrop-blur ${
                        selectedSlotIndex === slotIndex ? 'border-cyan-300/40 bg-cyan-300/20 text-cyan-50' : 'border-white/10 bg-black/75 text-white'
                      }`}
                    >
                      Posição {slotIndex + 1}
                    </button>
                    <select
                      value={camera?.id ?? ''}
                      onChange={(event) => setSlotCamera(slotIndex, event.target.value || null)}
                      onClick={(event) => event.stopPropagation()}
                      className="absolute right-2 top-2 z-20 max-w-[68%] rounded-lg border border-white/10 bg-black/75 px-2 py-1 text-xs text-white outline-none backdrop-blur"
                    >
                      <option value="" className="bg-zinc-950 text-white">Selecionar câmera</option>
                      {filteredCâmeras.map((option) => (
                        <option key={option.id} value={option.id} className="bg-zinc-950 text-white">
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}

                {camera ? (
                  <button
                    type="button"
                    onClick={() => setFocusedCameraId((current) => (current === camera.id ? null : camera.id))}
                    className="absolute inset-0 text-left"
                  >
                    <CameraFeed
                      camera={camera}
                      className={camera.status === 'OFFLINE' ? 'opacity-45' : ''}
                      imageClassName="h-full w-full object-cover"
                      emptyLabel="Sem imagem"
                      emptyHint="Aguardando stream ou snapshot."
                      compactErrors
                      showModeBadge
                      refreshMs={10000}
                    />

                    <div className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/85 to-transparent ${getTilePadding(activeLayout)}`}>
                      <div className="flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{camera.name}</p>
                          {activeLayout <= 4 ? (
                            <p className="mt-0.5 truncate text-xs text-zinc-400">{camera.location || 'Local não informado'}</p>
                          ) : null}
                          {!focusedCameraId && activeLayout <= 4 ? (
                            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-500">Arraste para trocar de posição</p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Badge className={`border px-2 py-0.5 text-[10px] ${getCameraTone(camera.status)}`}>{camera.status}</Badge>
                          {activeLayout <= 4 ? (
                            <Badge className="border-white/15 bg-black/60 px-2 py-0.5 text-[10px] text-zinc-200">
                              {getMediaLabel(camera)}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedSlotIndex(slotIndex)}
                    className="flex h-full w-full items-center justify-center text-xs text-zinc-600"
                  >
                    Sem câmera selecionada
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {!focusedCameraId ? (
          <aside className="hidden w-[320px] shrink-0 flex-col border border-white/10 bg-zinc-950/95 lg:flex">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">Banco de câmeras</p>
              <p className="mt-1 text-xs text-zinc-500">
                {selectedSlotIndex === null ? 'Selecione uma posição do layout.' : `Aplicando na posição ${selectedSlotIndex + 1}.`}
              </p>
              {activePresetId ? (
                <p className="mt-1 text-[11px] text-cyan-200">
                  Preset ativo: {savedPresets.find((preset) => preset.id === activePresetId)?.name}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-2 border-b border-white/10 px-4 py-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Layout</p>
                <p className="mt-1 text-lg font-semibold text-white">{filledSlotsCount}/{layout}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Online</p>
                <p className="mt-1 text-lg font-semibold text-white">{onlineCount}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Filtro</p>
                <p className="mt-1 text-lg font-semibold text-white">{availableBankCâmeras.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-b border-white/10 px-4 py-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Em uso</p>
                <p className="mt-1 text-lg font-semibold text-white">{assignedCount}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Sem imagem</p>
                <p className="mt-1 text-lg font-semibold text-white">{noMediaCount}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Presets</p>
                <p className="mt-1 text-lg font-semibold text-white">{savedPresets.length}</p>
              </div>
            </div>

            <div className="space-y-3 border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => focusAdjacentSlot('previous')}
                  disabled={layout <= 1}
                  className="h-8 border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10 disabled:opacity-50"
                >
                  Slot anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => focusAdjacentSlot('next')}
                  disabled={layout <= 1}
                  className="h-8 border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10 disabled:opacity-50"
                >
                  Próximo slot
                </Button>
                <Button
                  variant="outline"
                  onClick={clearSelectedSlot}
                  disabled={selectedSlotIndex === null}
                  className="h-8 border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10 disabled:opacity-50"
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  Limpar posição
                </Button>
              </div>

              <div className="flex gap-2">
                <input
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  placeholder="Nome do preset"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-zinc-600"
                />
                <Button
                  variant="outline"
                  onClick={saveCurrentPreset}
                  disabled={!presetName.trim()}
                  className="h-9 border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10 disabled:opacity-50"
                >
                  {savedPresets.some((preset) => normalizeString(preset.name) === normalizeString(presetName))
                    ? 'Atualizar'
                    : 'Salvar'}
                </Button>
              </div>

              {savedPresets.length ? (
                <div className="space-y-2">
                  {savedPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                        activePresetId === preset.id
                          ? 'border-cyan-300/30 bg-cyan-300/10'
                          : 'border-white/10 bg-white/[0.03]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-medium text-white">{preset.name}</p>
                        <p className="mt-0.5 text-[11px] text-zinc-500">
                          {preset.layout} posições | {preset.slots.filter(Boolean).length} ocupadas
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePreset(preset.id)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/10"
                      >
                        Excluir
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Rotação automática</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Alterna presets salvos ou páginas do banco lateral para monitor contínuo.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setAutoRotateEnabled((current) => !current)}
                    className="h-8 border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10"
                  >
                    {autoRotateEnabled ? <Square className="mr-2 h-3.5 w-3.5" /> : <Play className="mr-2 h-3.5 w-3.5" />}
                    {autoRotateEnabled ? 'Parar' : 'Iniciar'}
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { key: 'presets', label: 'Presets' },
                    { key: 'pages', label: 'Páginas' },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setAutoRotateMode(option.key as AutoRotateMode)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                        autoRotateMode === option.key
                          ? 'bg-cyan-300 text-black'
                          : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-zinc-500">Intervalo</span>
                  <select
                    value={String(autoRotateSeconds)}
                    onChange={(event) => setAutoRotateSeconds(Number(event.target.value))}
                    className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                  >
                    {[10, 15, 20, 30, 45, 60].map((seconds) => (
                      <option key={seconds} value={seconds}>
                        {seconds}s
                      </option>
                    ))}
                  </select>
                </div>

                <p className="mt-3 text-[11px] text-zinc-500">
                  {autoRotateMode === 'presets'
                    ? savedPresets.length
                      ? `Vai alternar entre ${savedPresets.length} preset(s) salvos.`
                      : 'Salve ao menos um preset para usar essa rotação.'
                    : bankTotalPages > 1
                      ? `Vai alternar entre ${bankTotalPages} páginas do banco lateral.`
                      : 'Há apenas uma página disponível para o filtro atual.'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 border-b border-white/10 px-4 py-3"> 
              {[
                { key: 'all', label: 'Todas' },
                { key: 'unassigned', label: 'Livres' },
                { key: 'assigned', label: 'Em uso' },
                { key: 'online', label: 'Online' },
                { key: 'no_media', label: 'Sem imagem' },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setBankFilter(option.key as BankFilter);
                    setBankPage(0);
                  }}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                    bankFilter === option.key
                      ? 'bg-white text-black'
                      : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {availableBankCâmeras.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-500">
                  Nenhuma câmera encontrada para esse filtro.
                </div>
              ) : (
                pagedBankCâmeras.map((camera) => {
                  const assignedSlot = visibleSlots.findIndex((cameraId) => cameraId === camera.id);
                  return (
                    <button
                      key={`${camera.id}-bank`}
                      type="button"
                      onClick={() => assignCameraToSelectedSlot(camera.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selectedSlotIndex !== null && visibleSlots[selectedSlotIndex] === camera.id
                          ? 'border-cyan-300/40 bg-cyan-300/10'
                          : 'border-white/10 bg-white/[0.03] hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{camera.name}</p>
                          <p className="mt-1 truncate text-xs text-zinc-500">{camera.location || 'Local não informado'}</p>
                        </div>
                        <Badge className={`border px-2 py-0.5 text-[10px] ${getCameraTone(camera.status)}`}>{camera.status}</Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                        <span>{getMediaLabel(camera)}</span>
                        <span>{assignedSlot >= 0 ? `Posição ${assignedSlot + 1}` : 'Fora do layout'}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-zinc-400">
              <span>
                Página {currentBankPage + 1} de {bankTotalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setBankPage((current) => Math.max(0, current - 1))}
                  disabled={currentBankPage === 0}
                  className="h-8 border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10 disabled:opacity-50"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setBankPage((current) => Math.min(bankTotalPages - 1, current + 1))}
                  disabled={currentBankPage >= bankTotalPages - 1}
                  className="h-8 border-white/10 bg-white/5 px-3 text-xs text-white hover:bg-white/10 disabled:opacity-50"
                >
                  Próxima
                </Button>
              </div>
            </div>
          </aside>
        ) : null}
      </section>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-zinc-950 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>Layout {activeLayout}</span>
          <span>|</span>
          <span>{filteredCâmeras.length} câmeras no filtro</span>
          {!focusedCamera ? (
            <>
              <span>|</span>
              <span>{filledSlotsCount}/{layout} posições ocupadas</span>
            </>
          ) : null}
          {focusedCamera ? (
            <>
              <span>|</span>
              <button type="button" onClick={() => setFocusedCameraId(null)} className="text-cyan-200 hover:text-cyan-100">
                Voltar ao mosaico
              </button>
            </>
          ) : null}
        </div>

        {!focusedCamera ? (
          <p className="text-xs text-zinc-500">
            Use o seletor de cada posição ou o banco lateral para escolher a câmera. Arraste uma posição sobre outra para trocar. Setas navegam entre slots e Esc limpa o foco atual.
          </p>
        ) : null}
      </footer>
    </main>
  );
}



