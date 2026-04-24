# Portaria Web - Pendências Ativas de Backend - 2026-04-24

## Objetivo

Consolidar em uma lista única as pendências atuais que dependem exclusivamente do backend, para evitar novos repasses fragmentados.

## 1. Câmeras

### 1.1 Criação assíncrona de câmera RTSP

Situação atual:

- o front envia `POST /api/v1/cameras/async`
- o job é criado
- porém os jobs recentes de `camera.create` continuam falhando

Erro encontrado nos jobs:

- `CreateCameraUseCase.__init__() missing 2 required positional arguments: 'device_repository' and 'device_projection_service'`

Exemplos confirmados em `GET /api/v1/jobs?limit=10`:

- `99a2328f-f101-4e20-995a-376a24be8b2e`
- `73b853cb-c57c-46e8-8bad-9051c561b7da`
- `025c664b-57d5-40fa-a75e-1e9f926f0249`
- `a81ccbb7-a10e-426f-afa1-e8a8c967b4f5`

O backend deve verificar:

1. a montagem do `CreateCameraUseCase`
2. a injeção/configuração de:
   - `device_repository`
   - `device_projection_service`
3. se o job `camera.create` está realmente conseguindo persistir a câmera ao final

### 1.2 Listagem de câmeras

Situação atual:

- `GET /api/v1/cameras` respondeu `200`
- porém a lista retornou vazia: `[]`

O backend deve verificar:

1. se a câmera criada entra de fato na persistência
2. se o `GET /api/v1/cameras` retorna a câmera criada após o job assíncrono
3. se há filtro por condomínio, unidade ou escopo impedindo a câmera de aparecer

### 1.3 Streaming de câmeras

Pendência anterior ainda válida:

1. confirmar contrato de `liveUrl`, `hlsUrl`, `webRtcUrl`, `imageStreamUrl` e `snapshotUrl`
2. confirmar disponibilidade real de `GET /api/v1/cameras/{id}/streaming`

## 2. Dispositivos faciais

Situação atual:

- o front mostra sucesso no cadastro
- porém a listagem ainda oscila e nem sempre retorna o item
- já houve erro real em:
  - `GET /api/v1/devices?condominiumId=...` com `500`

O backend deve verificar:

1. se o dispositivo facial está sendo persistido corretamente
2. se `GET /api/v1/devices` retorna o item recém-criado
3. se existe filtro por tipo, escopo ou permissão bloqueando esse retorno
4. se a listagem mantém contrato estável para o front

## 3. Mensagens entre morador e operador

Fluxo confirmado com o app morador:

- o app envia em `POST /api/v1/messages`
- com:
  - `unitId`
  - `body`
  - `origin: 'APP'`
  - `direction: 'RESIDENT_TO_PORTARIA'`
- o histórico é lido por `GET /api/v1/messages?unitId=...`
- quando a portaria responde, o backend grava:
  - `direction: 'PORTARIA_TO_RESIDENT'`
- leitura é confirmada por `PATCH /api/v1/messages/{id}/read`

Pendência atual para a web operacional:

- `GET /api/v1/messages?limit=10` sem `unitId` está retornando `400`
- no perfil `OPERADOR` testado, `/auth/me` não retornou:
  - `selectedUnitId`
  - `unitId`
  - `unitIds`

Impacto:

- a caixa de entrada global do operador não consegue carregar sem um `unitId`
- hoje a conversa só funciona de forma segura quando a web já conhece a unidade do morador

O backend deve verificar:

1. se `GET /api/v1/messages` deve aceitar listagem sem `unitId` para a portaria
2. se o perfil `OPERADOR` deve receber `unitId`, `selectedUnitId` ou `unitIds` em `/auth/me`
3. qual é o contrato oficial para a caixa de entrada operacional da portaria

## 4. Operação

Pendências ainda abertas:

### 4.1 Busca de unidades operacionais

- `GET /api/v1/operation/units?q=&limit=100` retorna `400`

Definir:

1. se a API deve aceitar busca vazia
2. ou se o contrato oficial exige ao menos 1 caractere

### 4.2 Histórico de troca de turno

- `GET /api/v1/operation/shift-changes?limit=8` segue retornando `500`

O backend deve verificar:

1. a estabilidade do endpoint
2. o contrato de retorno
3. se o perfil operacional tem escopo suficiente para essa consulta

## 5. Autenticação e sessão

Pendência anterior ainda válida:

1. confirmar política de expiração do token
2. confirmar se existe `refresh token`
3. padronizar resposta de sessão expirada para o front

## 6. Mídias

Pendência anterior ainda válida:

1. URLs de mídia com `404` real continuam dependendo do arquivo existir no servidor
2. isso vale para fotos de alerta, moradores, encomendas e imagens relacionadas

## Resumo objetivo

Hoje os bloqueios principais de backend para a Portaria Web são:

1. `camera.create` falhando por dependências internas ausentes
2. `GET /cameras` voltando vazio
3. `GET /devices` ainda instável para dispositivo facial
4. `GET /messages` sem `unitId` retornando `400`
5. `OPERADOR` sem `unitId/unitIds` claros em `/auth/me`
6. `operation/shift-changes` com `500`
7. `operation/units` com `400` em busca vazia
