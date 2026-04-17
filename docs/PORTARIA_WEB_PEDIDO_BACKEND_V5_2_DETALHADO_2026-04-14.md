# Portaria Web - Retorno ao Backend apos fechamento V5.2

Data: 2026-04-14

## 1. Consolidacao recebida e absorvida

O `Portaria Web` recebeu a consolidacao final enviada pelo backend para a `V5.2` e passou a tratar esses pontos como fechados no contrato oficial:

- `resident/profile` como fonte canonica do perfil do morador;
- `visit-forecasts` como recurso oficial de visitas previstas;
- `stream-capabilities` como contrato normativo para o cliente do stream operacional;
- `people/by-cpf`, `birthDate` e `minorFacialAuthorization` no fluxo de cadastro de moradores;
- OCR documental com `suggestedBirthDate`, `birthDateCandidates` e `prefill.birthDate`.

## 2. O que o front ja aplicou

- promoveu `GET /api/v1/resident/profile` para fonte principal no `Dashboard > Perfil`;
- passou a exibir `profileSource` na experiencia do morador;
- ligou `GET /api/v1/resident/lgpd-consent/history` na tela de perfil;
- ligou `GET /api/v1/visit-forecasts` na unidade ativa do morador;
- reforcou o cadastro de moradores com `birthDate`, consulta por CPF e autorizacao de responsavel para facial de menor;
- ajustou o cliente do stream para consultar `GET /api/v1/auth/stream-capabilities` antes de abrir o canal operacional.

## 3. O que deixa de ser cobranca de backend

Com base no fechamento enviado por voces, o `Portaria Web` deixa de tratar como pendencia de backend:

- OCR documental sem data de nascimento;
- ausencia de `birthDate` no contrato principal;
- ausencia de autorizacao oficial para facial de menor;
- visitante sem CPF como regra ainda nao suportada;
- `resident/profile` como fonte apenas complementar;
- `stream-capabilities` sem valor normativo.

## 4. Itens que ainda restam do nosso lado

Os pontos remanescentes desta rodada estao concentrados no proprio front:

- definir a regra de UX para autopreenchimento automatico de OCR de encomendas com base em `confidence`;
- ampliar o consumo canonicamente de `enabledModules`, `residentManagementSettings` e `slimMode` em mais areas do produto;
- continuar o polimento visual, textual e operacional sem depender de novo fechamento contratual.

## 5. Pendencia aberta apos validacao manual

Durante a validacao manual do `Portaria Web`, a criacao de camera ainda permanece com erro de contrato no retorno do backend:

- ao tentar salvar uma nova camera, a API responde apenas com `Field required`;
- o front ja passou a enviar defaults canonicos de integracao, como:
  - `eventIntegrationType: FACE_ENGINE`
  - `streamIntegrationType: VMS`
  - `streamIntegrationVendor: INCORESOFT`
  - `visibilityScope: ADMIN_ONLY`
- mesmo assim, o backend ainda nao informa de forma estruturada qual campo obrigatorio continua faltando neste ambiente.

Pedido objetivo:

- retornar `detail` estruturado com o nome exato do campo obrigatorio ausente;
- ou alinhar o contrato efetivo de criacao de camera com os defaults hoje aceitos pela API documentada.

## 6. Sugestao de UX registrada

Na area de `Encomendas`, fica registrada a sugestao de produto:

- exibir a foto da encomenda na listagem, mesmo em miniatura, quando houver imagem vinculada;
- isso melhora a identificacao visual rapida no fluxo operacional e administrativo;
- trata-se de melhoria de front/UX, nao de bloqueio contratual.

## 7. Situacao atual

- integracao principal da `V5.2` concluida no `Portaria Web`;
- build validado com sucesso;
- permanece pendente apenas o fechamento do erro `Field required` na criacao de camera neste ambiente.
