-- ============================================================
-- RLS POR VENDEDOR — VISIBILIDADE RESTRITIVA
--
-- PRÉ-REQUISITO: roles_vendedor.sql já aplicado.
--   - role 'vendedor' válida na constraint de profiles
--   - coluna profiles.vendedor_id (FK → vhsys_vendedores.id_vhsys)
--   - função public.vendedor_id_do_usuario(uid uuid) → bigint
--
-- COMO RODAR: cole tudo no Supabase SQL Editor e execute.
-- Seguro para re-execução (DROP … IF EXISTS antes de cada CREATE).
--
-- GUARDRAIL ANTI-LOCKOUT: admin nunca perde acesso; as policies
-- de admin existentes no setup.sql são PRESERVADAS (este arquivo
-- adiciona políticas por role, não as substitui).
-- ============================================================


-- ============================================================
-- BLOCO 1: vhsys_orcamentos
-- Admin e entregador: leitura de tudo (política aberta existente
-- "Autenticados leem orcamentos" permanece intacta).
-- Vendedor: substitui o "tudo" pela visão filtrada.
-- ============================================================

-- Substitui política aberta por política restritiva que cobre
-- admin/entregador com tudo E vendedor apenas com os próprios.
-- Estratégia: dropar a política aberta e criar duas separadas.

DROP POLICY IF EXISTS "Autenticados leem orcamentos" ON public.vhsys_orcamentos;

DROP POLICY IF EXISTS "Admin e entregador leem todos orcamentos" ON public.vhsys_orcamentos;
CREATE POLICY "Admin e entregador leem todos orcamentos"
  ON public.vhsys_orcamentos FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'entregador')
    )
  );

DROP POLICY IF EXISTS "Vendedor le apenas seus orcamentos" ON public.vhsys_orcamentos;
CREATE POLICY "Vendedor le apenas seus orcamentos"
  ON public.vhsys_orcamentos FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'vendedor'
    )
    AND vendedor_id_vhsys = public.vendedor_id_do_usuario(auth.uid())
  );


-- ============================================================
-- BLOCO 2: vhsys_pedidos
-- Entregador continua vendo todos (precisa para entregas).
-- Vendedor: apenas pedidos do próprio vendedor_id_vhsys.
-- ============================================================

DROP POLICY IF EXISTS "Autenticados leem pedidos" ON public.vhsys_pedidos;

DROP POLICY IF EXISTS "Admin e entregador leem todos pedidos" ON public.vhsys_pedidos;
CREATE POLICY "Admin e entregador leem todos pedidos"
  ON public.vhsys_pedidos FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'entregador')
    )
  );

DROP POLICY IF EXISTS "Vendedor le apenas seus pedidos" ON public.vhsys_pedidos;
CREATE POLICY "Vendedor le apenas seus pedidos"
  ON public.vhsys_pedidos FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'vendedor'
    )
    AND vendedor_id_vhsys = public.vendedor_id_do_usuario(auth.uid())
  );


-- ============================================================
-- BLOCO 3: entregas
-- As policies de setup.sql (insert/update/delete apenas admin)
-- são PRESERVADAS — aqui só alteramos o SELECT.
-- Admin e entregador: tudo (mantém comportamento atual).
-- Vendedor: somente entregas vinculadas a pedidos do seu
-- vendedor_id OU criadas pelo próprio usuário (created_by).
-- ============================================================

-- Drop da política aberta existente
DROP POLICY IF EXISTS "Todos autenticados podem ver" ON public.entregas;

DROP POLICY IF EXISTS "Admin e entregador veem todas entregas" ON public.entregas;
CREATE POLICY "Admin e entregador veem todas entregas"
  ON public.entregas FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'entregador')
    )
  );

DROP POLICY IF EXISTS "Vendedor ve entregas do seu vendedor ou criadas por ele" ON public.entregas;
CREATE POLICY "Vendedor ve entregas do seu vendedor ou criadas por ele"
  ON public.entregas FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'vendedor'
    )
    AND (
      -- Entrega vinculada a pedido do mesmo vendedor
      pedido_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.vhsys_pedidos p
        WHERE p.id = entregas.pedido_id
          AND p.vendedor_id_vhsys = public.vendedor_id_do_usuario(auth.uid())
      )
      OR
      -- Entrega criada diretamente pelo vendedor (sem vínculo de pedido)
      created_by = auth.uid()
    )
  );


-- ============================================================
-- BLOCO 4: tabelas espelho catalogos (read-only para todos)
-- Sem mudança — qualquer autenticado pode ler produtos, clientes,
-- vendedores, situações, contas a receber e NFs.
-- As políticas existentes já cobrem isso.
-- Mantidas intactas propositalmente.
-- ============================================================

-- vhsys_situacoes: policy "Autenticados leem situacoes" permanece.
-- vhsys_contas_receber: policy "Autenticados leem contas receber" permanece.
-- vhsys_vendedores, vhsys_produtos, vhsys_clientes (catalogos): sem mudança.
-- vhsys_notas_fiscais (se existir): sem mudança.

-- ============================================================
-- FIM — rodar no SQL Editor do Supabase
-- ============================================================
