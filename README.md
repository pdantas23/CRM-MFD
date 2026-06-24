# Sistema de Gestão de Entregas

Sistema interno para registro e acompanhamento de entregas.

## Stack

- Next.js 14 (App Router) + TypeScript strict
- Tailwind CSS
- Supabase (Auth, PostgreSQL, Storage)
- Deploy: Vercel

## Setup local

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha. O arquivo `.env.example` é o
guia completo de onboarding — cada variável tem um comentário explicativo.

```bash
cp .env.example .env.local
```

Blocos principais:
- **Bootstrap** (únicos da app): Supabase (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`), `CRON_SECRET`,
  `APP_MASTER_KEY` (cifra as credenciais VHSYS), `APP_NAME`, `APP_USER_AGENT`.
- **Por conta VHSYS** (`VHSYS_ACCOUNT_<N>_*`): slug, tokens, base e
  `THEME_COLOR` (cor do tema). Replique para cada conta (caso de uso: 2 CNPJs).

`APP_MASTER_KEY`: gere com `openssl rand -base64 32` (32 bytes). É a chave que
cifra/decifra os tokens VHSYS guardados na tabela `accounts` — não a perca.

### 3. Banco de dados

Execute as migrations do diretório `supabase/migrations/` **em ordem numérica**
no **Supabase SQL Editor** (todas são idempotentes — podem rerodar sem efeito
colateral). Isso cria: `profiles`, `entregas`, espelho VHSYS, tabela `accounts`
(multi-conta), `conta_id` + RLS por conta e as RPCs de métricas.

### 4. Semear as contas VHSYS

Com as variáveis `VHSYS_ACCOUNT_<N>_*` preenchidas, popule a tabela `accounts`
(tokens cifrados) e cacheie o nome da empresa (buscado do VHSYS):

```bash
npx tsx scripts/seed-accounts.ts
```

Pull inicial do espelho de uma conta:

```bash
npx tsx scripts/vhsys-pull-inicial.ts <slug-da-conta> completo
```

### 5. Criar primeiro usuário admin

No painel do Supabase → **Authentication → Users → Add User**, crie um usuário. Depois atualize o perfil:

```sql
UPDATE public.profiles
SET nome = 'Seu Nome', role = 'admin'
WHERE id = '<uuid-do-usuário>';
-- conta_id NULL = acesso a todas as contas; defina uma conta p/ fixar o acesso.
```

### 6. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## Deploy na Vercel

1. Push para GitHub
2. Importe o repositório na Vercel
3. Configure as variáveis de ambiente (as mesmas do `.env.local`)
4. Deploy automático

---

## Permissões por role

| Ação | Admin | Entregador |
|---|---|---|
| Ver entregas | ✅ | ✅ |
| Criar entrega | ✅ | ❌ |
| Editar entrega | ✅ | ❌ |
| Excluir entrega | ✅ | ❌ |
| Upload anexo | ✅ | ❌ |
