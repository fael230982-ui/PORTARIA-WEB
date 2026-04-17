function digitsOnly(value: string) {
  return value.replace(/\D+/g, '');
}

export function maskEmail(value?: string | null) {
  const email = String(value ?? '').trim();
  if (!email || !email.includes('@')) return value ?? '';

  const [local, domain] = email.split('@');
  if (!local || !domain) return email;

  if (local.length <= 2) {
    return `${local[0] ?? '*'}***@${domain}`;
  }

  return `${local.slice(0, 2)}***@${domain}`;
}

export function maskPhone(value?: string | null) {
  const raw = String(value ?? '').trim();
  const digits = digitsOnly(raw);
  if (!digits) return value ?? '';
  if (digits.length <= 4) return '***';

  const tail = digits.slice(-4);
  return `(**) *****-${tail}`;
}

export function maskDocument(value?: string | null) {
  const raw = String(value ?? '').trim();
  const digits = digitsOnly(raw);
  if (!digits) return value ?? '';

  if (digits.length === 11) {
    return `***.${digits.slice(3, 6)}.***-${digits.slice(-2)}`;
  }

  if (digits.length === 14) {
    return `**.${digits.slice(2, 5)}.***/****-${digits.slice(-2)}`;
  }

  return `***${digits.slice(-3)}`;
}

export function maskSecretCode(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return value ?? '';
  if (raw.length <= 4) return '****';

  return `${raw.slice(0, 2)}***${raw.slice(-2)}`;
}
