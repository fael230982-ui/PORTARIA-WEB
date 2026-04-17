import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUnitId,
  mapUiCategoryToApi,
  mapUiStatusToApi,
  matchesMoradorText,
  normalizeMoradorCategory,
  normalizeMoradorStatus,
  normalizePeople,
} from '../src/features/people/morador-normalizers.ts';
import {
  matchesDeliverySearch,
  normalizeDeliveries,
  normalizeDeliveryStatus,
} from '../src/features/deliveries/delivery-normalizers.ts';

test('normalizePeople converte payload da API para row usada na UI', () => {
  const rows = normalizePeople({
    data: [
      {
        id: '1',
        name: 'Ana Souza',
        phone: '11999999999',
        document: '123',
        category: 'RESIDENT',
        status: 'BLOCKED',
        unitId: 'B-204',
        photoUrl: null,
      },
    ],
  });

  assert.deepEqual(rows[0], {
    id: '1',
    nome: 'Ana Souza',
    unidade: '204',
    bloco: 'B',
    telefone: '11999999999',
    documento: '123',
    categoria: 'morador',
    status: 'bloqueado',
    avatarUrl: '',
  });
});

test('helpers de moradores reduzem adaptacoes de categoria, status e unidade', () => {
  assert.equal(buildUnitId('A', '101'), 'A-101');
  assert.equal(buildUnitId('  ', '101'), '101');
  assert.equal(mapUiCategoryToApi('funcionario'), 'SERVICE_PROVIDER');
  assert.equal(mapUiStatusToApi('pendente'), 'INACTIVE');
  assert.equal(normalizeMoradorCategory(undefined), 'morador');
  assert.equal(normalizeMoradorStatus(undefined), 'ativo');

  assert.equal(
    matchesMoradorText(
      {
        id: '1',
        nome: 'Carlos',
        bloco: 'C',
        unidade: '302',
        telefone: '11 90000-0000',
        documento: '999',
        categoria: 'visitante',
        status: 'ativo',
      },
      '302'
    ),
    true
  );
});

test('normalizeDeliveries aceita lista direta ou envelope data', () => {
  const direct = normalizeDeliveries([
    { id: '1', recipient: 'Lia', status: 'Recebido', carrier: 'Correios' },
  ]);
  const wrapped = normalizeDeliveries({
    data: [{ id: '2', recipient: 'Beto', status: 'Pendente', block: 'D', unit: '12' }],
  });

  assert.equal(direct.length, 1);
  assert.equal(wrapped.length, 1);
  assert.equal(normalizeDeliveryStatus(' Recebido '), 'recebido');
  assert.equal(matchesDeliverySearch(wrapped[0], 'd'), true);
});
