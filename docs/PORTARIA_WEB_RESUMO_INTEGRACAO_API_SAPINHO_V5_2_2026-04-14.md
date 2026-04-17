# Portaria Web - Resumo de Integracao API Sapinho V5.2

Data: 2026-04-14

## O que foi absorvido no front

- copia local da spec em `src/api/API Sapinho V5.2.txt`;
- `resident/profile` promovido a fonte principal da experiencia do morador;
- `Dashboard > Perfil` refeito para consumir:
  - `GET /api/v1/resident/profile`;
  - `GET /api/v1/resident/lgpd-consent/history`;
  - `GET /api/v1/visit-forecasts`;
- exibicao de `profileSource` canonicamente;
- exibicao de historico LGPD do dispositivo;
- exibicao de visitas previstas da unidade ativa;
- reforco do cadastro de moradores com `birthDate`, consulta por CPF e autorizacao de responsavel para facial de menor;
- adequacao do OCR documental para ler:
  - `suggestedBirthDate`;
  - `birthDateCandidates`;
  - `prefill.birthDate`;
- stream operacional ajustado para tratar `GET /api/v1/auth/stream-capabilities` como contrato obrigatorio antes de abrir o SSE.

## Resultado pratico

- o contrato canonicamente fechado pelo backend na V5.2 ja esta refletido nas areas principais do Portaria Web;
- o perfil do morador passou a priorizar o recurso oficial do backend;
- LGPD e visitas previstas ficaram visiveis na experiencia do morador;
- o cliente do stream operacional agora depende do contrato normativo de capacidades antes de conectar.

## Pendencias restantes

- permanece uma pendencia tecnica de backend na criacao de camera:
  - ao salvar nova camera, a API ainda responde apenas com `Field required`;
  - o front ja envia os defaults canonicos de integracao, mas o retorno ainda nao informa qual campo falta neste ambiente;
- os demais pontos remanescentes ficam no proprio front, principalmente:
  - definir o limiar de UX para autopreenchimento automatico com base em `confidence` no OCR de encomendas;
  - ampliar o consumo canonicamente de `enabledModules`, `residentManagementSettings` e `slimMode` em mais areas do produto.

## Sugestao registrada

- em `Encomendas`, exibir a foto da encomenda em miniatura na listagem quando houver imagem vinculada.

## Validacao

- `npm run build` executado com sucesso.
