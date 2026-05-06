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

## Headers de entrada

- `IFOOD_HEADERS_FILE`: caminho do JSON de headers (default: `./output/headers_produtos.json`)
- `IFOOD_COOKIE`: opcional para sobrescrever o Cookie do arquivo

Formatos aceitos:

- JSON de headers limpos (chave/valor)
- JSON capturado com estrutura `{ headers, cookieHeader }`

## Observacoes SSL

- Modo seguro (recomendado): configurar `IFOOD_CA_BUNDLE` com certificado corporativo.
- Modo inseguro manual: `IFOOD_INSECURE_SSL=1`.
- Fallback inseguro automatico (habilitado por padrao): `IFOOD_AUTO_FALLBACK_INSECURE_SSL=1`.
