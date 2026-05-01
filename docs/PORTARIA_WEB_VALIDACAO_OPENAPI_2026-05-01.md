# Validação OpenAPI - Portaria Web - 01/05/2026

Fonte principal consultada:

- `https://sapinhoprod.v8seguranca.com.br/openapi.json`

Observação de versão:

- Este documento usa o OpenAPI online atual como contrato válido da API em produção.
- A referência local `src/api/API Sapinho V5.6.txt` foi usada somente como histórico de comparação, porque era o arquivo mais recente salvo no repositório no momento da validação.
- Portanto, quando houver divergência entre a V5.6 local e o OpenAPI online atual, prevalece o OpenAPI online atual.

Escopo:

- Apenas Portaria Web.
- Não foram alterados App-Morador, Guarita ou Backend.
- Comparação histórica contra a última versão local documentada em `src/api/API Sapinho V5.6.txt`.

## Resumo

O OpenAPI público atual expõe 185 rotas. Os contratos relevantes para a Portaria Web foram revisados para câmeras, VMS, dispositivos Control iD, alertas e mensagens.

Foram aplicados apenas ajustes compatíveis com o contrato atual:

- `GET /api/v1/cameras/{id}/streaming` agora é consumido com `mediaRoute=external`.
- O front preserva os campos novos de streaming VMS: `mediaRoute`, `vmsStreamingUrls`, `vmsSnapshotUrls` e `vmsBaseUrls`.
- O player não trata `wss://.../vms` como vídeo HTML comum.
- Quando a API retorna `transport=VMS_NATIVE` sem `hlsUrl`, a tela informa que há apenas preview em frames, aguardando HLS/WebRTC ou player VMS nativo.
- O cadastro/edição de Servidor VMS usa IP interno e porta interna para calcular `baseUrl`.
- O Servidor VMS respeita o enum atual de status: `ONLINE` e `OFFLINE`.
- A lista de servidores VMS é exibida em ordem alfabética.
- A chamada legada `/api/v1/cameras/async` foi removida do fluxo do front, pois não existe mais no contrato público atual.

## Diferenças encontradas em relação à V5.6 local

Rotas adicionadas no contrato atual:

- `GET /api/v1/devices/equipment-catalog`
- `GET /api/v1/devices/{id}/control-id/door-status`
- `GET /api/v1/devices/{id}/control-id/jobs/{job_id}`
- `GET /api/v1/integrations/vms/servers`
- `POST /api/v1/integrations/vms/servers`
- `GET/PATCH/PUT/DELETE /api/v1/integrations/vms/servers/{server_id}`
- `GET /api/v1/integrations/vms/servers/{server_id}/cameras`
- `POST /api/v1/integrations/vms/servers/{server_id}/cameras/import`
- `GET /api/v1/integrations/vms/servers/{server_id}/delete-impact`
- `GET /api/v1/messages/inbox`

Rota removida do contrato atual:

- `POST /api/v1/cameras/async`

## Câmeras e VMS

Contrato validado:

- `GET /api/v1/cameras/{id}/streaming`
- Query aceita: `mediaRoute=internal|external`
- Resposta atual inclui:
  - `provider`
  - `transport`
  - `snapshotUrl`
  - `frameUrl`
  - `previewUrl`
  - `imageStreamUrl`
  - `mjpegUrl`
  - `liveUrl`
  - `hlsUrl`
  - `webRtcUrl`
  - `preferredLiveUrl`
  - `vmsStreamingUrl`
  - `vmsStreamingUrls`
  - `vmsSnapshotUrls`
  - `vmsBaseUrls`
  - `mediaRoute`
  - `cameraUuid`
  - `streams`

Resultado real observado:

```json
{
  "mediaRoute": "external",
  "transport": "VMS_NATIVE",
  "preferredLiveUrl": "wss://189.51.92.18:60110/vms",
  "hlsUrl": null
}
```

Conclusão:

- O front já consome a rota externa.
- O IP externo está chegando corretamente.
- Ainda não há vídeo HLS/WebRTC reproduzível pelo navegador.
- Enquanto o backend retornar apenas `VMS_NATIVE` via `wss://.../vms`, o front só consegue exibir o `imageStreamUrl` como preview em frames.

Pendência para backend/produto:

- Entregar `hlsUrl`/`.m3u8`, WebRTC compatível ou documentação/SDK do player VMS nativo para `wss://.../vms`.

## Servidor VMS

Contrato validado:

- `PublicVmsServerCreateRequest`
- Campos aceitos:
  - `name`
  - `vendor`
  - `baseUrl`
  - `internalScheme`
  - `internalIp`
  - `internalPort`
  - `externalScheme`
  - `externalIp`
  - `externalPort`
  - `apiToken`
  - `authType`
  - `verifySsl`
  - `timeoutSeconds`
  - `condominiumId`
  - `status`

Status aceitos:

- `ONLINE`
- `OFFLINE`

Ajuste aplicado:

- O front calcula `baseUrl` a partir de `internalScheme`, `internalIp` e `internalPort`.
- O campo `Base URL` fica informativo no modal, reduzindo preenchimento duplicado e erro operacional.

## Control iD

Contratos validados:

- `POST /api/v1/devices/{id}/control-id/remote-open`
- `GET /api/v1/devices/{id}/control-id/jobs/{job_id}`
- `GET /api/v1/devices/{id}/control-id/door-status`
- `POST /api/v1/devices/{id}/control-id/people/{person_id}/sync`

Situação do front:

- O front já consulta job de acionamento quando o backend retorna comando enfileirado.
- O front já consulta status de porta quando disponível.
- O front já diferencia comando enfileirado, sucesso, erro e sensor de porta quando a API retorna dados suficientes.

Pendência operacional:

- Quando o backend retorna apenas fila, o front não pode confirmar abertura física.
- Para confirmação visual definitiva, o backend precisa retornar estado final do job ou sensor confiável de porta.

## Alertas e ocorrências

Contrato validado:

- `GET /api/v1/alerts`
- `PATCH /api/v1/alerts/{id}/workflow`
- `PublicAlertResponse` com:
  - `snapshotUrl`
  - `replayUrl`
  - `replayCreateUrl`
  - `cameraIds`
  - `cameras[]`
  - `deviceId`
  - `workflowStatus`
  - `resolutionNote`
  - `resolutionPreset`

Situação do front:

- O front já está preparado para exibir evidências por câmera quando `cameras[]` vier preenchido.
- O modal de ocorrência consegue mostrar snapshot, abrir câmera ao vivo e oferecer replay quando a API retorna URL ou rota de criação.

Pendência para backend:

- Garantir que alertas reais de dispositivo tragam `cameras[]`, `snapshotUrl`/snapshot por câmera e `replayUrl` ou `replayCreateUrl`.

## Mensagens

Novidade encontrada:

- `GET /api/v1/messages/inbox`

Situação do front:

- A Portaria Web já possui consumo de caixa de entrada por `/messages/inbox`.
- Mantém compatibilidade com `/messages` para histórico e envio.

## Validações executadas

- Consulta real ao OpenAPI público.
- Comparação de rotas relevantes contra `API Sapinho V5.6.txt`.
- Build do front:

```txt
npm run build
Resultado: sucesso
```

## Pendências registradas

- Backend precisa fornecer HLS/WebRTC ou player/protocolo VMS nativo para vídeo contínuo no navegador.
- Backend precisa garantir evidências completas em alertas: snapshot e replay por câmera vinculada ao dispositivo.
- Confirmação física de acionamento depende de retorno final de job/sensor confiável.
- O front não deve reintroduzir `/api/v1/cameras/async` enquanto a rota não existir no OpenAPI público.
