# Portaria Web - Pós API - 2026-04-30 - Fase 1

## Novidades confirmadas no OpenAPI

Fonte consultada:

```text
https://sapinhoprod.v8seguranca.com.br/openapi.json
```

Endpoints úteis confirmados:

- `GET /api/v1/devices/{id}/control-id/door-status`
- `GET /api/v1/devices/{id}/control-id/jobs/{job_id}`
- `GET /api/v1/messages/inbox`
- `POST /api/v1/integrations/vms/servers/{server_id}/cameras/import`
- `POST /api/v1/cameras/{id}/replays`
- `GET /api/v1/cameras/{camera_id}/replays/{replay_id}`

## Integrações aplicadas no front

### Estado físico da porta

O front passou a consultar:

```http
GET /api/v1/devices/{id}/control-id/door-status
```

Uso aplicado:

- painel operacional;
- modal de acionamentos;
- Admin > Dispositivos > Comandos do equipamento.

Regra visual:

- se `sensorAvailable = true` e porta aberta, mostra porta aberta em vermelho;
- se `sensorAvailable = true` e porta fechada, mostra porta fechada em verde;
- se `sensorAvailable = false` ou estado desconhecido, mostra `Sensor não monitorado`;
- comando enviado não é mais tratado como prova de porta aberta.

Teste real em produção:

```json
{
  "ok": true,
  "vendor": "CONTROLID",
  "operation": "door_status",
  "result": {
    "deviceId": "9d850831-c5fb-4c8c-b9e4-889131c3b459",
    "doorStatus": "UNKNOWN",
    "doorState": "UNKNOWN",
    "doorOpen": null,
    "doorLastEventAt": null,
    "source": "NO_SENSOR_EVENT",
    "sensorAvailable": false,
    "deviceMessage": "Sem evento de sensor de porta recebido do Control iD"
  }
}
```

Conclusão:

- endpoint está funcional;
- para o device testado, ainda não há evento/sensor real recebido;
- o front deve exibir estado como não monitorado até o backend receber evento físico do Control iD.

### Caixa de mensagens da portaria

O front passou a priorizar:

```http
GET /api/v1/messages/inbox
```

Antes, a inbox dependia de `unitIds` no usuário e fazia várias chamadas por unidade. Agora:

- tenta carregar a inbox oficial primeiro;
- aceita retorno em lista, objeto paginado ou objeto único;
- se a inbox oficial falhar/vier vazia, usa fallback antigo por unidade.

Teste real em produção retornou mensagem do morador:

```json
{
  "unitName": "35",
  "senderUserName": "RAFAEL DA SILVA BEZERRA",
  "direction": "RESIDENT_TO_PORTARIA",
  "origin": "APP",
  "body": "Boa tarde chegou alguma encomenda para mim?",
  "status": "UNREAD"
}
```

### Reaproveitamento de câmera existente no VMS

O front passou a usar o endpoint específico publicado para importar câmera já existente do VMS:

```http
POST /api/v1/integrations/vms/servers/{server_id}/cameras/import
```

Regra aplicada:

- se o formulário estiver em modo `reaproveitar-camera-vms`, com `vmsServerId` e `vmsDeviceItemId`, o front chama o endpoint de importação;
- se for cadastro novo/fallback, mantém o fluxo de `POST /api/v1/cameras`;
- a resposta é normalizada como câmera local cadastrada.

Payload enviado nesse fluxo:

```json
{
  "cameraId": 21,
  "recordingServerId": 1,
  "name": "Camera Portaria",
  "location": null,
  "unitId": null,
  "residentVisible": false
}
```

## Validação local

```text
npm run build
```

Resultado:

- build concluído com sucesso;
- TypeScript sem erro.

## Pendência registrada para depois

Durante teste de cadastro de câmera nova no front, foi observado antes do ajuste:

```text
POST relacionado ao fluxo VMS/câmera retornou 400 Bad Request
[camera-vms] reaproveitar-camera-vms 2026-04-30T12:23:51.068Z
```

Próxima checagem:

- capturar request payload final;
- capturar response body completo;
- retestar no navegador se o fluxo novo de importação eliminou o `400 Bad Request`;
- se ainda falhar, validar se o backend exige algum campo adicional além de `cameraId`.
