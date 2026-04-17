# Parecer Consolidado Do Ecossistema

Data de referencia: `2026-04-11`

Base considerada:

- `MATRIZ_ALINHAMENTO_ECOSSISTEMA_2026-04-11.md`
- `devolutiva-matriz-alinhamento-ecossistema-2026-04-11.md`
- `DEVOLUTIVA_MATRIZ_ALINHAMENTO_ECOSSISTEMA_2026-04-11.md`

## Parecer Geral

A matriz do `Guarita` faz sentido como visao executiva inicial do ecossistema.

Ela esta correta ao apontar que:

- `Portaria Web` segue como referencia operacional mais ampla;
- `Guarita` esta forte no eixo operacional movel e de contingencia;
- `App Morador` atua como camada de relacionamento e autosservico;
- o principal risco atual continua sendo desalinhamento de contrato e semantica entre os tres canais.

As duas devolutivas recebidas confirmam a direcao da matriz.

O ajuste necessario agora nao e mudar a arquitetura do raciocinio, e sim deixar a matriz mais precisa em dois pontos:

- diferenciar melhor `fluxo implementado` de `contrato backend fechado`;
- corrigir alguns itens que ficaram subavaliados em `Portaria Web` e `App Morador`.

## Consensos Entre Os Tres Lados

Hoje existe consenso de que:

- `Tempo real e eventos` deve continuar como `Parcial` nos tres;
- `Permissoes por app/acao` deve continuar como `Parcial` nos tres;
- `Linguagem e rotulos operacionais` deve continuar como `Parcial` nos tres;
- `Portaria Web` e a referencia principal em `alertas`, `cameras` e operacao ampla;
- `Guarita` e a referencia mais forte em contingencia e operacao movel;
- `App Morador` e naturalmente mais restrito em operacao direta, busca ampla e auditoria;
- o backend ainda precisa fechar contratos oficiais unificados para status, permissoes, facial, alertas, mensagens, notificacoes e streaming.

## Ajustes Necessarios Na Matriz

### 1. Portaria Web esta subavaliado em dois pontos

Os retornos indicam que o `Portaria Web` ja esta mais maduro do que a matriz mostra em:

- `OCR de etiqueta`, que deve passar de `Parcial` para `Feito`;
- `Mensagens entre ponta e operacao`, que deve passar de `Parcial` para `Feito`.

Em `Notificacoes coerentes entre telas`, a leitura mais segura continua sendo `Parcial`, porque o contrato unificado ainda nao esta fechado de ponta a ponta.

### 2. App Morador esta subavaliado em varios fluxos ja existentes

O `App Morador` ja nao esta apenas em intencao nos dominios de:

- `alertas`;
- `cameras`;
- `mensagens`;
- `notificacoes`;
- `faces/foto`.

Nesses pontos, a classificacao `Parcial` pode ser mantida, mas a observacao textual precisa deixar claro que:

- o fluxo ja existe em interface e consumo;
- o gap principal agora e contrato final, padronizacao de semantica e fechamento de backend.

### 3. Legenda da matriz precisa ficar mais precisa

O maior problema atual da matriz e que `Feito`, `Parcial` e `Faltando` acabam misturando:

- tela pronta;
- integracao parcial;
- contrato oficial;
- consolidacao final de produto.

Por isso, a proxima versao da matriz deveria explicitar pelo menos esta regra:

- `Feito`: fluxo consolidado no produto;
- `Parcial`: fluxo existe, mas ainda depende de contrato, backend ou refinamento;
- `Faltando`: ainda nao consolidado no produto, mesmo que existam ideias, preparacao tecnica ou caminho previsto.

Isso evita duas leituras erradas:

- achar que algo inexiste quando na verdade ja existe no front;
- achar que algo esta totalmente fechado quando o contrato ainda nao esta estavel.

## Leitura Consolidada Por Produto

### Guarita

O `Guarita` esta bem alinhado principalmente em:

- encomendas;
- pessoas e unidades;
- acessos e visitas;
- disciplina operacional;
- contingencia local.

Ainda precisa evoluir para ficar no mesmo patamar do `Portaria Web` em:

- alertas;
- cameras;
- mensagens e notificacoes;
- cobertura visual mais ampla do ecossistema.

### App Morador

O `App Morador` esta bem alinhado em:

- acompanhamento de encomendas;
- notificacoes do residente;
- consulta da unidade ativa;
- cameras no escopo da unidade;
- mensagens com a portaria;
- fluxo de foto e biometria facial no recorte do residente.

Mas continua naturalmente mais restrito que os produtos operacionais em:

- operacao direta;
- busca operacional ampla;
- monitoramento geral;
- contingencia forte;
- auditoria operacional.

### Portaria Web

O `Portaria Web` segue como referencia principal do ecossistema em:

- operacao ampla;
- alertas;
- cameras;
- encomendas completas;
- monitoramento master;
- integracao mais extensa com a `V4.3`.

Tambem deve ser reconhecido na matriz como mais maduro em:

- OCR de etiqueta;
- mensagens operacionais.

## Ajustes Objetivos Recomendados

Os ajustes consolidados recomendados para a matriz sao estes:

1. `Portaria Web > OCR de etiqueta`: mudar de `Parcial` para `Feito`.
2. `Portaria Web > Mensagens entre ponta e operacao`: mudar de `Parcial` para `Feito`.
3. `Portaria Web > Notificacoes coerentes entre telas`: manter `Parcial`.
4. `App Morador`: manter varios itens como `Parcial`, mas ajustar o texto para deixar claro que o fluxo ja existe em tela e o gap e de contrato final.
5. `Guarita`: manter `Faltando` em `alertas`, `cameras` e parte de `mensagens/notificacoes`, mas esclarecer que isso significa `nao consolidado no produto`, nao `inexistente no ecossistema`.
6. Acrescentar uma nota geral dizendo que a classificacao considera maturidade de produto, nao apenas existencia de endpoint.

## Padrões Que Precisam Ser Fechados Agora

Os tres lados convergem que o proximo passo correto e fechar tabelas unicas para:

- status de encomenda;
- status facial;
- tipos e status de alerta;
- contratos de camera e prioridade de midia;
- permissoes por app e por acao;
- eventos, mensagens e notificacoes;
- tipagem final de stream e tempo real.

## Conclusao Final

A matriz do `Guarita` esta boa como base e faz sentido.

O que falta agora nao e refazer a leitura do ecossistema do zero.

O que falta e:

- corrigir pontos subavaliados de `Portaria Web` e `App Morador`;
- deixar a legenda mais precisa;
- e transformar o alinhamento atual em contrato oficial de backend e semantica unica entre `Guarita`, `Portaria Web` e `App Morador`.

Em resumo:

- a direcao geral esta correta;
- a matriz pode ser mantida;
- mas deve ser refinada para refletir melhor o estado real dos tres produtos.
