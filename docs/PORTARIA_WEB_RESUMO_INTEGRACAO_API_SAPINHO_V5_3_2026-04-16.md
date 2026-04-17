# Portaria Web - Resumo de Integracao API Sapinho V5.3

Data: 2026-04-16

## O que entrou na spec

- copia local da spec em `src/api/API Sapinho V5.3.txt`;
- inclusao de `POST /api/v1/operation/people/search-by-photo`;
- inclusao de `GET /api/v1/operation/people/search-by-photo/audit`;
- inclusao de `GET /api/v1/resident/condominium`;
- inclusao de `GET /api/v1/resident/people/by-cpf`;
- nenhum endpoint da `V5.2` foi removido;
- total de rotas passou de `129` para `133`.

## Impacto no Portaria Web

- a principal novidade para operacao e a busca de pessoas por foto;
- o request aceita:
  - `photoUrl`;
  - `photoBase64`;
  - `cameraId`;
  - `fileName`;
  - `maxMatches`;
- o response da busca retorna:
  - `matched`;
  - `matchStrategy`;
  - `capturedPhotoUrl`;
  - `matches`;
- cada match pode trazer:
  - `confidence`;
  - `person`;
  - `residentUnit`;
  - `activeVisitForecasts`;
  - `possibleDestination`;
- a auditoria da busca por foto ja vem com filtros de pagina, periodo, usuario, origem e resultado;
- `resident/condominium` reforca um contrato que o projeto ja vinha consumindo;
- `resident/people/by-cpf` e mais util ao app do morador, mas passa a existir oficialmente na spec compartilhada.

## O que foi absorvido no front

- servico operacional atualizado para consumir:
  - `POST /operation/people/search-by-photo`;
  - `GET /operation/people/search-by-photo/audit`;
- tipagem local adicionada para:
  - request e response de busca por foto;
  - matches;
  - auditoria;
- preservacao do consumo ja existente de `GET /resident/condominium`.

## Resultado pratico

- o projeto passa a ter a `V5.3` versionada localmente;
- o client HTTP do front fica pronto para ligar uma UX de reconhecimento por foto sem chamadas ad hoc;
- a auditoria da funcionalidade tambem fica pronta para consumo em tela administrativa ou operacional.

## Proximo passo recomendado

- integrar a busca por foto no fluxo de `Operacao`, preferencialmente a partir de:
  - snapshot da camera selecionada;
  - upload manual de imagem;
- definir a regra de UX para destacar automaticamente o melhor match com base em `confidence`;
- exibir `possibleDestination` e visitas previstas quando houver match util para triagem.
