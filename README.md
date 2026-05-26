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

Copie `.env.example` para `.env.local` e preencha com as credenciais do Supabase:

```bash
cp .env.example .env.local
```

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role (secret) |

### 3. Banco de dados

Execute `supabase/setup.sql` no **Supabase SQL Editor** para criar:
- Tabela `profiles` com RLS
- Tabela `entregas` com RLS
- Bucket `anexos-entregas` com políticas de Storage
- Trigger para criar perfil automaticamente ao criar usuário

### 4. Criar primeiro usuário admin

No painel do Supabase → **Authentication → Users → Add User**, crie um usuário. Depois atualize o perfil:

```sql
UPDATE public.profiles
SET nome = 'Seu Nome', role = 'admin'
WHERE id = '<uuid-do-usuário>';
```

### 5. Rodar em desenvolvimento

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
