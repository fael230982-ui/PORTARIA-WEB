# Contrato backend esperado - Operação - 2026-04-09

Este documento consolida o que o front já está preparado para consumir/enviar nas próximas integrações da tela operacional.

## 1. Baixa segura de encomenda

Endpoint:

```http
POST /api/v1/deliveries/{id}/validate-withdrawal
```

Payload:

```json
{
  "code": "123456"
}
```

Resposta:

```json
{
  "valid": true,
  "deliveryId": "delivery-id",
  "status": "WITHDRAWN",
  "message": "Retirada validada.",
  "withdrawnAt": "2026-04-09T18:20:00Z",
  "withdrawnBy": "operator-id",
  "withdrawnByName": "Nome do operador"
}
```

Campos esperados também na listagem `GET /api/v1/deliveries`:

- `pickupCode`
- `withdrawalCode`
- `qrCodeUrl`
- `notificationSentAt`
- `withdrawnAt`
- `withdrawnBy`
- `withdrawnByName`

## 2. Eventos em tempo real

Endpoint sugerido:

```http
GET /api/v1/events/stream
```

Formato SSE:

```json
{
  "id": "event-id",
  "type": "DELIVERY_CREATED",
  "createdAt": "2026-04-09T18:00:00Z",
  "payload": {
    "deliveryId": "delivery-id"
  }
}
```

Tipos esperados pelo front:

- `ALERT_CREATED`
- `ACCESS_REGISTERED`
- `DELIVERY_CREATED`
- `DELIVERY_UPDATED`
- `CAMERA_STATUS_CHANGED`
- `MESSAGE_CREATED`
- `ACTION_EXECUTED`

Observação: se preferirem WebSocket, manter payload equivalente.

## 3. Painel de acionamentos

Listagem:

```http
GET /api/v1/actions
```

Resposta:

```json
[
  {
    "id": "gate-main",
    "kind": "GATE_MAIN",
    "label": "Portão principal",
    "description": "Abertura do portão social",
    "enabled": true,
    "requiresConfirmation": true,
    "cooldownSeconds": 5
  }
]
```

Execução:

```http
POST /api/v1/actions/{actionId}/execute
```

Payload:

```json
{
  "reason": "Liberação autorizada pela portaria",
  "unitId": "unit-id",
  "personId": "person-id"
}
```

Resposta:

```json
{
  "id": "execution-id",
  "actionId": "gate-main",
  "status": "SUCCESS",
  "message": "Comando executado.",
  "executedAt": "2026-04-09T18:00:00Z",
  "executedBy": "operator-id"
}
```

## 4. Mensagens portaria e morador

Listagem:

```http
GET /api/v1/messages?unitId={unitId}&personId={personId}&limit=50
```

Resposta:

```json
{
  "data": [
    {
      "id": "message-id",
      "unitId": "unit-id",
      "unitLabel": "Bloco A / 101",
      "personId": "person-id",
      "senderId": "user-id",
      "senderName": "Portaria",
      "channel": "APP",
      "direction": "OUTBOUND",
      "text": "Sua encomenda chegou.",
      "readAt": null,
      "createdAt": "2026-04-09T18:00:00Z"
    }
  ]
}
```

Envio:

```http
POST /api/v1/messages
```

Payload:

```json
{
  "unitId": "unit-id",
  "personId": "person-id",
  "channel": "APP",
  "text": "Sua encomenda chegou."
}
```

## 5. Busca operacional unificada

Endpoint:

```http
GET /api/v1/operation/search?q=termo&limit=20
```

Resposta:

```json
{
  "data": [
    {
      "id": "person-id",
      "type": "PERSON",
      "title": "Nome da pessoa",
      "subtitle": "Visitante | Bloco A / 101",
      "unitId": "unit-id",
      "unitLabel": "Bloco A / 101",
      "personId": "person-id",
      "category": "VISITOR",
      "status": "ACTIVE",
      "payload": {}
    }
  ]
}
```

Tipos aceitos no front:

- `PERSON`
- `DELIVERY`
- `ALERT`
- `CAMERA`
- `UNIT`

## 6. Resumo de acesso por pessoa

Endpoint:

```http
GET /api/v1/people/{id}/access-summary
```

Resposta:

```json
{
  "personId": "person-id",
  "isInsideNow": true,
  "lastEntryAt": "2026-04-09T08:00:00Z",
  "lastExitAt": null,
  "entriesToday": 1,
  "exitsToday": 0,
  "lastOperatorId": "operator-id",
  "lastOperatorName": "Nome do operador",
  "lastCameraId": "camera-id",
  "lastLocation": "Portaria social"
}
```

## 7. Câmeras RTSP convertidas

Cadastro:

```http
POST /api/v1/cameras
```

Payload mínimo:

```json
{
  "name": "Portaria principal",
  "location": "Entrada social",
  "streamUrl": "rtsp://usuario:senha@host:554/cam/realmonitor?channel=1&subtype=0",
  "status": "ONLINE",
  "unitId": "unit-id"
}
```

Resposta/listagem deve devolver pelo menos um formato navegável:

- `snapshotUrl`
- `imageStreamUrl`
- HLS
- WebRTC

RTSP puro não toca direto no navegador.

## 8. Notificações do app-morador

Listagem:

```http
GET /api/v1/resident/notifications
```

Marcar como lida:

```http
PATCH /api/v1/resident/notifications/{id}/read
```

Evento de encomenda esperado:

```json
{
  "type": "DELIVERY_RECEIVED",
  "title": "Nova encomenda na portaria",
  "body": "Sua encomenda foi recebida e aguarda retirada.",
  "deliveryId": "delivery-id",
  "unitId": "unit-id",
  "createdAt": "2026-04-09T18:00:00Z"
}
```

## Regra multiunidade

Todos os endpoints sensíveis a unidade devem respeitar:

```http
X-Selected-Unit-Id: unit-id
```

Aplicar em:

- encomendas;
- visitantes;
- prestadores;
- mensagens;
- notificações;
- busca operacional;
- resumo de acesso, quando aplicável.
