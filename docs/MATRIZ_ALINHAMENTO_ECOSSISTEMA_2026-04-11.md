# Matriz De Alinhamento Do Ecossistema

Data de referencia: `2026-04-11`

Legenda:

- `Feito`: fluxo ou padrao ja aparece de forma consistente no modulo
- `Parcial`: existe, mas ainda depende de contrato, backend ou refinamento
- `Faltando`: ainda nao consolidado no modulo

## Visao Rapida

| Dominio | Guarita | App Morador | Portaria Web | Leitura direta |
| --- | --- | --- | --- | --- |
| Encomendas | Feito | Parcial | Feito | Guarita e Portaria estao mais maduros operacionalmente; Morador acompanha melhor do que opera |
| Faces e foto de pessoa | Parcial | Parcial | Parcial | Os tres convergem, mas ainda falta status facial unificado |
| Pessoas e unidades | Feito | Parcial | Feito | Guarita e Portaria ja trabalham mais no eixo operacional; Morador usa o recorte da unidade |
| Acessos e visitas | Feito | Parcial | Feito | Guarita e Portaria estao mais proximos; Morador consulta mais do que executa |
| Alertas | Faltando | Parcial | Feito | Morador e Portaria estao mais avancados que Guarita |
| Cameras | Faltando | Parcial | Feito | Portaria e a referencia principal; Morador acompanha a propria unidade |
| Mensagens e notificacoes | Faltando | Parcial | Parcial | Existe direcao comum, mas sem padrao unico fechado |
| Offline e contingencia | Feito | Parcial | Parcial | Guarita hoje e a referencia mais forte |
| Tempo real e eventos | Parcial | Parcial | Parcial | Linha aberta, mas contrato e cobertura ainda nao estao fechados nos tres |
| Permissoes por app/acao | Parcial | Parcial | Parcial | Ainda falta matriz unica oficial do backend |
| Linguagem e rotulos operacionais | Parcial | Parcial | Parcial | Ja existe convergencia, mas nao um glossario unico fechado |

## Por Dominio

### Encomendas

| Item | Guarita | App Morador | Portaria Web |
| --- | --- | --- | --- |
| Recebimento operacional | Feito | Faltando | Feito |
| Retirada com validacao | Feito | Parcial | Feito |
| Foto/evidencia | Feito | Parcial | Feito |
| OCR de etiqueta | Feito | Faltando | Parcial |
| Historico coerente | Feito | Parcial | Feito |
| Status compartilhados | Parcial | Parcial | Parcial |

Leitura:

- `Guarita` ficou forte em recebimento, OCR, evidencias e retirada.
- `App Morador` esta melhor em acompanhamento do que em operacao.
- `Portaria Web` segue como referencia ampla do fluxo.

### Faces E Foto

| Item | Guarita | App Morador | Portaria Web |
| --- | --- | --- | --- |
| Upload de foto | Feito | Feito | Parcial |
| Cadastro facial | Feito | Parcial | Parcial |
| Resumo de status facial | Parcial | Parcial | Parcial |
| Status facial unificado | Faltando | Faltando | Faltando |

Leitura:

- Os tres produtos apontam para a mesma direcao.
- Ainda falta o backend fechar um `faceStatus` padrao para todos.

### Pessoas, Unidades, Acessos E Visitas

| Item | Guarita | App Morador | Portaria Web |
| --- | --- | --- | --- |
| Busca operacional | Feito | Faltando | Feito |
| Vínculo pessoa/unidade | Feito | Parcial | Feito |
| Visitas previstas | Feito | Parcial | Feito |
| Ultimos acessos | Feito | Parcial | Feito |
| Consulta por unidade do morador | Faltando | Feito | Feito |

Leitura:

- `Guarita` e `Portaria Web` estao mais alinhados no operacional.
- `App Morador` usa o mesmo dominio, mas com recorte mais restrito.

### Alertas, Cameras, Mensagens E Notificacoes

| Item | Guarita | App Morador | Portaria Web |
| --- | --- | --- | --- |
| Alertas operacionais | Faltando | Parcial | Feito |
| Snapshot/evidencia de alerta | Faltando | Parcial | Feito |
| Visualizacao de cameras | Faltando | Parcial | Feito |
| Mensagens entre ponta e operacao | Faltando | Parcial | Parcial |
| Notificacoes coerentes entre telas | Faltando | Parcial | Parcial |

Leitura:

- Aqui o `Guarita` ainda nao esta no mesmo nivel.
- `Portaria Web` e a referencia principal.
- `App Morador` ja carrega boa parte da experiencia final do residente.

### Offline, Tempo Real E Operacao

| Item | Guarita | App Morador | Portaria Web |
| --- | --- | --- | --- |
| Cache local | Feito | Parcial | Parcial |
| Fila offline | Feito | Parcial | Parcial |
| Rascunho por operador/usuario | Feito | Parcial | Parcial |
| Distincao entre dado local e sistema | Feito | Parcial | Parcial |
| Stream de eventos | Parcial | Parcial | Parcial |

Leitura:

- `Guarita` hoje e a melhor referencia de contingencia.
- Os outros dois podem aproveitar essa disciplina de estado.

## O Que Ja Esta Bem Padronizado

- Separacao de papel entre os tres produtos
- Uso de `personId`, `unitId`, `deliveryId` como eixo de contrato
- Linha de encomendas com recebimento, retirada e auditoria
- Uso de foto como evidencia operacional
- Busca operacional como responsabilidade de Guarita e Portaria

## O Que Ainda Precisa Virar Padrao Oficial

- Matriz unica de status de alerta
- Matriz unica de status facial
- Matriz unica de status de encomenda para os tres fronts
- Matriz unica de permissao por app e por acao
- Tipagem final de `operation/search`
- Tipos oficiais do `events/stream`
- Glossario unico de rotulos operacionais e textos de usuario

## Leitura Final

Hoje o `Guarita` ficou bem mais alinhado ao ecossistema do que estava no inicio desta rodada.  
Ele ainda nao esta no mesmo patamar funcional de `Portaria Web` em `alertas`, `cameras` e `mensagens`, nem no mesmo patamar de experiencia final do `App Morador` para relacionamento com o residente.  
Mas no eixo operacional de `encomendas`, `pessoas`, `unidades`, `faces`, `contingencia` e `tempo real`, o alinhamento ja esta substancialmente melhor.
