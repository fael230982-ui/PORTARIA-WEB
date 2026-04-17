# Portaria Web - Pedido detalhado ao Backend apos API Sapinho V4.6

## Contexto

O `Portaria Web` absorveu o que a `V4.6` ja permite de forma segura:

- preferencias de notificacao do morador
- consentimento LGPD por dispositivo
- moradores por unidade
- OCR de etiqueta por payload
- `clientRequestId` automatico na criacao de encomendas

Mesmo assim, ainda existem fechamentos do lado do backend que impedem o ecossistema de operar com contrato totalmente canonico e auditavel.

## 1. Persistencia oficial do tratamento operacional de alertas

### Situacao atual no front

O `Portaria Web` ja trata alertas com fluxo operacional:

- `Novo`
- `Em espera`
- `Resolvido`

Tambem ja registra no front:

- hora da chegada
- hora de abertura
- hora de resolucao
- quem abriu
- quem resolveu
- retorno para fila
- texto obrigatorio de resolucao

### O que falta no backend

Criar ou formalizar persistencia canonica para esses dados no dominio de alertas.

### Pedido objetivo

- expor no contrato de alertas campos operacionais persistidos
- permitir atualizar o tratamento operacional de uma ocorrencia
- devolver esses dados em:
  - lista de alertas
  - detalhe de alerta
  - historico/relatorio administrativo

### Campos sugeridos

- `workflowStatus`
- `openedAt`
- `openedByUserId`
- `openedByName`
- `resolvedAt`
- `resolvedByUserId`
- `resolvedByName`
- `lastReturnedToQueueAt`
- `resolutionNote`
- `resolutionPreset`

### Impacto

Sem isso, o historico operacional fica apenas local no navegador e nao vira trilha oficial compartilhada entre operadores, admin e morador.

## 2. Fechamento oficial do sync offline

### Situacao atual no front

O `Portaria Web` ja opera offline com fila local e snapshot.
Na `V4.6`, o backend publicou:

- `POST /api/v1/internal/sync/events`
- `GET /api/v1/internal/sync/reconcile/{client_request_id}`

### O que falta no backend

Ainda nao esta fechado como o front deve:

- obter o `X-Sync-Token`
- enviar eventos para sync interno
- consultar reconciliacao de forma autenticada e padronizada
- interpretar `syncStatus`, `retryable`, `errorType`, `errorMessage`

### Pedido objetivo

- documentar como o `Portaria Web` recebe o `X-Sync-Token`
- fechar formato e ciclo de vida do token
- fechar lista oficial de `syncStatus`
- definir quando `retryable` deve ser `true`
- definir se `POST /internal/sync/events` e publico ao ecossistema ou somente interno de infraestrutura
- devolver exemplos reais de payload para criacao offline de:
  - encomenda
  - mensagem
  - troca de turno
  - ocorrencia

### Impacto

Sem esse fechamento, o front consegue enfileirar e reenviar, mas nao consegue fazer reconciliacao canonica e auditavel de ponta a ponta.

## 3. Reconciliacao por `clientRequestId`

### Situacao atual no front

O `Portaria Web` ja envia `clientRequestId` automatico em criacao de encomenda.

### O que falta no backend

Falta transformar isso em fluxo oficial utilizavel.

### Pedido objetivo

- garantir idempotencia por `clientRequestId` em criacao de encomenda
- garantir que a consulta de reconciliacao devolva:
  - `found`
  - `clientRequestId`
  - `aggregateType`
  - `aggregateId`
  - `eventType`
  - `syncStatus`
  - `retryable`
  - `errorType`
  - `errorMessage`
- documentar o tempo esperado para encontrar o agregado apos reconexao

### Impacto

Sem isso, o risco de duplicidade ou de incerteza de sincronizacao continua alto em cenarios offline.

## 4. Enumeracoes canonicas de preferencias de notificacao

### Situacao atual no front

A `V4.6` passou a expor:

- `channel`
- `priority`

Mas ambos ainda chegam como strings abertas.

### Pedido objetivo

Formalizar enumeracoes oficiais no contrato e na spec.

### Sugestao

- `channel`: `APP | PUSH | EMAIL`
- `priority`: `ALL | IMPORTANT | CRITICAL`

### Impacto

Sem enumeracao fechada, `Portaria Web`, `App Morador` e `Guarita` podem divergir em nomes e comportamento.

## 5. Fechamento do fluxo LGPD por dispositivo

### Situacao atual no front

O `Portaria Web` ja consegue consultar e registrar:

- `accepted`
- `version`
- `acceptedAt`
- `deviceId`

### O que falta no backend

Ainda falta governanca canonica para o ecossistema.

### Pedido objetivo

- fechar qual e a `version` oficial vigente do termo
- definir regra de revogacao
- definir comportamento quando mudar a unidade ativa
- definir se o consentimento e por usuario, por unidade, por conta ou por dispositivo com heranca
- devolver orientacao oficial para auditoria cruzada entre apps

### Impacto

Sem esse fechamento, a base tecnica existe, mas a governanca juridica e operacional continua ambigua.

## 6. Endpoint `people/unit-residents`

### Situacao atual no front

O `Portaria Web` ja usa esse endpoint em:

- `Admin > Encomendas`
- `Operacao > Registrar encomenda`

### O que falta no backend

Falta confirmar estabilidade de contrato e escopo.

### Pedido objetivo

- confirmar oficialmente se o endpoint respeita:
  - unidade ativa
  - perfil autenticado
  - permissao por contexto
- confirmar se moradores bloqueados/inativos entram ou nao
- confirmar se o retorno sempre vira ordenado e deduplicado

### Impacto

Sem isso, ainda precisamos manter fallback defensivo no front.

## 7. `resident/devices`

### Situacao observada

A `V4.6` publicou `POST /api/v1/resident/devices`, mas o contrato exige `pushToken`.

### Ponto de atencao

No `Portaria Web` web puro, nem sempre existe `pushToken` nativo.

### Pedido objetivo

Esclarecer se esse endpoint:

- e exclusivo de apps mobile
- ou se deve aceitar registro web com `pushToken` opcional

### Impacto

Sem essa definicao, o `Portaria Web` nao consegue adotar esse endpoint de forma semantica e limpa.

## 8. `resident/profile`

### Situacao observada

A `V4.6` expoe `GET /api/v1/resident/profile` retornando `PublicUserResponse`.

### Pedido objetivo

- confirmar se esse endpoint sera a fonte canonica do perfil do morador
- confirmar se ele substitui parcialmente leituras atuais de sessao
- confirmar comportamento com multiplas unidades e `selectedUnitId`

### Impacto

Sem essa definicao, o front continua usando o contexto de sessao como fonte principal e trata `resident/profile` apenas como complementar.

## Prioridade recomendada

1. persistencia backend do tratamento operacional de alertas
2. sync offline com `X-Sync-Token`, estados e reconciliacao
3. idempotencia e reconciliacao por `clientRequestId`
4. governanca LGPD por dispositivo
5. enumeracoes fechadas de `notification-preferences`
6. confirmacao de escopo em `people/unit-residents`
7. definicao de uso para `resident/devices`
8. definicao canonica de `resident/profile`
