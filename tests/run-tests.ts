import assert from 'node:assert/strict';
import {
  canAccessRole,
  getRouteForRole,
  resolveAuthenticatedRoute,
} from '../src/features/auth/access-control.ts';
import {
  buildPersonUpsertPayload,
  buildLegacyUnitId,
  buildResidenceInput,
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
import {
  normalizeAlert,
  normalizeAlertsListResponse,
  normalizeRealtimeAlert,
} from '../src/features/alerts/alert-normalizers.ts';
import {
  buildAccessReportPayload,
  buildOperationOccurrencePayload,
  parseAccessReportMetadata,
  parseOperationReportMetadata,
} from '../src/features/reports/report-metadata.ts';
import {
  normalizeCamera,
  normalizeCamerasListResponse,
  normalizeCameraStreamingResponse,
} from '../src/features/cameras/camera-normalizers.ts';
import { DELETE, PUT } from '../src/app/api/admin/relatorios/[id]/route.ts';
import { GET, POST } from '../src/app/api/admin/relatorios/route.ts';
import {
  createReportRecord,
  getReportsStore,
  resetReportsStore,
} from '../src/app/api/admin/relatorios/store.ts';

type TestCase = {
  name: string;
  run: () => void | Promise<void>;
};

const tests: TestCase[] = [
  {
    name: 'auth redireciona anonimo para login',
    run() {
      const target = resolveAuthenticatedRoute({
        token: null,
        user: null,
        isAuthenticated: false,
        loading: false,
        hydrated: true,
      });

      assert.equal(target, '/login');
    },
  },
  {
    name: 'auth redireciona por perfil',
    run() {
      assert.equal(
        resolveAuthenticatedRoute({
          token: 'token',
          user: { role: 'OPERADOR' },
          isAuthenticated: true,
          loading: false,
          hydrated: true,
        }),
        '/operacao'
      );

      assert.equal(getRouteForRole('ADMIN'), '/admin');
      assert.equal(getRouteForRole('MASTER'), '/master');
      assert.equal(getRouteForRole('CENTRAL'), '/operacao');
      assert.equal(getRouteForRole('MORADOR'), '/dashboard/profile');
      assert.equal(canAccessRole('ADMIN', ['ADMIN', 'MASTER']), true);
      assert.equal(canAccessRole('OPERADOR', ['ADMIN', 'MASTER']), false);
    },
  },
  {
    name: 'normalizacao de moradores reduz adaptacoes da UI',
    run() {
      const rows = normalizePeople({
        data: [
          {
            id: '1',
            name: 'Ana Souza',
            phone: '11999999999',
            document: '123',
            email: 'ana@condominio.com',
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
        email: 'ana@condominio.com',
        unidade: '204',
        bloco: 'B',
        telefone: '11999999999',
        documento: '123',
        categoria: 'morador',
        status: 'bloqueado',
        avatarUrl: '',
        condominio: '',
        estruturaTipo: '',
        estruturaLabel: 'B',
        localizacao: 'B',
        documentType: null,
        faceStatus: null,
        faceUpdatedAt: null,
        faceListSyncStatus: null,
        faceListSyncError: null,
        faceErrorMessage: null,
        unit: null,
      });

      assert.equal(buildLegacyUnitId('a', '101'), 'A-101');
      assert.equal(buildLegacyUnitId('  ', 'a101'), 'A101');
      assert.deepEqual(
        buildResidenceInput({
          condominiumName: ' Reserva Azul ',
          structureType: 'BLOCK',
          structureLabel: ' b ',
          unitLabel: ' 204 ',
        }),
        {
          condominiumName: 'Reserva Azul',
          structureType: 'BLOCK',
          structureLabel: 'B',
          unitLabel: '204',
        }
      );
      assert.equal(mapUiCategoryToApi('funcionario'), 'DELIVERER');
      assert.equal(mapUiCategoryToApi('proprietario'), 'RESIDENT');
      assert.equal(mapUiStatusToApi('pendente'), 'INACTIVE');
      assert.equal(normalizeMoradorCategory(undefined), 'morador');
      assert.equal(normalizeMoradorStatus(undefined), 'ativo');
      assert.deepEqual(
        buildPersonUpsertPayload({
          nome: '  Ana  ',
          email: '  ana@condominio.com  ',
          telefone: '   ',
          documento: '',
          tipo: 'proprietario',
          residence: {
            condominiumName: 'Reserva Azul',
            structureType: 'BLOCK',
            structureLabel: 'B',
            unitLabel: '204',
          },
        }),
        {
          name: 'Ana',
          category: 'RESIDENT',
          email: 'ana@condominio.com',
          unitId: 'B-204',
        }
      );
      assert.equal(
        matchesMoradorText(
          {
            id: '1',
            nome: 'Carlos',
            email: 'carlos@predio.com',
            bloco: 'C',
            unidade: '302',
            telefone: '11 90000-0000',
            documento: '999',
            categoria: 'visitante',
            status: 'ativo',
          },
          'predio.com'
        ),
        true
      );
    },
  },
  {
    name: 'normalizacao de encomendas tipa lista direta e envelope data',
    run() {
      const direct = normalizeDeliveries([
        { id: '1', recipientUnitId: 'unit-1', deliveryCompany: 'Correios', status: 'RECEIVED', receivedAt: '2026-04-09T10:00:00Z', receivedBy: 'user-1' },
      ]);
      const wrapped = normalizeDeliveries({
        data: [{ id: '2', recipientUnitId: 'unit-2', deliveryCompany: 'Jadlog', status: 'NOTIFIED', receivedAt: '2026-04-09T11:00:00Z', receivedBy: 'user-2', trackingCode: 'BR123' }],
        meta: { totalItems: 1, currentPage: 1, totalPages: 1, itemsPerPage: 10 },
      });

      assert.equal(direct.length, 1);
      assert.equal(wrapped.length, 1);
      assert.equal(normalizeDeliveryStatus(' notified '), 'NOTIFIED');
      assert.equal(matchesDeliverySearch(wrapped[0], 'jad'), true);
    },
  },
  {
    name: 'normalizacao de cameras adapta camelCase e snake_case',
    run() {
      const normalized = normalizeCamera({
        id: 'cam-1',
        name: 'Portaria',
        status: 'online',
        stream_url: 'https://stream',
        snapshot_url: 'https://snapshot',
        image_stream_url: 'https://image-stream',
        vms_streaming_url: 'wss://127.0.0.1:8080/vms',
        last_seen: '2026-04-09T10:00:00Z',
        engine_stream_id: 9,
      } as never);

      assert.deepEqual(normalized, {
        id: 'cam-1',
        name: 'Portaria',
        location: null,
        deviceType: null,
        deviceUsageType: null,
        provider: null,
        transport: null,
        status: 'ONLINE',
        streamUrl: 'https://stream',
        snapshotUrl: 'https://snapshot',
        imageStreamUrl: 'https://image-stream',
        liveUrl: null,
        hlsUrl: null,
        webRtcUrl: null,
        thumbnailUrl: null,
        vmsStreamingUrl: 'wss://127.0.0.1:8080/vms',
        lastSeen: '2026-04-09T10:00:00Z',
        engineStreamId: 9,
        engineStreamUuid: null,
        faceAnalyticsId: null,
        unitId: null,
        personId: null,
      });

      const list = normalizeCamerasListResponse([
        {
          id: 'cam-2',
          name: 'Garagem',
          status: 'OFFLINE',
          snapshotUrl: 'https://snapshot-2',
        },
      ]);

      assert.equal(list.data.length, 1);
      assert.equal(list.data[0].snapshotUrl, 'https://snapshot-2');

      const streaming = normalizeCameraStreamingResponse({
        provider: 'VMS',
        transport: 'MJPEG',
        snapshot_url: '/api/v1/cameras/cam-1/snapshot',
        image_stream_url: '/api/v1/cameras/cam-1/image-stream',
        vms_streaming_url: 'wss://127.0.0.1:8080/vms',
      });

      assert.deepEqual(streaming, {
        provider: 'VMS',
        transport: 'MJPEG',
        snapshotUrl: '/api/proxy/cameras/cam-1/snapshot',
        imageStreamUrl: '/api/proxy/cameras/cam-1/image-stream',
        liveUrl: null,
        hlsUrl: null,
        webRtcUrl: null,
        mjpegUrl: null,
        previewUrl: null,
        thumbnailUrl: null,
        frameUrl: null,
        gatewayPath: null,
        vmsStreamingUrl: 'wss://127.0.0.1:8080/vms',
        cameraUuid: null,
        streams: [],
      });
    },
  },
  {
    name: 'normalizacao de alertas adapta api e realtime',
    run() {
      const alert = normalizeAlert({
        id: 'alert-1',
        title: 'Pessoa desconhecida',
        type: 'unknown_person',
        status: 'unread',
        timestamp: '2026-04-09T10:00:00Z',
        camera_id: 'cam-1',
      } as never);

      assert.deepEqual(alert, {
        id: 'alert-1',
        alertId: null,
        title: 'Pessoa desconhecida',
        description: null,
        type: 'UNKNOWN_PERSON',
        status: 'UNREAD',
        severity: 'INFO',
        timestamp: '2026-04-09T10:00:00Z',
        cameraId: 'cam-1',
        personId: null,
        photoUrl: null,
        location: null,
        readAt: null,
        snapshotUrl: null,
        thumbnailUrl: null,
        imageUrl: null,
        replayUrl: null,
        workflow: null,
        payload: null,
      });

      const list = normalizeAlertsListResponse({
        data: [
          {
            id: 'alert-2',
            title: 'Camera offline',
            type: 'camera_offline',
            status: 'READ',
            timestamp: '2026-04-09T11:00:00Z',
          },
        ],
      } as never);

      assert.equal(list.data.length, 1);
      assert.equal(list.data[0].type, 'CAMERA_OFFLINE');

      const realtime = normalizeRealtimeAlert({
        id: 'alert-3',
        message: 'Movimento suspeito',
        type: 'WARNING',
        timestamp: '2026-04-09T12:00:00Z',
      });

      assert.equal(realtime.title, 'Movimento suspeito');
      assert.equal(realtime.status, 'UNREAD');
      assert.equal(realtime.type, 'WARNING');
    },
  },
  {
    name: 'metadata de relatorios suporta acesso e ocorrencia',
    run() {
      const accessPayload = buildAccessReportPayload(
        {
          id: 'p-1',
          name: 'Ana',
          category: 'VISITOR',
          status: 'ACTIVE',
          unitId: 'u-1',
          unit: {
            id: 'u-1',
            label: '204',
            condominiumId: 'c-1',
            structureType: 'BLOCK',
            structure: { id: 's-1', type: 'BLOCK', label: 'B' },
            condominium: { id: 'c-1', name: 'Reserva Azul' },
          },
        } as never,
        'ENTRY',
        new Map()
      );

      const parsedAccess = parseAccessReportMetadata({
        id: 'r-1',
        title: accessPayload.title,
        description: accessPayload.description,
        category: accessPayload.category,
        status: accessPayload.status,
        priority: accessPayload.priority,
        visibility: accessPayload.visibility,
        createdAt: '2026-04-09T10:00:00Z',
        updatedAt: '2026-04-09T10:00:00Z',
      });

      assert.deepEqual(parsedAccess, {
        kind: 'access',
        action: 'ENTRY',
        personId: 'p-1',
        unitId: 'u-1',
        category: 'VISITOR',
      });

      const operationPayload = buildOperationOccurrencePayload({
        title: 'Movimento suspeito',
        description: 'Pessoa rondando a entrada lateral',
        priority: 'high',
        context: 'operacao',
        cameraId: 'cam-1',
        personId: 'p-1',
        unitId: 'u-1',
      });

      const parsedOperation = parseOperationReportMetadata({
        id: 'r-2',
        title: operationPayload.title,
        description: operationPayload.description,
        category: operationPayload.category,
        status: operationPayload.status,
        priority: operationPayload.priority,
        visibility: operationPayload.visibility,
        createdAt: '2026-04-09T11:00:00Z',
        updatedAt: '2026-04-09T11:00:00Z',
      });

      assert.deepEqual(parsedOperation, {
        kind: 'operation',
        context: 'operacao',
        personId: 'p-1',
        cameraId: 'cam-1',
        unitId: 'u-1',
      });
    },
  },
  {
    name: 'CRUD local de relatorios cobre create e list',
    async run() {
      resetReportsStore();

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
    },
  },
  {
    name: 'CRUD local de relatorios cobre update, delete e erros',
    async run() {
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

      const invalidPostResponse = await POST(
        new Request('http://localhost/api/admin/relatorios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '   ',
          }),
        })
      );

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

      assert.equal(invalidPostResponse.status, 400);
      assert.equal(missingPutResponse.status, 404);
      assert.equal(missingDeleteResponse.status, 404);
    },
  },
];

async function main() {
  let failures = 0;

  for (const testCase of tests) {
    try {
      await testCase.run();
      console.log(`PASS ${testCase.name}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${testCase.name}`);
      console.error(error);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`PASS ${tests.length} checks`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
