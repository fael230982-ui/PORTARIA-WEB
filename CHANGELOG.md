# Changelog

Todas as alteracoes relevantes deste projeto devem ser registradas aqui.

## [Unreleased] - 2026-04-23

### Added

- Importacao CSV de unidades e moradores com modelo de preenchimento e validacao previa.
- Diagnostico documentado para o fluxo de cadastro de veiculos quando o backend recusa unidade fora do escopo do usuario.

### Changed

- Revisao de textos, acentos e mensagens para reduzir termos tecnicos na experiencia do usuario.
- Ajustes no painel administrativo, dashboard do morador, encomendas, alertas, cameras, pendencias, unidades e veiculos.
- Cadastro de veiculos passa a enviar a unidade escolhida no corpo e no cabecalho de escopo esperado pela API.
- Proxy deixa de reutilizar unidade antiga de morador quando a chamada ja possui autenticacao propria.

### Fixed

- Corrigido travamento da pagina de veiculos quando os dados ainda nao tinham carregado.
- Corrigidas mensagens quebradas por codificacao em telas administrativas e servicos.
- Corrigida protecao contra acesso nulo em listas e filtros de veiculos.

## [1.0.0] - 2026-04-17

### Added

- Registro inicial de autoria e titularidade do codigo-fonte
- Estrutura basica de governanca do repositorio
- Publicacao inicial da base do projeto PORTARIA-WEB
- CHECKLIST.md como parte obrigatoria da preparacao do modulo
