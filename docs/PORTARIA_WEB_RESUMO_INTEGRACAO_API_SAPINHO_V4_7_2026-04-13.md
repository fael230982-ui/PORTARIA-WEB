# Portaria Web - Resumo de Integracao API Sapinho V4.7

## O que foi absorvido

- registro da especificacao `API Sapinho V4.7` no projeto local
- leitura ampliada do dominio de pessoas para suportar:
  - `faceListSyncStatus`
  - `faceListSyncError`
- exposicao operacional desses campos em `Admin > Moradores`
- preparacao segura de reconciliacao offline por `clientRequestId` usando:
  - `GET /api/v1/internal/sync/reconcile/{client_request_id}`
  - `X-Sync-Token` por variavel de ambiente quando disponivel

## Impacto no produto

- o cadastro e o detalhe de moradores passam a mostrar melhor o estado de sincronizacao da lista facial, nao apenas o `faceStatus`
- a fila offline de encomendas fica preparada para reconciliar criacoes ja aplicadas no backend sem depender apenas da resposta imediata do POST
- o comportamento atual continua seguro: sem token de sync configurado, o fluxo segue como antes

## Arquivos principais

- `src/api/API Sapinho V4.7.txt`
- `src/types/person.ts`
- `src/features/people/morador-normalizers.ts`
- `src/app/admin/moradores/page.tsx`
- `src/types/sync.ts`
- `src/services/sync.service.ts`
- `src/features/offline/offline-operation-queue.ts`

## Validacao

- `npm run build` concluido com sucesso em `2026-04-13`
