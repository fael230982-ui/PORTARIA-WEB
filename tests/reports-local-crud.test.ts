import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DELETE, PUT } from '../src/app/api/admin/relatorios/[id]/route.ts';
import { GET, POST } from '../src/app/api/admin/relatorios/route.ts';
import {
  createReportRecord,
  getReportsStore,
  resetReportsStore,
} from '../src/app/api/admin/relatorios/store.ts';

beforeEach(() => {
  resetReportsStore();
});

test('POST e GET mantem CRUD local de relatorios em memoria', async () => {
  const createResponse = await POST(
    new Request('http://localhost/api/admin/relatorios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Acesso fora do horario',
        description: 'Portao principal acionado apos as 22h',
        category: 'acessos',
        status: 'ativo',
        priority: 'alta',
        visibility: 'interno',
      }),
    })
  );

  assert.equal(createResponse.status, 200);

  const createdBody = await createResponse.json();
  assert.equal(createdBody.success, true);
  assert.equal(getReportsStore().length, 1);

  const listResponse = await GET();
  const listBody = await listResponse.json();

  assert.equal(listBody.total, 1);
  assert.equal(listBody.data[0].title, 'Acesso fora do horario');
});

test('PUT atualiza relatorio existente e DELETE remove do store local', async () => {
  const existing = createReportRecord({
    title: 'Relatorio inicial',
    description: 'Texto',
    category: 'geral',
    status: 'ativo',
    priority: 'normal',
    visibility: 'interno',
  });

  resetReportsStore([existing]);

  const updateResponse = await PUT(
    new Request(`http://localhost/api/admin/relatorios/${existing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Relatorio atualizado',
        priority: 'alta',
      }),
    }),
    { params: Promise.resolve({ id: existing.id }) }
  );

  const updateBody = await updateResponse.json();
  assert.equal(updateResponse.status, 200);
  assert.equal(updateBody.data.title, 'Relatorio atualizado');
  assert.equal(updateBody.data.priority, 'alta');

  const deleteResponse = await DELETE(
    new Request(`http://localhost/api/admin/relatorios/${existing.id}`, {
      method: 'DELETE',
    }),
    { params: Promise.resolve({ id: existing.id }) }
  );

  const deleteBody = await deleteResponse.json();
  assert.equal(deleteResponse.status, 200);
  assert.equal(deleteBody.data.id, existing.id);
  assert.equal(getReportsStore().length, 0);
});

test('rotas retornam 404 ou 400 quando payload ou id sao invalidos', async () => {
  const invalidPostResponse = await POST(
    new Request('http://localhost/api/admin/relatorios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '   ',
      }),
    })
  );

  assert.equal(invalidPostResponse.status, 400);

  const missingPutResponse = await PUT(
    new Request('http://localhost/api/admin/relatorios/missing', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'novo' }),
    }),
    { params: Promise.resolve({ id: 'missing' }) }
  );

  const missingDeleteResponse = await DELETE(
    new Request('http://localhost/api/admin/relatorios/missing', {
      method: 'DELETE',
    }),
    { params: Promise.resolve({ id: 'missing' }) }
  );

  assert.equal(missingPutResponse.status, 404);
  assert.equal(missingDeleteResponse.status, 404);
});
