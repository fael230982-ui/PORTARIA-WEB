# Padrao de Preparacao de Repositorio GitHub

Este documento define o padrao minimo para publicar novos modulos com autoria registrada, organizacao basica e historico consistente.

## Checklist

1. Configurar `git config user.name` e `git config user.email`
2. Inicializar Git com `git init`
3. Criar `.gitignore` adequado ao projeto
4. Criar `README.md`, `AUTHORS.md`, `CHANGELOG.md` e `CONTRIBUTING.md`
5. Fazer o commit inicial
6. Criar repositorio no GitHub e conectar `origin`
7. Publicar `main`
8. Criar a tag `v1.0.0`
9. Adicionar templates de PR e issue em `.github/`
10. Manter commits pequenos com `feat`, `fix`, `docs` e `chore`

## Reforcos recomendados

- Criar `LICENSE` conforme a politica do projeto
- Criar `AUTHORSHIP.md` com nome, e-mail, cargo e abrangencia
- Bloquear segredos no `.gitignore`
- Revisar se ha chaves, tokens, `.env` e credenciais antes do primeiro push

## Estrutura minima sugerida

```text
.github/
  ISSUE_TEMPLATE/
  PULL_REQUEST_TEMPLATE.md
.gitignore
AUTHORS.md
AUTHORSHIP.md
CHANGELOG.md
CONTRIBUTING.md
LICENSE
README.md
```

## Convencao de commits

- `feat`: nova funcionalidade
- `fix`: correcao
- `docs`: documentacao
- `chore`: organizacao, manutencao e infraestrutura

## Observacao importante

Se o GitHub bloquear o push por segredo identificado no historico, o correto e remover o arquivo do versionamento, ajustar o `.gitignore`, reescrever o commit afetado e tentar o push novamente.
