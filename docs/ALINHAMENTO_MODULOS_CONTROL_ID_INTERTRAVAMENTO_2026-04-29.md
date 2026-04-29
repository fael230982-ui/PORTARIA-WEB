# Alinhamento entre modulos - Control iD e intertravamento - 2026-04-29

## Escopo

Este documento registra o que a Portaria Web passou a consumir do contrato publico atual para dispositivos Control iD.

Nao altera implementacao dos demais modulos. Serve apenas como referencia para App Morador, backend e demais interfaces seguirem o mesmo contrato quando forem tratar abertura remota.

## Contratos relevantes

- `POST /api/v1/devices/{id}/control-id/remote-open`
- `GET /api/v1/devices/{id}/control-id/jobs/{job_id}`
- `POST /api/v1/devices/{id}/control-id/configure-monitor`
- `POST /api/v1/devices/{id}/control-id/configure-push`
- `GET /api/v1/devices/equipment-catalog`
- `remoteAccessConfig.interlockConfig`

## Regra adotada na Portaria Web

- `remote-open` com `queued=true` nao e considerado sucesso fisico.
- quando houver `jobId`, a Portaria consulta o job.
- `SUCCEEDED` muda o comando para confirmado.
- `FAILED` muda o comando para falha.
- enquanto o job fica `PENDING` ou `RUNNING`, a tela exibe pendencia/aguardando confirmacao.
- sucesso de comando nao e tratado como sensor de porta aberta.
- icone de porta aberta/fechada so deve representar sensor real quando o backend expuser `doorStatus` ou campo equivalente.

## Intertravamento

O admin da Portaria Web agora permite configurar:

- `interlockConfig.enabled`
- `interlockConfig.blockedByDeviceIds`
- `interlockConfig.openStateTtlSeconds`

Payload esperado dentro de `remoteAccessConfig`:

```json
{
  "targetType": "DOOR",
  "actionOneLabel": "PORTAO SOCIAL",
  "actionTwoLabel": "GARAGEM",
  "actionOneEnabled": true,
  "actionTwoEnabled": false,
  "interlockConfig": {
    "enabled": true,
    "blockedByDeviceIds": ["UUID_DO_OUTRO_DEVICE"],
    "openStateTtlSeconds": 180
  }
}
```

## Pendencia ainda externa ao front

O OpenAPI ainda nao expoe campo publico claro para estado fisico real da porta, como:

- `doorStatus`
- `doorLastEventAt`
- `doorStateSource`

Enquanto esse contrato nao existir, a Portaria Web nao deve exibir porta aberta/fechada como estado de sensor.
