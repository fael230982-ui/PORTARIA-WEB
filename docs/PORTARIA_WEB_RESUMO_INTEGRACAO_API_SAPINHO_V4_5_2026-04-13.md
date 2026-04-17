# Resumo De Integracao - API Sapinho V4.5 - Portaria Web

Data de referencia: `2026-04-13`
Origem: `Portaria Web`

## Leitura Da V4.5

Na comparacao direta entre `V4.4` e `V4.5`, a mudanca objetiva que impactou o `Portaria Web` foi o bloco de `deliveries`, com destaque para:

- novo endpoint oficial `POST /api/v1/deliveries/{id}/renotify`;
- schema explicito para `PublicDeliveryRenotifyResponse`;
- exposicao mais clara de `recipientPersonName` no contrato de encomenda;
- configuracoes de `deliveryRenotification` aparecendo no contrato da API.

## Ajustes Aplicados

- `Admin > Encomendas` passou a usar o endpoint oficial de reenvio `renotify`;
- foi mantido fallback compatível para ambientes que ainda nao expuserem `renotify`;
- os tipos de `Delivery` agora aceitam `recipientPersonName`;
- a busca e a UI de encomendas passaram a priorizar `recipientPersonName` quando a API ja entregar esse campo;
- o detalhe da encomenda tambem passou a exibir o nome do destinatario quando vier pronto da API.

## Arquivos Principais

- `src/services/deliveries.service.ts`
- `src/types/delivery.ts`
- `src/features/deliveries/delivery-normalizers.ts`
- `src/app/admin/encomendas/page.tsx`
- `src/app/admin/encomendas/[id]/page.tsx`

## Validacao

- `npm run build`: `ok`

## Leitura Curta

- a `V4.5` nao exigiu refatoracao grande do `Portaria Web`;
- o impacto foi concentrado em `encomendas`;
- a base ficou pronta para usar o fluxo oficial de `renotify` e para aproveitar melhor o nome do destinatario vindo da API.
