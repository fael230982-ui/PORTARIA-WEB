# Handoff para app-morador - 2026-04-09

Este documento resume as evoluções feitas no front da portaria e o que deve ser refletido no app-morador.

## Prioridade recomendada

1. Encomendas do morador.
2. Seleção obrigatória de unidade para morador multiunidade.
3. Notificações de encomenda.
4. Código/QRCode para retirada.
5. Câmeras apenas quando o backend expuser URL compatível com app/navegador.

## Encomendas

O front da portaria já trabalha com o contrato V3.5 de encomendas.

Status usados:

- `RECEIVED`: encomenda recebida na portaria.
- `NOTIFIED`: morador notificado.
- `WITHDRAWN`: encomenda retirada.

Campos atualmente usados/esperados:

- `id`
- `recipientUnitId`
- `recipientPersonId`
- `deliveryCompany`
- `trackingCode`
- `status`
- `receivedAt`
- `receivedBy`
- `photoUrl`
- `notificationSentAt`
- `withdrawnAt`
- `withdrawnBy`

Campos preparados no front, mas que precisam ser confirmados pelo backend:

- `pickupCode`
- `withdrawalCode`
- `qrCodeUrl`

Comportamento desejado no app-morador:

- Mostrar lista de encomendas vinculadas ao morador/unidade ativa.
- Destacar encomendas pendentes de retirada.
- Exibir detalhes da encomenda: transportadora, código de rastreio, unidade, data de recebimento e status.
- Se a API enviar `pickupCode` ou `withdrawalCode`, mostrar o código para retirada.
- Se a API enviar `qrCodeUrl`, mostrar QRCode.
- Se a API ainda não enviar código/QRCode, mostrar mensagem amigável: `Código de retirada ainda não disponível`.

Observação operacional:

- A baixa segura da encomenda deve acontecer na portaria, preferencialmente validando código ou QRCode informado pelo morador.
- Se o backend ainda não tiver validação de token/QRCode, solicitar endpoint específico para isso.

## Notificações

Fluxo desejado:

- Quando admin/porteiro cadastrar uma encomenda, o morador deve receber notificação no app.
- A API pode usar `notificationSentAt` para indicar que a notificação já foi disparada.

Validar no backend:

- Existe endpoint de notificações do morador?
- Existe push notification?
- Existe listagem de notificações pendentes/lidas?
- O cadastro de encomenda dispara notificação automaticamente?

Fallback no app:

- Se não houver push ainda, exibir alerta visual dentro da tela inicial do app-morador quando houver encomendas pendentes.

## Morador multiunidade

Contrato informado pelo backend:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

Campos relevantes:

- `unitIds`
- `unitNames`
- `selectedUnitId`
- `selectedUnitName`
- `requiresUnitSelection`

Regra:

- Se `requiresUnitSelection = true`, o app-morador deve bloquear ações dependentes de unidade até o usuário escolher uma unidade.
- Depois da escolha, enviar o header `X-Selected-Unit-Id` nas ações vinculadas à unidade.
- Se o backend retornar `403`, mostrar mensagem amigável: `Esta unidade não pertence ao seu vínculo de acesso`.

UX sugerida no app:

- Ao abrir o app, se exigir seleção, mostrar modal/tela obrigatória de escolha da unidade.
- Mostrar a unidade ativa no topo das telas principais.
- Permitir troca explícita de unidade pelo morador.

## Câmeras

Informação importante:

- RTSP não deve ser reproduzido diretamente no app ou navegador.
- A URL RTSP é origem técnica para backend/VMS.
- Para o front/app consumir, o backend precisa expor uma URL compatível.

Formatos compatíveis recomendados:

- `snapshotUrl`
- `imageStreamUrl` MJPEG
- HLS
- WebRTC

Contrato já considerado no front da portaria:

- `GET /api/v1/cameras/{id}/snapshot`
- `GET /api/v1/cameras/{id}/streaming`
- `GET /api/v1/cameras/{id}/image-stream`

Campos úteis:

- `snapshotUrl`
- `imageStreamUrl`
- `vmsStreamingUrl`
- `provider`
- `transport`

Observação:

- Se o backend devolver apenas RTSP, o app deve informar que a câmera ainda não está disponível para visualização.

## Mensagens

Na portaria, já existe espaço reservado para comunicação:

- App do morador.
- WhatsApp.
- Log/Ocorrências.

Para o app-morador, antes de implementar:

- Confirmar se existe endpoint de mensagens.
- Confirmar se existe envio/recebimento em tempo real.
- Confirmar se mensagens serão via app, WhatsApp ou ambos.

Fallback:

- Preparar arquitetura e UI básica, mas não simular conversa real sem contrato de backend.

## Arquivos de referência no front portaria

- `src/types/delivery.ts`
- `src/services/deliveries.service.ts`
- `src/features/deliveries/delivery-normalizers.ts`
- `src/app/operacao/page.tsx`
- `src/app/admin/encomendas/page.tsx`
- `src/app/admin/cameras/page.tsx`

## Próximos pedidos ao backend

Solicitar confirmação/adição dos seguintes pontos:

- Endpoint para listar encomendas do morador autenticado.
- Campo de código seguro para retirada: `pickupCode` ou `withdrawalCode`.
- Campo de QRCode para retirada: `qrCodeUrl` ou payload equivalente.
- Endpoint para validar retirada por código/QRCode.
- Notificação push ou endpoint de notificações do morador.
- Para câmeras RTSP, endpoint que converta RTSP em `snapshotUrl`, `imageStreamUrl`, HLS ou WebRTC.

