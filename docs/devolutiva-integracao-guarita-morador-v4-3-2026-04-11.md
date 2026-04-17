# Devolutiva sobre o resumo de integracao do Guarita

Data: `2026-04-11`

Documento revisado em `Documentos`: `resposta da api sapinho.docx`

## Parecer geral

O resumo enviado pelo Guarita faz sentido como fotografia de uma fase anterior da API, mas hoje ele esta desatualizado para a realidade da `Sapinho V4.3`.

Ele acerta ao cobrar:

- padronizacao melhor de respostas;
- fechamento de CRUD e contratos de retorno;
- existencia de gaps entre o que o produto precisa e o que o backend publica;
- necessidade de recursos mais completos para operacao condominial.

Mas ele erra ou ficou desatualizado em pontos importantes, porque afirma ausencia de modulos que hoje ja existem no contrato `V4.3`.

## O que precisa ser corrigido no texto do Guarita

### 1. Encomendas nao estao mais ausentes

O resumo antigo diz que nao existe modulo proprio de encomendas.

Isso nao procede mais na `V4.3`.

Hoje existem no contrato:

- `GET /api/v1/deliveries`
- `POST /api/v1/deliveries`
- `PATCH /api/v1/deliveries/{id}/status`
- `POST /api/v1/deliveries/{id}/validate-withdrawal`
- `GET /api/v1/deliveries/withdrawal-qr/{code}`
- `POST /api/v1/deliveries/ocr`
- `POST /api/v1/deliveries/photo/upload`
- `GET /api/v1/resident/deliveries`

Correcao recomendada:
- trocar “nao existe modulo de encomendas” por “o modulo de encomendas existe, mas ainda precisa consolidar OCR, foto, retirada segura e contratos de resposta em todos os ambientes”.

### 2. Unidades nao estao mais ausentes como dominio de API

O resumo antigo diz que nao existe recurso proprio de unidades.

Isso tambem ficou desatualizado.

Ja existem:

- `GET /api/v1/units`
- `PATCH /api/v1/units/{id}`
- `GET /api/v1/operation/units`

Correcao recomendada:
- trocar “faltam unidades como recurso separado” por “o dominio de unidades existe, mas a busca operacional de unidades ainda precisa de contrato mais confiavel para substituir totalmente os catálogos locais do front”.

### 3. O resumo subestima o bloco master e operacao que a V4.3 ja publicou

Hoje a API ja tem:

- `GET /api/v1/master/summary`
- `GET /api/v1/master/clients`
- `POST /api/v1/master/clients`
- `PATCH /api/v1/master/clients/{client_id}`
- `GET /api/v1/master/modules/catalog`
- `GET /api/v1/master/operation-devices`
- `POST /api/v1/operation/devices/heartbeat`
- `POST /api/v1/operation/shift-change`
- `GET /api/v1/operation/shift-changes`

Correcao recomendada:
- atualizar a narrativa para “o backend ja cobre boa parte do master e da operacao, mas ainda precisa fechar melhor tipagem, retorno e filtros”.

### 4. A critica de CRUD incompleto ainda faz sentido, mas precisa ser reescrita

No resumo antigo, a leitura estava muito binaria: “nao tem CRUD completo”.

Hoje o mais correto e separar por modulo:

- Pessoas: existe CRUD relevante, com status e update.
- Encomendas: existe criacao e fluxo operacional principal.
- Master: existe criacao e atualizacao.
- Câmeras e alertas: ainda precisam evolucoes dependendo do caso de uso.

Correcao recomendada:
- substituir afirmacoes globais por avaliacao por modulo.

### 5. A parte de padronizacao de respostas continua correta

Essa critica segue valida.

Principalmente porque na `V4.3` ainda existem endpoints importantes com `schema: {}` na resposta de sucesso, por exemplo em partes do bloco master.

Essa observacao deve permanecer no documento revisado.

## Leitura correta para o estado atual

Hoje o cenario mais fiel e:

- a API ja tem base suficiente para operar morador, encomendas, master e boa parte da operacao;
- o front ja foi adaptado para consumir esse contrato `V4.3`;
- o problema principal agora nao e “ausencia total de modulo”, e sim:
  - resposta pouco tipada em alguns endpoints;
  - necessidade de consolidacao de ambiente real;
  - falta de alguns refinamentos para reduzir fallback no front;
  - lacunas de tempo real, auditoria e filtros.

## Mensagem recomendada para devolver ao Guarita e ao App Morador

O resumo anterior estava parcialmente correto para uma versao antiga do backend, mas ficou desatualizado frente a `API Sapinho V4.3`.

Hoje:

- encomendas existem como modulo real e ja foram integradas no front;
- unidades existem no dominio da API e a operacao ja tem rota propria de busca;
- master e operacao ganharam endpoints novos relevantes;
- o foco agora deve sair de “modulo inexistente” e passar para “contrato precisa amadurecer”.

## O que alinhar entre Guarita e App Morador

### Guarita

Deve considerar como base oficial:

- `deliveries`
- `operation/search`
- `operation/units`
- `operation/devices/heartbeat`
- `operation/shift-change`
- `operation/shift-changes`

Deve tratar como pendencia de backend:

- tipagem melhor de respostas;
- eventos em tempo real;
- enriquecimento de monitoramento e historico;
- refinamento de OCR e sugestao automatica de unidade/pessoa.

### App Morador

Deve considerar como base oficial:

- `resident/deliveries`
- `resident/notifications`
- `resident/notifications/{id}/read`
- `resident/notifications/read-all`
- `cameras` com unidade ativa no contexto

Deve tratar como pendencia de backend:

- fechamento do fluxo de eventos/tempo real;
- consolidacao de notificacoes com payload mais padronizado;
- garantia de comportamento uniforme em todos os ambientes.

## Conclusao

O documento do Guarita precisa ser atualizado, nao descartado.

Ele ainda e util como alerta de maturidade de contrato, mas deve ser reescrito para refletir que a `V4.3` ja cobre muito mais coisa do que o texto afirma.

Em resumo:

- manter a critica sobre padronizacao, tipagem e maturidade;
- remover as afirmacoes de que nao existem encomendas e unidades;
- atualizar o texto para reconhecer os modulos novos de master e operacao;
- alinhar Guarita e App Morador em cima da mesma base `V4.3`.
