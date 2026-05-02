# Perfil / local de cameras

Data: 2026-05-02

## Decisao aplicada

Enquanto nao existe CRUD especifico de grupos de cameras no backend, o Portaria Web passa a usar o campo `location` da camera como agrupador operacional chamado de `Perfil / local`.

Exemplos de preenchimento pelo admin:

- ACESSOS
- ELEVADORES
- AREA COMUM
- HALLS
- LAZER
- GARAGEM

## Onde ja foi aplicado

- Cadastro e edicao de camera no admin: o campo aparece como `Perfil / local`.
- Lista de cameras no admin: filtro por perfil.
- Monitor externo da portaria: filtro por perfil.
- Tela de cameras do morador no Portaria Web: filtro por perfil.

## Limite atual

Essa abordagem usa texto livre salvo em `location`.

Para uma Fase 2 completa, o ideal e o backend expor cadastro estruturado de perfis/grupos de camera por condominio, evitando divergencias como `ACESSO`, `ACESSOS` e `Acesso`.

## Fase 2 recomendada

Criar contrato de backend para:

- cadastrar perfil de cameras por condominio;
- ordenar perfis;
- definir cor/icone opcional;
- vincular cameras a um perfil por ID;
- retornar `residentCameraGroupId`, `residentCameraGroupName` e ordem oficial.
