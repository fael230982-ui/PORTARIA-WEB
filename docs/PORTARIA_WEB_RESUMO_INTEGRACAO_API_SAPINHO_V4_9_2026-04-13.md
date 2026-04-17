# Portaria Web - Resumo de integracao API Sapinho V4.9

## O que foi absorvido

- `GET /api/v1/resident/lgpd-policy`
  - o perfil do morador agora consegue ler:
    - escopo
    - versao atual
    - revogacao suportada
    - versionamento de historico
    - modo de auditoria
    - dimensoes de governanca
- `GET /api/v1/auth/stream-capabilities`
  - o front ja passou a suportar a leitura do contrato oficial de capacidades do stream
- manutencao da linha canônica iniciada na `V4.8`
  - workflow operacional de alertas persistido
  - stream priorizando `eventType` e `occurredAt`
  - OCR de encomendas aproveitando sugestoes de unidade e destinatario

## Melhorias praticas no produto

- `Dashboard > Perfil` do morador ficou menos estatico no bloco LGPD
  - a versao do aceite agora pode seguir o valor oficial publicado pelo backend
  - a tela mostra o escopo e a governanca oficial do contrato
- `Admin > Moradores`
  - o cadastro ficou pronto para captura de documento por:
    - upload
    - webcam
    - camera do condominio
  - isso prepara o fluxo para OCR documental assim que o endpoint oficial existir

## Leitura atual

A `V4.9` nao trouxe uma mudanca estrutural grande de tela, mas amadureceu governanca em dois pontos importantes:

- contrato oficial do stream
- politica LGPD oficial do morador

Tambem deixou o `Portaria Web` mais pronto para o proximo passo funcional pedido pelo produto:

- OCR de documento para auto preenchimento de cadastro via webcam ou camera
