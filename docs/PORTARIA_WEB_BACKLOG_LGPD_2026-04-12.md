# Backlog LGPD - Portaria Web

Data: `2026-04-12`
Origem: `Portaria Web`

## Concluido Nesta Rodada

- paginas `/termos` e `/privacidade`;
- gate de primeiro acesso em `/acordo`;
- aceite local versionado no front;
- links de documentos legais na tela de login.

## Pendencias Do Portaria Web

### Prioridade alta

- persistir aceite/versionamento no backend, nao apenas no `localStorage`;
- mostrar versao aceita no perfil do usuario ou em tela de conformidade;
- mapear dados sensiveis exibidos em telas operacionais e mascarar quando possivel.

### Prioridade media

- registrar politicas de retencao por tipo de dado em documentos do produto;
- separar melhor ciencia geral de uso x consentimento especifico de facial, quando exigido;
- criar pagina interna de governanca com versao legal atual, data de aceite e referencias do ecossistema.

### Dependencias De Backend

- endpoint oficial para persistencia de aceite de termo/politica;
- definicao oficial de `consentAccepted` em fluxos faciais;
- regra oficial de retencao e descarte para imagem, facial, OCR e evidencia.

### Dependencias Do Ecossistema

- documento unico de papeis LGPD entre `Portaria Web`, `App Morador`, `Guarita` e `Backend`;
- versao canonica dos textos legais compartilhados;
- decisao sobre fluxos que exigem consentimento especifico versus mera ciencia operacional.
