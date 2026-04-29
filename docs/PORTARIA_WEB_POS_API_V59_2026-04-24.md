# Portaria Web - Validação Pós API v5.9 - 2026-04-24

## Objetivo

Registrar o que foi efetivamente validado após a chegada da documentação da API v5.9, separando o que saiu da lista de pendências do que ainda precisa de alinhamento com o backend.

## Testes reais executados

Perfis usados nos testes:

- `OPERADOR`: `cris@v8.com`
- `ADMIN`: `admin@v8.com`
- `MORADOR`: `teles@sapinho.com`

Todos os logins responderam `200`.

## Itens validados como resolvidos

### 1. `GET /api/v1/auth/me` no perfil operacional

Resultado real:

- `200`
- passou a devolver:
  - `unitIds`
  - `unitNames`

Exemplo validado:

- `unitIds` com 10 unidades
- `unitNames` com:
  - `1`
  - `10`
  - `101`
  - `12`
  - `20`
  - `25`
  - `35`
  - `CASA 20`
  - `Casa Prod Visita`
  - `SAS`

Conclusão:

- a pendência antiga de contrato do operador em `auth/me` foi resolvida

### 2. Mensagens da operação por unidade

Resultado real:

- `GET /api/v1/messages?unitId=...&limit=5`
- respondeu `200`

Conclusão:

- o contrato de mensagens por unidade está utilizável
- a caixa operacional da web pode trabalhar com as unidades retornadas no `auth/me`

### 3. `GET /api/v1/resident/profile`

Resultado real:

- `200`
- agora expõe os campos antes ausentes:
  - `phone`
  - `photoUrl`
  - `photoUri`
  - `faceStatus`

Retorno validado:

- `photoUrl = /media/people/66721ce5f7884202bbf8079db7d159f3.jpg`
- `faceStatus = FACE_SYNCED`
- `phone` presente no contrato

Conclusão:

- a divergência antiga de contrato de `resident/profile` foi resolvida

### 4. Encaminhamento de `/media/`

Resultado real:

- `GET /media/people/66721ce5f7884202bbf8079db7d159f3.jpg`
- respondeu `200`

Conclusão:

- o encaminhamento de `/media/` no nginx está funcionando

## Item que melhorou, mas ainda não está fechado

### Dispositivo facial

Na v5.7, o problema era:

- `POST /devices` retornava sucesso
- o item não aparecia na lista
- `GET /devices/{id}` voltava `404`

Na v5.9, o comportamento mudou.

Teste real executado:

- `POST /api/v1/devices`
- payload com:
  - `type = FACIAL_DEVICE`
  - `deviceUsageType = ENTRY`
  - `unitId` enviado
  - `X-Selected-Unit-Id` enviado

Resultado real:

- `403`
- mensagem:
  - `Unidade solicitada não pertence ao escopo do usuário`

Leitura:

- o backend deixou de aceitar criação inconsistente
- isso é melhor do que `201` seguido de item invisível
- porém ainda falta fechar qual unidade está realmente autorizada para esse perfil criar dispositivo

Estado atual:

- `GET /api/v1/devices?condominiumId=...` respondeu `200`
- listagem retornou `4` dispositivos
- a criação de novo dispositivo facial segue bloqueada por escopo

## Pendência real após a v5.9

### Criação de dispositivo facial para usuário administrativo escopado

Situação atual:

- `auth/me` já entrega `unitIds`
- mesmo enviando `unitId` e `X-Selected-Unit-Id`, o backend respondeu:
  - `403 Unidade solicitada não pertence ao escopo do usuário`

O backend precisa definir com clareza:

1. qual unidade do `ADMIN` está válida para criação de dispositivo
2. se `unitIds` retornadas em `auth/me` são realmente aceitas no `POST /devices`
3. se ainda existe algum cabeçalho, seleção prévia ou regra adicional para esse fluxo

## Itens que saíram da lista de pendências

- contrato de `auth/me` para operador
- contrato de mensagens por unidade na operação
- contrato de `resident/profile`
- encaminhamento de `/media/`

## Resumo objetivo

Depois da API v5.9 e dos testes reais:

- `auth/me` do operador foi resolvido
- mensagens por unidade foram validadas
- `resident/profile` foi corrigido
- `/media/` está funcionando

A pendência real restante confirmada nesta rodada ficou concentrada em:

- criação de dispositivo facial com escopo de unidade para usuário administrativo
