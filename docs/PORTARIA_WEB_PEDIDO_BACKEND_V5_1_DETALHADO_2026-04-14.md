# Portaria Web - Pendências para Backend após API Sapinho V5.1

Data: 2026-04-14

## 1. Cadastro documental ainda não devolve data de nascimento

### Contexto
O `Portaria Web` já integrou `POST /api/v1/people/document-ocr` e usa o retorno para autopreencher `nome`, `documento` e `tipo do documento`.

### Pendência
Ainda falta o backend devolver `data de nascimento` no OCR documental ou em um endpoint complementar de consulta por CPF/documento.

### Impacto
Sem isso, o front consegue preparar o campo, mas não consegue autopreencher idade nem aplicar automaticamente a regra de menor de idade.

### Pedido
- publicar `birthDate` no retorno do OCR documental; ou
- publicar endpoint complementar oficial de consulta documental com retorno de:
  - `fullName`
  - `birthDate`
  - `document`
  - `documentType`
  - `confidence`

## 2. Autorização facial para menor ainda não tem persistência oficial

### Contexto
O front já bloqueia sincronização facial automática de menor sem autorização local.

### Pendência
Ainda não existe contrato oficial do backend para persistir:
- autorização do responsável;
- texto/versionamento da autorização;
- operador que registrou;
- data e hora do aceite;
- vínculo com a pessoa cadastrada.

### Impacto
Hoje a regra operacional existe no front, mas a trilha jurídica e de auditoria ainda não fica registrada de forma canônica no servidor.

### Pedido
Publicar contrato oficial para autorização de envio facial de menor, com histórico auditável.

## 3. Pessoa ainda não expõe `birthDate` no contrato principal

### Contexto
O formulário já está preparado para `data de nascimento`.

### Pendência
O contrato principal de pessoa ainda não foi fechado para persistir `birthDate`.

### Impacto
O campo existe no front, mas ainda não pode ser salvo de forma oficial.

### Pedido
Adicionar `birthDate` em:
- `POST /api/v1/people`
- `PUT /api/v1/people/{id}`
- respostas de listagem e detalhe de pessoa

## 4. Política oficial para exigência opcional de CPF para visitante

### Contexto
O front já tem configuração local para exigir ou não documento de visitante.

### Pendência
Ainda falta o backend permitir a mesma flexibilidade sem rejeitar o cadastro por validação rígida no ambiente.

### Impacto
Mesmo com a opção desligada no front, o backend pode continuar recusando visitante sem documento.

### Pedido
Definir e documentar a política oficial:
- visitante com documento obrigatório; ou
- visitante com documento opcional por configuração de cliente/unidade/perfil

## 5. Streaming de câmera ainda depende de estabilidade real do backend/VMS

### Contexto
O front foi reforçado para tentar reproduzir melhor `liveUrl/hlsUrl`.

### Pendência
Quando a câmera não devolve stream reproduzível de forma estável, o front cai para preview/snapshot.

### Impacto
A tela pode continuar sem “ao vivo” mesmo com melhoria no navegador se o backend não entregar `liveUrl`/`hlsUrl` utilizável.

### Pedido
Garantir estabilidade de:
- `GET /api/v1/cameras/{id}/streaming`
- `liveUrl`
- `hlsUrl`
- fallback coerente com `imageStreamUrl` e `snapshotUrl`

## 6. `visit-forecasts` ainda não foi ligado no Portaria Web

### Contexto
A V5.1 já expõe o bloco de visitas previstas.

### Pendência
Ainda falta fechar prioridade funcional e UX para plugar esse contrato no Portaria Web.

### Impacto
O endpoint existe, mas ainda não virou tela/fluxo operacional real no front.

### Pedido
Confirmar se `visit-forecasts` já está estável para consumo pleno em portaria web e se pode entrar como contrato oficial de agenda de visitas.

## Estado atual do Portaria Web

- integração principal da V5.1 concluída;
- OCR documental operacional no front;
- build validado com sucesso;
- pendências restantes concentradas no backend e no fechamento de contrato.
