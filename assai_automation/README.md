# Assai Automation

Automacao modular para coleta de catalogos do iFood (Assai), com fila no Redis, consolidacao em CSV e payloads para integracao.

Modo atual: API-only (sem abrir browser).

## Estrutura

- config: variaveis de ambiente e parametros gerais
- lib: carregamento de headers, cliente HTTP, parser e CSV
- queue: fila Redis para processar catalogos
- integrations: payload de import DB e integracao Consinco
- output: arquivos de saida do processo

## Fluxo

1. Carrega headers/cookies de arquivo JSON (headers limpos ou payload capturado).
2. Consulta menu completo de catalogos (code e name).
3. Enfileira catalogos no Redis.
4. Processa a fila consultando cada catalogo com timeout de 5 segundos e intervalo de 5 segundos.
5. Gera CSV consolidado e payloads de integracao.
6. Persiste dados no DW Oracle (quando habilitado).
7. Realiza integracao no Consinco (quando habilitado).
8. Envia e-mail com CSV em anexo (quando habilitado).

## Configuracao

1. Copie `.env.example` para `.env`.
2. Ajuste as variaveis de Redis, SSL e fonte de headers conforme ambiente.
3. Instale dependencias:

```bash
npm install
```

## Execucao

```bash
npm start
```

Execucao com ambiente de homologacao:

```bash
ENV_FILE=.env.homolog npm start
```

## Headers de entrada

- `IFOOD_HEADERS_FILE`: caminho do JSON de headers (default: `./output/headers_produtos.json`)
- `IFOOD_COOKIE`: opcional para sobrescrever o Cookie do arquivo
- `COLETA_TIPO`, `COLETA_CEP`, `COLETA_CIDADE`, `COLETA_BAIRRO`: metadados inseridos no CSV/DB

Formatos aceitos:

- JSON de headers limpos (chave/valor)
- JSON capturado com estrutura `{ headers, cookieHeader }`

## Integracao Consinco

- Ative com `CONSINCO_ENABLED=true`
- Preencha `CONSINCO_API`, `CONSINCO_COMPANY`, `CONSINCO_USER`, `CONSINCO_PWD`, `CONSINCO_SEQ_CONCORRENTE`, `CONSINCO_SEQ_LISTA`
- Informe empresas em `CONSINCO_EMPRESAS_JSON` (array JSON):

```json
[
	{ "nroempresa": 1, "indcentralloja": "S" }
]
```

## Persistencia no Banco (DW)

- Ative com `DB_ENABLED=true`
- Preencha `DW_URL_DB`, `DW_USER_DB`, `DW_PWD_DB`
- A persistencia segue o padrao do projeto coleta-preco, gravando em `rpa.tab_coletaprecos_concorrentes_mix_completo`

## Formato do CSV

- O CSV de saida inclui os campos `INTEGRADO` (sempre `1`) e `SEQLISTA`.
- O schema principal segue: `ID,DATACOLETA,SEQCONCORRENTE,EAN,EAN_CONCORRENTE,URL,NOME,PRECODE,PRECOPOR,URLFOTO,SKUID,DEPARTAMENTO,CATEGORIA,INTEGRADO,SEQLISTA,TIPO,CEP,CIDADE,BAIRRO`.

## Envio de E-mail

- Ative com `EMAIL_ENABLED=true`
- Preencha `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PWD`, `SMTP_DESTINOS`
- O CSV gerado em `output/produtos.csv` sera anexado automaticamente.
- O nome do anexo segue `EMAIL_ANEXO_PREFIX + DDMMYYYY`, por exemplo `coletaTotalAssai06052026.csv`.

## Observacoes SSL

- Modo seguro (recomendado): configurar `IFOOD_CA_BUNDLE` com certificado corporativo.
- Modo inseguro manual: `IFOOD_INSECURE_SSL=1`.
- Fallback inseguro automatico (habilitado por padrao): `IFOOD_AUTO_FALLBACK_INSECURE_SSL=1`.
