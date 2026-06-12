# Suíte de Performance — entregas_site

Mede regressões de tempo no núcleo CRU das ondas de carregamento do CRM (sem cache, sem escrita no banco). Todos os cenários são read-only: apenas `SELECT` e RPC de leitura.

---

## O que cada cenário mede

| Cenário | O que mede |
| --- | --- |
| `rpc:pedidos:30d` | RPC `pedidos_metricas` direto, período 30 dias, sem busca |
| `rpc:pedidos:busca` | RPC `pedidos_metricas` com busca por nome "silva" (~294 registros) |
| `rpc:pedidos:so-com-saldo` | RPC `pedidos_metricas` com `p_so_com_saldo=true` |
| `rpc:orcamentos:30d` | RPC `orcamentos_metricas` direto, período 30 dias |
| `rpc:orcamentos:busca` | RPC `orcamentos_metricas` com busca por "silva" (~806 registros) |
| `rpc:orcamentos:tudo` | RPC `orcamentos_metricas` sem filtro de data (período "tudo") |
| `onda:pedidos:1:30d` | `pedidosOnda1` completo: kanban + métricas + situações/vendedores em `Promise.all` |
| `onda:pedidos:2:30d` | `pedidosOnda2` isolado: financeiro + clientes + entregas dos cards visíveis (onda 1 roda no `preparar`, fora da medição) |
| `onda:orcamentos:30d` | `orcamentosOnda` completo: lista + count + métricas + meta em paralelo |
| `count:orcamentos:exact:30d` | `SELECT count exact` com filtro 30d — custo da contagem precisa com índice de data |
| `count:orcamentos:planned:tudo` | `SELECT count planned` sem filtros — estimativa do planejador; **em conexão remota (Supabase Cloud) a latência de rede (~400 ms) domina e planned ≈ exact; a diferença < 20 ms só aparece em conexão local ao Postgres** |

Os grupos `rpc:*` têm `pular()` automático: se a RPC não existir no banco (erro PGRST202 / 42883), o cenário é marcado **SKIPPED** — não falha.

---

## Como rodar

### Variáveis de ambiente

| Variável | Onde usar | Descrição |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` / CI secret | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` / CI secret | Service role key (leitura determinística, bypassa RLS) |
| `PERF_BASE_URL` | local / CI | Habilita a suíte HTTP. Ex.: `http://localhost:3000` |
| `PERF_AUTH_COOKIE` | local / CI | Cookie de sessão para rotas autenticadas (opcional) |

No CI o nome dos secrets é `SUPABASE_URL` (mapeado para `NEXT_PUBLIC_SUPABASE_URL`) e `SUPABASE_SERVICE_ROLE_KEY`.

### Suíte server-side (principal)

```bash
npm run test:perf
```

Roda via Vitest (`tests/perf/run.test.ts`), imprime a tabela markdown no terminal e falha se `mediana > baseline × 1.25`.

### Suíte HTTP (gated)

Só executa se `PERF_BASE_URL` estiver definido. Sem ele, o script termina em exit 0 sem erro.

```bash
# 1. Inicie o servidor Next já buildado
npm run start

# 2. Em outro terminal, com o servidor rodando:
PERF_BASE_URL=http://localhost:3000 npx tsx tests/perf/http.ts

# Com autenticação (evita que o TTFB inclua o redirect para login):
PERF_BASE_URL=http://localhost:3000 \
  PERF_AUTH_COOKIE="sb-xxxx-auth-token=..." \
  npx tsx tests/perf/http.ts
```

**TTFB medido**: `performance.now()` imediatamente antes do `fetch` até o primeiro chunk do corpo (`response.body.getReader().read()`). Inclui DNS + TCP + TLS + processamento do servidor. Em rotas autenticadas sem cookie de sessão, o middleware redireciona para `/login` — o TTFB medido é então o da resposta final da cadeia de redirecionamentos que o fetch segue automaticamente.

---

## Thresholds

| Delta | Resultado |
| --- | --- |
| mediana ≤ baseline × 1.10 | **OK** |
| +10% a +25% (baseline × 1.10–1.25) | **WARN** (não falha) |
| > baseline × 1.25 | **REGRESSAO** (exit 1) |
| sem baseline | **ESTABELECER** (registra sem falhar) |
| RPC inexistente / `pular()=true` | **SKIPPED** (não falha) |

---

## Atualizar o baseline

### Localmente (sanidade apenas)

```bash
npm run test:perf:update-baseline
```

Grava `tests/perf/baseline.json` com as medianas da sua máquina. **Útil para sanidade local, mas NÃO deve ser commitado como baseline oficial** — números locais diferem do runner do CI (hardware, rede, estado do banco).

### Baseline oficial (GitHub Actions)

O baseline oficial é gerado pelo workflow `.github/workflows/perf.yml` via `workflow_dispatch` com `update_baseline=true`. Apenas esse runner produz números reproduzíveis e comparáveis entre runs. Depois de gerar, o workflow commita o `baseline.json` atualizado no repositório.

---

## Regras da suíte

- Read-only: nenhuma escrita no banco. Apenas `SELECT` e RPC de leitura.
- Os cenários chamam o **núcleo cru** de `carregar.ts` — nunca a versão envolta em `comCache`. Chamar a versão com cache tornaria as execuções 2..N próximas de 0 ms, inutilizando a medição.
- Nenhum acesso ao VHSYS (API externa).
- RLS não é alterado.
