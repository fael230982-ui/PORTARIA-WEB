# App Guarita - especificacao inicial

Data: 2026-04-10

## Objetivo

Criar um app simples para porteiro/guarita com foco em:

- registro rapido de encomendas;
- foto da etiqueta e do pacote;
- OCR para sugerir unidade, destinatario, transportadora e rastreio;
- envio da foto na notificacao do app morador;
- cadastro/coleta de face pelo celular.

## Fluxo 1 - Encomenda com foto e OCR

1. Porteiro toca em `Nova encomenda`.
2. Seleciona ou fotografa etiqueta.
3. App roda OCR local ou envia para backend.
4. App sugere:
   - unidade;
   - destinatario;
   - transportadora;
   - codigo de rastreio;
   - texto bruto da etiqueta.
5. Porteiro revisa.
6. Porteiro tira foto do pacote, se necessario.
7. App envia a encomenda.
8. Backend dispara notificacao para moradores da unidade.

## Campos minimos no app

- `recipientUnitId`
- `recipientPersonId` opcional
- `deliveryCompany`
- `trackingCode`
- `receivedAt`
- `photoUrl`
- `labelPhotoUrl`
- `ocrRawText`
- `ocrConfidence`

## Endpoints desejados

### Upload

`POST /api/v1/uploads`

Aceitar multipart com imagem.

Resposta:

```json
{
  "fileId": "uuid",
  "url": "https://...",
  "mimeType": "image/jpeg"
}
```

### OCR

`POST /api/v1/ocr/delivery-label`

Body:

```json
{
  "imageUrl": "https://..."
}
```

Resposta:

```json
{
  "recipientName": "Rafael",
  "unitLabel": "Casa20",
  "trackingCode": "ABC123456789BR",
  "deliveryCompany": "Correios",
  "confidence": 0.87,
  "rawText": "texto extraido..."
}
```

### Criar encomenda

`POST /api/v1/deliveries`

Body sugerido:

```json
{
  "recipientUnitId": "uuid",
  "recipientPersonId": "uuid",
  "deliveryCompany": "Correios",
  "trackingCode": "ABC123456789BR",
  "receivedAt": "2026-04-10T10:00:00Z",
  "photoUrl": "https://.../pacote.jpg",
  "labelPhotoUrl": "https://.../etiqueta.jpg",
  "ocrRawText": "texto extraido",
  "ocrConfidence": 0.87
}
```

## Notificacao ao morador

Ao criar encomenda, backend deve disparar push para usuarios MORADOR da unidade.

Payload ideal:

```json
{
  "type": "DELIVERY",
  "deliveryId": "uuid",
  "unitId": "uuid",
  "title": "Nova encomenda recebida",
  "body": "Sua encomenda chegou na portaria.",
  "photoUrl": "https://.../pacote.jpg",
  "thumbnailUrl": "https://.../thumb.jpg",
  "pickupCode": "123456",
  "qrCodeUrl": "https://..."
}
```

## Fluxo 2 - Cadastro de face

1. Porteiro busca pessoa.
2. Seleciona morador, visitante, prestador ou locatario.
3. Tira foto pelo celular.
4. App valida qualidade minima:
   - rosto visivel;
   - boa iluminacao;
   - apenas uma face;
   - imagem nao borrada.
5. Envia para backend.
6. Backend vincula foto/face a pessoa.

Endpoint sugerido:

`POST /api/v1/people/{id}/face`

Multipart:

- `file`
- `source=GUARITA_APP`

Resposta:

```json
{
  "personId": "uuid",
  "photoUrl": "https://...",
  "faceStatus": "READY",
  "qualityScore": 0.92
}
```

## Permissoes

Perfil OPERACIONAL/PORTARIA pode:

- criar encomenda;
- subir foto de encomenda;
- chamar OCR;
- cadastrar face de pessoa no proprio condominio;
- consultar unidade e moradores para vinculo.

Perfil MORADOR nao pode cadastrar face de terceiros.

## Fases recomendadas

1. Registro manual de encomenda com foto.
2. OCR local no celular para preencher campos.
3. Upload de foto na notificacao do morador.
4. Cadastro de face pelo celular.
5. Validacao automatica de qualidade da face.
6. Integracao com equipamento facial/VMS.

