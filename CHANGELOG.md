# Changelog

Todas as alteracoes relevantes deste projeto devem ser registradas aqui.

## [Unreleased] - 2026-04-23

### Added

- Importacao CSV de unidades e moradores com modelo de preenchimento e validacao previa.
- Diagnostico documentado para o fluxo de cadastro de veiculos quando o backend recusa unidade fora do escopo do usuario.
- Matriz documentada de smoke tests do backend por perfil: morador, operador, admin e master.

### Changed

- Revisao de textos, acentos e mensagens para reduzir termos tecnicos na experiencia do usuario.
- Ajustes no painel administrativo, dashboard do morador, encomendas, alertas, cameras, pendencias, unidades e veiculos.
- Cadastro de veiculos passa a enviar a unidade escolhida no corpo e no cabecalho de escopo esperado pela API.
- Proxy deixa de reutilizar unidade antiga de morador quando a chamada ja possui autenticacao propria.
- Catalogo de condominios e unidades passa a usar fallback da sessao quando a API oscila.
- Telas de cameras e veiculos passam a manter a ultima atualizacao valida em modo degradado.
- Tela de dispositivos passa a manter cache com data da ultima sincronizacao e feedback mais claro quando a listagem do servidor oscila.
- Cadastro RTSP de cameras passa a entrar em fila visual local, aparecendo na lista enquanto o servidor conclui a sincronizacao.
- Dispositivos recem-cadastrados passam a ficar marcados como sincronizacao pendente ate a confirmacao da listagem oficial.
- Telas de Usuarios e Operacao tiveram nova limpeza de termos tecnicos visiveis ao usuario final.
- Câmeras, Moradores, Encomendas, Alertas, Unidades, Relatórios e formulários administrativos receberam nova revisão para remover linguagem técnica da interface.

### Fixed

- Corrigido travamento da pagina de veiculos quando os dados ainda nao tinham carregado.
- Corrigidas mensagens quebradas por codificacao em telas administrativas e servicos.
- Corrigida protecao contra acesso nulo em listas e filtros de veiculos.
- Corrigida perda completa de lista em cameras e veiculos quando o backend fica indisponivel.

## [1.0.0] - 2026-04-17

### Added

- Registro inicial de autoria e titularidade do codigo-fonte
- Estrutura basica de governanca do repositorio
- Publicacao inicial da base do projeto PORTARIA-WEB
- CHECKLIST.md como parte obrigatoria da preparacao do modulo
