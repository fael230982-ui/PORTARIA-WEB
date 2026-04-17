# Pedido ao backend - Encomendas com retirada segura - 2026-04-09

Este complemento detalha o fluxo de encomendas necessário para a portaria e para o app-morador.

## Objetivo

Garantir que uma encomenda só seja retirada por pessoa autorizada, usando código ou QRCode apresentado pelo morador no momento da retirada.

## Fluxo desejado

1. Porteiro ou admin registra a encomenda.
2. Backend gera `pickupCode` e/ou `qrCodeUrl`.
3. Backend notifica o morador no app.
4. Morador apresenta código/QRCode na portaria.
5. Porteiro valida o código/QRCode.
6. Backend marca a encomenda como `WITHDRAWN`.
7. Backend registra auditoria da retirada.

## Campos esperados na encomenda

```json
{
  "id": "delivery-id",
  "recipientUnitId": "unit-id",
  "recipientPersonId": "person-id",
  "deliveryCompany": "Correios",
  "trackingCode": "AA123",
  "status": "RECEIVED",
  "receivedAt": "2026-04-09T18:00:00Z",
  "pickupCode": "123456",
  "withdrawalCode": "123456",
  "qrCodeUrl": "https://...",
  "notificationSentAt": "2026-04-09T18:01:00Z",
  "withdrawnAt": null,
  "withdrawnBy": null,
  "withdrawnByName": null
}
```

## Endpoint recomendado para validação

```http
POST /api/v1/deliveries/{id}/validate-withdrawal
```

Payload:

```json
{
  "code": "123456"
}
```

Resposta válida:

```json
{
  "valid": true,
  "deliveryId": "delivery-id",
  "status": "WITHDRAWN",
  "withdrawnAt": "2026-04-09T18:20:00Z",
  "withdrawnBy": "operator-id",
  "withdrawnByName": "Nome do operador"
}
```

Resposta inválida:

```json
{
  "valid": false,
  "message": "Código de retirada inválido."
}
```

## Auditoria recomendada

- `withdrawnAt`
- `withdrawnBy`
- `withdrawnByName`
- `withdrawalValidationMethod`: `CODE`, `QRCODE` ou `MANUAL`
- `withdrawalValidatedAt`
- `withdrawalFailureReason`, quando houver tentativa inválida

## Notificação ao app-morador

Evento recomendado:

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

## Contingência no front

Enquanto a API não enviar `pickupCode`, `withdrawalCode` ou `qrCodeUrl`, o front exige confirmação manual do operador para retirada. Isso deve ser considerado contingência, não fluxo definitivo.
