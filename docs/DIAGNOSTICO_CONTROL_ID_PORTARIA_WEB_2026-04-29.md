# Diagnóstico Control iD - Portaria Web - 2026-04-29

## Ambiente

- API: `https://sapinhoprod.v8seguranca.com.br/api/v1`
- Usuário de teste: `admin@v8.com`
- Device testado: `9d850831-c5fb-4c8c-b9e4-889131c3b459`
- Nome: `RAFIELS`
- Tipo: `FACIAL_DEVICE`
- Host: `192.168.0.129`
- Status: `ONLINE`
- hasPassword: `true`
- Grupos do device: `SALA - RAFIELS`, `ACESSO GERAL PORTARIA`

Pessoa testada:

- id: `392480bd-5046-47cd-86ef-b8ef14ab1ee2`
- nome: `RAFAEL DA SILVA BEZERRA`
- unidade: `35`
- faceStatus: `PHOTO_ONLY`
- hasFacialCredential: `false`
- photoUrl: existe
- birthDate: `1982-09-23`
- categoria: `RESIDENT`
- status: `ACTIVE`
- grupos: `SALA - RAFIELS`, `ACESSO GERAL PORTARIA`

## Teste 1 - Acionamento remoto

Request:

```http
POST /api/v1/devices/9d850831-c5fb-4c8c-b9e4-889131c3b459/control-id/remote-open
```

Payload:

```json
{
  "doorNumber": 1,
  "reason": 1,
  "secboxId": null,
  "portalId": null
}
```

Resultado inicial:

- HTTP 200
- `ok: true`
- `queued: true`
- `executed: false`
- `confirmed: false`
- `finalStatus: PENDING`
- `deviceHttpStatus: null`
- `deviceMessage: "Comando aguardando consumo pelo Control iD"`
- job gerado: `f8e15a0b-14e8-46fc-b8be-3c1f3a8d8568`

Polling do job por 60 segundos:

- endpoint: `GET /api/v1/devices/{deviceId}/control-id/jobs/{jobId}`
- resultado permaneceu:
  - `result.status: RUNNING`
  - `result.finalStatus: RUNNING`
  - `result.queued: true`
  - `result.executed: false`
  - `result.confirmed: false`
  - `result.deviceHttpStatus: null`
  - `result.finishedAt: null`
  - mensagem depois de algumas tentativas: `Control iD ainda não consumiu o comando de abertura remota`

Conclusão:

- Front está correto ao manter o estado como aguardando.
- O backend está criando job e expondo polling.
- O comando ainda não está sendo consumido/confirmado pelo Control iD nesse fluxo.

## Teste 2 - Sincronizar pessoa no equipamento

Request:

```http
POST /api/v1/devices/9d850831-c5fb-4c8c-b9e4-889131c3b459/control-id/people/392480bd-5046-47cd-86ef-b8ef14ab1ee2/sync
```

Resultado:

- HTTP 502
- tempo aproximado: 133 ms
- body vazio

Conclusão:

- O device e a pessoa possuem dados mínimos esperados.
- O erro continua no backend/integração.
- Falta body técnico para o front exibir causa real.

## Teste 3 - Persistência do interlockConfig

Estado anterior:

- `remoteAccessConfig.interlockConfig: null`

Patch testado:

```json
{
  "remoteAccessConfig": {
    "targetType": "DOOR",
    "reason": 1,
    "residentEnabled": false,
    "actionOneLabel": "RAFIELS",
    "actionTwoLabel": "Acionamento 2",
    "actionOneEnabled": true,
    "actionTwoEnabled": false,
    "interlockConfig": {
      "enabled": true,
      "blockedByDeviceIds": [],
      "openStateTtlSeconds": 180
    }
  }
}
```

Resultado:

- backend persistiu corretamente:
  - `enabled: true`
  - `blockedByDeviceIds: []`
  - `openStateTtlSeconds: 180`
- depois do teste, o valor foi restaurado para `null`.

Conclusão:

- Front pode salvar `interlockConfig`.
- Backend persiste o contrato.
- Falta testar bloqueio real quando houver segundo device configurado.

## Checagem OpenAPI - 2026-04-29

Fonte:

```text
https://sapinhoprod.v8seguranca.com.br/openapi.json
```

Endpoints Control iD relevantes publicados:

- `POST /api/v1/devices/{id}/control-id/test-connection`
- `POST /api/v1/devices/{id}/control-id/configure-push`
- `POST /api/v1/devices/{id}/control-id/configure-monitor`
- `POST /api/v1/devices/{id}/control-id/enable-online`
- `POST /api/v1/devices/{id}/control-id/disable-online`
- `POST /api/v1/devices/{id}/control-id/remote-open`
- `GET /api/v1/devices/{id}/control-id/jobs/{job_id}`
- `POST /api/v1/devices/{id}/control-id/people/{person_id}/sync`
- `POST /api/notifications/door`

Novidade útil confirmada:

- `enable-online` e `disable-online` estão no contrato público.
- O front já possui chamadas de serviço e botões administrativos para essas ações.

Ainda não encontrado no contrato:

- endpoint público `GET /api/v1/devices/{id}/door-status`;
- campo formal `doorStatus`, `doorState` ou `doorLastEventAt`;
- campos formais no schema do acionamento como `finalStatus`, `deviceHttpStatus` ou `deviceMessage`.

Conclusão:

- O front pode configurar o Control iD online, push e monitor pelo Admin.
- O front pode acompanhar job de acionamento quando o backend retorna `jobId`.
- Para ícone confiável de porta aberta/fechada, ainda falta o backend expor estado físico da porta em endpoint/campo público.
