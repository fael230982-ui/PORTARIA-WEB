# Portaria Web - Retorno Sobre Fechamento do Backend - 2026-04-14

## Contexto

O `Portaria Web` recebeu a consolidacao final do backend registrada em `docs/backend-contract-closure-2026-04-14.md` e passa a tratar esse documento como referencia oficial para encerramento das pendencias ja fechadas no servidor.

Com isso, os itens abaixo deixam de compor cobranca ativa do `Portaria Web` ao backend, porque foram formalmente marcados como resolvidos no contrato e no comportamento da API.

## Itens Fechados No Backend E Retirados Das Cobrancas

1. Exclusao de camera
- `DELETE /api/v1/cameras/{id}` agora respeita a remocao previa no VMS e evita exclusao parcial.

2. OCR documental
- `POST /api/v1/people/document-ocr` agora devolve `suggestedBirthDate`, `birthDateCandidates` e `prefill.birthDate`.

3. `birthDate` em pessoa/morador
- `birthDate` passou a ser campo persistido no contrato oficial.

4. Menor com facial
- a autorizacao do responsavel para envio facial de menor foi fechada no backend.

5. Visitante sem CPF obrigatorio
- o backend ja aceita visitante sem CPF/documento no contrato atual.

6. URL ao vivo de camera
- `liveUrl` foi estabilizado com fallback canonico para `/api/v1/cameras/{id}/image-stream`.

7. Cadastro de encomenda
- `POST /api/v1/deliveries` nao derruba mais o cadastro com `500` quando a encomenda ja foi persistida.

8. OCR de encomendas
- `POST /api/v1/deliveries/ocr` e `POST /api/v1/deliveries/ocr-label` passam a ser as rotas canonicas das sugestoes.
- para envio `multipart/form-data` com arquivo, a rota canonica permanece `POST /api/v1/deliveries/ocr` com o campo `photo`.

9. `resident/profile`
- `GET /api/v1/resident/profile` foi fechado como fonte canonica do perfil do morador.

10. `enabledModules`, `residentManagementSettings` e `slimMode`
- a origem canonica ficou definida no recurso de condominio/cliente via `PublicCondominiumResponse`.
- no contexto do morador, `GET /api/v1/resident/condominium` tambem e rota canonica para essa configuracao.

11. `sync-capabilities` e `stream-capabilities`
- `GET /api/v1/auth/stream-capabilities` passa a ser contrato normativo para os clientes que consomem stream operacional.

## Pendente Apenas No Front

Apos o fechamento acima, o `Portaria Web` reconhece que os itens abaixo passaram a ser responsabilidade principal do front:

1. `visit-forecasts`
- plugar a funcionalidade nas telas do `Portaria Web`.

2. `resident/profile`
- passar a usar `GET /api/v1/resident/profile` como fonte principal da experiencia do morador, e nao apenas como fonte complementar.

3. OCR de encomendas
- definir a regra de UX para autopreenchimento com base em `confidence`.
- decidir quando o preenchimento sera automatico e quando exigira confirmacao manual.

4. Configuracao de cliente/condominio
- consumir `enabledModules`, `residentManagementSettings` e `slimMode` a partir dos endpoints canonicos ja definidos pelo backend.
- para a experiencia do morador, priorizar `GET /api/v1/resident/condominium`.

5. Stream operacional
- tratar `GET /api/v1/auth/stream-capabilities` como contrato obrigatorio no cliente que consome stream.

## Posicao Do Portaria Web

O `Portaria Web` esta de acordo com a consolidacao enviada pelo backend e passa a considerar esses fechamentos como validos a partir desta data.

Com isso:
- os itens marcados como resolvidos no backend saem da lista de pendencias abertas do `Portaria Web`;
- a continuidade do trabalho do `Portaria Web` se concentra nos cinco pontos que restaram apenas no front;
- novas cobrancas ao backend devem considerar este fechamento como base oficial, evitando reabrir temas ja encerrados no contrato.

## Referencia

- `docs/backend-contract-closure-2026-04-14.md`
