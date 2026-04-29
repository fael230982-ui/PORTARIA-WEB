# Diagnóstico Frontend - VMS Incoresoft e Dispositivo Facial

Data do teste VMS: 2026-04-24T20:58:26-03:00  
Data do reteste facial: 2026-04-24  
Ambiente testado: `http://localhost:3000` via proxy do frontend  
Usuário testado: `admin@v8.com`  
Perfil: `ADMIN`

## 1. Servidor VMS

### Request
- Método: `POST`
- URL: `http://localhost:3000/api/proxy/integrations/vms/servers`

Payload enviado:

```json
{
  "name": "VMS Incoresoft Diagnostico 20260424205825",
  "vendor": "INCORESOFT",
  "baseUrl": "https://192.168.0.160:2443/",
  "apiToken": "WSc37eQhSMUFSe541PEL7HyBbS4YJmdG",
  "authType": "API_TOKEN",
  "verifySsl": false,
  "timeoutSeconds": 45,
  "status": "ONLINE"
}
```

### Response
- Status HTTP: `201`
- Server ID criado: `d58fb7f5-8c1d-4062-97ab-6505896d2415`

Body retornado:

```json
{
  "id": "d58fb7f5-8c1d-4062-97ab-6505896d2415",
  "name": "VMS Incoresoft Diagnostico 20260424205825",
  "vendor": "INCORESOFT",
  "operationMode": "MANAGED_PROVISIONING",
  "capabilities": {
    "supportsProvisioning": true,
    "supportsCameraLookup": true,
    "supportsExistingCameraBinding": true
  },
  "baseUrl": "https://192.168.0.160:2443/",
  "authType": "API_TOKEN",
  "verifySsl": false,
  "timeoutSeconds": 45,
  "condominiumId": "dbe471a0-970b-4aea-948e-ed5838a0e296",
  "status": "ONLINE"
}
```

## 2. Fallback de criação de câmera no Incoresoft

### Request
- Método: `POST`
- URL: `http://localhost:3000/api/proxy/cameras`
- `server_id` usado: `d58fb7f5-8c1d-4062-97ab-6505896d2415`

Payload enviado:

```json
{
  "name": "Camera Fallback Diagnostico 20260424205826",
  "deviceType": "CAMERA",
  "streamUrl": "rtsp://192.168.0.153/cam/realmonitor?channel=1&subtype=0",
  "vmsServerId": "d58fb7f5-8c1d-4062-97ab-6505896d2415",
  "status": "ONLINE"
}
```

### Response
- Status HTTP: `503`

Body retornado:

```html
<html>
<head><title>503 Service Temporarily Unavailable</title></head>
<body>
<center><h1>503 Service Temporarily Unavailable</h1></center>
<hr><center>nginx</center>
</body>
</html>
```

Headers principais retornados:
- `vary`
- `x-proxy-target`
- `Connection`
- `Keep-Alive`
- `Transfer-Encoding`
- `Content-Type`
- `Date`

## 3. Cadastro de dispositivo facial Control ID

### Situação anterior

Antes da correção do front, o payload estava saindo com:

```json
{
  "condominiumId": null
}
```

Isso bloqueava a validação correta com o backend.

### Ajuste aplicado no frontend

- `DevicePayload` passou a aceitar `condominiumId`
- a tela `Admin > Dispositivos` agora envia automaticamente o `condominiumId` do usuário `ADMIN` ou `MASTER`

### Reteste real

#### Request
- Método: `POST`
- URL: `http://localhost:3000/api/proxy/devices`

Payload enviado:

```json
{
  "status": "ONLINE",
  "username": "admin",
  "model": "IDFACE",
  "monitoringEnabled": false,
  "condominiumId": "dbe471a0-970b-4aea-948e-ed5838a0e296",
  "snapshotUrl": "http://192.168.0.90/camera.jpg",
  "name": "Control ID Portaria",
  "type": "FACIAL_DEVICE",
  "host": "192.168.0.90",
  "deviceUsageType": "ENTRY",
  "webPort": 80,
  "externalId": "control-id-portaria-01",
  "vendor": "CONTROLID",
  "cameraEnabled": true,
  "residentVisible": false,
  "password": "admin"
}
```

#### Response
- Status HTTP: `201`

Body retornado:

```json
{
  "id": "d889457f-0e4b-4361-b0f5-1e74e597d655",
  "name": "Control ID Portaria",
  "type": "FACIAL_DEVICE",
  "vendor": "CONTROLID",
  "model": "IDFACE",
  "externalId": "control-id-portaria-01",
  "host": "192.168.0.90",
  "webPort": 80,
  "snapshotUrl": "http://192.168.0.90/camera.jpg",
  "monitoringEnabled": false,
  "residentVisible": false,
  "cameraEnabled": true,
  "deviceUsageType": "ENTRY",
  "status": "ONLINE",
  "unitId": null,
  "condominiumId": "dbe471a0-970b-4aea-948e-ed5838a0e296",
  "cameraId": "8246cba2-cd69-4bfa-a8d4-6238fa2d99af",
  "cameraName": "Control ID Portaria"
}
```

## 4. Observações

- O frontend já está gerando logs detalhados no console para `POST /cameras`
- O cadastro do servidor VMS foi concluído com sucesso
- O cadastro do dispositivo facial Control ID foi corrigido e validado com sucesso
- O bloqueio real que continua neste documento está concentrado em:
  - `POST /api/v1/cameras`
- Arquivo bruto do teste local:
  - `C:\\Users\\Pc Rafa\\Desktop\\portaria\\my-app\\tmp-vms-diagnostics.json`
