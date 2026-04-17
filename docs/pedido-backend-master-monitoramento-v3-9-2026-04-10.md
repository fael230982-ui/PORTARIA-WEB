# Pedido ao backend - Master, licencas e monitoramento v3.9

Data: 2026-04-10

## Contexto

O front web ja foi alinhado com a API Sapinho v3.9 para:

- cameras com `GET /api/v1/cameras/{id}/streaming`;
- acionamentos com `GET /api/v1/actions` e `POST /api/v1/actions/{action_id}/execute`;
- mensagens com `GET /api/v1/messages`, `POST /api/v1/messages` e `PATCH /api/v1/messages/{id}/read`;
- busca operacional com `GET /api/v1/operation/search`;
- retirada segura com `POST /api/v1/deliveries/{id}/validate-withdrawal`;
- QR de retirada com `GET /api/v1/deliveries/withdrawal-qr/{code}`.

Ainda falta publicar contrato persistente para a area Master.

## 1. Condominium como cliente/licenca

Hoje na OpenAPI v3.9:

- `PublicCondominiumCreateRequest` aceita apenas `name`;
- `PublicCondominiumResponse` retorna apenas `id` e `name`.

Solicito ampliar `POST /api/v1/condominiums`, `GET /api/v1/condominiums` e `PATCH /api/v1/condominiums/{id}` para aceitar e retornar:

```json
{
  "id": "uuid",
  "name": "Residencial Exemplo",
  "clientKind": "CONDOMINIUM",
  "document": "00.000.000/0000-00",
  "address": "Rua Exemplo, 100",
  "city": "Sao Paulo",
  "state": "SP",
  "zipCode": "00000-000",
  "responsibleName": "Nome do responsavel",
  "responsibleEmail": "financeiro@cliente.com",
  "responsiblePhone": "(11) 99999-9999",
  "licensePlan": "Profissional",
  "licenseStatus": "ACTIVE",
  "licenseExpiresAt": "2026-12-31",
  "enabledModules": ["users", "cameras", "facialRecognition"],
  "moduleSettings": {
    "users": true,
    "units": false,
    "people": false,
    "cameras": true,
    "facialRecognition": true
  }
}
```

Enums sugeridos:

- `clientKind`: `CONDOMINIUM` ou `RESIDENCE`;
- `licenseStatus`: `ACTIVE`, `TRIAL`, `SUSPENDED`, `EXPIRED`.

## 2. Dashboard Master agregado

Para a tela Master funcionar como um "Power BI" operacional, criar endpoint:

`GET /api/v1/master/summary`

Resposta sugerida:

```json
{
  "clients": 12,
  "condominiums": 9,
  "residences": 3,
  "activeLicenses": 11,
  "expiredLicenses": 1,
  "peopleCount": 1840,
  "residentsCount": 1312,
  "camerasCount": 96,
  "onlineCameras": 91,
  "offlineCameras": 5,
  "pendingDeliveries": 43,
  "criticalAlerts": 2,
  "offlineOperationDevices": 1
}
```

Opcional: incluir array `clients` com contadores por cliente.

## 3. Monitoramento de computadores da portaria

Precisamos saber quando um computador da portaria desconectar.

Criar:

`POST /api/v1/operation/devices/heartbeat`

Payload:

```json
{
  "deviceId": "browser-generated-id",
  "deviceName": "Portaria principal",
  "clientVersion": "web-1.0.0",
  "currentPath": "/operacao",
  "metadata": {
    "userAgent": "browser",
    "screen": "1920x1080"
  }
}
```

Resposta:

```json
{
  "ok": true,
  "serverTime": "2026-04-10T19:00:00Z"
}
```

Criar tambem:

`GET /api/v1/master/operation-devices`

Resposta:

```json
[
  {
    "id": "uuid",
    "condominiumId": "uuid",
    "condominiumName": "Residencial Exemplo",
    "deviceId": "browser-generated-id",
    "deviceName": "Portaria principal",
    "status": "ONLINE",
    "lastSeenAt": "2026-04-10T19:00:00Z",
    "userId": "uuid",
    "userName": "Operador"
  }
]
```

Regra sugerida:

- `ONLINE`: ultimo heartbeat ate 90 segundos;
- `OFFLINE`: sem heartbeat acima de 90 segundos.

Enviar evento em tempo real por `GET /api/v1/events/stream` quando mudar de online para offline.

## 4. Busca operacional

A v3.9 ja publica:

`GET /api/v1/operation/search?q=...&limit=...`

O front ja normaliza `people`, `deliveries` e `accessLogs`.

Melhoria desejada: cada item retornado trazer identificadores e labels padronizados:

```json
{
  "people": [
    {
      "id": "person-id",
      "name": "Pessoa",
      "document": "00000000000",
      "unitId": "unit-id",
      "unitLabel": "Casa 20",
      "status": "ACTIVE"
    }
  ],
  "deliveries": [
    {
      "id": "delivery-id",
      "deliveryCompany": "Mercado Livre",
      "trackingCode": "ABC123",
      "recipientUnitId": "unit-id",
      "unitLabel": "Casa 20",
      "status": "NOTIFIED"
    }
  ],
  "accessLogs": [
    {
      "id": "access-id",
      "personId": "person-id",
      "personName": "Pessoa",
      "unitId": "unit-id",
      "unitLabel": "Casa 20",
      "action": "ENTRY",
      "createdAt": "2026-04-10T19:00:00Z"
    }
  ]
}
```

## 5. Retirada segura de encomenda

A v3.9 ja publica:

`POST /api/v1/deliveries/{id}/validate-withdrawal`

Payload aceito pelo front:

```json
{
  "code": "123456",
  "validationMethod": "CODE",
  "manualConfirmation": false
}
```

Confirmar regra:

- se `valid=true`, backend deve marcar a encomenda como `WITHDRAWN`;
- preencher `withdrawnAt`, `withdrawnByName`, `withdrawalValidatedAt`, `withdrawalValidationMethod`;
- retornar mensagem amigavel quando codigo expirar ou nao pertencer a encomenda.

## 6. App guarita OCR

Para o app guarita com foto da etiqueta, criar futuramente:

`POST /api/v1/deliveries/ocr`

Payload multipart:

- `photo`: imagem da etiqueta;
- `condominiumId` opcional;
- `unitId` opcional.

Resposta sugerida:

```json
{
  "deliveryCompany": "Mercado Livre",
  "trackingCode": "ABC123",
  "recipientName": "Rafael",
  "unitHint": "Casa 20",
  "confidence": 0.92,
  "rawText": "texto extraido"
}
```

Depois o app confirma e chama `POST /api/v1/deliveries`.

