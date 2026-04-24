'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { CameraSnapshot } from '@/components/camera-snapshot';
import { CaptureGuidanceCard } from '@/components/capture-guidance-card';
import { getStructureTypeLabel } from '@/features/people/morador-normalizers';
import { camerasService } from '@/services/cameras.service';
import { getPersonByCpf, suggestPersonDocumentData } from '@/services/people.service';
import type { Unit } from '@/types/condominium';
import type { Camera } from '@/types/camera';
import type { PersonDocumentOcrSuggestionResponse, PersonDocumentType } from '@/types/person';
import { Camera as CameraIcon, Upload, Video } from 'lucide-react';

export type MoradorFormData = {
  nome: string;
  email: string;
  telefone: string;
  documento: string;
  documentType: PersonDocumentType | '';
  birthDate: string;
  allowMinorFaceSync: boolean;
  guardianName: string;
  guardianDocument: string;
  guardianRelationship: string;
  condominio: string;
  estrutura: string;
  unitId: string;
  tipo: string;
  status: string;
  photoUrl: string;
  photoSource: 'upload' | 'webcam' | 'camera';
  cameraId: string;
};

type DocumentCaptureSource = 'upload' | 'webcam' | 'camera';

type MoradorFormProps = {
  initialData?: Partial<MoradorFormData>;
  onSubmit: (data: MoradorFormData) => Promise<void> | void;
  onCancel: () => void;
  loading?: boolean;
  condominiumLocked?: boolean;
  availableUnits?: Unit[];
  catalogLoading?: boolean;
  emailReadOnly?: boolean;
  emailHint?: string;
  cameras?: Camera[];
  existingResidents?: Array<{
    id: string;
    nome: string;
    documento?: string;
    unidade?: string;
    condominio?: string;
  }>;
};

const defaultValues: MoradorFormData = {
  nome: '',
  email: '',
  telefone: '',
  documento: '',
  documentType: '',
  birthDate: '',
  allowMinorFaceSync: false,
  guardianName: '',
  guardianDocument: '',
  guardianRelationship: '',
  condominio: '',
  estrutura: '',
  unitId: '',
  tipo: 'morador',
  status: 'ativo',
  photoUrl: '',
  photoSource: 'upload',
  cameraId: '',
};

function getInitialValues(initialData?: Partial<MoradorFormData>): MoradorFormData {
  return {
    ...defaultValues,
    ...initialData,
  };
}

function getUniqueStructures(units: Unit[]) {
  const seen = new Set<string>();

  return units
    .filter((unit) => unit.structure?.label)
    .map((unit) => `${unit.structureType ?? 'STREET'}::${unit.structure!.label}`)
    .filter((label) => {
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    })
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function formatUnitOptionLabel(unit: Unit) {
  return [unit.condominium?.name, unit.structure?.label, unit.label].filter(Boolean).join(' / ') || unit.label;
}

function maskDocumentValue(value: string) {
  const digits = value.replace(/\D+/g, '').slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function maskPhoneValue(value: string) {
  const digits = value.replace(/\D+/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export default function MoradorForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  condominiumLocked = false,
  availableUnits = [],
  catalogLoading = false,
  emailReadOnly = false,
  emailHint,
  cameras = [],
  existingResidents = [],
}: MoradorFormProps) {
  const [form, setForm] = useState<MoradorFormData>(() => getInitialValues(initialData));
  const [localError, setLocalError] = useState<string | null>(null);
  const [cameraCaptureLoadingId, setCameraCaptureLoadingId] = useState<string | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [documentCaptureSource, setDocumentCaptureSource] = useState<DocumentCaptureSource>('upload');
  const [documentImageUrl, setDocumentImageUrl] = useState('');
  const [documentCameraId, setDocumentCameraId] = useState('');
  const [documentCameraCaptureLoadingId, setDocumentCameraCaptureLoadingId] = useState<string | null>(null);
  const [documentWebcamActive, setDocumentWebcamActive] = useState(false);
  const documentVideoRef = useRef<HTMLVideoElement | null>(null);
  const documentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const documentStreamRef = useRef<MediaStream | null>(null);
  const [documentOcrLoading, setDocumentOcrLoading] = useState(false);
  const [documentOcrResult, setDocumentOcrResult] = useState<PersonDocumentOcrSuggestionResponse | null>(null);
  const [cpfLookupLoading, setCpfLookupLoading] = useState(false);
  const [cpfLookupMessage, setCpfLookupMessage] = useState<string | null>(null);

  const structureOptions = useMemo(() => getUniqueStructures(availableUnits), [availableUnits]);

  const filteredUnits = useMemo(() => {
    const [selectedType, selectedLabel] = form.estrutura.split('::');

    return availableUnits
      .filter((unit) =>
        !form.estrutura ||
        (unit.structureType ?? 'STREET') === selectedType && unit.structure?.label === selectedLabel
      )
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [availableUnits, form.estrutura]);

  const availableCameras = useMemo(
    () => cameras.filter((camera) => camera.snapshotUrl || camera.streamUrl),
    [cameras]
  );
  const initialDocumentDigits = useMemo(
    () => String(initialData?.documento ?? '').replace(/\D+/g, ''),
    [initialData?.documento]
  );
  const documentDigits = useMemo(
    () => form.documento.replace(/\D+/g, ''),
    [form.documento]
  );
  const existingResidentMatch = useMemo(() => {
    if (!documentDigits) return null;
    return existingResidents.find((resident) => {
      const residentDigits = String(resident.documento ?? '').replace(/\D+/g, '');
      if (!residentDigits || residentDigits !== documentDigits) return false;
      if (initialDocumentDigits && residentDigits === initialDocumentDigits) return false;
      return true;
    }) ?? null;
  }, [documentDigits, existingResidents, initialDocumentDigits]);
  const isMinor = useMemo(() => {
    if (!form.birthDate) return false;
    const birthDate = new Date(`${form.birthDate}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDelta = today.getMonth() - birthDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age < 18;
  }, [form.birthDate]);

  const handleChange = (field: keyof MoradorFormData, value: string | boolean) => {
    if (localError) {
      setLocalError(null);
    }

    const normalizedValue =
      field === 'documento' && typeof value === 'string'
        ? maskDocumentValue(value)
        : field === 'telefone' && typeof value === 'string'
          ? maskPhoneValue(value)
          : value;

    setForm((prev) => {
      const next = {
        ...prev,
        [field]: normalizedValue as never,
      };

      if (field === 'estrutura') {
        next.unitId = '';
      }

      if (field === 'photoSource' && value !== 'camera') {
        next.cameraId = '';
      }

      if (field === 'allowMinorFaceSync' && value === false) {
        next.guardianName = '';
        next.guardianDocument = '';
        next.guardianRelationship = '';
      }

      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const documentDigits = form.documento.replace(/\D+/g, '');
    const phoneDigits = form.telefone.replace(/\D+/g, '');

    if (documentDigits.length > 0 && ![11, 14].includes(documentDigits.length)) {
      setLocalError('O documento deve ter 11 ou 14 dígitos.');
      return;
    }

    if (existingResidentMatch) {
      setLocalError(`Já existe cadastro para este documento: ${existingResidentMatch.nome}. Revise antes de salvar.`);
      return;
    }

    if (phoneDigits.length > 0 && phoneDigits.length < 10) {
      setLocalError('O telefone deve ter ao menos 10 dígitos.');
      return;
    }

    if (isMinor && form.allowMinorFaceSync) {
      if (!form.guardianName.trim() || !form.guardianDocument.replace(/\D+/g, '').trim()) {
        setLocalError('Informe nome e documento do responsável para autorizar o facial do menor.');
        return;
      }
    }

    if (!form.unitId) {
      setLocalError('Selecione uma unidade existente.');
      return;
    }

    await onSubmit(form);
  };

  const handlePhotoChange = (file: File | null) => {
    if (localError) {
      setLocalError(null);
    }

    if (!file) {
      setForm((prev) => ({
        ...prev,
        photoUrl: '',
        cameraId: '',
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLocalError('A foto deve ter no máximo 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        photoUrl: typeof reader.result === 'string' ? reader.result : '',
        photoSource: 'upload',
        cameraId: '',
      }));
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      documentStreamRef.current?.getTracks().forEach((track) => track.stop());
      documentStreamRef.current = null;
    };
  }, []);

  const startWebcam = async () => {
    try {
      setLocalError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      setWebcamActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setLocalError('Não foi possível acessar a webcam.');
    }
  };

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
  };

  const handleDocumentPhotoChange = (file: File | null) => {
    if (localError) {
      setLocalError(null);
    }
    setDocumentOcrResult(null);

    if (!file) {
      setDocumentImageUrl('');
      setDocumentCameraId('');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLocalError('A imagem do documento deve ter no máximo 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDocumentImageUrl(typeof reader.result === 'string' ? reader.result : '');
      setDocumentCaptureSource('upload');
      setDocumentCameraId('');
    };
    reader.readAsDataURL(file);
  };

  const startDocumentWebcam = async () => {
    try {
      setLocalError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      });

      documentStreamRef.current?.getTracks().forEach((track) => track.stop());
      documentStreamRef.current = stream;
      setDocumentWebcamActive(true);

      if (documentVideoRef.current) {
        documentVideoRef.current.srcObject = stream;
        await documentVideoRef.current.play();
      }
    } catch {
      setLocalError('Não foi possível acessar a webcam para capturar o documento.');
    }
  };

  const stopDocumentWebcam = () => {
    documentStreamRef.current?.getTracks().forEach((track) => track.stop());
    documentStreamRef.current = null;
    if (documentVideoRef.current) {
      documentVideoRef.current.srcObject = null;
    }
    setDocumentWebcamActive(false);
  };

  const captureDocumentWebcam = () => {
    if (!documentVideoRef.current || !documentCanvasRef.current) {
      setLocalError('Webcam indisponível para capturar o documento.');
      return;
    }

    const canvas = documentCanvasRef.current;
    const video = documentVideoRef.current;

    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 640;
    const context = canvas.getContext('2d');

    if (!context) {
      setLocalError('Não foi possível processar a imagem do documento.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setDocumentImageUrl(canvas.toDataURL('image/jpeg', 0.92));
    setDocumentCaptureSource('webcam');
    setDocumentCameraId('');
    setDocumentOcrResult(null);
    stopDocumentWebcam();
  };

  const selectDocumentCamera = async (camera: Camera) => {
    if (!camera.snapshotUrl && !camera.streamUrl) {
      setLocalError('Esta câmera não possui snapshot disponível para o documento.');
      return;
    }

    setDocumentCameraCaptureLoadingId(camera.id);
    setLocalError(null);

    try {
      const response = await camerasService.capturePhoto(camera.id);
      setDocumentImageUrl(response.photoUrl);
      setDocumentCaptureSource('camera');
      setDocumentCameraId(camera.id);
      setDocumentOcrResult(null);
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : 'Não foi possível capturar a imagem do documento usando a câmera do condomínio.'
      );
    } finally {
      setDocumentCameraCaptureLoadingId(null);
    }
  };

  const captureWebcam = () => {
    if (!videoRef.current || !canvasRef.current) {
      setLocalError('Webcam indisponível para captura.');
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');

    if (!context) {
      setLocalError('Não foi possível processar a imagem da webcam.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setForm((prev) => ({
      ...prev,
      photoUrl: canvas.toDataURL('image/jpeg', 0.92),
      photoSource: 'webcam',
      cameraId: '',
    }));
    stopWebcam();
  };

  const selectCondominiumCamera = async (camera: Camera) => {
    if (!camera.snapshotUrl && !camera.streamUrl) {
      setLocalError('Esta câmera não possui snapshot disponível.');
      return;
    }

    setCameraCaptureLoadingId(camera.id);
    setLocalError(null);

    try {
      const response = await camerasService.capturePhoto(camera.id);

      setForm((prev) => ({
        ...prev,
        photoUrl: response.photoUrl,
        photoSource: 'camera',
        cameraId: camera.id,
      }));
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : 'Não foi possível capturar a foto usando a câmera do condomínio.'
      );
    } finally {
      setCameraCaptureLoadingId(null);
    }
  };

  const applyDocumentOcrSuggestion = (result: PersonDocumentOcrSuggestionResponse) => {
    setForm((prev) => ({
      ...prev,
      nome: result.suggestedName?.trim() || prev.nome,
      documento: result.suggestedDocument ? maskDocumentValue(result.suggestedDocument) : prev.documento,
      documentType: result.suggestedDocumentType ?? prev.documentType,
      birthDate:
        result.suggestedBirthDate ??
        (typeof result.prefill?.birthDate === 'string' ? result.prefill.birthDate : prev.birthDate) ??
        prev.birthDate,
    }));
  };

  const handleDocumentOcr = async () => {
    if (!documentImageUrl && !documentCameraId) {
      setLocalError('Capture ou envie o documento antes de usar o OCR.');
      return;
    }

    setDocumentOcrLoading(true);
    setLocalError(null);

    try {
      const result = await suggestPersonDocumentData({
        photoBase64: documentImageUrl.startsWith('data:') ? documentImageUrl : null,
        photoUrl: documentImageUrl.startsWith('data:') ? null : documentImageUrl || null,
        cameraId: documentCaptureSource === 'camera' ? documentCameraId || null : null,
        fileName: form.documento?.trim() ? `documento-${form.documento.trim()}` : 'documento-morador',
      });

      setDocumentOcrResult(result);
      applyDocumentOcrSuggestion(result);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Não foi possível ler o documento com OCR.');
    } finally {
      setDocumentOcrLoading(false);
    }
  };

  useEffect(() => {
    if (documentDigits.length !== 11) {
      setCpfLookupLoading(false);
      setCpfLookupMessage(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setCpfLookupLoading(true);
      setCpfLookupMessage(null);

      try {
        const person = await getPersonByCpf(documentDigits);

        setForm((prev) => ({
          ...prev,
          nome: prev.nome.trim() ? prev.nome : person.name ?? '',
          birthDate: prev.birthDate || person.birthDate || '',
          documentType: prev.documentType || person.documentType || 'CPF',
        }));
        setCpfLookupMessage('Consulta por CPF localizada na base oficial.');
      } catch {
        setCpfLookupMessage('CPF não localizado na base oficial.');
      } finally {
        setCpfLookupLoading(false);
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [documentDigits]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {localError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {localError}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Documento</span>
          <input
            type="text"
            inputMode="numeric"
            value={form.documento}
            onChange={(e) => handleChange('documento', e.target.value)}
            className={`w-full rounded-2xl border bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 ${
              existingResidentMatch ? 'border-amber-400/40' : 'border-white/10'
            }`}
            placeholder="CPF ou CNPJ"
            required
          />
          {existingResidentMatch ? (
            <p className="text-xs text-amber-200">
              Documento já encontrado na base: {existingResidentMatch.nome}
              {existingResidentMatch.unidade ? ` | ${existingResidentMatch.unidade}` : ''}
              {existingResidentMatch.condominio ? ` | ${existingResidentMatch.condominio}` : ''}.
            </p>
          ) : documentDigits.length === 11 ? (
            <p className="text-xs text-slate-500">
              {cpfLookupLoading
                ? 'Consultando CPF na base oficial...'
                : cpfLookupMessage || 'Ao digitar um CPF válido, o sistema consulta nome completo e data de nascimento na base oficial.'}
            </p>
          ) : null}
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Data de nascimento</span>
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => handleChange('birthDate', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          />
          <p className="text-xs text-slate-500">Campo disponível nesta tela. Se a alteração não aparecer logo depois, atualize a página e tente novamente.</p>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Tipo do documento</span>
          <select
            value={form.documentType}
            onChange={(e) => handleChange('documentType', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          >
            <option value="">Não informado</option>
            <option value="CPF">CPF</option>
            <option value="RG">RG</option>
            <option value="CNH">CNH</option>
          </select>
        </label>

        <div className="md:col-span-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleChange('photoSource', 'upload')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                    form.photoSource === 'upload' ? 'bg-white text-slate-950' : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('photoSource', 'webcam')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                    form.photoSource === 'webcam' ? 'bg-white text-slate-950' : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  <Video className="h-4 w-4" />
                  Webcam
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('photoSource', 'camera')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                    form.photoSource === 'camera' ? 'bg-white text-slate-950' : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  <CameraIcon className="h-4 w-4" />
                  Câmera do condomínio
                </button>
              </div>

              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                {form.photoSource === 'upload' ? (
                  <AvatarUpload
                    onChange={handlePhotoChange}
                    preview={form.photoUrl || undefined}
                  />
                ) : null}

                {form.photoSource === 'webcam' ? (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                      {webcamActive ? (
                        <video
                          ref={videoRef}
                          className="h-40 w-60 object-cover"
                          autoPlay
                          muted
                          playsInline
                        />
                      ) : form.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.photoUrl}
                          alt="Captura da webcam"
                          className="h-40 w-60 object-cover"
                        />
                      ) : (
                        <div className="flex h-40 w-60 items-center justify-center text-sm text-slate-400">
                          Webcam inativa
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!webcamActive ? (
                        <button
                          type="button"
                          onClick={startWebcam}
                          className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
                        >
                          Ativar webcam
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={captureWebcam}
                            className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
                          >
                            Capturar
                          </button>
                          <button
                            type="button"
                            onClick={stopWebcam}
                            className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/15"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                ) : null}

                {form.photoSource === 'camera' ? (
                  <div className="w-full space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      {availableCameras.map((camera) => (
                        <button
                          key={camera.id}
                          type="button"
                          onClick={() => void selectCondominiumCamera(camera)}
                          className={`overflow-hidden rounded-2xl border text-left transition ${
                            form.cameraId === camera.id
                              ? 'border-white bg-white/10'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          {camera.snapshotUrl ? (
                            <CameraSnapshot
                              cameraId={camera.id}
                              alt={camera.name}
                              fallbackSrc={camera.snapshotUrl}
                              className="h-32 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-32 items-center justify-center bg-slate-900 text-sm text-slate-400">
                              Sem snapshot
                            </div>
                          )}
                          <div className="p-3">
                            <p className="text-sm font-medium text-white">{camera.name}</p>
                            <p className="mt-1 text-xs text-slate-400">{camera.location || 'Local não informado'}</p>
                            {cameraCaptureLoadingId === camera.id ? (
                              <p className="mt-2 text-xs text-cyan-200">Capturando foto...</p>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                    {!availableCameras.length ? (
                      <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
                        Nenhuma câmera com snapshot ou stream disponível para capturar o rosto.
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <CaptureGuidanceCard
                  title="Captura guiada do morador"
                  description="Use uma foto frontal, nitida e bem enquadrada. Isso reduz falha de cadastro e melhora a sincronizacao facial."
                  tips={[
                    'Rosto centralizado e sem corte',
                    'Evite tremor e contraluz',
                    'Prefira fundo limpo',
                    'Revise antes de salvar',
                  ]}
                  footer="Upload, webcam e câmera do condomínio seguem o mesmo padrão de foto para manter o cadastro consistente."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">Captura do documento</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Esta área prepara o cadastro para leitura documental por webcam ou câmera. O preenchimento automático será liberado em uma próxima etapa.
                  </p>
                </div>
                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-100">
                  OCR documental ativo
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleDocumentOcr()}
                  disabled={documentOcrLoading || (!documentImageUrl && !documentCameraId)}
                  className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {documentOcrLoading ? 'Lendo documento...' : 'Ler documento com OCR'}
                </button>
                {documentOcrResult ? (
                  <button
                    type="button"
                    onClick={() => applyDocumentOcrSuggestion(documentOcrResult)}
                    className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/15"
                  >
                    Reaplicar sugestão
                  </button>
                ) : null}
              </div>

              {documentOcrResult ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Sugestão do OCR</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-slate-500">Nome sugerido</p>
                      <p className="mt-1 text-white">{documentOcrResult.suggestedName || 'Não identificado'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Documento sugerido</p>
                      <p className="mt-1 text-white">
                        {documentOcrResult.suggestedDocument || 'Não identificado'}
                        {documentOcrResult.suggestedDocumentType ? ` | ${documentOcrResult.suggestedDocumentType}` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Data de nascimento sugerida</p>
                      <p className="mt-1 text-white">{documentOcrResult.suggestedBirthDate || 'Não identificada'}</p>
                    </div>
                  </div>
                  {documentOcrResult.birthDateCandidates?.length ? (
                    <div className="mt-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Datas candidatas</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {documentOcrResult.birthDateCandidates.map((candidate) => (
                          <button
                            key={`${candidate.birthDate}-${candidate.score}`}
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, birthDate: candidate.birthDate }))}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 transition hover:bg-white/10"
                          >
                            {candidate.birthDate} | {(candidate.score * 100).toFixed(0)}%
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {typeof documentOcrResult.confidence === 'number' ? (
                    <p className="mt-3 text-xs text-slate-500">Confiança estimada: {(documentOcrResult.confidence * 100).toFixed(0)}%</p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDocumentCaptureSource('upload')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                    documentCaptureSource === 'upload' ? 'bg-white text-slate-950' : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setDocumentCaptureSource('webcam')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                    documentCaptureSource === 'webcam' ? 'bg-white text-slate-950' : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  <Video className="h-4 w-4" />
                  Webcam
                </button>
                <button
                  type="button"
                  onClick={() => setDocumentCaptureSource('camera')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                    documentCaptureSource === 'camera' ? 'bg-white text-slate-950' : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  <CameraIcon className="h-4 w-4" />
                  Câmera do condomínio
                </button>
              </div>

              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                {documentCaptureSource === 'upload' ? (
                  <AvatarUpload onChange={handleDocumentPhotoChange} preview={documentImageUrl || undefined} />
                ) : null}

                {documentCaptureSource === 'webcam' ? (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                      {documentWebcamActive ? (
                        <video
                          ref={documentVideoRef}
                          className="h-40 w-60 object-cover"
                          autoPlay
                          muted
                          playsInline
                        />
                      ) : documentImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={documentImageUrl}
                          alt="Documento capturado"
                          className="h-40 w-60 object-cover"
                        />
                      ) : (
                        <div className="flex h-40 w-60 items-center justify-center text-sm text-slate-400">
                          Webcam inativa
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!documentWebcamActive ? (
                        <button
                          type="button"
                          onClick={startDocumentWebcam}
                          className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
                        >
                          Ativar webcam
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={captureDocumentWebcam}
                            className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
                          >
                            Capturar documento
                          </button>
                          <button
                            type="button"
                            onClick={stopDocumentWebcam}
                            className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white transition hover:bg-white/15"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                    <canvas ref={documentCanvasRef} className="hidden" />
                  </div>
                ) : null}

                {documentCaptureSource === 'camera' ? (
                  <div className="w-full space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      {availableCameras.map((camera) => (
                        <button
                          key={`${camera.id}-document`}
                          type="button"
                          onClick={() => void selectDocumentCamera(camera)}
                          className={`overflow-hidden rounded-2xl border text-left transition ${
                            documentCameraId === camera.id
                              ? 'border-white bg-white/10'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          {camera.snapshotUrl ? (
                            <CameraSnapshot
                              cameraId={camera.id}
                              alt={camera.name}
                              fallbackSrc={camera.snapshotUrl}
                              className="h-32 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-32 items-center justify-center bg-slate-900 text-sm text-slate-400">
                              Sem snapshot
                            </div>
                          )}
                          <div className="p-3">
                            <p className="text-sm font-medium text-white">{camera.name}</p>
                            <p className="mt-1 text-xs text-slate-400">{camera.location || 'Local não informado'}</p>
                            {documentCameraCaptureLoadingId === camera.id ? (
                              <p className="mt-2 text-xs text-cyan-200">Capturando documento...</p>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                    {!availableCameras.length ? (
                      <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
                        Nenhuma câmera com snapshot ou stream disponível para capturar o documento.
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <CaptureGuidanceCard
                  title="Captura guiada do documento"
                  description="Enquadre o documento inteiro, com boa luz e sem reflexo. Isso prepara o auto preenchimento do cadastro quando o OCR documental for conectado."
                  tips={[
                    'Mostre frente inteira do documento',
                    'Evite reflexo, plastico brilhante e tremor',
                    'Mantenha os dados legíveis e centralizados',
                    'Revise nome e documento antes de salvar',
                  ]}
                  footer="A captura já pode ser feita por aqui. O preenchimento automático do documento será liberado em uma próxima etapa."
                />
              </div>
            </div>
          </div>
        </div>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Nome</span>
          <input
            type="text"
            value={form.nome}
            onChange={(e) => handleChange('nome', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            placeholder="Nome completo"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">E-mail</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            placeholder="email@exemplo.com"
            disabled={emailReadOnly}
          />
          {emailHint ? <p className="text-xs text-slate-500">{emailHint}</p> : null}
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Telefone</span>
          <input
            type="text"
            inputMode="tel"
            value={form.telefone}
            onChange={(e) => handleChange('telefone', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            placeholder="(00) 00000-0000"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Condomínio</span>
          <input
            type="text"
            value={form.condominio}
            onChange={(e) => handleChange('condominio', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            placeholder="Ex.: Reserva das Palmeiras"
            required
            disabled={condominiumLocked}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Estrutura</span>
          <select
            value={form.estrutura}
            onChange={(e) => handleChange('estrutura', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            disabled={catalogLoading || structureOptions.length === 0}
            required
          >
            <option value="">
              {catalogLoading ? 'Carregando estruturas...' : 'Selecione uma estrutura'}
            </option>
            {structureOptions.map((option) => (
              <option key={option} value={option}>
                {(() => {
                  const [type, label] = option.split('::');
                  const typeLabel = getStructureTypeLabel((type as Unit['structureType']) ?? 'STREET');
                  return [typeLabel, label].filter(Boolean).join(' / ');
                })()}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Unidade</span>
          <select
            value={form.unitId}
            onChange={(e) => handleChange('unitId', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            disabled={catalogLoading || filteredUnits.length === 0}
            required
          >
            <option value="">
              {catalogLoading ? 'Carregando unidades...' : 'Selecione uma unidade existente'}
            </option>
            {filteredUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {formatUnitOptionLabel(unit)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Tipo</span>
          <select
            value={form.tipo}
            onChange={(e) => handleChange('tipo', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          >
            <option value="morador">Morador</option>
            <option value="proprietario">Proprietário</option>
            <option value="locatario">Locatário</option>
            <option value="funcionario">Funcionário</option>
            <option value="visitante">Visitante</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Status</span>
          <select
            value={form.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="pendente">Pendente</option>
            <option value="bloqueado">Bloqueado</option>
          </select>
        </label>

        {isMinor ? (
          <div className="md:col-span-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-medium">Cadastro de menor de idade</p>
            <p className="mt-2">
              Por padrão, a foto de menores não é enviada para os leitores faciais. Se houver autorização do responsável, marque a opção abaixo e informe os dados do responsável.
            </p>
            <label className="mt-4 flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.allowMinorFaceSync}
                onChange={(e) => handleChange('allowMinorFaceSync', e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                Autorizo o envio da foto deste menor para a integração facial.
              </span>
            </label>
            {form.allowMinorFaceSync ? (
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm text-amber-50">Nome do responsável</span>
                  <input
                    type="text"
                    value={form.guardianName}
                    onChange={(e) => handleChange('guardianName', e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                    placeholder="Nome completo"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-amber-50">Documento do responsável</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.guardianDocument}
                    onChange={(e) => handleChange('guardianDocument', maskDocumentValue(e.target.value))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                    placeholder="CPF ou CNPJ"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-amber-50">Relação</span>
                  <input
                    type="text"
                    value={form.guardianRelationship}
                    onChange={(e) => handleChange('guardianRelationship', e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                    placeholder="Ex.: pai, mãe, responsável legal"
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
        O morador será vinculado a uma unidade já cadastrada. A criação de unidade deve ser feita separadamente.
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Salvando...' : 'Salvar morador'}
        </button>
      </div>
    </form>
  );
}

