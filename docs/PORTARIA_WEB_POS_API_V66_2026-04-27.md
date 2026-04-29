# Portaria Web - Validacao Pos API v6.6 - 2026-04-27

## Objetivo

Registrar o que a `API Sapinho v6.6` trouxe de util para o `Portaria Web`, o que ja estava alinhado no projeto e o que precisou de ajuste de compatibilidade.

## Documentos cruzados revisados

- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\API\API Sapinho V6.6.txt`
- `C:\Users\Pc Rafa\Desktop\guarita\GUARITA_POS_API_V6_5_2026-04-27.md`
- `C:\Users\Pc Rafa\Desktop\app-morador\docs\RELATORIO_POS_API_V6_5_2026-04-27.md`

## Leitura util da v6.6 para o Portaria Web

Os pontos realmente uteis desta rodada foram:

1. `GET /api/v1/auth/permissions-matrix`
   - agora esta retornando envelope com:
     - `value`
     - `Count`

2. `GET /api/v1/master/provisioning-keys`
   - tambem esta retornando envelope com:
     - `value`
     - `Count`

3. Listagens administrativas
   - o mesmo padrao `value` / `Count` continua aparecendo em:
     - `integrations/vms/servers`
     - `integrations/face/servers`
     - `devices`

4. Contratos operacionais e de morador
   - `auth/sync-capabilities` respondeu de forma estavel
   - `auth/stream-capabilities` respondeu de forma estavel
   - `messages/whatsapp/connection?unitId=...` respondeu de forma estavel
   - `resident/profile` e `resident/notification-preferences` seguem compativeis com o `App Morador`

## Padronizacao com os outros modulos

### Guarita

O `Guarita` continua alinhado no que importa para esta rodada:

- mensagens por unidade
- Control ID como integracao tecnica
- sem necessidade de refatoracao nova por API

### App Morador

O `App Morador` continua confirmando a mesma base:

- escopo por unidade
- `resident/profile` estavel
- `resident/notification-preferences` estavel
- sem ruptura contratual para o morador

## Validacao real executada no localhost

### Login

- `POST /api/v1/auth/login`
  - `200` para `MASTER`
  - `200` para `ADMIN`
  - `200` para `OPERADOR`

### Contratos validados

- `GET /api/v1/auth/permissions-matrix`
  - `200`
  - retorno em `value` / `Count`
- `GET /api/v1/auth/sync-capabilities`
  - `200`
- `GET /api/v1/auth/stream-capabilities`
  - `200`
- `GET /api/v1/messages/whatsapp/connection?unitId=...`
  - `200`
- `GET /api/v1/master/provisioning-keys`
  - `200`
  - retorno em `value` / `Count`
- `GET /api/v1/integrations/vms/servers`
  - `200`
  - retorno em `value` / `Count`
- `GET /api/v1/integrations/face/servers`
  - `200`
  - retorno em `value` / `Count`
- `GET /api/v1/devices`
  - `200`
  - retorno em `value` / `Count`
- `GET /api/v1/resident/profile`
  - ja validado nas rodadas anteriores e continua dentro do contrato esperado
- `GET /api/v1/resident/notification-preferences`
  - ja validado nas rodadas anteriores e continua dentro do contrato esperado

## O que foi aplicado no front

Nesta rodada, o `Portaria Web` foi ajustado para aceitar o envelope `value` / `Count` tambem em:

1. `permissions-matrix`
2. `master/provisioning-keys`
3. `partner/provisioning-keys`
4. `master/partners`
5. `partner/clients`

Arquivos ajustados:

- [master.service.ts](/abs/path/C:/Users/Pc%20Rafa/Desktop/portaria/my-app/src/services/master.service.ts)
- [partners.service.ts](/abs/path/C:/Users/Pc%20Rafa/Desktop/portaria/my-app/src/services/partners.service.ts)

## O que nao exigiu refatoracao nova

Nao apareceu mudanca de contrato que justificasse alteracao grande em:

- cameras
- replays
- face engine servers
- mensagens por unidade
- perfil do morador
- preferencias de notificacao do morador

## Pendencias que continuam abertas

1. inbox global da operacao
   - ainda nao existe contrato final confirmado sem `unitId`

2. fechamento ponta a ponta do fluxo VMS Incoresoft
   - o front esta preparado
   - a homologacao final do cadastro da camera ainda depende de nova rodada estavel do backend

3. persistencia dos nomes e ativacoes dos acionamentos do Control ID
   - o front ja envia e consome a estrutura
   - o backend ainda precisa persistir e devolver:
     - `remoteAccessConfig.actionOneLabel`
     - `remoteAccessConfig.actionTwoLabel`
     - `remoteAccessConfig.actionOneEnabled`
     - `remoteAccessConfig.actionTwoEnabled`

## Resumo objetivo

A `v6.6` foi util, mas trouxe delta pequeno para o `Portaria Web`.

O ganho real desta rodada foi:

- consolidacao de contrato
- compatibilidade com `value` / `Count` em mais listagens
- manutencao da padronizacao com `Guarita` e `App Morador`

Conclusao pratica:

- nao houve refatoracao ampla
- houve ajuste pontual de compatibilidade
- o projeto segue alinhado com a `v6.6`
