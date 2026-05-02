# Resposta Portaria Web aos pedidos do App Morador - Fase 2

Data: 2026-05-02

Documento de origem:

- `FASE_2_PEDIDOS_PORTARIA_WEB_2026-05-02.md`

## Resumo executivo

Esta análise trata de uma Fase 2 paralela do App Morador. Ela não bloqueia nem altera o critério de fechamento da Fase 1 do Portaria Web.

O objetivo é antecipar requisitos futuros para acelerar melhorias posteriores, mantendo a Fase 1 estável e sem inserir campos sem contrato publicado.

O Portaria Web já cobre parte da base necessária para o App Morador na Fase 2, principalmente:

- visibilidade de câmera por escopo;
- vínculo de câmera com unidade;
- vínculo de device com câmeras para evidências de alerta;
- leitura dos campos de mídia retornados pela API;
- exibição de snapshot/replay quando o backend retornar esses campos no alerta.

Ainda não há contrato público no OpenAPI v7.4 para gestão de grupos personalizados de câmeras do morador, como `residentCameraGroupId`, `residentCameraGroupName` e `residentCameraGroupOrder`.

## 1. Grupos personalizáveis de câmeras

Status no Portaria Web: não implementável de forma persistente sem backend.

O pedido sugere campos:

```json
{
  "residentCameraGroupId": "uuid-do-grupo",
  "residentCameraGroupName": "Entradas",
  "residentCameraGroupOrder": 1
}
```

No OpenAPI v7.4, esses campos não aparecem no contrato público de câmeras.

Necessário do backend:

- CRUD de grupos de câmera do morador.
- Campos de grupo na resposta de câmera.
- Campos de grupo em `POST/PATCH /api/v1/cameras`.
- Definição se a ordenação será global, por condomínio, por grupo ou por unidade.

Sugestão de contrato:

```http
GET /api/v1/resident-camera-groups
POST /api/v1/resident-camera-groups
PATCH /api/v1/resident-camera-groups/{id}
DELETE /api/v1/resident-camera-groups/{id}
```

Payload sugerido:

```json
{
  "name": "Entradas",
  "displayOrder": 1,
  "icon": "door",
  "color": "#22c55e",
  "condominiumId": "uuid",
  "active": true
}
```

Campos sugeridos em câmera:

```json
{
  "residentCameraGroupId": "uuid",
  "residentCameraGroupName": "Entradas",
  "residentCameraGroupOrder": 1,
  "residentDisplayOrder": 1,
  "residentMainSuggested": true
}
```

## 2. Câmera padrão e ordem de exibição

Status no Portaria Web: depende do mesmo contrato de grupos/ordenação.

Hoje o front consegue exibir e filtrar câmeras, mas não há campo persistente publicado para:

- ordem da câmera no App Morador;
- ordem dentro do grupo;
- câmera principal sugerida para o morador.

Necessário do backend:

- `residentDisplayOrder`;
- `residentCameraGroupOrder`;
- `residentMainSuggested` ou equivalente.

## 3. Câmera ao vivo compatível com mobile

Status no Portaria Web: leitura preparada, bloqueio atual é backend/VMS.

O Portaria Web já tenta usar:

- `preferredLiveUrl`;
- `liveUrl`;
- `hlsUrl`;
- `vmsStreamingUrls.external`;
- `vmsStreamingUrl`;
- `streamUrl`.

Retorno real atual da API:

```json
{
  "transport": "VMS_NATIVE",
  "liveUrl": "wss://189.51.92.18:60110/vms",
  "hlsUrl": null,
  "webRtcUrl": null,
  "playback": {
    "requiresNativePlayer": true,
    "backendProcessesStream": false,
    "backendProxyFallbackFields": ["imageStreamUrl", "mjpegUrl"]
  }
}
```

Com esse retorno, navegador e mobile não recebem HLS/WebRTC padrão. O fallback correto é `imageStreamUrl/mjpegUrl`, que resulta em frames.

Necessário do backend/VMS:

- `hlsUrl` com `.m3u8`; ou
- `webRtcUrl` com contrato completo; ou
- SDK/contrato documentado do player nativo Incoresoft para `wss://.../vms`.

Documento específico já criado:

- `PORTARIA_WEB_PENDENCIA_VMS_AO_VIVO_2026-05-02.md`

## 4. Alertas com câmera vinculada

Status no Portaria Web: implementado no front, aguardando validação com novo alerta real.

O Portaria Web já envia `cameraIds` no payload de `POST/PATCH /api/v1/devices`.

Na tela de edição de device já existe a seção:

- `Câmeras vinculadas a alertas`.

Essa seção permite marcar uma ou mais câmeras que devem ser usadas como evidência quando o device gerar alerta.

Necessário validar:

- editar o device que gera alerta;
- marcar as câmeras;
- salvar;
- gerar novo alerta real;
- confirmar se o backend retorna `cameraId`, `snapshotUrl`, `liveUrl` e `replayUrl`.

Observação: snapshot/replay devem ser gerados pelo backend no momento do evento, porque o backend recebe o `eventTime` real.

## 5. Notificações por tipo

Status no Portaria Web: roadmap.

Não há contrato público identificado no OpenAPI v7.4 para configurar template/prioridade/som/push por tipo de notificação do morador.

Necessário do backend antes de UI persistente:

```http
GET /api/v1/resident-notification-rules
POST /api/v1/resident-notification-rules
PATCH /api/v1/resident-notification-rules/{id}
```

Campos mínimos sugeridos:

```json
{
  "domain": "ALERT",
  "titleTemplate": "Alerta no condomínio",
  "bodyTemplate": "Um evento foi registrado.",
  "priority": "HIGH",
  "sound": "alert",
  "pushEnabled": true,
  "appVisible": true,
  "readRequired": false,
  "active": true
}
```

## 6. Ações remotas do morador com geolocalização

Status no Portaria Web: roadmap.

O Portaria Web já possui configuração de acionamentos físicos para operação/admin em devices Control iD.

Para liberar ações remotas ao morador, ainda é necessário contrato específico para:

- ação liberada ao morador;
- device vinculado;
- unidade/perfis autorizados;
- raio de geolocalização;
- exigência de biometria;
- horário permitido;
- mensagens de sucesso/bloqueio.

Sugestão de contrato:

```http
GET /api/v1/resident-remote-actions
POST /api/v1/resident-remote-actions
PATCH /api/v1/resident-remote-actions/{id}
```

## O que o Portaria Web pode fazer agora sem novo backend

- Manter e validar vínculo de device com câmeras para evidências.
- Melhorar a clareza visual do status de mídia da câmera.
- Exibir quando uma câmera está visível ao morador, restrita à unidade ou apenas admin.
- Exibir aviso quando a câmera ainda é apenas preview em frames.
- Preparar documentação e placeholders de roadmap, sem enviar campos não aceitos pela API.

## Pendências objetivas para o backend

1. Criar contrato de grupos de câmera do morador.
2. Adicionar campos de grupo/ordem/principal em câmera.
3. Entregar HLS/WebRTC ou player nativo documentado para câmera ao vivo no navegador/mobile.
4. Confirmar que `cameraIds` salvos no device são usados para anexar evidências em alertas.
5. Criar contrato de regras de notificação por tipo.
6. Criar contrato de ações remotas do morador com geolocalização.

## Conclusão

O Portaria Web já está alinhado com os pontos de Fase 1 e preparado parcialmente para a Fase 2. Esta lista deve ser tratada como roadmap separado do App Morador, sem impedir o aceite da Fase 1.

A maior parte dos pedidos novos do App Morador depende de campos e endpoints ainda não publicados no OpenAPI v7.4.
