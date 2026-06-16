# Instrumentação de Cold Start — `[perf-boot]`

## Como filtrar nos Runtime Logs da Vercel

Na aba **Logs** do projeto na Vercel, use o filtro de texto:

```
[perf-boot]
```

Ou via Vercel CLI:

```bash
vercel logs --follow | grep '\[perf-boot\]'
```

---

## Formato da linha de log

```
[perf-boot] heat=<cold|warm> reqN=<N> rt=<edge|node> path=<pathname> <timings> <extras> total=<T>ms
```

### Campos

| Campo | Valores | Significado |
|---|---|---|
| `heat` | `cold` / `warm` | `cold` = 1ª request nesta instância lambda/edge (cold start). `warm` = instância já aquecida. |
| `reqN` | inteiro ≥ 1 | Número sequencial de requests **dentro desta instância**. `reqN=1` confirma cold start. |
| `rt` | `edge` / `node` | Runtime onde o log foi emitido. Middleware roda em `edge`; layout/page rodam em `node`. |
| `path` | string | Pathname da URL no momento da medição. |
| `total` | `Nms` | Latência total desde o início do handler até emitir o log. |

### Timings específicos por ponto

| `source` | Timing(s) medidos | O que representam |
|---|---|---|
| `middleware` | `getUser=Nms` | Roundtrip ao Supabase Auth para validar o token JWT. Está em edge; aparece em **toda** request. |
| `layout` | `getSessaoComProfile=Nms` | Tempo total de `getSessaoComProfile()` visto pelo layout. Se houver HIT no process-cache, este tempo é ~0 ms (a linha `sessao=HIT` do `sessao` confirma). |
| `sessao` (inline) | `supabaseMs=Nms` | Emitido diretamente de `getSessaoComProfile`; indica MISS (roundtrip real ao Supabase). Linha: `[perf-boot] sessao=MISS supabaseMs=Nms source=sessao` |
| `sessao` HIT (inline) | — | `[perf-boot] sessao=HIT cacheMs=0ms source=sessao` — zero roundtrip, servido do process-cache de 5 s. |
| `orcamentos/novo` | `vendedores=Nms ultimoOrc=Nms` | Cada query Supabase **sequencial** medida individualmente. |
| `login` | `signIn=Nms` | Duração do `signInWithPassword`. Inclui `result=ok` ou `result=erro`. |

---

## Roteiro de captura

### (a) Cold start — middleware/edge

1. Deixe o site ocioso por **≥ 15 minutos** (lambda hiberna).
2. Abra os Runtime Logs da Vercel com filtro `[perf-boot]`.
3. Acesse `/login` no navegador (sem estar logado).
4. Observe a linha do middleware:
   ```
   [perf-boot] heat=cold reqN=1 rt=edge path=/login getUser=Nms source=middleware total=Nms
   ```
   - `heat=cold` + `reqN=1` confirmam cold start.
   - `getUser` mede o roundtrip ao Auth — em cold start costuma ser mais alto (lambda acabou de bootar).

### (b) Roundtrips autenticados — layout + página

5. Faça login normalmente. Observe:
   ```
   [perf-boot] heat=<cold|warm> reqN=N rt=node path=/api/auth/login signIn=Nms source=login result=ok total=Nms
   ```
6. Clique em **"Criar orçamento"** (navega para `/orcamentos/novo`). Observe **em ordem**:
   - Linha do middleware (edge): `getUser=Nms`
   - Linha do sessao (node): `sessao=MISS supabaseMs=Nms` (1ª vez após login) ou `sessao=HIT` (≤ 5 s depois)
   - Linha do layout (node): `getSessaoComProfile=Nms`
   - Linha da page (node): `vendedores=Nms ultimoOrc=Nms`

### (c) Comparação cold vs warm

- **1ª navegação (cold):** `heat=cold reqN=1` — todo o bootstrap da instância está incluído na latência. `getUser` tende a ser ≥ 200 ms.
- **2ª navegação (warm, mesma instância):** `heat=warm reqN=2` — instância já aquecida. `getUser` tende a ser < 100 ms. Se ≤ 5 s desde a 1ª request autenticada, `sessao=HIT` significa **zero** roundtrip para getUser/profile.

### Conclusão de análise

- Se `total` do middleware é alto mas `getUser` é baixo → overhead de boot da instância edge.
- Se `getUser` é alto → latência de rede até o Supabase Auth (pode indicar região do edge worker distante).
- Se `sessao=HIT` aparece → process-cache funcionando; `getSessaoComProfile` no layout é praticamente gratuito.
- Se `vendedores` + `ultimoOrc` são altos individualmente → queries sequenciais; candidatas a paralelização futura.

---

## Remoção

Estes logs são temporários (diagnóstico de cold start). Quando não forem mais necessários, remover:
- `src/lib/perf/boot.ts` (arquivo inteiro)
- Imports e chamadas de `iniciarRequest`, `medir`, `emitirLog` nos 5 arquivos instrumentados
- As duas linhas `console.log("[perf-boot] sessao=…")` em `src/lib/auth/sessao.ts`
- Este arquivo de documentação
