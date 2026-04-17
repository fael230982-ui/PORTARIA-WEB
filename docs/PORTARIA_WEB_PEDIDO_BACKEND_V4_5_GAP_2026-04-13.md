# Pendencias De Backend - API Sapinho V4.5 - Portaria Web

Data de referencia: `2026-04-13`
Origem: `Portaria Web`

## Contexto

A `V4.5` trouxe principalmente o endpoint oficial de reenvio de notificacao de encomenda.

O `Portaria Web` ja foi ajustado para consumir esse fluxo, mas ainda existem pontos que valem fechamento do lado do `Backend` para reduzir fallback e melhorar homologacao entre os modulos.

## Pendencias Objetivas

### 1. Subir `renotify` de forma consistente em todos os ambientes

Hoje o frontend ja usa `POST /api/v1/deliveries/{id}/renotify`, mas ainda precisa manter fallback para ambientes que nao responderem esse endpoint.

Objetivo:

- eliminar compatibilidade provisoria baseada em `PATCH /deliveries/{id}/status`;
- deixar o reenvio de notificacao semanticamente separado da mudanca de status.

### 2. Fechar melhor o contrato de `PublicDeliveryRenotifyResponse`

O shape atual ja ajuda, mas ainda seria melhor ter:

- mensagem humana opcional;
- confirmacao explicita se houve notificacao real ou tentativa sem destinatarios;
- metadado opcional de canal usado.

### 3. Formalizar `recipientPersonName` como campo estavel

O `Portaria Web` ja passou a consumir `recipientPersonName`, mas precisa saber se esse campo sera:

- retornado sempre que houver `recipientPersonId`;
- preenchido tambem em listagens paginadas;
- mantido estavel em todos os ambientes.

### 4. Explicitar configuracao de `deliveryRenotification`

A `V4.5` passou a expor configuracao ligada a renotificacao de encomendas. O frontend ainda precisa de esclarecimento sobre:

- se isso e apenas configuracao interna da API;
- se sera exposto por rota consumivel;
- se influencia regra de negocio no front.

### 5. Manter linha de idempotencia e conciliacao offline

Mesmo com a `V4.5`, continuam pendentes os fechamentos ja apontados no documento de offline/sync:

- `clientRequestId` ou equivalente;
- reconciliacao oficial;
- replay seguro;
- classificacao de erro temporal versus erro definitivo.

## Leitura Curta

- a `V4.5` foi absorvida sem quebra no `Portaria Web`;
- o principal ganho foi `renotify`;
- o principal pedido ao backend agora e estabilizar esse fluxo e reduzir fallback entre ambientes.
