# Pedido ao Backend - GAP restante após análise da API v4.0

Data: 10/04/2026

Base analisada:
- Front web em `C:\Users\Pc Rafa\Desktop\portaria\my-app`
- Documento da API: `src/api/API Sapinho V4.0.txt`

## 1. O que já ficou coberto na v4.0

Esses pontos já estão publicados e o front consegue aproveitar:

- `GET /api/v1/cameras/{id}/streaming`
- `POST /api/v1/deliveries/{id}/validate-withdrawal`
- `GET /api/v1/deliveries/withdrawal-qr/{code}`
- `GET /api/v1/actions`
- `POST /api/v1/actions/{action_id}/execute`
- `GET /api/v1/messages`
- `POST /api/v1/messages`
- `PATCH /api/v1/messages/{id}/read`
- `GET /api/v1/operation/search`
- `GET /api/v1/resident/notifications`
- `PATCH /api/v1/resident/notifications/{id}/read`
- `PATCH /api/v1/resident/notifications/read-all`
- `GET /api/v1/master/summary`
- `GET /api/v1/master/clients`
- `POST /api/v1/master/clients`
- `GET /api/v1/master/licenses`
- `PATCH /api/v1/master/licenses/{client_id}`
- `PATCH /api/v1/master/clients/{client_id}/modules`
- `PATCH /api/v1/master/clients/{client_id}/operation`

## 2. O que ainda falta o backend fechar

### 2.1. Tipar as respostas do bloco Master

Hoje, na OpenAPI v4.0, os retornos abaixo estão com schema vazio `{}`:

- `GET /api/v1/master/summary`
- `GET /api/v1/master/clients`
- `POST /api/v1/master/clients`
- `GET /api/v1/master/licenses`
- `PATCH /api/v1/master/licenses/{client_id}`
- `PATCH /api/v1/master/clients/{client_id}/modules`
- `PATCH /api/v1/master/clients/{client_id}/operation`

Isso impede integração forte sem adivinhação.

### Solicitação

Publicar schemas de resposta tipados e exemplos reais de JSON.

### Campos mínimos esperados em `GET /api/v1/master/clients`

Por cliente:

- `id`
- `name`
- `clientType`
- `document`
- `address`
- `city`
- `state`
- `uf`
- `zipCode`
- `cep`
- `responsibleName`
- `responsibleEmail`
- `responsiblePhone`
- `licensePlan`
- `licenseStatus`
- `licenseExpiresAt`
- `enabledModules`
- `slimMode`
- `peopleCount`
- `residentsCount`
- `camerasCount`
- `operationStatus`
- `operationLastSeenAt`
- `operationDeviceName`

### Campos mínimos esperados em `GET /api/v1/master/summary`

- `clients`
- `condominiums`
- `residences`
- `activeLicenses`
- `offlineOperations`
- `peopleCount`
- `residentsCount`
- `cameraCount`
- `enabledModulesTotal`

## 2.2. Endpoint de edição cadastral do cliente no namespace Master

Hoje existe:

- `POST /api/v1/master/clients`
- `PATCH /api/v1/master/licenses/{client_id}`
- `PATCH /api/v1/master/clients/{client_id}/modules`
- `PATCH /api/v1/master/clients/{client_id}/operation`

Mas não existe um endpoint claro para editar os dados cadastrais do cliente no namespace master.

Hoje o front ainda depende de `PATCH /api/v1/condominiums/{id}` para isso.

### Solicitação

Criar:

`PATCH /api/v1/master/clients/{client_id}`

### Payload esperado

```json
{
  "name": "Residencial Exemplo",
  "clientType": "CONDOMINIUM",
  "document": "12.345.678/0001-99",
  "address": "Rua Exemplo, 100",
  "city": "Campinas",
  "state": "SP",
  "uf": "SP",
  "zipCode": "13000-000",
  "cep": "13000-000",
  "responsibleName": "João Silva",
  "responsibleEmail": "joao@exemplo.com",
  "responsiblePhone": "(19) 99999-9999"
}
```

## 2.3. Monitoramento real dos computadores da portaria

O Master já prevê monitoramento operacional, mas a v4.0 ainda não trouxe o contrato que fecha isso de forma real.

Hoje existe:

- `PATCH /api/v1/master/clients/{client_id}/operation`

Isso serve para atualizar status, mas não substitui heartbeat real vindo do computador da guarita.

### Solicitação

Criar:

- `POST /api/v1/operation/devices/heartbeat`
- `GET /api/v1/master/operation-devices`

ou, como alternativa, incluir a lista de dispositivos dentro de:

- `GET /api/v1/master/summary`
- ou `GET /api/v1/master/clients`

### Payload mínimo do heartbeat

```json
{
  "clientId": "uuid",
  "deviceId": "uuid-ou-id-estavel",
  "deviceName": "GUARITA-01",
  "machineName": "PC-GUARITA",
  "appVersion": "web-1.0.0",
  "localIp": "192.168.0.10",
  "lastSeenAt": "2026-04-10T19:00:00Z"
}
```

### Campos mínimos esperados na listagem de monitoramento

- `clientId`
- `clientName`
- `deviceId`
- `deviceName`
- `machineName`
- `status` (`ONLINE` / `OFFLINE`)
- `lastSeenAt`
- `appVersion`
- `localIp`

## 2.4. Catálogo de módulos do Master ainda não bate com o produto

Na v4.0, o enum `PublicMasterModule` tem:

- `USERS`
- `PEOPLE`
- `CAMERAS`
- `ACCESS_LOGS`
- `DELIVERIES`
- `VISIT_FORECASTS`
- `VEHICLES`
- `FACIAL`
- `MONITORING`

Mas o produto que está sendo montado no front já trabalha com módulos de negócio mais amplos:

- `UNITS`
- `USERS`
- `PEOPLE`
- `OPERATION`
- `DELIVERIES`
- `CAMERAS`
- `VEHICLES`
- `ALERTS`
- `REPORTS`
- `FACIAL`
- `MESSAGES`
- `ACTIONS`
- `RESIDENT_APP`
- `GUARD_APP`

### Solicitação

Escolher um dos dois caminhos:

1. Expandir o enum do backend para refletir os módulos reais do produto.
2. Criar um catálogo oficial:

`GET /api/v1/master/modules/catalog`

Com resposta tipada, por exemplo:

```json
[
  { "key": "USERS", "label": "Usuários", "required": true },
  { "key": "PEOPLE", "label": "Pessoas", "required": false },
  { "key": "CAMERAS", "label": "Câmeras", "required": false }
]
```

Sem isso, front e backend vão divergir sobre quais módulos existem de fato.

## 2.5. Contrato do stream de eventos ainda está aberto demais

Existe:

- `GET /api/v1/events/stream`

Mas na v4.0 o retorno ainda está sem schema e o content type aparece como `application/json`.

Se a ideia for SSE, o correto é documentar como stream e definir o envelope dos eventos.

### Solicitação

Definir claramente se será:

- SSE (`text/event-stream`)
- ou WebSocket
- ou polling JSON

### Envelope mínimo esperado

```json
{
  "event": "delivery.created",
  "clientId": "uuid",
  "unitId": "uuid",
  "occurredAt": "2026-04-10T19:00:00Z",
  "payload": {}
}
```

### Eventos que o front precisa receber

- `delivery.created`
- `delivery.updated`
- `camera.status_changed`
- `access.created`
- `message.created`
- `alert.created`
- `operation.device_online`
- `operation.device_offline`

## 2.6. `GET /api/v1/operation/search` ainda precisa de resposta mais tipada

Hoje a v4.0 já melhorou e trouxe:

- `people`
- `deliveries`
- `accessLogs`

Mas cada item ainda está como `object` genérico na OpenAPI.

### Solicitação

Tipar os itens com campos mínimos estáveis.

### Pessoas

- `id`
- `name`
- `document`
- `unitId`
- `unitName`
- `status`

### Encomendas

- `id`
- `recipientUnitId`
- `unitName`
- `deliveryCompany`
- `status`
- `createdAt`

### Access logs

- `id`
- `personId`
- `personName`
- `cameraId`
- `direction`
- `status`
- `createdAt`

## 3. O que não precisa pedir agora

Esses pontos já estão suficientes para o front seguir:

- streaming de câmera via `/cameras/{id}/streaming`
- mensagens operacionais
- ações operacionais
- retirada de encomenda por validação
- notificações do app morador

## 4. Prioridade recomendada para o backend

### Obrigatório para integração forte agora

1. Tipar respostas do bloco Master
2. Criar `PATCH /api/v1/master/clients/{client_id}`
3. Fechar heartbeat/listagem real dos computadores da portaria
4. Alinhar catálogo de módulos

### Recomendado na sequência

5. Tipar melhor `GET /api/v1/operation/search`
6. Fechar contrato real de `GET /api/v1/events/stream`

