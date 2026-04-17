const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sapinhoprod.v8seguranca.com.br/api/v1';
const UNIT_ID = process.env.UNIT_ID || '7db846ab-073a-4b09-b3ed-1d9242b6e19f';
const TOKEN = process.env.MORADOR_TOKEN;

if (!TOKEN) {
  console.error('Defina MORADOR_TOKEN com um token real de MORADOR antes de rodar.');
  console.error('Exemplo PowerShell: $env:MORADOR_TOKEN=\"ey...\"; node scripts/validate-casa20-resident-api.mjs');
  process.exit(1);
}

const calls = [
  ['usuario logado', '/auth/me'],
  ['encomendas morador', '/resident/deliveries?page=1&limit=20'],
  ['notificacoes morador', '/resident/notifications'],
  ['cameras sem query', '/cameras'],
  ['cameras com unitId', `/cameras?unitId=${UNIT_ID}`],
];

function countItems(payload) {
  if (Array.isArray(payload)) return payload.length;
  if (Array.isArray(payload?.data)) return payload.data.length;
  return null;
}

function summarizePayload(payload) {
  const count = countItems(payload);
  if (count != null) return `${count} item(ns)`;

  if (payload?.user) {
    return `perfil=${payload.user.role ?? 'n/a'} unitId=${payload.user.unitId ?? 'n/a'}`;
  }

  if (payload?.role || payload?.id) {
    return `perfil=${payload.role ?? 'n/a'} unitId=${payload.unitId ?? 'n/a'}`;
  }

  return JSON.stringify(payload).slice(0, 240);
}

for (const [label, path] of calls) {
  const response = await fetch(`${API_URL.replace(/\/+$/, '')}${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'X-Selected-Unit-Id': UNIT_ID,
    },
  });

  const text = await response.text();
  let payload = text;

  try {
    payload = JSON.parse(text);
  } catch {
    // keep raw text
  }

  console.log(`\n${response.status} ${label}`);
  console.log(`GET ${path}`);
  console.log(summarizePayload(payload));
}
