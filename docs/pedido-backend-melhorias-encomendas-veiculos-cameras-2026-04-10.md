# Pedido ao backend - melhorias operacionais

Data: 2026-04-10

## 1. Reenvio real de notificacao de encomenda

Hoje o front consegue chamar:

```http
PATCH /api/v1/deliveries/{id}/status
{
  "status": "NOTIFIED",
  "withdrawnBy": null
}
```

Mas isso nao garante que uma nova notificacao push/app seja enviada. Criar endpoint explicito:

```http
POST /api/v1/deliveries/{id}/resend-notification
```

Headers:

```http
Authorization: Bearer <token>
X-Selected-Unit-Id: <unitId>
```

Body sugerido:

```json
{
  "channel": "APP",
  "reason": "REMINDER"
}
```

Resposta sugerida:

```json
{
  "id": "uuid-da-encomenda",
  "notificationSentAt": "2026-04-10T12:00:00Z",
  "notificationCount": 2,
  "lastNotificationChannel": "APP",
  "lastNotificationSentBy": "uuid-do-operador"
}
```

Regra:

- `ADMIN`, `OPERACIONAL`, `CENTRAL` podem reenviar aviso.
- Reenviar apenas se `status != WITHDRAWN`.
- Registrar evento no historico.

## 2. Historico/timeline da encomenda

Criar endpoint:

```http
GET /api/v1/deliveries/{id}/events
```

Resposta sugerida:

```json
{
  "data": [
    {
      "id": "uuid",
      "deliveryId": "uuid-da-encomenda",
      "type": "DELIVERY_CREATED",
      "createdAt": "2026-04-10T08:00:00Z",
      "createdByUserId": "uuid",
      "createdByUserName": "Cris",
      "metadata": {}
    }
  ]
}
```

Tipos sugeridos:

- `DELIVERY_CREATED`
- `DELIVERY_NOTIFICATION_SENT`
- `DELIVERY_NOTIFICATION_RESENT`
- `DELIVERY_WITHDRAWAL_CODE_VALIDATED`
- `DELIVERY_WITHDRAWN`
- `DELIVERY_STATUS_CHANGED`
- `DELIVERY_PHOTO_UPLOADED`

## 3. Detalhe de encomenda por ID

Hoje o front lista e filtra localmente. Criar:

```http
GET /api/v1/deliveries/{id}
```

Permissoes:

- `ADMIN`, `OPERACIONAL`, `CENTRAL`: podem consultar dentro do escopo.
- `MORADOR`: pode consultar se `recipientUnitId` estiver em `user.unitIds`.

## 4. Upload/foto da encomenda

Criar:

```http
POST /api/v1/deliveries/{id}/photo
Content-Type: multipart/form-data
```

Campo:

```txt
file
```

Resposta:

```json
{
  "id": "uuid-da-encomenda",
  "photoUrl": "https://..."
}
```

Tambem aceitar foto no cadastro:

```http
POST /api/v1/deliveries
```

Campo atual `photoUrl` pode continuar existindo, mas upload e melhor para portaria/app.

## 5. Retirada rapida por codigo

O endpoint atual funciona e confirma retirada:

```http
POST /api/v1/deliveries/{id}/validate-withdrawal
{
  "code": "154840"
}
```

Sugestao adicional para a portaria nao precisar saber o ID:

```http
POST /api/v1/deliveries/validate-withdrawal
{
  "code": "154840",
  "unitId": "opcional"
}
```

Resposta:

```json
{
  "valid": true,
  "deliveryId": "uuid",
  "status": "WITHDRAWN",
  "withdrawnAt": "2026-04-10T12:01:18Z",
  "withdrawnBy": "uuid-do-operador",
  "withdrawnByName": "Cris"
}
```

## 6. Encomendas atrasadas

Adicionar campos calculados ou filtros:

```http
GET /api/v1/deliveries?status=RECEIVED&waitingMoreThanHours=24
GET /api/v1/deliveries?status=NOTIFIED&waitingMoreThanHours=48
```

Ou retornar campos:

```json
{
  "waitingHours": 31,
  "delayLevel": "WARNING"
}
```

Valores:

- `NORMAL`: menos de 24h
- `WARNING`: 24h ou mais
- `URGENT`: 48h ou mais

## 7. Reenvio automatico por job

Criar regra configuravel por condominio:

```http
GET /api/v1/delivery-notification-rules
POST /api/v1/delivery-notification-rules
PATCH /api/v1/delivery-notification-rules/{id}
```

Payload:

```json
{
  "condominiumId": "uuid",
  "enabled": true,
  "firstReminderHours": 24,
  "secondReminderHours": 48,
  "notifyOperationAfterHours": 72,
  "channels": ["APP"]
}
```

## 8. Cameras para morador

Hoje `MORADOR` na Casa20 recebe:

```http
GET /api/v1/cameras?unitId=7db846ab-073a-4b09-b3ed-1d9242b6e19f
```

Resposta:

```json
[]
```

Mas admin ve a camera:

```json
{
  "id": "c1677391-b586-4845-9475-6857f31a5403",
  "name": "teste",
  "unitId": "7db846ab-073a-4b09-b3ed-1d9242b6e19f",
  "visibilityScope": "ADMIN_ONLY"
}
```

Criar visibilidade:

- `ADMIN_ONLY`
- `OPERATION`
- `RESIDENT_UNIT`

Ou endpoint:

```http
GET /api/v1/resident/cameras
```

Regra:

- `MORADOR` ve somente cameras onde `camera.unitId in user.unitIds` e `visibilityScope = RESIDENT_UNIT`.

## 9. Reset de senha de usuario

Criar um dos endpoints:

```http
PATCH /api/v1/users/{id}/password
```

Body:

```json
{
  "password": "novaSenha123",
  "forceChangeOnNextLogin": false
}
```

Ou:

```http
POST /api/v1/users/{id}/reset-password
```

Body:

```json
{
  "temporaryPassword": "123456",
  "notifyUser": true
}
```

## 10. Consulta de placa veicular

O front ja esta preparado para chamar endpoint interno. Para API oficial do backend:

```http
GET /api/v1/vehicles/lookup?plate=ABC1D23
```

Resposta:

```json
{
  "plate": "ABC1D23",
  "brand": "Toyota",
  "model": "Corolla",
  "color": "Prata",
  "type": "carro",
  "year": 2020,
  "city": "Sao Paulo",
  "state": "SP",
  "situation": "Regular",
  "stolen": false,
  "source": "provedor"
}
```

Observacao: evitar scraping do SINESP Cidadao. Usar provedor autorizado/contratado.
