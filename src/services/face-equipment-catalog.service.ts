import { api } from '@/lib/axios';

export type FaceEquipmentCatalogEntry = {
  vendor: string;
  model: string;
  vendorLabel?: string;
  modelLabel?: string;
  deviceType?: string;
  eventWebhookPath?: string;
};

type RawCatalogResponse =
  | FaceEquipmentCatalogEntry[]
  | {
      brands?: unknown[];
      items?: unknown[];
      data?: unknown[];
      value?: unknown[];
      vendors?: unknown[];
      result?: unknown;
      catalog?: unknown;
      equipmentCatalog?: unknown;
    };

function toText(value: unknown) {
  return String(value ?? '').trim();
}

function uniqueEntries(entries: FaceEquipmentCatalogEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.vendor}::${entry.model}`;
    if (!entry.vendor || !entry.model || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseModelItem(model: unknown, vendor: string, vendorLabel?: string): FaceEquipmentCatalogEntry {
  if (model && typeof model === 'object') {
    const object = model as Record<string, unknown>;
    const rawModel = toText(object.model) || toText(object.name) || toText(object.label);
    return {
      vendor,
      vendorLabel,
      model: rawModel,
      modelLabel: toText(object.label) || rawModel,
      deviceType: toText(object.deviceType) || undefined,
      eventWebhookPath: toText(object.eventWebhookPath) || undefined,
    };
  }

  const rawModel = toText(model);
  return {
    vendor,
    vendorLabel,
    model: rawModel,
    modelLabel: rawModel,
  };
}

function parseItem(item: unknown): FaceEquipmentCatalogEntry[] {
  if (!item || typeof item !== 'object') return [];

  const object = item as Record<string, unknown>;
  const vendor =
    toText(object.brand) ||
    toText(object.vendor) ||
    toText(object.vendorName) ||
    toText(object.manufacturer) ||
    toText(object.fabricante) ||
    toText(object.name);
  const vendorLabel = toText(object.label) || vendor;

  if (Array.isArray(object.models)) {
    return object.models
      .map((model) => parseModelItem(model, vendor, vendorLabel))
      .filter((entry) => entry.vendor && entry.model);
  }

  const model =
    toText(object.model) ||
    toText(object.modelName) ||
    toText(object.modelo);

  return vendor && model ? [{ vendor, vendorLabel, model, modelLabel: toText(object.label) || model }] : [];
}

function parseVendorMap(source: Record<string, unknown>) {
  return Object.entries(source).flatMap(([vendorKey, value]) => {
    const vendor = toText(vendorKey);
    if (!vendor) return [];

    if (Array.isArray(value)) {
      return value
        .map((model) => parseModelItem(model, vendor))
        .filter((entry) => entry.vendor && entry.model);
    }

    if (value && typeof value === 'object') {
      const objectValue = value as Record<string, unknown>;
      const nestedModels = objectValue.models ?? objectValue.items ?? objectValue.data ?? objectValue.value;
      if (Array.isArray(nestedModels)) {
        return nestedModels
          .map((model) => parseModelItem(model, vendor, toText(objectValue.label) || vendor))
          .filter((entry) => entry.vendor && entry.model);
      }
    }

    return [];
  });
}

function parseCatalog(payload: RawCatalogResponse): FaceEquipmentCatalogEntry[] {
  if (Array.isArray(payload)) {
    return uniqueEntries(payload.flatMap((item) => parseItem(item)));
  }

  const source =
    payload.items ??
    payload.data ??
    payload.value ??
    payload.brands ??
    payload.vendors ??
    payload.result ??
    payload.catalog ??
    payload.equipmentCatalog ??
    [];

  if (Array.isArray(source)) {
    return uniqueEntries(source.flatMap((item) => parseItem(item)));
  }

  if (source && typeof source === 'object') {
    return uniqueEntries(parseVendorMap(source as Record<string, unknown>));
  }

  if (payload && typeof payload === 'object') {
    return uniqueEntries(parseVendorMap(payload as Record<string, unknown>));
  }

  return [];
}

export const faceEquipmentCatalogService = {
  async list(): Promise<FaceEquipmentCatalogEntry[]> {
    try {
      const { data } = await api.get<RawCatalogResponse>('/devices/equipment-catalog');
      return parseCatalog(data);
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;

      if (status && status !== 404 && status !== 405) {
        throw error;
      }

      const { data } = await api.get<RawCatalogResponse>('/integrations/face/equipment-catalog');
      return parseCatalog(data);
    }
  },
};
