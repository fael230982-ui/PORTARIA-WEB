# Portaria Web - Pedido detalhado ao Backend apos API Sapinho V4.7

## Contexto

O `Portaria Web` absorveu de forma segura o que a `V4.7` permite aproveitar agora:

- status de sincronizacao de lista facial em pessoas
- reconciliacao offline defensiva por `clientRequestId`
- continuidade do fluxo facial e de sync sem quebrar ambientes ainda incompletos

Mesmo assim, ainda existem fechamentos do lado do backend para o contrato ficar realmente canonico e confiavel no ecossistema.

## 1. Fechar oficialmente o contrato de reconciliacao offline

### Situacao atual no front

O front ja consegue:

- gerar `clientRequestId`
- enfileirar criacao offline de encomenda
- tentar reconciliar por `GET /api/v1/internal/sync/reconcile/{client_request_id}`

### O que ainda falta no backend

- confirmar se esse endpoint e oficialmente consumivel pelos modulos do ecossistema
- fechar provisao do header `X-Sync-Token`
- documentar validade, rotacao e escopo do token

### Pedido objetivo

- confirmar o uso oficial de `GET /internal/sync/reconcile/{client_request_id}` pelo `Portaria Web`
- documentar como o token chega ao frontend web
- confirmar se o token e:
  - por ambiente
  - por cliente
  - por sessao
  - por dispositivo
- documentar expiracao e renovacao

### Impacto

Sem isso, a reconciliacao fica tecnicamente preparada no front, mas nao pode ser tratada como fluxo canonico fechado.

## 2. Fechar semantica dos estados de reconciliacao

### Situacao atual na spec

A `V4.7` publica estados como:

- `NOT_FOUND`
- `PENDING`
- `PROCESSING`
- `APPLIED`
- `FAILED_TEMPORARY`
- `FAILED_PERMANENT`

### O que falta no backend

Falta transformar isso em contrato operacional claro.

### Pedido objetivo

- documentar o significado exato de cada `syncStatus`
- definir quando `retryable` deve ser `true`
- definir se `isFinal` sempre acompanha:
  - `APPLIED`
  - `FAILED_PERMANENT`
- documentar quando `NOT_FOUND` significa:
  - evento ainda nao recebido
  - evento expirado
  - `clientRequestId` invalido

### Impacto

Sem isso, cada modulo tende a interpretar reconciliação de forma diferente.

## 3. Idempotencia forte em criacao de encomendas

### Situacao atual no front

O `Portaria Web` ja envia `clientRequestId` automaticamente.

### O que falta no backend

Garantir comportamento oficial e previsivel de idempotencia.

### Pedido objetivo

- garantir que duas criacoes com o mesmo `clientRequestId` nao gerem duplicidade
- documentar resposta quando o agregado ja existir
- devolver no fluxo de reconciliacao o identificador real da encomenda criada

### Campos desejados na reconciliacao

- `aggregateType`
- `aggregateId`
- `eventType`
- `clientRequestId`
- `syncStatus`
- `errorType`
- `errorMessage`
- `syncedAt`

### Impacto

Sem isso, o operador ainda pode ficar em duvida se a encomenda foi aplicada ou duplicada apos reconexao.

## 4. Fechar o contrato de `faceListSyncStatus` e `faceListSyncError`

### Situacao atual no front

O `Portaria Web` ja le e exibe esses campos no cadastro de moradores.

### O que falta no backend

Ainda falta padronizacao oficial.

### Pedido objetivo

- documentar enum oficial de `faceListSyncStatus`
- confirmar se os valores esperados sao, por exemplo:
  - `PENDING`
  - `PROCESSING`
  - `SYNCED`
  - `ERROR`
- definir quando `faceStatus` diverge de `faceListSyncStatus`
- definir quando `faceErrorMessage` e `faceListSyncError` coexistem e qual precedencia deve ser usada

### Impacto

Sem isso, os modulos conseguem mostrar o estado, mas ainda precisam inferir a semantica.

## 5. Esclarecer a relacao entre `faceStatus` e sincronizacao externa

### Ponto observado

Hoje existem ao menos dois eixos:

- estado da foto/face local (`faceStatus`)
- estado de envio para lista/engine externa (`faceListSyncStatus`)

### Pedido objetivo

- documentar claramente a diferenca entre:
  - foto existente
  - face extraida
  - face pendente
  - face sincronizada localmente
  - face sincronizada na engine/lista externa
- devolver exemplos reais de payload para cada combinacao relevante

### Impacto

Sem isso, a UI fica correta visualmente, mas ainda depende de leitura contextual para explicar o estado ao operador.

## 6. Fechar oficialmente o uso de `integrations/face/people/{id}/sync`

### Situacao atual no front

O `Portaria Web` ja usa o endpoint de sync manual de pessoa.

### O que falta no backend

- definir se ele e sincrono ou apenas dispara processamento assíncrono
- definir se a resposta sempre reflete o estado final ou apenas aceite do job
- documentar relacao com `faceListSyncStatus`

### Pedido objetivo

- documentar resposta esperada do sync manual
- esclarecer se o retorno representa:
  - sucesso final
  - aceite do processamento
  - enfileiramento

### Impacto

Sem isso, o front ainda precisa comunicar sync facial de forma prudente e nao deterministica.

## 7. Continuar o fechamento do sync interno por evento

### Situacao atual

A spec ainda publica:

- `POST /api/v1/internal/sync/events`

### Pedido objetivo

- confirmar se esse endpoint e parte do contrato do ecossistema ou se permanece apenas interno
- se for oficial, documentar payloads por dominio:
  - encomendas
  - alertas
  - mensagens
  - turnos

### Impacto

Sem esse fechamento, os modulos continuam com reconciliacao parcial e sem ciclo completo de sync oficial.

## Prioridade recomendada

1. fechamento de `X-Sync-Token` e reconciliacao offline
2. idempotencia oficial por `clientRequestId`
3. enum e semantica de `faceListSyncStatus`
4. relacao oficial entre `faceStatus` e sync externo
5. comportamento do endpoint manual de sync facial
6. definicao do papel de `internal/sync/events`
