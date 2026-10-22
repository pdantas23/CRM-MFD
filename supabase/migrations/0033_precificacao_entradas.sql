-- ============================================================
-- PRECIFICAÇÃO ← NOTAS DE ENTRADA (2026-10-22)
--
-- O cron de sync passa a ler as entradas de mercadoria (notas de compra) do
-- VHSYS e, para cada produto da nota, atualiza na aba Produtos a última compra
-- e o preço de custo (valor unitário da nota). Quando a unidade da nota difere
-- da unidade do cadastro (ex.: caixa × unidade), só a data é atualizada e o
-- motivo fica em aviso_compra.
--
-- Cursor por conta: entradas_ultimo_id = maior id_entrada já aplicado. Na
-- primeira execução o cursor só é posicionado (as notas antigas já vieram da
-- planilha na carga inicial e NÃO são reaplicadas).
--
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

alter table public.precificacao_produtos
  add column if not exists aviso_compra text;

alter table public.precificacao_config
  add column if not exists entradas_ultimo_id bigint,
  add column if not exists entradas_verificado_em timestamptz;
