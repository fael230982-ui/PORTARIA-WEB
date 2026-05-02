'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BellRing,
  ClipboardList,
  Clock3,
  Copy,
  ImageUp,
  Package,
  Plus,
  RefreshCw,
  ScanSearch,
  Search,
  UserCheck,
} from 'lucide-react';
import { useProtectedRoute } from '@/hooks/use-protected-route';
import { useAllDeliveries } from '@/hooks/use-deliveries';
import { useResidenceCatalog } from '@/hooks/use-residence-catalog';
import { useAllPeople, useUnitResidents } from '@/hooks/use-people';
import { useOfflineOperationQueue } from '@/hooks/use-offline-operation-queue';
import {
  createDelivery,
  ocrDeliveryPhoto,
  ocrDeliveryLabel,
  renotifyDelivery,
  updateDeliveryStatus,
  uploadDeliveryPhoto,
  validateDeliveryWithdrawal,
} from '@/services/deliveries.service';
import { createClientRequestId } from '@/features/offline/client-request-id';
import { CaptureGuidanceCard } from '@/components/capture-guidance-card';
import {
  enqueueOfflineOperation,
  isOfflineQueueCandidateError,
} from '@/features/offline/offline-operation-queue';
import { getApiErrorMessage } from '@/features/http/api-error';
import {
  getDeliveryWithdrawalCode,
  getDeliveryWithdrawalQrUrl,
  getDeliveryPhotoUrl,
  hasDeliverySecureWithdrawal,
  getDeliveryStatusBadgeClass,
  getDeliveryStatusLabel,
  matchesDeliverySearch,
  normalizeDeliveries,
  normalizeDeliveryStatus,
  safeDeliveryText,
  type DeliveryRow,
} from '@/features/deliveries/delivery-normalizers';
import { CrudModal } from '@/components/admin/CrudModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { DeliveryPayload, DeliveryStatus } from '@/types/delivery';
import type { Person } from '@/types/person';
import type { Unit } from '@/types/condominium';

type Filters = {
  search: string;
  status: 'all' | DeliveryStatus;
  sort: 'newest' | 'oldest' | 'delay';
};

type DeliveryViewMode = 'list' | 'unit';

type DeliveryFormData = {
  recipientUnitId: string;
  recipientPersonId: string;
  deliveryCompany: string;
  trackingCode: string;
  receivedAt: string;
  photoUrl: string;
};

type DeliveryOcrReview = {
  confidenceLabel: string | null;
  reviewMode: 'auto' | 'review';
  appliedFields: string[];
  suggestedUnitName: string | null;
  suggestedResidentName: string | null;
  trackingCode: string | null;
  deliveryCompany: string | null;
};

const initialForm: DeliveryFormData = {
  recipientUnitId: '',
  recipientPersonId: '',
  deliveryCompany: '',
  trackingCode: '',
  receivedAt: '',
  photoUrl: '',
};

const DELIVERY_OCR_AUTOFILL_CONFIDENCE = 0.85;
const DELIVERY_OCR_REVIEW_CONFIDENCE = 0.65;

type DeliverySnapshotCache = {
  deliveries: DeliveryRow[];
  people: Person[];
  units: Array<{ id: string; label: string }>;
  cachedAt: string | null;
};

function getDeliverySnapshotKey(userId?: string | null) {
  return userId ? `admin-deliveries-snapshot:${userId}` : null;
}

function readDeliverySnapshot(userId?: string | null): DeliverySnapshotCache {
  if (typeof window === 'undefined') {
    return { deliveries: [], people: [], units: [], cachedAt: null };
  }

  const key = getDeliverySnapshotKey(userId);
  if (!key) {
    return { deliveries: [], people: [], units: [], cachedAt: null };
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { deliveries: [], people: [], units: [], cachedAt: null };
    const parsed = JSON.parse(raw) as Partial<DeliverySnapshotCache>;
    return {
      deliveries: Array.isArray(parsed.deliveries) ? parsed.deliveries : [],
      people: Array.isArray(parsed.people) ? parsed.people : [],
      units: Array.isArray(parsed.units) ? parsed.units : [],
      cachedAt: typeof parsed.cachedAt === 'string' ? parsed.cachedAt : null,
    };
  } catch {
    return { deliveries: [], people: [], units: [], cachedAt: null };
  }
}

function getDeliverySnapshotSignature(snapshot: DeliverySnapshotCache) {
  return JSON.stringify({
    deliveries: snapshot.deliveries,
    people: snapshot.people,
    units: snapshot.units,
  });
}

function persistDeliverySnapshot(userId: string, snapshot: DeliverySnapshotCache) {
  if (typeof window === 'undefined') return false;

  const key = getDeliverySnapshotKey(userId);
  if (!key) return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(snapshot));
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      try {
        window.localStorage.removeItem(key);
        window.localStorage.setItem(key, JSON.stringify(snapshot));
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }
}

function formatUnitLabel(input: {
  condominiumName?: string | null;
  structureLabel?: string | null;
  unitLabel?: string | null;
}) {
  return [input.condominiumName, input.structureLabel, input.unitLabel].filter(Boolean).join(' / ');
}

function getErrorMessage(error: unknown, fallback: string) {
  return getApiErrorMessage(error, {
    fallback,
    byStatus: {
      403: 'Você não tem permissão para registrar encomenda nessa unidade.',
      500: 'Não foi possível salvar a encomenda agora. Tente novamente em instantes.',
    },
    keywordMap: [
      { includes: ['unitid', 'recipientunitid'], message: 'Selecione uma unidade valida para registrar a encomenda.' },
      { includes: ['recipientpersonid'], message: 'Selecione um destinatário válido ou deixe o vínculo de pessoa em branco.' },
      { includes: ['deliverycompany'], message: 'Informe a transportadora ou origem da encomenda.' },
    ],
  });
}

function getDeliveryPreviewUrl(delivery: DeliveryRow) {
  return getDeliveryPhotoUrl(delivery);
}

function DeliveryThumbnail({ delivery, label, onClick }: { delivery: DeliveryRow; label: string; onClick?: () => void }) {
  const [hidden, setHidden] = useState(false);
  const previewUrl = getDeliveryPreviewUrl(delivery);

  if (!previewUrl || hidden) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-[10px] uppercase tracking-[0.16em] text-slate-500"
      >
        Sem foto
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60"
    >
      <img
        src={previewUrl}
        alt={label}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setHidden(true)}
      />
    </button>
  );
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toIsoOrNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatConfidenceLabel(confidence?: number | null) {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) return null;
  return `${Math.round(confidence * 100)}%`;
}

function shouldAutoFillOcrRecipient(confidence?: number | null, hasDirectSuggestion = false) {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) {
    return hasDirectSuggestion;
  }

  if (confidence >= DELIVERY_OCR_AUTOFILL_CONFIDENCE) {
    return true;
  }

  if (hasDirectSuggestion && confidence >= DELIVERY_OCR_REVIEW_CONFIDENCE) {
    return true;
  }

  return false;
}

function getDeliveryAgeInfo(receivedAt?: string | null) {
  if (!receivedAt) {
    return {
      label: 'Tempo indisponível',
      delayed: false,
      urgent: false,
      className: 'border-white/10 bg-white/5 text-slate-300',
    };
  }

  const receivedTime = new Date(receivedAt).getTime();
  if (Number.isNaN(receivedTime)) {
    return {
      label: 'Tempo indisponível',
      delayed: false,
      urgent: false,
      className: 'border-white/10 bg-white/5 text-slate-300',
    };
  }

  const hours = Math.max(0, Math.floor((Date.now() - receivedTime) / 3_600_000));
  const days = Math.floor(hours / 24);
  const label = days > 0 ? `Aguardando ha ${days} dia(s)` : `Aguardando ha ${hours}h`;

  if (hours >= 48) {
    return {
      label,
      delayed: true,
      urgent: true,
      className: 'border-red-500/30 bg-red-500/10 text-red-100',
    };
  }

  if (hours >= 24) {
    return {
      label,
      delayed: true,
      urgent: false,
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    };
  }

  return {
    label,
    delayed: false,
    urgent: false,
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  };
}

function DeliveryForm({
  value,
  onChange,
  onPhotoSelected,
  onOcr,
  onSubmit,
  onCancel,
  loading,
  ocrLoading,
  errorMessage,
  ocrReview,
  units,
  people,
  hasSelectedPhoto,
}: {
  value: DeliveryFormData;
  onChange: (field: keyof DeliveryFormData, nextValue: string) => void;
  onPhotoSelected: (file: File | null) => void;
  onOcr: () => Promise<void> | void;
  onSubmit: () => Promise<void> | void;
  onCancel: () => void;
  loading: boolean;
  ocrLoading: boolean;
  errorMessage?: string | null;
  ocrReview?: DeliveryOcrReview | null;
  units: Array<{ id: string; label: string }>;
  people: Person[];
  hasSelectedPhoto: boolean;
}) {
  const { data: unitResidents = [], isLoading: loadingUnitResidents } = useUnitResidents(value.recipientUnitId, Boolean(value.recipientUnitId));
  const filteredPeople = useMemo(() => {
    if (unitResidents.length > 0) {
      return unitResidents.map((person) => ({ id: person.id, name: person.name }));
    }
    return people
      .filter((person) => !value.recipientUnitId || person.unitId === value.recipientUnitId)
      .map((person) => ({ id: person.id, name: person.name }));
  }, [people, unitResidents, value.recipientUnitId]);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit();
      }}
      className="space-y-5"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Unidade de destino</span>
          <select
            value={value.recipientUnitId}
            onChange={(event) => onChange('recipientUnitId', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            required
          >
            <option value="">Selecione uma unidade</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Destinatário</span>
          <select
            value={value.recipientPersonId}
            onChange={(event) => onChange('recipientPersonId', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          >
            <option value="">Não vincular a uma pessoa específica</option>
            {loadingUnitResidents ? <option value="">Carregando moradores da unidade...</option> : null}
            {filteredPeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Transportadora</span>
          <input
            value={value.deliveryCompany}
            onChange={(event) => onChange('deliveryCompany', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="Ex.: Correios, Mercado Livre, Amazon"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Código de rastreio</span>
          <input
            value={value.trackingCode}
            onChange={(event) => onChange('trackingCode', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="Opcional"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Entrada na portaria</span>
          <input
            type="datetime-local"
            value={value.receivedAt}
            onChange={(event) => onChange('receivedAt', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">URL da foto</span>
          <input
            value={value.photoUrl}
            onChange={(event) => onChange('photoUrl', event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            placeholder="Opcional"
          />
        </label>
      </div>

      <CaptureGuidanceCard
        title="OCR e foto da encomenda"
        description="Leia a etiqueta e envie a foto para concluir o cadastro da encomenda."
        tips={[
          'Enquadre a etiqueta inteira',
          'Evite sombra e reflexo',
          'Mantenha a mao estavel',
          'Revise a imagem antes do OCR',
        ]}
        footer="Captura automática ainda não foi ligada no Portaria Web. Nesta etapa, o foco é padronizar a captura guiada para reduzir erro operacional."
      />
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-50">
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15">
            <ImageUp className="h-4 w-4" />
            Selecionar foto
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => onPhotoSelected(event.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            onClick={() => void onOcr()}
            disabled={ocrLoading || !hasSelectedPhoto}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ScanSearch className="h-4 w-4" />
            {ocrLoading ? 'Lendo etiqueta...' : 'Aplicar OCR'}
          </button>
          {hasSelectedPhoto ? (
            <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              Foto pronta para upload
            </span>
          ) : null}
        </div>
      </div>

      {ocrReview ? (
        <div className={`rounded-2xl border p-4 text-sm ${
          ocrReview.reviewMode === 'auto'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-50'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-50'
        }`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em]">
              {ocrReview.reviewMode === 'auto' ? 'Autopreenchimento' : 'Revisao manual'}
            </span>
            {ocrReview.confidenceLabel ? (
              <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px]">
                Confianca {ocrReview.confidenceLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-3">
            {ocrReview.reviewMode === 'auto'
              ? 'A etiqueta foi considerada confiável o suficiente para aplicar os vínculos automaticamente.'
              : 'A leitura trouxe sinais suficientes para ajudar, mas exige revisão antes de salvar.'}
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-white/60">Sugestões</p>
              <p className="mt-2">Unidade: {ocrReview.suggestedUnitName ?? 'Sem sugestão direta'}</p>
              <p className="mt-1">Destinatário: {ocrReview.suggestedResidentName ?? 'Sem sugestão direta'}</p>
              <p className="mt-1">Transportadora: {ocrReview.deliveryCompany ?? 'Não identificada'}</p>
              <p className="mt-1">Rastreio: {ocrReview.trackingCode ?? 'Não identificado'}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-white/60">Campos aplicados</p>
              <p className="mt-2">
                {ocrReview.appliedFields.length ? ocrReview.appliedFields.join(', ') : 'Nenhum campo foi aplicado automaticamente.'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? 'Salvando...' : 'Registrar encomenda'}
        </button>
      </div>
    </form>
  );
}

function StatusForm({
  currentStatus,
  selected,
  onSubmit,
  onValidateWithdrawal,
  onCancel,
  loading,
  errorMessage,
}: {
  currentStatus: DeliveryStatus;
  selected: DeliveryRow;
  onSubmit: (status: DeliveryStatus) => Promise<void> | void;
  onValidateWithdrawal: (code: string) => Promise<boolean>;
  onCancel: () => void;
  loading: boolean;
  errorMessage?: string | null;
}) {
  const [status, setStatus] = useState<DeliveryStatus>(currentStatus);
  const [manualWithdrawalConfirmed, setManualWithdrawalConfirmed] = useState(false);
  const [withdrawalCodeInput, setWithdrawalCodeInput] = useState('');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [validationOk, setValidationOk] = useState(false);
  const [validatingWithdrawal, setValidatingWithdrawal] = useState(false);
  const withdrawalToken = getDeliveryWithdrawalCode(selected);
  const needsTokenWarning = status === 'WITHDRAWN' && !withdrawalToken && !getDeliveryWithdrawalQrUrl(selected);
  const canSubmit =
    !loading &&
    (status !== 'WITHDRAWN' || (!withdrawalToken && manualWithdrawalConfirmed));

  async function validateCode() {
    setValidatingWithdrawal(true);
    setValidationMessage(null);
    setValidationOk(false);

    try {
      const valid = await onValidateWithdrawal(withdrawalCodeInput.trim());
      setValidationOk(valid);
      setValidationMessage(valid ? 'Código validado e retirada confirmada.' : 'Código inválido para esta encomenda.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível validar o código.';
      setValidationMessage(message);
    } finally {
      setValidatingWithdrawal(false);
    }
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!canSubmit) return;
        await onSubmit(status);
      }}
      className="space-y-5"
    >
      <label className="space-y-2">
        <span className="text-sm text-slate-300">Novo status</span>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as DeliveryStatus);
            setManualWithdrawalConfirmed(false);
          }}
          className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
        >
          <option value="RECEIVED">Aguardando retirada</option>
          <option value="NOTIFIED">Aviso enviado ao morador</option>
          <option value="WITHDRAWN">Retirada pelo morador</option>
        </select>
      </label>

      {status === 'WITHDRAWN' ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-medium">Validação de retirada</p>
          <p className="mt-2">
            {withdrawalToken
              ? 'Solicite ao morador o código ou QR Code no app e valide abaixo.'
              : 'O código ou QR Code de retirada ainda não está disponível para esta encomenda.'}
          </p>
          {needsTokenWarning ? (
            <label className="mt-3 flex items-start gap-3 rounded-xl border border-amber-300/20 bg-slate-950/30 p-3 text-sm text-amber-50">
              <input
                type="checkbox"
                checked={manualWithdrawalConfirmed}
                onChange={(event) => setManualWithdrawalConfirmed(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-amber-300/40 bg-slate-950"
              />
              <span>Confirmo que validei manualmente a identidade do morador ou responsável antes da retirada.</span>
            </label>
          ) : null}
          {withdrawalToken ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/30 p-3">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.16em] text-amber-100">Código apresentado pelo morador</span>
                <input
                  value={withdrawalCodeInput}
                  onChange={(event) => {
                    setWithdrawalCodeInput(event.target.value);
                    setValidationOk(false);
                    setValidationMessage(null);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none"
                  placeholder="Digite o código informado pelo morador"
                />
              </label>
              <button
                type="button"
                onClick={() => void validateCode()}
                disabled={validatingWithdrawal || !withdrawalCodeInput.trim()}
                className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {validatingWithdrawal ? 'Validando...' : 'Validar e confirmar retirada'}
              </button>
              {validationMessage ? (
                <p className={validationOk ? 'mt-2 text-xs text-emerald-200' : 'mt-2 text-xs text-red-200'}>
                  {validationMessage}
                </p>
              ) : null}
            </div>
          ) : null}
          {needsTokenWarning ? (
            <p className="mt-2 text-amber-50">
              Antes de usar baixa segura, confirme a liberação do código ou QR Code de validação.
            </p>
          ) : null}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15">
          Cancelar
        </button>
        <button type="submit" disabled={!canSubmit} className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? 'Atualizando...' : status === 'WITHDRAWN' && withdrawalToken ? 'Use a validacao por codigo' : status === 'WITHDRAWN' ? 'Confirmar retirada manual' : 'Atualizar status'}
        </button>
      </div>
    </form>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
}) {
  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-400" />
      </CardHeader>
      <CardContent>
        <div className="text-center text-2xl font-semibold tabular-nums">{value}</div>
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function EncomendasPage() {
  const router = useRouter();
  const { user, canAccess, isChecking } = useProtectedRoute({
    allowedRoles: ['ADMIN', 'GERENTE', 'MASTER', 'OPERADOR', 'CENTRAL'],
  });
  const [activeUnitId, setActiveUnitId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('unitId') ?? '';
  });
  const {
    data: deliveriesData,
    isLoading: deliveriesLoading,
    error: deliveriesError,
    refetch: refetchDeliveries,
  } = useAllDeliveries({ limit: 100, recipientUnitId: activeUnitId || undefined });
  const { units } = useResidenceCatalog(Boolean(user));
  const { data: peopleData } = useAllPeople({ limit: 100, enabled: Boolean(user) });

  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    sort: 'delay',
  });
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [viewMode, setViewMode] = useState<DeliveryViewMode>('list');
  const [openCreate, setOpenCreate] = useState(false);
  const [openStatus, setOpenStatus] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selected, setSelected] = useState<DeliveryRow | null>(null);
  const [detailsDelivery, setDetailsDelivery] = useState<DeliveryRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<DeliveryFormData>(initialForm);
  const [ocrReview, setOcrReview] = useState<DeliveryOcrReview | null>(null);
  const [handledInitialQuery, setHandledInitialQuery] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [runningOcr, setRunningOcr] = useState(false);
  const [snapshotCache, setSnapshotCache] = useState<DeliverySnapshotCache>(() => readDeliverySnapshot(null));
  const snapshotSignatureRef = useRef(
    getDeliverySnapshotSignature({ deliveries: [], people: [], units: [], cachedAt: null })
  );
  const {
    pendingCount: offlinePendingCount,
    failedCount: offlineFailedCount,
    isOnline,
    isFlushing: offlineSyncing,
    lastFlushSummary,
    flushNow: flushOfflineNow,
  } = useOfflineOperationQueue(Boolean(user));

  const deliveries = useMemo(() => {
    const live = deliveriesData ? normalizeDeliveries(deliveriesData) : [];
    return live.length ? live : !isOnline ? snapshotCache.deliveries : live;
  }, [deliveriesData, isOnline, snapshotCache.deliveries]);
  const people = useMemo(
    () => (peopleData?.data?.length ? peopleData.data : !isOnline ? snapshotCache.people : peopleData?.data ?? []),
    [isOnline, peopleData, snapshotCache.people]
  );

  const unitOptions = useMemo(
    () =>
      (units.length ? units : !isOnline ? ((snapshotCache.units as unknown) as Unit[]) : units)
        .map((unit) => ({
          id: unit.id,
          label: formatUnitLabel({
            condominiumName: unit.condominium?.name,
            structureLabel: unit.structure?.label,
            unitLabel: unit.label,
          }) || unit.legacyUnitId || unit.label,
        }))
        .filter((unit) => Boolean(unit.label))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [isOnline, snapshotCache.units, units]
  );

  const unitLabelMap = useMemo(() => new Map(unitOptions.map((unit) => [unit.id, unit.label])), [unitOptions]);
  const activeUnitLabel = activeUnitId ? unitLabelMap.get(activeUnitId) ?? 'Unidade filtrada' : '';
  const peopleMap = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);

  const filteredDeliveries = useMemo(
    () =>
      deliveries
        .filter((row) => {
        const extraTerms = [
          unitLabelMap.get(row.recipientUnitId) ?? '',
          row.recipientPersonName ?? '',
          peopleMap.get(row.recipientPersonId ?? '')?.name ?? '',
        ];
        const statusOk = filters.status === 'all' || normalizeDeliveryStatus(row.status) === filters.status;
        const pendingOk = !pendingOnly || normalizeDeliveryStatus(row.status) !== 'WITHDRAWN';
        const delayOk = !delayedOnly || (normalizeDeliveryStatus(row.status) !== 'WITHDRAWN' && getDeliveryAgeInfo(row.receivedAt).delayed);
        const urgentOk = !urgentOnly || (normalizeDeliveryStatus(row.status) !== 'WITHDRAWN' && getDeliveryAgeInfo(row.receivedAt).urgent);
        return statusOk && pendingOk && delayOk && urgentOk && matchesDeliverySearch(row, filters.search, extraTerms);
        })
        .sort((left, right) => {
          const leftTime = left.receivedAt ? new Date(left.receivedAt).getTime() : 0;
          const rightTime = right.receivedAt ? new Date(right.receivedAt).getTime() : 0;
          if (filters.sort === 'oldest') return leftTime - rightTime;
          if (filters.sort === 'newest') return rightTime - leftTime;

          const leftUrgency = Number(getDeliveryAgeInfo(left.receivedAt).urgent) * 2 + Number(getDeliveryAgeInfo(left.receivedAt).delayed);
          const rightUrgency = Number(getDeliveryAgeInfo(right.receivedAt).urgent) * 2 + Number(getDeliveryAgeInfo(right.receivedAt).delayed);
          if (leftUrgency !== rightUrgency) return rightUrgency - leftUrgency;
          return leftTime - rightTime;
        }),
    [delayedOnly, deliveries, filters, pendingOnly, peopleMap, unitLabelMap, urgentOnly]
  );

  const groupedDeliveries = useMemo(() => {
    const groups = new Map<string, { unitLabel: string; deliveries: DeliveryRow[] }>();

    filteredDeliveries.forEach((delivery) => {
      const unitLabel = unitLabelMap.get(delivery.recipientUnitId) ?? 'Unidade não identificada';
      const current = groups.get(delivery.recipientUnitId) ?? { unitLabel, deliveries: [] };
      current.deliveries.push(delivery);
      groups.set(delivery.recipientUnitId, current);
    });

    return Array.from(groups.entries())
      .map(([unitId, group]) => ({
        unitId,
        unitLabel: group.unitLabel,
        deliveries: group.deliveries,
        pendingCount: group.deliveries.filter((item) => normalizeDeliveryStatus(item.status) !== 'WITHDRAWN').length,
        urgentCount: group.deliveries.filter((item) => normalizeDeliveryStatus(item.status) !== 'WITHDRAWN' && getDeliveryAgeInfo(item.receivedAt).urgent).length,
      }))
      .sort((left, right) => {
        if (left.urgentCount !== right.urgentCount) return right.urgentCount - left.urgentCount;
        if (left.pendingCount !== right.pendingCount) return right.pendingCount - left.pendingCount;
        return left.unitLabel.localeCompare(right.unitLabel, 'pt-BR');
      });
  }, [filteredDeliveries, unitLabelMap]);

  const stats = useMemo(() => {
    const total = deliveries.length;
    const recebidas = deliveries.filter((item) => normalizeDeliveryStatus(item.status) === 'RECEIVED').length;
    const notificadas = deliveries.filter((item) => normalizeDeliveryStatus(item.status) === 'NOTIFIED').length;
    const retiradas = deliveries.filter((item) => normalizeDeliveryStatus(item.status) === 'WITHDRAWN').length;
    const atrasadas24 = deliveries.filter(
      (item) => normalizeDeliveryStatus(item.status) !== 'WITHDRAWN' && getDeliveryAgeInfo(item.receivedAt).delayed
    ).length;
    const atrasadas48 = deliveries.filter(
      (item) => normalizeDeliveryStatus(item.status) !== 'WITHDRAWN' && getDeliveryAgeInfo(item.receivedAt).urgent
    ).length;
    const semCodigo = deliveries.filter((item) => normalizeDeliveryStatus(item.status) !== 'WITHDRAWN' && !hasDeliverySecureWithdrawal(item)).length;
    return { total, recebidas, notificadas, retiradas, atrasadas24, atrasadas48, semCodigo };
  }, [deliveries]);

  useEffect(() => {
    const nextSnapshot = readDeliverySnapshot(user?.id ?? null);
    snapshotSignatureRef.current = getDeliverySnapshotSignature(nextSnapshot);
    setSnapshotCache(nextSnapshot);
  }, [user?.id]);

  useEffect(() => {
    if (handledInitialQuery || unitOptions.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const unitId = params.get('unitId');
    if (!unitId) {
      setHandledInitialQuery(true);
      return;
    }

    const unit = unitOptions.find((item) => item.id === unitId);
    if (!unit) {
      setHandledInitialQuery(true);
      return;
    }

    setCreateForm({
      ...initialForm,
      recipientUnitId: unit.id,
      receivedAt: toDatetimeLocal(new Date().toISOString()),
    });
    setActiveUnitId(unit.id);
    setFilters((current) => ({
      ...current,
      search: current.search || unit.label,
    }));

    if (params.get('new') === '1') {
      setOpenCreate(true);
    }

    setHandledInitialQuery(true);
  }, [handledInitialQuery, unitOptions]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const key = getDeliverySnapshotKey(user.id);
    if (!key) return;
    const currentSnapshot = readDeliverySnapshot(user.id);

    const nextSnapshot: DeliverySnapshotCache = {
      deliveries: deliveriesData ? normalizeDeliveries(deliveriesData) : currentSnapshot.deliveries,
      people: peopleData?.data ?? currentSnapshot.people,
      units: unitOptions.length ? unitOptions : currentSnapshot.units,
      cachedAt: new Date().toISOString(),
    };
    const nextSnapshotSignature = getDeliverySnapshotSignature(nextSnapshot);

    if (nextSnapshotSignature === snapshotSignatureRef.current) {
      return;
    }

    if (persistDeliverySnapshot(user.id, nextSnapshot)) {
      snapshotSignatureRef.current = nextSnapshotSignature;
      setSnapshotCache((current) =>
        getDeliverySnapshotSignature(current) === nextSnapshotSignature ? current : nextSnapshot
      );
    }
  }, [deliveriesData, peopleData?.data, unitOptions, user]);

  function closeCreate() {
    setOpenCreate(false);
    setCreateForm(initialForm);
    setSelectedPhotoFile(null);
    setOcrReview(null);
    setFormError(null);
  }

  function openNew() {
    setCreateForm((current) => ({
      ...initialForm,
      recipientUnitId: unitOptions.length === 1 ? unitOptions[0].id : current.recipientUnitId,
      receivedAt: toDatetimeLocal(new Date().toISOString()),
    }));
    setFormError(null);
    setOcrReview(null);
    setOpenCreate(true);
  }

  function handleSelectPhoto(file: File | null) {
    setSelectedPhotoFile(file);
    setOcrReview(null);

    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCreateForm((current) => ({
        ...current,
        photoUrl: typeof reader.result === 'string' ? reader.result : current.photoUrl,
      }));
    };
    reader.readAsDataURL(file);
  }

  async function handleApplyOcr() {
    if (!selectedPhotoFile) {
      setFormError('Selecione uma foto antes de aplicar OCR.');
      return;
    }
    if (!isOnline) {
      setFormError('A leitura da etiqueta exige conexão no momento. A foto pode ser salva e a encomenda concluída depois.');
      return;
    }

    setRunningOcr(true);
    setFormError(null);
    try {
      const result = createForm.photoUrl.startsWith('data:')
        ? await ocrDeliveryLabel({
            photoBase64: createForm.photoUrl,
            fileName: selectedPhotoFile.name,
          })
        : await ocrDeliveryPhoto(selectedPhotoFile);
      const suggestedUnitId =
        result.suggestedUnitId?.trim() ||
        result.unitSuggestions?.find((item) => item.unitId?.trim())?.unitId ||
        '';
      const suggestedPersonId =
        result.suggestedResidentId?.trim() ||
        result.residentSuggestions?.find((item) => item.id?.trim())?.id ||
        '';
      const confidenceLabel = formatConfidenceLabel(result.confidence);
      const autoFillRecipient = shouldAutoFillOcrRecipient(
        result.confidence,
        Boolean(result.suggestedUnitId?.trim() || result.suggestedResidentId?.trim())
      );
      const appliedFields = [
        result.deliveryCompany?.trim() || result.carrierHint?.trim() ? 'transportadora' : null,
        result.trackingCode?.trim() || result.trackingCodeCandidates?.find((item) => item.trim())?.trim() ? 'rastreio' : null,
        autoFillRecipient && suggestedUnitId ? 'unidade' : null,
        autoFillRecipient && suggestedPersonId ? 'destinatario' : null,
      ].filter((item): item is string => Boolean(item));

      setCreateForm((current) => ({
        ...current,
        deliveryCompany: result.deliveryCompany?.trim() || result.carrierHint?.trim() || current.deliveryCompany,
        trackingCode:
          result.trackingCode?.trim() ||
          result.trackingCodeCandidates?.find((item) => item.trim())?.trim() ||
          current.trackingCode,
        recipientUnitId: autoFillRecipient && suggestedUnitId ? suggestedUnitId : current.recipientUnitId,
        recipientPersonId: autoFillRecipient && suggestedPersonId ? suggestedPersonId : current.recipientPersonId,
      }));
      setOcrReview({
        confidenceLabel,
        reviewMode: autoFillRecipient ? 'auto' : 'review',
        appliedFields,
        suggestedUnitName:
          result.suggestedUnitName?.trim() ||
          unitOptions.find((item) => item.id === suggestedUnitId)?.label ||
          null,
        suggestedResidentName:
          result.suggestedResidentName?.trim() ||
          people.find((item) => item.id === suggestedPersonId)?.name ||
          null,
        trackingCode:
          result.trackingCode?.trim() ||
          result.trackingCodeCandidates?.find((item) => item.trim())?.trim() ||
          null,
        deliveryCompany: result.deliveryCompany?.trim() || result.carrierHint?.trim() || null,
      });
      setPageMessage(
        autoFillRecipient
          ? `OCR aplicado na etiqueta da encomenda${confidenceLabel ? ` com confiança de ${confidenceLabel}` : ''}. Unidade e destinatário foram sugeridos automaticamente.`
          : `OCR aplicado na etiqueta da encomenda${confidenceLabel ? ` com confiança de ${confidenceLabel}` : ''}. Revise manualmente unidade e destinatário antes de salvar.`
      );
    } catch (error) {
      setOcrReview(null);
      setFormError(getErrorMessage(error, 'Não foi possível ler a etiqueta agora.'));
    } finally {
      setRunningOcr(false);
    }
  }

  function openStatusModal(delivery: DeliveryRow) {
    setSelected(delivery);
    setStatusError(null);
    setOpenStatus(true);
  }

  function openDetailsModal(delivery: DeliveryRow) {
    setDetailsDelivery(delivery);
    setOpenDetails(true);
  }

  async function handleRefresh() {
    await refetchDeliveries();
  }

  async function handleCreate() {
    if (!user) return;
    setSaving(true);
    setFormError(null);
    try {
      let photoUrl = createForm.photoUrl.trim() || null;

      if (selectedPhotoFile && photoUrl?.startsWith('data:')) {
        if (!isOnline) {
          throw new Error('O envio da foto exige conexão no momento. Salve a encomenda sem foto ou aguarde a reconexão.');
        }
        const uploaded = await uploadDeliveryPhoto(photoUrl, selectedPhotoFile.name);
        photoUrl = uploaded.photoUrl;
      }

      const payload: DeliveryPayload = {
        recipientUnitId: createForm.recipientUnitId,
        recipientPersonId: createForm.recipientPersonId || null,
        deliveryCompany: createForm.deliveryCompany.trim(),
        trackingCode: createForm.trackingCode.trim() || null,
        status: 'RECEIVED',
        receivedAt: toIsoOrNull(createForm.receivedAt),
        receivedBy: user.id,
        photoUrl,
        clientRequestId: createClientRequestId('delivery'),
      };
      try {
        await createDelivery(payload);
      } catch (error) {
        if (!isOfflineQueueCandidateError(error)) throw error;
        enqueueOfflineOperation({
          kind: 'DELIVERY_CREATE',
          payload,
          description: `Registrar encomenda de ${payload.deliveryCompany}`,
        });
        setPageMessage('Sem conexão. A encomenda foi salva localmente e será sincronizada ao reconectar.');
      }
      closeCreate();
      await handleRefresh();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Não foi possível registrar a encomenda.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStatus(status: DeliveryStatus) {
    if (!user || !selected) return;
    setSaving(true);
    setStatusError(null);
    try {
      const payload = {
        status,
        withdrawnBy: status === 'WITHDRAWN' ? user.id : null,
      };
      try {
        await updateDeliveryStatus(selected.id, payload);
      } catch (error) {
        if (!isOfflineQueueCandidateError(error)) throw error;
        enqueueOfflineOperation({
          kind: 'DELIVERY_STATUS_UPDATE',
          payload: {
            deliveryId: selected.id,
            payload,
          },
          description: `Atualizar status da encomenda para ${status}`,
        });
        setPageMessage('Sem conexão. A atualização de status foi salva localmente.');
      }
      setOpenStatus(false);
      setSelected(null);
      await handleRefresh();
    } catch (error) {
      setStatusError(getErrorMessage(error, 'Não foi possível atualizar o status da encomenda.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleValidateWithdrawal(code: string) {
    if (!selected) return false;
    if (!isOnline) {
      setStatusError('A validação por código exige conexão no momento. Aguarde reconectar ou use a retirada manual excepcional.');
      return false;
    }
    const response = await validateDeliveryWithdrawal(selected.id, { code });
    if (response.valid) {
      setOpenStatus(false);
      setSelected(null);
      setPageMessage('Código validado e retirada confirmada.');
      await handleRefresh();
    }
    return Boolean(response.valid);
  }

  async function handleResendNotification(delivery: DeliveryRow) {
    if (!user) return;
    const unitLabel = unitLabelMap.get(delivery.recipientUnitId) ?? 'unidade selecionada';
    const confirmed = window.confirm(`Reenviar aviso para ${unitLabel}?`);
    if (!confirmed) return;

    setNotifyingId(delivery.id);
    setPageMessage(null);
    setStatusError(null);

    try {
      try {
        const response = await renotifyDelivery(delivery.id);
        setPageMessage(
          response.notifiedUsersCount > 0
            ? `Aviso reenviado para ${response.notifiedUsersCount} destinatário(s).`
            : 'Tentativa de reenvio concluída, mas sem destinatários notificados.'
        );
      } catch (error) {
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status === 404 || status === 405 || status === 501) {
          await updateDeliveryStatus(delivery.id, {
            status: 'NOTIFIED',
            withdrawnBy: null,
          });
          setPageMessage('Ambiente sem /renotify. Reenvio tratado pelo fluxo compatível de status.');
          await handleRefresh();
          return;
        }
        if (!isOfflineQueueCandidateError(error)) throw error;
        enqueueOfflineOperation({
          kind: 'DELIVERY_STATUS_UPDATE',
          payload: {
            deliveryId: delivery.id,
            payload: {
              status: 'NOTIFIED',
              withdrawnBy: null,
            },
          },
          description: 'Reenviar aviso de encomenda',
        });
        setPageMessage('Sem conexão. O reenvio do aviso foi salvo localmente.');
      }
      await handleRefresh();
    } catch (error) {
      setPageMessage(getErrorMessage(error, 'Não foi possível reenviar o aviso agora.'));
    } finally {
      setNotifyingId(null);
    }
  }

  async function handleCopyWithdrawalCode(delivery: DeliveryRow) {
    const hasSecureToken = hasDeliverySecureWithdrawal(delivery);
    setPageMessage(
      hasSecureToken
        ? 'Por segurança, o código de retirada não é exibido nem copiado pela portaria. Solicite a apresentação no app do morador.'
        : 'Esta encomenda ainda não possui código ou QR Code de retirada.'
    );
  }

  if (isChecking) {
    return <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white">Carregando painel...</div>;
  }
  if (!canAccess || !user) return null;

  return (
    <div className="space-y-6 text-white">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Administração</p>
            <h1 className="mt-2 text-2xl font-semibold">Encomendas</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Registre, acompanhe e atualize encomendas com foto, etiqueta e aviso ao destinatário.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/encomendas/retirada-rapida" className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20">
              Retirada rápida
            </Link>
            <Button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-slate-950 hover:bg-slate-200">
              <Plus className="h-4 w-4" />
              Nova encomenda
            </Button>
            <Button variant="outline" onClick={handleRefresh} className="inline-flex items-center gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>
      </section>

      {!isOnline || offlinePendingCount || offlineFailedCount ? (
        <section className={`rounded-3xl border p-4 text-sm ${!isOnline ? 'border-amber-500/25 bg-amber-500/10 text-amber-100' : offlineFailedCount ? 'border-red-500/25 bg-red-500/10 text-red-100' : 'border-cyan-500/25 bg-cyan-500/10 text-cyan-100'}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium">
                {!isOnline ? 'Modo offline em encomendas' : offlinePendingCount ? 'Sincronização pendente de encomendas' : 'Falhas definitivas na fila offline'}
              </p>
              <p className="mt-1 text-xs opacity-90">
                {!isOnline
                  ? `A tela usa o último snapshot salvo${snapshotCache.cachedAt ? ` em ${new Date(snapshotCache.cachedAt).toLocaleString('pt-BR')}` : ''}.`
                  : offlinePendingCount
                    ? `${offlinePendingCount} item(ns) aguardam envio automático.${lastFlushSummary?.succeeded ? ` ${lastFlushSummary.succeeded} já foram sincronizados nesta rodada.` : ''}`
                    : `${offlineFailedCount} item(ns) precisam de revisão na fila offline da operação.`}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void flushOfflineNow()}
              disabled={!isOnline || offlineSyncing || offlinePendingCount === 0}
              className="border-white/10 bg-black/20 text-white hover:bg-white/10"
            >
              {offlineSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
            </Button>
          </div>
        </section>
      ) : null}

      {activeUnitId ? (
        <div className="flex flex-col gap-3 rounded-3xl border border-cyan-500/25 bg-cyan-500/10 p-4 text-sm text-cyan-50 md:flex-row md:items-center md:justify-between">
          <span>Filtro ativo: {activeUnitLabel}</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { router.push(`/admin/unidades?unitId=${encodeURIComponent(activeUnitId)}`); }} className="rounded-xl border border-cyan-200/20 bg-cyan-200/10 px-3 py-2 text-xs font-medium text-cyan-50 transition hover:bg-cyan-200/20">
              Abrir unidade
            </button>
            <button type="button" onClick={() => { router.push('/admin/encomendas'); }} className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15">
              Limpar filtro
            </button>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Total" value={deliveriesLoading ? '...' : String(stats.total)} icon={Package} hint="Todas as encomendas" />
        <StatCard title="Aguardando" value={deliveriesLoading ? '...' : String(stats.recebidas)} icon={Clock3} hint="Aguardando retirada" />
        <StatCard title="Avisos enviados" value={deliveriesLoading ? '...' : String(stats.notificadas)} icon={BellRing} hint="Morador avisado" />
        <StatCard title="24h+" value={deliveriesLoading ? '...' : String(stats.atrasadas24)} icon={Clock3} hint="Precisam reforço" />
        <StatCard title="48h+" value={deliveriesLoading ? '...' : String(stats.atrasadas48)} icon={Clock3} hint="Prioridade alta" />
        <StatCard title="Sem código" value={deliveriesLoading ? '...' : String(stats.semCodigo)} icon={UserCheck} hint="Retirada ainda insegura" />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_0.8fr]">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Buscar por unidade, destinatário, rastreio ou transportadora..."
              className="border-0 bg-transparent p-0 text-white shadow-none placeholder:text-slate-500 focus-visible:ring-0"
            />
          </label>
          <label className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as Filters['status'] }))}
              className="w-full bg-transparent text-sm outline-none"
            >
              <option value="all">Todos os status</option>
              <option value="RECEIVED">Aguardando retirada</option>
              <option value="NOTIFIED">Aviso enviado</option>
              <option value="WITHDRAWN">Retiradas</option>
            </select>
          </label>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Código e QR Code de retirada não são exibidos para a portaria por questões de segurança. Apenas o morador tem acesso a essa informação.
          </div>
          <label className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <select
              value={filters.sort}
              onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value as Filters['sort'] }))}
              className="w-full bg-transparent text-sm outline-none"
            >
              <option value="delay">Priorizar atrasadas</option>
              <option value="oldest">Mais antigas primeiro</option>
              <option value="newest">Mais recentes primeiro</option>
            </select>
          </label>
        </div>
        <label className="mt-3 flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={delayedOnly}
            onChange={(event) => setDelayedOnly(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-slate-900"
          />
          Mostrar somente encomendas aguardando há mais de 24h
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: 'Todas', status: 'all' as const, delayed: false },
            { label: 'Aguardando', status: 'RECEIVED' as const, delayed: false },
            { label: 'Avisadas', status: 'NOTIFIED' as const, delayed: false },
            { label: 'Retiradas', status: 'WITHDRAWN' as const, delayed: false },
            { label: '24h+', status: 'all' as const, delayed: true },
          ].map((item) => (
            <button
              key={`${item.label}-${item.status}-${item.delayed}`}
              type="button"
              onClick={() => {
                setFilters((current) => ({ ...current, status: item.status }));
                setDelayedOnly(item.delayed);
              }}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                filters.status === item.status && delayedOnly === item.delayed
                  ? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-50'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPendingOnly((current) => !current)}
            className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
              pendingOnly
                ? 'border-emerald-300/40 bg-emerald-300/15 text-emerald-50'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            Somente pendentes
          </button>
          <button
            type="button"
            onClick={() => setUrgentOnly((current) => !current)}
            className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
              urgentOnly
                ? 'border-rose-300/40 bg-rose-300/15 text-rose-50'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            Somente críticas
          </button>
          <button
            type="button"
            onClick={() => setViewMode((current) => (current === 'list' ? 'unit' : 'list'))}
            className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
              viewMode === 'unit'
                ? 'border-violet-300/40 bg-violet-300/15 text-violet-50'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {viewMode === 'unit' ? 'Agrupado por unidade' : 'Lista simples'}
          </button>
          {stats.semCodigo > 0 ? (
            <span className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-100">
              {stats.semCodigo} sem código
            </span>
          ) : null}
        </div>
      </section>

      {deliveriesError ? (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-100">
          Não foi possível carregar as encomendas.
        </div>
      ) : null}

      {pageMessage ? (
        <div className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-5 text-sm text-cyan-100">
          {pageMessage}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Lista de encomendas</h2>
            <p className="text-sm text-slate-400">{filteredDeliveries.length} registro(s) encontrado(s)</p>
          </div>
          <ClipboardList className="h-5 w-5 text-slate-400" />
        </div>

        {filteredDeliveries.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">Nenhuma encomenda encontrada.</div>
        ) : viewMode === 'unit' ? (
          <div className="divide-y divide-white/10">
            {groupedDeliveries.map((group) => (
              <div key={group.unitId} className="px-5 py-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{group.unitLabel}</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {group.deliveries.length} encomenda(s) | {group.pendingCount} pendente(s)
                      {group.urgentCount ? ` | ${group.urgentCount} crítica(s)` : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => { router.push(`/admin/unidades?unitId=${encodeURIComponent(group.unitId)}`); }}
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    Abrir unidade
                  </Button>
                </div>

                <div className="space-y-3">
                  {group.deliveries.map((delivery) => {
                    const recipient = delivery.recipientPersonName || (delivery.recipientPersonId ? peopleMap.get(delivery.recipientPersonId)?.name : null);
                    const ageInfo = getDeliveryAgeInfo(delivery.receivedAt);
                    return (
                      <div
                        key={delivery.id}
                        className={`grid gap-4 rounded-2xl border px-4 py-4 lg:grid-cols-[auto_1.15fr_1fr_0.7fr_auto] lg:items-center ${
                          ageInfo.urgent && normalizeDeliveryStatus(delivery.status) !== 'WITHDRAWN'
                            ? 'border-red-500/30 bg-red-500/10'
                            : 'border-white/10 bg-slate-950/35'
                        }`}
                      >
                        <DeliveryThumbnail
                          delivery={delivery}
                          label={`Foto da encomenda de ${recipient || 'destinatário não identificado'}`}
                          onClick={() => openDetailsModal(delivery)}
                        />
                        <div>
                          <p className="font-medium text-white">{recipient || 'Sem destinatário vinculado'}</p>
                          <p className="text-sm text-slate-400">{safeDeliveryText(delivery.deliveryCompany, 'Sem transportadora')}</p>
                        </div>
                        <div className="text-sm text-slate-300">
                          <p>{safeDeliveryText(delivery.trackingCode, 'Sem rastreio')}</p>
                          <p className="text-slate-500">{toDatetimeLocal(delivery.receivedAt).replace('T', ' ') || 'Horário indisponível'}</p>
                        </div>
                        <div className="space-y-2">
                          <Badge className={getDeliveryStatusBadgeClass(delivery.status)}>
                            {getDeliveryStatusLabel(delivery.status)}
                          </Badge>
                          {normalizeDeliveryStatus(delivery.status) !== 'WITHDRAWN' ? (
                            <p className={`w-fit rounded-lg border px-2 py-1 text-xs ${ageInfo.className}`}>
                              {ageInfo.label}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          {normalizeDeliveryStatus(delivery.status) !== 'WITHDRAWN' ? (
                            <Button
                              variant="outline"
                              onClick={() => void handleResendNotification(delivery)}
                              disabled={notifyingId === delivery.id}
                              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {notifyingId === delivery.id ? 'Enviando...' : 'Reenviar aviso'}
                            </Button>
                          ) : null}
                          <Button variant="outline" onClick={() => openStatusModal(delivery)} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                            Atualizar status
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredDeliveries.map((delivery) => {
              const recipient = delivery.recipientPersonName || (delivery.recipientPersonId ? peopleMap.get(delivery.recipientPersonId)?.name : null);
              const ageInfo = getDeliveryAgeInfo(delivery.receivedAt);
              const unitLabel = unitLabelMap.get(delivery.recipientUnitId) ?? 'Unidade não identificada';
              return (
                <div key={delivery.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[auto_1.2fr_1fr_0.8fr_auto] lg:items-center">
                  <DeliveryThumbnail
                    delivery={delivery}
                    label={`Foto da encomenda de ${recipient || 'destinatário não identificado'}`}
                    onClick={() => openDetailsModal(delivery)}
                  />
                  <div>
                    <p className="font-medium text-white">{recipient || 'Sem destinatário vinculado'}</p>
                    <p className="text-sm text-slate-400">{unitLabel}</p>
                    <Link href={`/admin/encomendas/${encodeURIComponent(delivery.id)}`} className="mt-2 inline-flex text-xs text-cyan-200 hover:text-cyan-100">
                      Ver detalhes
                    </Link>
                  </div>
                  <div className="text-sm text-slate-300">
                    <p>{safeDeliveryText(delivery.deliveryCompany, 'Sem transportadora')}</p>
                    <p className="text-slate-500">{safeDeliveryText(delivery.trackingCode, 'Sem rastreio')}</p>
                  </div>
                  <div className="space-y-2">
                    <Badge className={getDeliveryStatusBadgeClass(delivery.status)}>
                      {getDeliveryStatusLabel(delivery.status)}
                    </Badge>
                    {normalizeDeliveryStatus(delivery.status) !== 'WITHDRAWN' ? (
                      <p className={`w-fit rounded-lg border px-2 py-1 text-xs ${ageInfo.className}`}>
                        {ageInfo.label}
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-500">{toDatetimeLocal(delivery.receivedAt).replace('T', ' ') || 'Horário indisponível'}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={() => { router.push(`/admin/unidades?unitId=${encodeURIComponent(delivery.recipientUnitId)}`); }} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                      Abrir unidade
                    </Button>
                    {normalizeDeliveryStatus(delivery.status) !== 'WITHDRAWN' ? (
                      <Button
                        variant="outline"
                        onClick={() => void handleResendNotification(delivery)}
                        disabled={notifyingId === delivery.id}
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {notifyingId === delivery.id ? 'Enviando...' : 'Reenviar aviso'}
                      </Button>
                    ) : null}
                    <Button variant="outline" onClick={() => void handleCopyWithdrawalCode(delivery)} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                      <Copy className="mr-2 h-4 w-4" />
                      Solicitar apresentação
                    </Button>
                    <Button variant="outline" onClick={() => openStatusModal(delivery)} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                      Atualizar status
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <CrudModal open={openCreate} title="Nova encomenda" description="Cadastre a encomenda recebida na portaria." onClose={closeCreate} maxWidth="xl">
        <DeliveryForm
          value={createForm}
          onChange={(field, nextValue) => setCreateForm((current) => ({ ...current, [field]: nextValue }))}
          onPhotoSelected={handleSelectPhoto}
          onOcr={handleApplyOcr}
          onSubmit={handleCreate}
          onCancel={closeCreate}
          loading={saving}
          ocrLoading={runningOcr}
          errorMessage={formError}
          ocrReview={ocrReview}
          units={unitOptions}
          people={people}
          hasSelectedPhoto={Boolean(selectedPhotoFile)}
        />
      </CrudModal>

      <CrudModal
        open={openDetails}
        title="Detalhes da encomenda"
        description="Resumo da encomenda selecionada."
        onClose={() => {
          setOpenDetails(false);
          setDetailsDelivery(null);
        }}
        maxWidth="lg"
      >
        {detailsDelivery ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Foto</p>
              <div className="mt-3">
                {getDeliveryPhotoUrl(detailsDelivery) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getDeliveryPhotoUrl(detailsDelivery)}
                    alt="Foto da encomenda"
                    className="max-h-[420px] w-full rounded-2xl object-contain"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-sm text-slate-400">
                    Sem foto cadastrada
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Destinatário</p>
                <p className="mt-2 text-base font-medium text-white">
                  {detailsDelivery.recipientPersonName || (detailsDelivery.recipientPersonId ? peopleMap.get(detailsDelivery.recipientPersonId)?.name : null) || 'Não informado'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Unidade</p>
                <p className="mt-2 text-base font-medium text-white">
                  {unitLabelMap.get(detailsDelivery.recipientUnitId) ?? 'Unidade não identificada'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Origem</p>
                <p className="mt-2 text-base font-medium text-white">{safeDeliveryText(detailsDelivery.deliveryCompany, 'Não informada')}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Código de rastreio</p>
                <p className="mt-2 text-base font-medium text-white">{safeDeliveryText(detailsDelivery.trackingCode, 'Não informado')}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
                <p className="mt-2 text-base font-medium text-white">{getDeliveryStatusLabel(detailsDelivery.status)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recebida em</p>
                <p className="mt-2 text-base font-medium text-white">{toDatetimeLocal(detailsDelivery.receivedAt).replace('T', ' ') || 'Horário indisponível'}</p>
              </div>
            </div>
          </div>
        ) : null}
      </CrudModal>

      <CrudModal open={openStatus} title="Atualizar status da encomenda" description="Use os status disponíveis para acompanhar a entrega e a retirada." onClose={() => { setOpenStatus(false); setSelected(null); setStatusError(null); }} maxWidth="lg">
        {selected ? (
          <StatusForm
            currentStatus={normalizeDeliveryStatus(selected.status)}
            selected={selected}
            onSubmit={handleUpdateStatus}
            onValidateWithdrawal={handleValidateWithdrawal}
            onCancel={() => { setOpenStatus(false); setSelected(null); setStatusError(null); }}
            loading={saving}
            errorMessage={statusError}
          />
        ) : null}
      </CrudModal>
    </div>
  );
}


