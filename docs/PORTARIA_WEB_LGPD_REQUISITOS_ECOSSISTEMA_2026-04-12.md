# LGPD - Requisitos Do Ecossistema

Data: `2026-04-12`
Origem: `Portaria Web`

## Objetivo

Registrar os requisitos minimos de conformidade que o ecossistema deve observar em `Portaria Web`, `App Morador`, `Guarita` e `Backend`.

## Pontos Minimos

### 1. Transparencia

- disponibilizar `Politica de Privacidade` e `Termo de Uso` acessiveis;
- registrar versao dos documentos;
- informar finalidades principais de tratamento.

### 2. Aceite e ciencia

- no minimo, registrar ciencia no primeiro acesso do usuario;
- quando houver fluxo que dependa de consentimento especifico, registrar aceite proprio por finalidade;
- manter trilha de versao e data do aceite.

### 3. Base legal e finalidade

- mapear a base legal por fluxo:
  - autenticacao
  - controle de acesso
  - facial
  - cameras e snapshots
  - OCR
  - mensagens e notificacoes
  - encomendas

### 4. Controle de acesso

- restringir dados por perfil e escopo;
- evitar exibicao excessiva de dados em telas operacionais;
- manter auditoria de acoes sensiveis.

### 5. Retencao e minimizacao

- definir tempo de retencao de logs, snapshots, fotos, OCR e evidencias;
- armazenar apenas o necessario para a finalidade operacional e legal.

### 6. Direitos do titular

- preparar fluxo para acesso, correcao e revisao de dados, quando aplicavel;
- definir canal oficial do encarregado/controlador.

### 7. Dados sensiveis e de imagem

- tratar facial, imagem de camera e documento com governanca reforcada;
- nao assumir sincronizacao facial concluida sem resposta oficial do backend;
- registrar se o fluxo exige consentimento especifico.

## Estado Atual Do Portaria Web

- paginas de `Termo de Uso` e `Politica de Privacidade` publicadas;
- fluxo de primeiro acesso com ciencia local implementado;
- falta persistencia oficial do aceite no backend;
- falta matriz formal de base legal por fluxo;
- falta politica oficial de retencao compartilhada entre os quatro membros.

## Dependencias Externas

- decisao oficial do `Backend` sobre onde persistir aceite e consentimento;
- decisao oficial do ecossistema sobre controlador, operador e encarregado;
- politica compartilhada de retencao e atendimento ao titular.
