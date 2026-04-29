# Portaria Web - Analise Pos API V6.7 - 2026-04-27

## Objetivo

Registrar o impacto da `API Sapinho V6.7` no modulo `Portaria Web`, mantendo alinhamento com `Guarita` e `App Morador`.

## Arquivos revisados

- `C:\Users\Pc Rafa\Desktop\DES-RAFIELS\API\API Sapinho V6.7.txt`
- `C:\Users\Pc Rafa\Desktop\guarita\GUARITA_POS_API_V6_5_2026-04-27.md`
- `C:\Users\Pc Rafa\Desktop\app-morador\docs\RELATORIO_POS_API_V6_5_2026-04-27.md`

## Leitura objetiva da V6.7

A `V6.7` consolidou o fluxo do `Motor Facial` no backend.

Pontos relevantes para o `Portaria Web`:

- o provisionamento continua em:
  - `POST /api/v1/integrations/face/servers/{server_id}/cameras/{camera_id}/provision`
- o backend agora garante:
  - reaproveitamento da camera no Motor Facial quando ela ja existir
  - criacao do stream quando nao existir
  - criacao/vinculo automatico do analitico facial
  - criacao/vinculo automatico da lista facial necessaria
  - persistencia dos vinculos no cadastro da camera

Campos relevantes na camera:

- `eventIntegrationType`
- `faceEngineServerId`
- `engineStreamId`
- `engineStreamUuid`
- `faceAnalyticsId`

Tambem apareceu no contrato:

- `POST /api/v1/integrations/face/device-events`

Leitura:

- esta rota e tecnica de ingestao/eventos do Motor Facial para o backend
- nao exige tela nova no `Portaria Web` nesta rodada

## Impacto no Portaria Web

Nao foi necessario abrir uma refatoracao estrutural nova para a `V6.7`.

O front ja estava alinhado nos pontos principais:

- cadastro/edicao de camera com `faceEngineServerId`
- chamada de provisionamento no Motor Facial
- normalizacao dos campos:
  - `engineStreamId`
  - `engineStreamUuid`
  - `faceAnalyticsId`
  - `faceEngineServerId`
- exibicao desses vinculos nos detalhes da camera

## Ajustes aplicados nesta rodada

Foram feitos ajustes operacionais na tela `Operacao`, que seguem validos com a `V6.7`:

- `Buscar rosto` agora envia contexto de `unitId` na consulta facial
- `Enviar imagem` voltou a funcionar com o input sempre presente no DOM
- a camera do painel operacional deixou de herdar preview indevido da busca facial

## Conclusao pos-V6.7

Para o `Portaria Web`, a `V6.7` funciona como consolidacao do fluxo do Motor Facial, nao como versao de nova interface obrigatoria.

O recurso util identificado foi:

- manter o fluxo atual de provisionamento facial
- confiar no retorno persistido da camera para refletir:
  - `eventIntegrationType`
  - `faceEngineServerId`
  - `engineStreamId`
  - `engineStreamUuid`
  - `faceAnalyticsId`

## Proxima acao recomendada

Fazer nova validacao funcional na tela `Admin > Cameras` com:

1. selecao de um `Servidor facial`
2. selecao de uma camera ja cadastrada
3. provisionamento facial
4. confirmacao de persistencia dos campos na camera apos o retorno do backend
