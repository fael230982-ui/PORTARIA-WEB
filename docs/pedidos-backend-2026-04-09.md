# Pedidos ao backend - 2026-04-09

Este documento lista os pontos necessários para concluir as integrações da portaria e do app-morador.

## 1. Cadastro de câmera RTSP retorna 500

Ao tentar cadastrar uma câmera com URL RTSP, o backend retorna erro interno `500`.

URL de teste informada pelo TI:

```text
rtsp://muralha:muralha5514@192.168.0.153:554/cam/realmonitor?channel=1&subtype=0
```

Comportamento esperado:

- `POST /api/v1/cameras` deve aceitar URL RTSP em `streamUrl`, ou retornar erro 400 amigável explicando o campo inválido.
- Não deve retornar 500 para entrada comum de usuário.
- Se RTSP não for aceito diretamente, informar o contrato correto para cadastro.

Payload mínimo que o front tenta enviar:

```json
{
  "name": "Portaria principal",
  "location": "Entrada social",
  "streamUrl": "rtsp://...",
  "status": "ONLINE",
  "unitId": "id-da-unidade-se-aplicavel"
}
```

Observação:

- O front foi ajustado para enviar apenas campos preenchidos, sem `null` em campos opcionais.

## 2. Exibição de câmera no front/app

RTSP não é reproduzido diretamente por navegador nem deve ser usado direto no app-morador.

Para visualização, o backend/VMS precisa expor pelo menos um destes formatos:

- `snapshotUrl`
- `imageStreamUrl` MJPEG
- HLS
- WebRTC

Contrato recomendado:

- `GET /api/v1/cameras/{id}/snapshot`
- `GET /api/v1/cameras/{id}/streaming`
- `GET /api/v1/cameras/{id}/image-stream`

Resposta esperada de streaming:

```json
{
  "provider": "VMS",
  "transport": "MJPEG",
  "snapshotUrl": "/api/v1/cameras/{id}/snapshot",
  "imageStreamUrl": "/api/v1/cameras/{id}/image-stream",
  "vmsStreamingUrl": "url-nativa-se-existir"
}
```

## 3. Código/QRCode para retirada de encomenda

O front já está preparado para exibir os campos abaixo, mas a API precisa confirmar/enviar:

- `pickupCode`
- `withdrawalCode`
- `qrCodeUrl`

Objetivo:

- Quando uma encomenda for cadastrada, o morador recebe um código/QRCode.
- Para retirar na portaria, o porteiro valida esse código/QRCode antes de marcar como retirada.

Contrato desejado na listagem de encomendas:

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
  "qrCodeUrl": "https://..."
}
```

## 4. Endpoint para validar retirada

Hoje existe:

- `PATCH /api/v1/deliveries/{id}/status`

Para baixa segura, sugerimos um endpoint específico:

```http
POST /api/v1/deliveries/{id}/validate-withdrawal
```

Payload:

```json
{
  "code": "123456"
}
```

Resposta esperada:

```json
{
  "valid": true,
  "deliveryId": "delivery-id",
  "status": "WITHDRAWN",
  "withdrawnAt": "2026-04-09T18:20:00Z",
  "withdrawnBy": "operator-id"
}
```

Se inválido:

```json
{
  "valid": false,
  "message": "Código de retirada inválido."
}
```

## 5. Notificação ao app-morador

Quando uma encomenda for cadastrada pela portaria/admin:

- O backend deve notificar o morador vinculado à unidade/destinatário.
- Se push ainda não existir, disponibilizar pelo menos uma listagem de notificações pendentes.

Campos úteis:

- `notificationSentAt`
- `notificationReadAt`
- `notificationChannel`

Endpoints sugeridos:

```http
GET /api/v1/resident/notifications
PATCH /api/v1/resident/notifications/{id}/read
```

## 6. Encomendas do morador

O app-morador precisa de endpoint filtrado pelo usuário autenticado e unidade ativa.

Sugestão:

```http
GET /api/v1/resident/deliveries
```

Regras:

- Respeitar `X-Selected-Unit-Id` quando o morador tiver múltiplas unidades.
- Retornar apenas encomendas da unidade ativa.
- Permitir filtrar por status.

## 7. Morador multiunidade

Contrato já informado:

- `selectedUnitId`
- `selectedUnitName`
- `requiresUnitSelection`
- `unitIds`
- `unitNames`
- Header `X-Selected-Unit-Id`

Necessário manter essa regra nos endpoints do app-morador:

- encomendas
- visitantes
- prestadores
- mensagens
- notificações

