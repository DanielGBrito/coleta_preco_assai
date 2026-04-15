# Automação de Extração de Produtos iFood (Assaí)

## Visão Geral
Este projeto automatiza a captura de dados de produtos do iFood (loja Assaí) e gera um arquivo CSV padronizado para uso em integrações, análise ou importação em outros sistemas.

A automação faz três grandes etapas:
1. Abre a página da loja com Playwright e captura headers/cookies reais de navegação.
2. Reaproveita esses headers para fazer o GET do catálogo de produtos.
3. Converte o JSON retornado em CSV com layout customizado.

Arquivo principal da automação:
- `teste_final.js`

## Fluxo da Automação

### 1) Inicialização do navegador
- Usa Playwright com Chromium via canal Chrome.
- Abre a loja definida em `URL_LOJA`.
- Aguarda requests de catálogo para capturar headers válidos da sessão.

### 2) Captura de headers e cookies
- Intercepta requests do tipo catálogo (`/catalog`) com filtros de paginação/tamanho.
- Salva os headers capturados em `headers_capturados.json`.
- Captura cookies da sessão e monta o header `Cookie`.

### 3) Requisição do catálogo
- Monta `headers_produtos.json` com os headers válidos.
- Faz GET em `URL_PRODUTOS`.
- Salva a resposta bruta em `produtos_response.json`.

### 4) Transformação JSON -> CSV
A geração de CSV considera os itens em:
- `data.categoryMenu.itens`

Cada item vira uma linha no CSV (`produtos.csv`) com as colunas:

| Coluna CSV | Origem no JSON / Regra |
|---|---|
| EAN | `item.ean` |
| URL | concatenação `URL_LOJA + ?item=item.id` |
| NOME | `item.description` |
| PRECODE | `item.unitPrice` |
| PRECOPOR | `item.scalePrices[].price` (primeiro preço válido); se vazio, usa PRECODE |
| URLFOTO | concatenação `https://static.ifood-static.com.br/image/upload/t_low/pratos/ + item.logoUrl` |
| SKUID | `item.externalCode` |
| DEPARTAMENTO | `data.categoryMenu.name` |
| CATEGORIA | `data.categoryMenu.name` |

## Pré-requisitos
- Node.js 18+ (recomendado 20+).
- Dependência Playwright instalada.
- Google Chrome instalado (pois o script usa `channel: 'chrome'`).

## Instalação
Se ainda não houver configuração de projeto Node na pasta:

1. Inicialize o projeto:
   - `npm init -y`
2. Instale o Playwright:
   - `npm install playwright`

## Execução
Na pasta do projeto, execute:

- `node teste_final.js`

Durante a execução:
- O navegador abre de forma visível (`headless: false`).
- A automação aguarda requests de catálogo.
- Em seguida realiza o GET dos produtos e gera os arquivos de saída.

## Arquivos Gerados
- `headers_capturados.json`:
  - Headers brutos capturados da navegação real.
- `headers_produtos.json`:
  - Headers finais usados no GET de produtos.
- `produtos_response.json`:
  - Resposta JSON completa da API de catálogo.
- `produtos.csv`:
  - CSV final com layout customizado por item.

## Estrutura Atual (resumo)
- `teste_final.js` -> Script principal da automação
- `produtos_response.json` -> Último JSON retornado
- `produtos.csv` -> Último CSV gerado
- `headers_capturados.json` -> Headers capturados no browser
- `headers_produtos.json` -> Headers enviados no GET
- `antigo/` -> Arquivos antigos/históricos

## Tratamento de Erros e Diagnóstico

### Erro: Nenhuma request de catálogo foi capturada
Possíveis causas:
- A loja demorou para carregar requests.
- Mudança no padrão de URL das requests.

Ações recomendadas:
- Aumentar o tempo de espera (`waitForTimeout`).
- Revisar o filtro `ehRequestCatalogo` no script.

### PREÇOS vindo em branco
- PRECODE depende de `unitPrice` no item.
- PRECOPOR depende de `scalePrices[].price`.
- Se `scalePrices` vier vazio, PRECOPOR usa PRECODE automaticamente.

### URL da foto inválida
- Confirmar se `logoUrl` existe no item.
- O script já concatena com a base:
  - `https://static.ifood-static.com.br/image/upload/t_low/pratos/`

## Pontos de Evolução
- Suporte a múltiplas categorias e paginações.
- Retry automático para resposta HTTP diferente de 200.
- Logs estruturados por execução (timestamp/pasta por lote).
- Parametrizar URL da loja e URL do catálogo por linha de comando.

## Observações Importantes
- Este projeto depende do formato atual da resposta da API e dos headers capturados no navegador.
- Caso o iFood altere endpoints, autenticação ou estrutura JSON, o script pode precisar de ajustes.
- Utilize a automação respeitando termos de uso, políticas de plataforma e legislação vigente.
# Automação de Extração de Produtos iFood (Assaí)

## Visão Geral
Este projeto automatiza a captura de dados de produtos do iFood (loja Assaí) e gera um arquivo CSV padronizado para uso em integrações, análise ou importação em outros sistemas.

A automação faz três grandes etapas:
1. Abre a página da loja com Playwright e captura headers/cookies reais de navegação.
2. Reaproveita esses headers para fazer o GET do catálogo de produtos.
3. Converte o JSON retornado em CSV com layout customizado.

Arquivo principal da automação:
- `teste_final.js`

## Fluxo da Automação

### 1) Inicialização do navegador
- Usa Playwright com Chromium via canal Chrome.
- Abre a loja definida em `URL_LOJA`.
- Aguarda requests de catálogo para capturar headers válidos da sessão.

### 2) Captura de headers e cookies
- Intercepta requests do tipo catálogo (`/catalog`) com filtros de paginação/tamanho.
- Salva os headers capturados em `headers_capturados.json`.
- Captura cookies da sessão e monta o header `Cookie`.

### 3) Requisição do catálogo
- Monta `headers_produtos.json` com os headers válidos.
- Faz GET em `URL_PRODUTOS`.
- Salva a resposta bruta em `produtos_response.json`.

### 4) Transformação JSON -> CSV
A geração de CSV considera os itens em:
- `data.categoryMenu.itens`

Cada item vira uma linha no CSV (`produtos.csv`) com as colunas:

| Coluna CSV | Origem no JSON / Regra |
|---|---|
| EAN | `item.ean` |
| URL | concatenação `URL_LOJA + ?item=item.id` |
| NOME | `item.description` |
| PRECODE | `item.unitPrice` |
| PRECOPOR | `item.scalePrices[].price` (primeiro preço válido); se vazio, usa PRECODE |
| URLFOTO | concatenação `https://static.ifood-static.com.br/image/upload/t_low/pratos/ + item.logoUrl` |
| SKUID | `item.externalCode` |
| DEPARTAMENTO | `data.categoryMenu.name` |
| CATEGORIA | `data.categoryMenu.name` |

## Pré-requisitos
- Node.js 18+ (recomendado 20+).
- Dependência Playwright instalada.
- Google Chrome instalado (pois o script usa `channel: 'chrome'`).

## Instalação
Se ainda não houver configuração de projeto Node na pasta:

1. Inicialize o projeto:
   - `npm init -y`
2. Instale o Playwright:
   - `npm install playwright`

## Execução
Na pasta do projeto, execute:

- `node teste_final.js`

Durante a execução:
- O navegador abre de forma visível (`headless: false`).
- A automação aguarda requests de catálogo.
- Em seguida realiza o GET dos produtos e gera os arquivos de saída.

## Arquivos Gerados
- `headers_capturados.json`:
  - Headers brutos capturados da navegação real.
- `headers_produtos.json`:
  - Headers finais usados no GET de produtos.
- `produtos_response.json`:
  - Resposta JSON completa da API de catálogo.
- `produtos.csv`:
  - CSV final com layout customizado por item.

## Estrutura Atual (resumo)
- `teste_final.js` -> Script principal da automação
- `produtos_response.json` -> Último JSON retornado
- `produtos.csv` -> Último CSV gerado
- `headers_capturados.json` -> Headers capturados no browser
- `headers_produtos.json` -> Headers enviados no GET
- `antigo/` -> Arquivos antigos/históricos

## Tratamento de Erros e Diagnóstico

### Erro: Nenhuma request de catálogo foi capturada
Possíveis causas:
- A loja demorou para carregar requests.
- Mudança no padrão de URL das requests.

Ações recomendadas:
- Aumentar o tempo de espera (`waitForTimeout`).
- Revisar o filtro `ehRequestCatalogo` no script.

### PREÇOS vindo em branco
- PRECODE depende de `unitPrice` no item.
- PRECOPOR depende de `scalePrices[].price`.
- Se `scalePrices` vier vazio, PRECOPOR usa PRECODE automaticamente.

### URL da foto inválida
- Confirmar se `logoUrl` existe no item.
- O script já concatena com a base:
  - `https://static.ifood-static.com.br/image/upload/t_low/pratos/`

## Pontos de Evolução
- Suporte a múltiplas categorias e paginações.
- Retry automático para resposta HTTP diferente de 200.
- Logs estruturados por execução (timestamp/pasta por lote).
- Parametrizar URL da loja e URL do catálogo por linha de comando.

## Observações Importantes
- Este projeto depende do formato atual da resposta da API e dos headers capturados no navegador.
- Caso o iFood altere endpoints, autenticação ou estrutura JSON, o script pode precisar de ajustes.
- Utilize a automação respeitando termos de uso, políticas de plataforma e legislação vigente.
