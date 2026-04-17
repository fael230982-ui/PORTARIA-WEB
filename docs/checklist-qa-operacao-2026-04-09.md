# Checklist QA - Operação e Encomendas - 2026-04-09

Use este roteiro para validar a tela operacional após novas APIs do backend.

## Tela Operacional

- Abrir `/operacao`.
- Conferir se os botões principais aparecem centralizados e legíveis: novo cadastro, registrar entrada, registrar saída e registrar encomenda.
- Conferir se os contadores superiores batem com a operação real: alertas, visitantes/prestadores dentro e encomendas pendentes.
- Buscar uma pessoa comum pelo nome e confirmar que a lista mostra somente resultado compacto.
- Clicar em uma pessoa e conferir se o modal abre com ficha operacional completa.
- Registrar entrada individual.
- Registrar saída individual.
- Registrar entrada coletiva e confirmar se aparece mensagem de confirmação antes de concluir.
- Registrar saída coletiva e confirmar se aparece mensagem de confirmação antes de concluir.

## Encomendas

- Clicar em `Registrar encomenda`.
- Conferir se as unidades reais aparecem no seletor.
- Registrar uma encomenda para uma unidade.
- Conferir se o card `Encomendas pendentes` aumenta o contador.
- Clicar em `Ver mais` no card de encomendas.
- Buscar encomenda por nome do morador.
- Buscar encomenda por unidade.
- Buscar encomenda por transportadora.
- Buscar encomenda por código de rastreio.
- Conferir se encomendas sem `pickupCode`, `withdrawalCode` ou `qrCodeUrl` aparecem como pendentes de código/QRCode da API.

## Admin > Encomendas

- Abrir `/admin/encomendas`.
- Atualizar uma encomenda para `Morador notificado`.
- Tentar atualizar uma encomenda para `Retirada pelo morador` sem código/QRCode.
- Confirmar que o botão de retirada fica bloqueado até marcar validação manual de identidade.
- Marcar a confirmação manual e concluir a retirada.
- Quando o backend enviar código/QRCode, repetir o teste e conferir se a retirada não exige confirmação manual.

## Câmeras

- Abrir `/admin/cameras`.
- Cadastrar câmera com URL RTSP.
- Se retornar erro 500, encaminhar ao backend como falha de contrato.
- Abrir `/operacao/cameras`.
- Conferir se a tela não mostra tokens de unidade.
- Conferir se câmera sem snapshot/image stream mostra mensagem amigável.

## Mensagens De Erro

- Forçar cadastro sem unidade quando unidade for obrigatória.
- Confirmar que o front mostra mensagem amigável, sem `unitId`, `unitIds`, `Request failed` ou erro bruto `500`.
- Forçar falha de câmera RTSP.
- Confirmar que a mensagem orienta acionar backend para aceitar RTSP/converter stream.

## Pendências De Backend

- Confirmar envio de `pickupCode`, `withdrawalCode` ou `qrCodeUrl`.
- Confirmar endpoint de validação de retirada.
- Confirmar notificação ao app-morador quando encomenda for cadastrada.
- Confirmar listagem de encomendas do morador filtrada pela unidade ativa.
- Confirmar suporte ao header `X-Selected-Unit-Id` em encomendas, visitantes, prestadores, mensagens e notificações.

## Integrações Preparadas No Front

- Baixa segura: `POST /api/v1/deliveries/{id}/validate-withdrawal`.
- Eventos em tempo real: `GET /api/v1/events/stream`.
- Acionamentos: `GET /api/v1/actions` e `POST /api/v1/actions/{actionId}/execute`.
- Mensagens: `GET /api/v1/messages` e `POST /api/v1/messages`.
- Busca operacional: `GET /api/v1/operation/search`.
- Resumo de acesso por pessoa: `GET /api/v1/people/{id}/access-summary`.
- Câmeras: `snapshotUrl`, `imageStreamUrl`, HLS ou WebRTC a partir de RTSP.
- Notificações do app-morador: `GET /api/v1/resident/notifications` e `PATCH /api/v1/resident/notifications/{id}/read`.
