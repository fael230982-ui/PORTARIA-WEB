# Checklist de Publicacao

## Antes do primeiro push

- [ ] `git config user.name` e `git config user.email` configurados
- [ ] `.gitignore` revisado
- [ ] Segredos, tokens, chaves, `.env` e credenciais removidos do versionamento
- [ ] `README.md`, `AUTHORS.md`, `AUTHORSHIP.md`, `CHANGELOG.md`, `CONTRIBUTING.md` e `CHECKLIST.md` criados
- [ ] Templates de PR e issue adicionados em `.github/`

## Antes de publicar

- [ ] Typecheck executado, quando aplicavel
- [x] Build executado em 2026-04-23 com `npm run build`
- [ ] Testes aplicaveis executados
- [x] `CHANGELOG.md` atualizado em 2026-04-23
- [x] `CHECKLIST.md` revisado em 2026-04-23

## Release

- [ ] Commit inicial ou commit de release realizado
- [ ] `main` publicada no GitHub
- [ ] Tag de versao criada e publicada
- [ ] Homologacao registrada conforme o modulo
