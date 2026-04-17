import { env } from '@/lib/env';
import type { DeliveriesListResponse, Delivery, DeliveryStatus, DeliveryStatusInput } from '@/types/delivery';

export type DeliveryRow = Delivery;

export function safeDeliveryText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function normalizeDeliveryAssetUrl(value: unknown) {
  const normalized = safeDeliveryText(value);
  if (!normalized) return null;

  if (normalized.startsWith('/api/proxy/')) return normalized;
  if (normalized.startsWith('/api/v1/')) return `/api/proxy/${normalized.slice('/api/v1/'.length)}`;
  if (normalized.startsWith('api/v1/')) return `/api/proxy/${normalized.slice('api/v1/'.length)}`;
  if (normalized.startsWith('/deliveries/')) return `/api/proxy${normalized}`;
  if (normalized.startsWith('/uploads/')) return `/api/proxy${normalized}`;
  if (normalized.startsWith('/files/')) return `/api/proxy${normalized}`;
  if (normalized.startsWith('/storage/')) return `/api/proxy${normalized}`;

  if (normalized.startsWith('data:') || normalized.startsWith('blob:')) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      const pathWithQuery = `${parsed.pathname}${parsed.search}`;

      if (parsed.pathname.startsWith('/api/v1/')) {
        return `/api/proxy/${pathWithQuery.slice('/api/v1/'.length)}`;
      }

      if (
        parsed.pathname.startsWith('/deliveries/')
        || parsed.pathname.startsWith('/uploads/')
        || parsed.pathname.startsWith('/files/')
        || parsed.pathname.startsWith('/storage/')
      ) {
        return `/api/proxy${pathWithQuery}`;
      }
    } catch {
      return normalized;
    }

    return normalized;
  }

  const baseOrigin = env.apiBaseUrl.replace(/\/api\/v1$/i, '');
  const absolutePath = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `${baseOrigin}${absolutePath}`;
}

function normalizeSearchText(value: unknown) {
  return safeDeliveryText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function normalizeDeliveryStatus(value: unknown): DeliveryStatus {
  const normalized = normalizeSearchText(value || 'RECEIVED');
  if (
    normalized === 'ready_for_withdrawal' ||
    normalized === 'ready for withdrawal' ||
    normalized === 'pronta para retirada' ||
    normalized === 'pronto para retirada'
  ) {
    return 'RECEIVED';
  }
  if (normalized === 'notified' || normalized === 'notificada' || normalized === 'notificado') return 'NOTIFIED';
  if (normalized === 'withdrawn' || normalized === 'retirada' || normalized === 'retirado') return 'WITHDRAWN';
  return 'RECEIVED';
}

export function getDeliveryStatusLabel(status: DeliveryStatusInput | string | unknown) {
  const normalized = normalizeDeliveryStatus(status);
  if (normalized === 'NOTIFIED') return 'Aviso enviado';
  if (normalized === 'WITHDRAWN') return 'Retirada';
  return 'Aguardando retirada';
}

export function getDeliveryStatusBadgeClass(status: unknown) {
  const normalized = normalizeDeliveryStatus(status);
  if (normalized === 'WITHDRAWN') {
    return 'bg-slate-500/15 text-slate-200 hover:bg-slate-500/20';
  }
  if (normalized === 'NOTIFIED') {
    return 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/20';
  }
  return 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20';
}

export function normalizeDeliveries(data?: DeliveriesListResponse | Delivery[] | null): DeliveryRow[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

export function getDeliveryWithdrawalCode(row?: Pick<Delivery, 'pickupCode' | 'withdrawalCode'> | null) {
  const primary = safeDeliveryText(row?.withdrawalCode);
  if (primary) return primary;

  const legacy = safeDeliveryText(row?.pickupCode);
  return legacy || null;
}

export function getDeliveryWithdrawalQrUrl(
  row?: Pick<Delivery, 'qrCodeUrl' | 'withdrawalQrCodeUrl'> | null
) {
  const target = normalizeDeliveryAssetUrl(row?.withdrawalQrCodeUrl);
  if (target) return target;

  const current = normalizeDeliveryAssetUrl(row?.qrCodeUrl);
  return current || null;
}

export function getDeliveryPhotoUrl(
  row?: Pick<Delivery, 'photoUrl' | 'packagePhotoUrl' | 'labelPhotoUrl'> | null
) {
  return (
    normalizeDeliveryAssetUrl(row?.packagePhotoUrl) ||
    normalizeDeliveryAssetUrl(row?.photoUrl) ||
    normalizeDeliveryAssetUrl(row?.labelPhotoUrl) ||
    null
  );
}

export function hasDeliverySecureWithdrawal(
  row?: Pick<Delivery, 'pickupCode' | 'withdrawalCode' | 'qrCodeUrl' | 'withdrawalQrCodeUrl'> | null
) {
  return Boolean(getDeliveryWithdrawalCode(row) || getDeliveryWithdrawalQrUrl(row));
}

export function matchesDeliverySearch(row: DeliveryRow, term: string, extraTerms: string[] = []) {
  if (!term) return true;
  const query = normalizeSearchText(term);
  return [
    row.deliveryCompany,
    row.trackingCode,
    row.recipientPersonName,
    getDeliveryWithdrawalCode(row),
    getDeliveryWithdrawalQrUrl(row),
    row.status,
    row.recipientUnitId,
    row.recipientPersonId,
    ...extraTerms,
  ]
    .filter(Boolean)
    .some((value) => normalizeSearchText(value).includes(query));
}
