# API Sapinho 3.6 - analise de integracao

Fonte local: `src/api/API Sapinho 3.6.pdf`.

## Melhorias relevantes encontradas

- `GET /api/v1/resident/deliveries`: endpoint proprio para morador listar encomendas da unidade ativa. Aceita `page`, `limit`, `status` e header `X-Selected-Unit-Id`.
- `GET /api/v1/resident/notifications`: endpoint proprio para notificacoes do morador. Aceita `unreadOnly` e header `X-Selected-Unit-Id`.
- `PATCH /api/v1/resident/notifications/{id}/read`: permite marcar notificacao como lida.
- `POST /api/v1/cameras/async`: cria camera por job assíncrono e retorna `PublicBackgroundJobResponse`.
- `GET /api/v1/jobs` e `GET /api/v1/jobs/{id}`: permite acompanhar jobs de integracao.
- `GET /api/v1/cameras/{id}/image-stream`: stream de imagem com `width`, `height` e `intervalMs`.
- `GET /api/v1/cameras/{id}/streaming`: agora documenta `imageStreamUrl`, `liveUrl`, `hlsUrl`, `webRtcUrl`, `gatewayPath` e dados de VMS.
- `POST /api/v1/integrations/face/people/{id}/sync`: sincronizacao direta de pessoa com motor facial.
- `GET /api/v1/ops/metrics`: metricas operacionais.

## Pontos ainda ausentes no contrato

- Nao apareceu endpoint oficial de veiculos, como `/api/v1/vehicles`.
- Nao apareceu endpoint especifico de cameras para morador, como `/api/v1/resident/cameras`.
- `GET /api/v1/cameras` documenta apenas filtro `status`; o front ainda envia `unitId` por compatibilidade local, mas a API 3.6 nao documenta esse query param.

## Integrado no front

- Dashboard do morador passou a usar `GET /resident/deliveries`.
- Dashboard do morador passou a usar `GET /resident/notifications` e `PATCH /resident/notifications/{id}/read`.
- Tela `/dashboard/cameras` deixou de usar dados fixos e passou a consultar cameras da API.
- Servicos e hooks criados para resident deliveries, resident notifications e jobs.
- Tipos de camera atualizados para novos campos de streaming da API 3.6.
- `camerasService` ganhou suporte a `POST /cameras/async` e helper para `/cameras/{id}/image-stream`.

## Recomendacao para Gorduxo/backend

- Para app morador, trocar a consulta de encomendas de `GET /api/v1/deliveries` para `GET /api/v1/resident/deliveries`.
- Confirmar se camera de morador deve usar `GET /api/v1/cameras` com `X-Selected-Unit-Id` ou se sera criado `GET /api/v1/resident/cameras`.
- Se o objetivo e mostrar cameras da unidade no app, o contrato precisa garantir que MORADOR receba apenas cameras com `unitId` vinculado ao usuario e `visibilityScope` liberado.
