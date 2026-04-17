# Portaria Web - Resumo de integracao API Sapinho V4.8

## O que foi absorvido

- workflow operacional de alertas agora usa `PATCH /api/v1/alerts/{id}/workflow` como caminho oficial para:
  - `ON_HOLD`
  - `RESOLVED`
- leitura de alertas passou a aceitar `workflow` persistido na propria resposta da API
- stream operacional continua compativel com legado, mas agora prioriza o canonico:
  - `eventType`
  - `occurredAt`
- OCR de encomendas passou a aproveitar os campos novos:
  - `suggestedUnitId`
  - `suggestedResidentId`
  - `unitSuggestions`
  - `residentSuggestions`

## Ajustes práticos no produto

- tela de Operacao:
  - alertas mais operacionais
  - severidade visivel
  - `Detalhar` na lista
  - respostas sugeridas preenchendo a resolucao
  - modal mais compacto
  - evidencias/pre-alarme preparados
- componente compartilhado de alertas tambem passou a usar workflow persistido do backend

## Leitura atual

A `V4.8` fecha parte importante do que antes exigia parser e workflow mais defensivos, especialmente em:

- alertas operacionais
- stream canonico
- reconcilacao por `clientRequestId`
- permissions matrix
- moradores por unidade

Ainda assim, a compatibilidade temporaria com campos legados foi mantida onde isso nao cria risco, para evitar quebra em ambiente parcialmente atualizado.
