# Portaria Web - Validação Pós API v6.0 - 2026-04-24

## Objetivo

Registrar o que foi validado com testes reais via `localhost`, o que saiu da lista de pendências e o que continua aberto após a chegada da API v6.0.

## Perfis testados

- `OPERADOR`
  - `cris@v8.com`
- `ADMIN`
  - `admin@v8.com`
- `MORADOR`
  - `teles@sapinho.com`

## Testes reais executados

### 1. Operador

- `POST /api/v1/auth/login`
  - `200`
- `GET /api/v1/auth/me`
  - `200`
  - retornou `unitIds` com `10` itens
  - retornou `unitNames` com `10` itens
- `GET /api/v1/messages?unitId=...&limit=5`
  - `200`

### 2. Morador

- `POST /api/v1/auth/login`
  - `200`
- `GET /api/v1/resident/profile`
  - `200`
  - retornou:
    - `photoUrl`
    - `photoUri`
    - `faceStatus`
  - `phone` veio presente no contrato, mas com valor `null` para o usuário testado
- `GET /media/...`
  - `200`
  - mídia do morador carregou corretamente

### 3. Admin

- `POST /api/v1/auth/login`
  - `200`
- `GET /api/v1/auth/me`
  - `200`
  - retornou `unitIds`
- `POST /api/v1/devices`
  - payload testado:
    - `type = FACIAL_DEVICE`
    - `deviceUsageType = ENTRY`
    - `unitId`
    - header `X-Selected-Unit-Id`
  - resultado:
    - `403`
    - mensagem:
      - `Unidade solicitada não pertence ao escopo do usuário`

## O que saiu da lista de pendências

Com base na v6.0 e nos testes reais desta rodada, seguem resolvidos:

1. `auth/me` para operador
   - `unitIds` e `unitNames` continuam corretos e utilizáveis

2. `resident/profile`
   - contrato já expõe:
     - `photoUrl`
     - `photoUri`
     - `faceStatus`
   - o campo `phone` existe no contrato; no teste realizado ele veio `null`, o que indica ausência de dado do usuário testado, não falha do endpoint

3. `/media/`
   - acesso real à mídia do morador retornou `200`

## O que continua pendente

### 1. Caixa global de mensagens da portaria

Situação real:

- `GET /api/v1/messages?unitId=...`
  - `200`
- `GET /api/v1/messages?limit=5`
  - `400`
  - retorno:
    - `Field required`

Impacto:

- a conversa por unidade funciona
- a caixa de entrada global da operação continua sem contrato suficiente para carregar “todas as mensagens” sem `unitId`

### 2. Cadastro de dispositivo facial para admin escopado

Situação real:

- `POST /api/v1/devices`
  - `403`
  - mensagem:
    - `Unidade solicitada não pertence ao escopo do usuário`

Impacto:

- o fluxo não cria dispositivo facial para o `ADMIN` testado
- continua indefinido qual regra adicional de escopo o backend exige além de `unitId`, `unitIds` e `X-Selected-Unit-Id`

## Nova capacidade encontrada na v6.0

A documentação agora expõe replays de câmera:

- `POST /api/v1/cameras/{id}/replays`
- `GET /api/v1/cameras/{camera_id}/replays/{replay_id}`

Contrato identificado:

- criação do replay exige:
  - `eventTime`
  - opcionalmente:
    - `secondsBefore`
    - `secondsAfter`
- resposta do replay prevê:
  - `replayUrl`
  - `status`
  - `startTime`
  - `endTime`
  - `mediaAuthType`
  - `errorMessage`

Observação:

- a capacidade existe na documentação v6.0
- ainda não foi homologada na interface web nesta rodada

## Resumo objetivo

Após a API v6.0, a situação prática da web ficou assim:

- `auth/me` do operador: validado
- `resident/profile`: validado
- `/media/`: validado
- mensagens por unidade: validadas
- mensagens globais da operação: continuam pendentes
- dispositivo facial para admin escopado: continua pendente
- replays de câmera: capacidade nova encontrada na documentação, ainda sem homologação no front
