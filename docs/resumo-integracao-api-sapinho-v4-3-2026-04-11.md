# Resumo da integracao com a API Sapinho V4.3

Data: `2026-04-11`

## Situacao atual

O front web foi atualizado para operar com o contrato local `src/api/API Sapinho V4.3.txt`, preservando fallback para contratos anteriores quando o endpoint novo ainda nao estiver disponivel no ambiente.

## Ja integrado no front

- Morador:
  - `GET /api/v1/resident/deliveries`
  - `GET /api/v1/resident/notifications`
  - `PATCH /api/v1/resident/notifications/{id}/read`
  - `PATCH /api/v1/resident/notifications/read-all`

- Master:
  - `GET /api/v1/master/clients`
  - `POST /api/v1/master/clients`
  - `PATCH /api/v1/master/clients/{client_id}`
  - `PATCH /api/v1/master/licenses/{client_id}`
  - `PATCH /api/v1/master/clients/{client_id}/modules`
  - `GET /api/v1/master/summary`
  - `GET /api/v1/master/modules/catalog`
  - `GET /api/v1/master/operation-devices`

- Operacao:
  - `GET /api/v1/operation/search`
  - `POST /api/v1/operation/devices/heartbeat`
  - `POST /api/v1/operation/shift-change`
  - `GET /api/v1/operation/shift-changes`

- Encomendas:
  - `POST /api/v1/deliveries`
  - `PATCH /api/v1/deliveries/{id}/status`
  - `POST /api/v1/deliveries/{id}/validate-withdrawal`
  - `GET /api/v1/deliveries/withdrawal-qr/{code}`
  - `POST /api/v1/deliveries/ocr`
  - `POST /api/v1/deliveries/photo/upload`

## Melhorias entregues nesta rodada

- O dashboard do morador passou a usar a rota oficial `resident/deliveries`.
- As notificacoes de morador foram alinhadas com os campos novos da `V4.3`, incluindo `snapshotUrl` e `payload`.
- A tela master passou a ler:
  - resumo agregado da API;
  - catalogo oficial de modulos persistidos;
  - devices operacionais reais para monitoramento.
- O cadastro admin de encomendas passou a aceitar:
  - foto local da etiqueta;
  - OCR pela API;
  - upload da foto para persistencia no backend antes da criacao da encomenda.
- A operacao passou a consultar o historico oficial de troca de turno via `shift-changes`.

## Validacao

- Build validado com sucesso em `2026-04-11`:
  - `npm run build`

## Observacao importante

Nem toda melhoria publicada na `V4.3` ja foi conectada em todas as telas. O contrato principal esta compatibilizado, mas ainda existem pontos de produto que dependem de publicacao adicional, refinamento de resposta ou integracao complementar no backend.
