# PORTARIA WEB - Resumo de Integracao API Sapinho V5.5

Data: 2026-04-20

## Escopo principal da V5.5

A integracao desta versao foi focada no fluxo de mensagens com WhatsApp por QR code, mantendo tudo dentro do modulo operacional ja existente.

## Endpoints novos utilizados

- `GET /api/v1/messages/whatsapp/connection?unitId={unitId}`
- `POST /api/v1/messages/whatsapp/connect?unitId={unitId}`
- `POST /api/v1/messages` com `origin=WHATSAPP`

## Regras de integracao

- o fluxo permanece dentro da tela de mensagens da Operacao
- o envio com `origin=WHATSAPP` exige `recipientPersonId` ou `recipientPhone`
- as respostas do morador entram no mesmo historico como `OperationMessage` com `origin=WHATSAPP`
- o front deve consultar o estado da conexao ate a instancia ficar `open`

## Schema principal mapeado

`PublicWhatsAppConnectionResponse`

Campos utilizados:

- `enabled`
- `instance`
- `state`
- `qrCodeText`
- `qrCodeImageDataUrl`
- `pairingCode`

## Ajustes aplicados no front

- suporte a conexao WhatsApp na camada de tipos
- suporte a consulta e reconexao do WhatsApp no service de Operacao
- polling automatico do estado da conexao
- envio de mensagem pelo canal `WHATSAPP` no mesmo modal do morador
- exibicao do QR code e do codigo de pareamento na tela operacional
- historico de mensagens com identificacao visual do canal

## Arquivos atualizados

- `src/api/API Sapinho V5.5.txt`
- `src/types/operation.ts`
- `src/services/operation.service.ts`
- `src/hooks/use-operation-integrations.ts`
- `src/app/operacao/page.tsx`

## Validacao

- `npm run build`
