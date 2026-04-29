# Portaria Web - Validação Pós API v6.5 - 2026-04-27

## Objetivo

Registrar o que a `API Sapinho v6.5` trouxe de útil para o `Portaria Web`, o que já está alinhado no front e o que não pôde ser homologado por instabilidade do ambiente.

## Documentos cruzados revisados

- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\API\API Sapinho V6.5.txt`
- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\GUARITA_POS_API_V6_3_2026-04-27.md`
- `C:\Users\Pc Rafa\Desktop\app-morador\docs\RELATORIO_POS_API_V5_9_2026-04-24.md`

## Leitura útil da v6.5 para o Portaria Web

Os pontos realmente relevantes para a web administrativa e operacional foram:

1. `GET /api/v1/integrations/vms/servers/{server_id}/cameras`
   - contrato estruturado com:
     - `items`
     - `foundCount`
     - `shouldCreateNewCamera`
     - `message`

2. Câmeras
   - manutenção do suporte a:
     - `faceEngineServerId`
     - `faceEngineServerName`
     - `vmsServerId`
     - `residentVisibleUnitIds`
   - replays continuam documentados em:
     - `POST /api/v1/cameras/{id}/replays`
     - `GET /api/v1/cameras/{camera_id}/replays/{replay_id}`

3. Dispositivos
   - `remoteAccessConfig` permanece no contrato público do device
   - `POST /api/v1/devices/{id}/control-id/remote-open` continua como rota oficial do Control ID

4. Autenticação e escopo
   - `auth/me` continua publicando:
     - `unitIds`
     - `unitNames`
     - `selectedUnitId`
     - `selectedUnitName`

5. Morador
   - `GET /api/v1/resident/profile`
   - `GET /api/v1/resident/notification-preferences`
   continuam compatíveis com o que já foi validado no `App Morador`

6. Mensagens
   - a regra útil continua sendo por unidade:
     - `GET /api/v1/messages?unitId=...`
   - não há evidência nova de inbox global sem `unitId`

## Padronização com os outros módulos

### Guarita

O documento do `Guarita` confirma a mesma leitura:

- mensagens operacionais continuam por `unitId`
- `unitIds` e `unitNames` seguem como base de escopo
- os endpoints VMS são mais relevantes para módulos administrativos e para o `Portaria Web`

### App Morador

O documento do `App Morador` confirma a mesma base de contrato:

- `auth/me` rico
- `resident/profile` estável
- `resident/notification-preferences` estável
- câmeras continuam dependentes da publicação correta no backend

## Situação do código atual da web

A análise do front mostrou que a parte mais importante da v6.5 já estava incorporada:

- fluxo de `Servidores VMS`
- leitura do contrato estruturado de lookup de câmeras do VMS
- cadastro de câmera com:
  - `vmsServerId`
  - `streamExternalId`
  - `vmsDeviceId`
  - `vmsDeviceItemId`
  - `vmsRecordingServerId`
- suporte a `faceEngineServerId`
- suporte a replays de câmera
- leitura de `unitIds` e `unitNames`
- mensagens por `unitId`

## Teste real executado nesta rodada

A validação via `localhost` foi repetida e fechou melhor nesta segunda passada.

### Resultado observado

#### Admin

- `POST /api/v1/auth/login`
  - `200`
  - o token veio em `token`
- `GET /api/v1/auth/me`
  - `200`
  - retornou `unitIds` com `10` itens
  - retornou `unitNames` com `10` itens
- `GET /api/v1/integrations/vms/servers`
  - `200`
  - retornou `3` servidores
  - o payload veio em envelope `value` / `Count`
  - as capabilities do `INCORESOFT` vieram como:
    - `supportsProvisioning = true`
    - `supportsCameraLookup = true`
    - `supportsExistingCameraBinding = true`
- `GET /api/v1/devices`
  - `200`
  - retornou `7` dispositivos
  - o payload veio em envelope `value` / `Count`

#### Operador

- `POST /api/v1/auth/login`
  - `200`
- `GET /api/v1/auth/me`
  - `200`
  - retornou `unitIds` com `10` itens
  - retornou `unitNames` com `10` itens
- `GET /api/v1/messages?unitId=...&limit=5`
  - `200`

#### Morador

- `POST /api/v1/auth/login`
  - `200`
- `GET /api/v1/resident/profile`
  - `200`
  - retornou:
    - `photoUri`
    - `faceStatus`
    - `profileSource = CANONICAL_RESIDENT_PROFILE`
- `GET /api/v1/resident/notification-preferences`
  - `200`

### Leitura

- a autenticação e os contratos principais da `v6.5` estão estáveis
- o delta real de compatibilidade desta rodada foi o envelope `value` / `Count` em algumas listagens
- o `Portaria Web` precisou ser ajustado para ler esse formato em:
  - `Servidores VMS`
  - `Dispositivos`
  - `Servidores faciais`

## O que vale aplicar no Portaria Web agora

### Aplicação imediata útil

1. manter o contrato estruturado do lookup VMS como padrão oficial
2. manter a padronização de mensagens por unidade
3. manter a padronização de `auth/me` rica em `unitIds` e `unitNames`
4. manter o fluxo facial por `faceEngineServerId`
5. manter o replay de câmera como capacidade operacional da web
6. suportar envelopes `value` / `Count` nas listagens administrativas que já estão respondendo assim no ambiente

### O que não exige refatoração agora

Nesta rodada não foi identificado delta que justifique grande mudança de código só por leitura da `v6.5`.

O ganho real foi:

- consolidação de contrato
- padronização entre módulos
- confirmação de que o `Portaria Web` já está, em grande parte, alinhado com a API nova
- ajuste de compatibilidade para envelopes `value` / `Count`

## Pendências que continuam relevantes

1. inbox global da operação
   - a leitura global de mensagens segue sem contrato confirmado

2. fluxo final de câmera no VMS Incoresoft
   - o contrato do servidor VMS e o lookup estão corretos
   - a validação ponta a ponta do cadastro final da câmera não foi refeita nesta rodada

3. persistência de configuração dos acionamentos do Control ID
   - o front já está preparado
   - depende do backend persistir e devolver:
     - `remoteAccessConfig.actionOneLabel`
     - `remoteAccessConfig.actionTwoLabel`
     - `remoteAccessConfig.actionOneEnabled`
     - `remoteAccessConfig.actionTwoEnabled`

## Resumo objetivo

A `v6.5` é útil para o `Portaria Web`, mas nesta rodada ela trouxe mais consolidação do que ruptura.

Conclusão prática:

- o front já está alinhado com os recursos mais importantes da `v6.5`
- `Guarita` e `App Morador` seguem a mesma base de contrato
- não apareceu mudança que obrigue refatoração ampla agora
- a homologação real ficou parcialmente bloqueada por `502 Bad Gateway` no ambiente do backend
