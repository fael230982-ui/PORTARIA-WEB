param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectPath,

  [Parameter(Mandatory = $true)]
  [string]$ProjectName,

  [Parameter(Mandatory = $true)]
  [string]$AuthorName,

  [Parameter(Mandatory = $true)]
  [string]$AuthorEmail,

  [Parameter(Mandatory = $true)]
  [string]$AuthorRole,

  [string]$RemoteUrl
)

$ErrorActionPreference = "Stop"

function Write-Utf8File {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$Content
  )

  $parent = Split-Path -Parent $Path
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }

  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

$repoPath = (Resolve-Path $ProjectPath).Path
Set-Location $repoPath

if (-not (Test-Path (Join-Path $repoPath ".git"))) {
  git init
}

git config user.name $AuthorName
git config user.email $AuthorEmail

$gitignore = @"
# dependencies
node_modules/

# builds
.next/
dist/
build/
coverage/

# environment
.env*

# logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# secrets
*firebase-adminsdk*.json
*.pem
"@

$readme = @"
# $ProjectName

Repositorio preparado com padrao minimo de governanca, autoria e publicacao.

## Autoria

- Nome: $AuthorName
- E-mail: $AuthorEmail
- Cargo: $AuthorRole

## Documentos do repositorio

- LICENSE
- AUTHORSHIP.md
- AUTHORS.md
- CHANGELOG.md
- CONTRIBUTING.md
- CHECKLIST.md
"@

$authorship = @"
# Autoria e Titularidade

- Nome: $AuthorName
- E-mail: $AuthorEmail
- Cargo: $AuthorRole
- Abrangencia: todos os arquivos do projeto
"@

$authors = @"
# AUTHORS

- $AuthorName
- E-mail: $AuthorEmail
- Cargo: $AuthorRole
"@

$changelog = @"
# Changelog

## [1.0.0] - $(Get-Date -Format "yyyy-MM-dd")

### Added

- Estrutura inicial de governanca do repositorio
- Registro de autoria
"@

$contributing = @"
# Contribuicao

## Convencao de commits

- feat
- fix
- docs
- chore

## Regras gerais

- Nao publique segredos, tokens ou credenciais
- Atualize o changelog quando fizer sentido
- Mantenha commits pequenos e objetivos
- Execute validacao minima antes de publicar
- Mantenha CHECKLIST.md atualizado
"@

$checklist = @"
# Checklist de Publicacao

## Antes do primeiro push

- [ ] git config user.name e git config user.email configurados
- [ ] .gitignore revisado
- [ ] Segredos, tokens, chaves, .env e credenciais removidos do versionamento
- [ ] README.md, AUTHORS.md, AUTHORSHIP.md, CHANGELOG.md, CONTRIBUTING.md e CHECKLIST.md criados
- [ ] Templates de PR e issue adicionados

## Antes de publicar

- [ ] Typecheck executado, quando aplicavel
- [ ] Build executado
- [ ] Testes aplicaveis executados
- [ ] CHANGELOG.md atualizado
- [ ] CHECKLIST.md revisado
"@

$prTemplate = @"
## Resumo

Descreva o que mudou.

## Validacao

- [ ] Revisado manualmente
- [ ] Sem segredos ou credenciais
"@

$bugIssue = @"
---
name: Bug report
about: Reportar problema encontrado
title: "[BUG] "
labels: bug
assignees: ""
---

## Descricao

Descreva o problema.
"@

$featureIssue = @"
---
name: Feature request
about: Sugerir melhoria
title: "[FEAT] "
labels: enhancement
assignees: ""
---

## Objetivo

Descreva a necessidade.
"@

Write-Utf8File -Path (Join-Path $repoPath ".gitignore") -Content $gitignore
Write-Utf8File -Path (Join-Path $repoPath "README.md") -Content $readme
Write-Utf8File -Path (Join-Path $repoPath "AUTHORSHIP.md") -Content $authorship
Write-Utf8File -Path (Join-Path $repoPath "AUTHORS.md") -Content $authors
Write-Utf8File -Path (Join-Path $repoPath "CHANGELOG.md") -Content $changelog
Write-Utf8File -Path (Join-Path $repoPath "CONTRIBUTING.md") -Content $contributing
Write-Utf8File -Path (Join-Path $repoPath "CHECKLIST.md") -Content $checklist
Write-Utf8File -Path (Join-Path $repoPath ".github\PULL_REQUEST_TEMPLATE.md") -Content $prTemplate
Write-Utf8File -Path (Join-Path $repoPath ".github\ISSUE_TEMPLATE\bug_report.md") -Content $bugIssue
Write-Utf8File -Path (Join-Path $repoPath ".github\ISSUE_TEMPLATE\feature_request.md") -Content $featureIssue

if ($RemoteUrl) {
  $hasOrigin = git remote | Select-String "^origin$"
  if ($hasOrigin) {
    git remote set-url origin $RemoteUrl
  } else {
    git remote add origin $RemoteUrl
  }
}

Write-Host "Repositorio preparado em: $repoPath"
Write-Host "Proximo passo sugerido:"
Write-Host "git add ."
Write-Host "git commit -m `"chore: initialize repository governance`""
if ($RemoteUrl) {
  Write-Host "git push -u origin main"
  Write-Host "git tag -a v1.0.0 -m `"v1.0.0`""
  Write-Host "git push origin v1.0.0"
}
