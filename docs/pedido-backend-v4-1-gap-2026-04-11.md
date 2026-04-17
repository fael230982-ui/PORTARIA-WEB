# Pedido backend v4.1

Data: 11/04/2026

Base analisada:
- `src/api/API Sapinho V4.1.txt`
- front web em `my-app`

## O que a v4.1 já resolveu

- `GET /api/v1/master/clients`
- `POST /api/v1/master/clients`
- `PATCH /api/v1/master/licenses/{client_id}`
- `PATCH /api/v1/master/clients/{client_id}/modules`
- `PATCH /api/v1/master/clients/{client_id}/operation`
- `GET /api/v1/resident/notifications`
- `PATCH /api/v1/resident/notifications/{id}/read`
- `POST /api/v1/resident/notifications/read-all`

Também melhorou o `PublicCondominiumResponse`, que agora traz:
- `clientType`
- `document`
- `address`
- `city`
- `state` / `uf`
- `zipCode` / `cep`
- `responsibleName`
- `responsibleEmail`
- `responsiblePhone`
- `licensePlan`
- `licenseStatus`
- `licenseExpiresAt`
- `enabledModules`
- `slimMode`
- `operationStatus`
- `operationLastSeenAt`

## Pendências reais do backend

### 1. Falta edição cadastral completa do cliente no namespace Master

Ainda não existe:

- `PATCH /api/v1/master/clients/{client_id}`

Hoje o front consegue:
- criar cliente via `POST /master/clients`
- editar licença via `PATCH /master/licenses/{client_id}`
- editar módulos via `PATCH /master/clients/{client_id}/modules`

Mas para editar cadastro do cliente ainda depende de fallback legado:
- `PATCH /api/v1/condominiums/{id}`
- ou `PUT /api/v1/condominiums/{id}`

### Contrato desejado

`PATCH /api/v1/master/clients/{client_id}`

Payload esperado:

```json
{
  "name": "Condomínio Exemplo",
  "clientType": "CONDOMINIUM",
  "document": "00.000.000/0001-00",
  "address": "Rua Exemplo, 100",
  "city": "Campinas",
  "state": "SP",
  "zipCode": "13000-000",
  "responsibleName": "Maria Gestora",
  "responsibleEmail": "maria@cliente.com",
  "responsiblePhone": "(19) 99999-9999"
}
```

Resposta:
- mesmo shape de `PublicCondominiumResponse`

---

### 2. Falta heartbeat real por dispositivo da portaria

O front web já envia heartbeat para:

- `POST /api/v1/operation/devices/heartbeat`

Mas esse endpoint não aparece na v4.1.

Hoje a v4.1 só expõe:

- `PATCH /api/v1/master/clients/{client_id}/operation`

Isso ajuda no Master, mas não resolve a origem real do sinal por computador da portaria.

### Contrato desejado

#### Registrar heartbeat

`POST /api/v1/operation/devices/heartbeat`

Payload:

```json
{
  "deviceId": "web-123",
  "deviceName": "Portaria web",
  "clientVersion": "web-v4.1",
  "currentPath": "/operacao",
  "metadata": {
    "role": "OPERADOR",
    "viewport": "1920x1080",
    "userAgent": "..."
  }
}
```

#### Consultar dispositivos

`GET /api/v1/master/operation-devices`

Resposta sugerida:

```json
[
  {
    "clientId": "uuid",
    "clientName": "Condomínio Exemplo",
    "deviceId": "web-123",
    "deviceName": "Guarita principal",
    "status": "ONLINE",
    "lastSeenAt": "2026-04-11T16:00:00Z",
    "currentPath": "/operacao"
  }
]
```

---

### 3. `GET /api/v1/events/stream` continua sem contrato tipado

Na v4.1, o `200` de `/api/v1/events/stream` ainda está com schema vazio.

Isso impede fechar o consumo em tempo real com segurança no front.

### Contrato desejado

Definir claramente:
- se é `text/event-stream` ou outro formato;
- shape do evento;
- tipos suportados.

Exemplo:

```json
{
  "id": "evt_123",
  "type": "ALERT_CREATED",
  "createdAt": "2026-04-11T16:00:00Z",
  "payload": {
    "alertId": "uuid",
    "cameraId": "uuid",
    "unitId": "uuid"
  }
}
```

---

### 4. `GET /api/v1/operation/search` ainda retorna arrays genéricos

A v4.1 já formalizou `PublicOperationSearchResponse`, mas ainda assim os campos são:

- `people: object[]`
- `deliveries: object[]`
- `accessLogs: object[]`

Isso ainda está genérico demais.

### Contrato desejado

Tipar cada item desses arrays com schemas próprios.

Exemplo:
- `PublicOperationSearchPersonResult`
- `PublicOperationSearchDeliveryResult`
- `PublicOperationSearchAccessLogResult`

Hoje o front ainda precisa normalizar “na mão”.

---

### 5. Notificações do morador ainda não trazem imagem do alerta

A v4.1 abriu:

- `GET /api/v1/resident/notifications`

Mas `PublicResidentNotificationResponse` ainda só traz:
- `id`
- `type`
- `title`
- `body`
- `channel`
- `unitId`
- `deliveryId`
- `readAt`
- `createdAt`

Para o caso de alerta facial ou “pessoa sem cadastro detectada”, ainda falta imagem.

### Contrato desejado

Adicionar ao menos:

```json
{
  "alertId": "uuid",
  "cameraId": "uuid",
  "snapshotUrl": "/api/v1/alerts/{id}/snapshot",
  "thumbnailUrl": "/api/v1/alerts/{id}/thumbnail"
}
```

Idealmente também:
- `location`
- `occurredAt`
- `personId` quando houver

---

### 6. Catálogo de módulos do backend ainda é menor que o catálogo do produto

Na v4.1, `PublicMasterModule` suporta:

- `USERS`
- `PEOPLE`
- `CAMERAS`
- `ACCESS_LOGS`
- `DELIVERIES`
- `VISIT_FORECASTS`
- `VEHICLES`
- `FACIAL`
- `MONITORING`

Mas o produto já trabalha visualmente também com:
- `units`
- `alerts`
- `reports`
- `messages`
- `actions`
- `residentApp`
- `guardApp`

Hoje o front já trata isso corretamente, salvando no backend apenas o subconjunto suportado pela v4.1.

### Pedido

Expandir o enum de `PublicMasterModule` quando esses módulos passarem a ser persistidos por cliente.

---

### 7. Relatório de troca de turno ainda não tem endpoint real

O front web já ficou pronto e funcional usando a estrutura local de relatórios:
- início de turno
- fechamento de turno
- resumo
- observações
- histórico no Admin

Mas ainda não existe contrato backend específico para isso.

### Contrato sugerido

`POST /api/v1/operation/shift-reports`

Payload:

```json
{
  "operatorId": "uuid",
  "operatorName": "Nome",
  "condominiumId": "uuid",
  "startedAt": "2026-04-11T08:00:00Z",
  "endedAt": "2026-04-11T14:00:00Z",
  "durationMinutes": 360,
  "summary": {
    "alerts": 3,
    "alertLocations": ["Portão social", "Garagem"],
    "receivedDeliveries": 4,
    "pendingDeliveries": 2,
    "withdrawnDeliveries": 1,
    "visitors": 5,
    "serviceProviders": 2,
    "activeResidents": 18,
    "unreadMessages": 1,
    "occurrences": 2,
    "accessEntries": 12,
    "accessExits": 11
  },
  "notes": "Resumo da passagem"
}
```

E:

- `GET /api/v1/operation/shift-reports`
- `GET /api/v1/operation/shift-reports/{id}`

---

## Prioridade sugerida

### Obrigatório
1. `PATCH /api/v1/master/clients/{client_id}`
2. `POST /api/v1/operation/devices/heartbeat`
3. `GET /api/v1/master/operation-devices`
4. tipar `GET /api/v1/events/stream`
5. tipar melhor `GET /api/v1/operation/search`

### Recomendado
6. enriquecer `resident/notifications` com snapshot do alerta
7. endpoint real de troca de turno

### Futuro
8. expandir enum de módulos do Master
