# Portaria Web - Resumo de Integração API Sapinho V5.1

Data: 2026-04-14

## O que foi absorvido no front

- integração da spec `API Sapinho V5.1` ao projeto;
- cópia local da spec em `src/api/API Sapinho V5.1.txt`;
- suporte tipado a `documentType` no domínio de pessoas;
- integração do endpoint `POST /api/v1/people/document-ocr`;
- cadastro de morador preparado para OCR documental com:
  - leitura por `upload`;
  - leitura por `webcam`;
  - leitura por `câmera do condomínio`;
  - autopreenchimento de `nome`, `documento` e `tipo do documento`;
  - exibição de confiança e sugestão devolvidas pela API;
- cadastro de morador com:
  - `documento` em primeiro lugar;
  - checagem local de documento já existente na base carregada;
  - campo de `data de nascimento` preparado no front;
  - bloqueio de sincronização facial para menor sem autorização local;
- melhoria da tentativa de reprodução de vídeo ao vivo em `camera-feed`, com `play()` explícito e preparação melhor para stream do navegador;
- manutenção da configuração local para obrigatoriedade de CPF/documento de visitante.

## Resultado prático

- o Portaria Web já consegue usar a V5.1 para OCR documental no cadastro;
- o fluxo de morador ficou mais próximo do cenário operacional pedido;
- a base segue compilando sem quebra.

## Validação

- `npm run build` executado com sucesso.
