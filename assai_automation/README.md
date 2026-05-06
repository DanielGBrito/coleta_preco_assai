# Assai Automation

Automacao modular para coleta de catalogos do iFood (Assai), com fila no Redis, consolidacao em CSV e payloads para integracao.

## Estrutura

- config: variaveis de ambiente e parametros gerais
- lib: captura de sessao, cliente HTTP, parser e CSV
- queue: fila Redis para processar catalogos
- integrations: payload de import DB e integracao Consinco
- output: arquivos de saida do processo

## Fluxo

1. Captura headers e cookies via Playwright na loja.
2. Consulta menu completo de catalogos (code e name).
3. Enfileira catalogos no Redis.
4. Processa a fila consultando cada catalogo com timeout de 5 segundos e intervalo de 5 segundos.
5. Gera CSV consolidado e payloads de integracao.

## Configuracao

1. Copie `.env.example` para `.env`.
2. Ajuste as variaveis de Redis e SSL conforme ambiente.
3. Instale dependencias:

```bash
npm install
```

## Execucao

```bash
npm start
```

## Observacoes SSL

- Modo seguro (recomendado): configurar `IFOOD_CA_BUNDLE` com certificado corporativo.
- Modo inseguro manual: `IFOOD_INSECURE_SSL=1`.
- Fallback inseguro automatico (habilitado por padrao): `IFOOD_AUTO_FALLBACK_INSECURE_SSL=1`.
