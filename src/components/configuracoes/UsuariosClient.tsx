"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { CoresClient } from "@/components/configuracoes/CoresClient";
import {
  criarUsuario,
  atualizarUsuario,
  excluirUsuario,
  type UsuarioRow,
  type VendedorVhsys,
} from "@/lib/usuarios/acoes";

interface Props {
  usuarios: UsuarioRow[];
  vendedores: VendedorVhsys[];
  currentUserId: string;
  /** Cor primária atual da conta ativa (hex). */
  corAtual: string;
  /** Nome da conta ativa (exibido na aba Cores). */
  nomeEmpresa: string;
  /** Slug da conta ativa (sufixo automático do nome de login). */
  slugConta: string;
}

const ROLE_OPCOES = [
  { value: "owner", label: "Owner" },
  { value: "superadmin", label: "Superadmin" },
  { value: "admin", label: "Admin" },
  { value: "vendedor", label: "Vendedor" },
  { value: "entregador", label: "Entregador" },
];

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  superadmin: "Superadmin",
  admin: "Admin",
  vendedor: "Vendedor",
  entregador: "Entregador",
};

// ── Abas ────────────────────────────────────────────────────────────────────

const ABAS = [
  { id: "usuarios", label: "Usuários" },
  { id: "cores", label: "Cores" },
] as const;
type AbaId = (typeof ABAS)[number]["id"];

// ── Ícone de olho ─────────────────────────────────────────────────────────

function IconeOlho({ visivel }: { visivel: boolean }) {
  if (visivel) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );
}

// ── Componente principal ──────────────────────────────────────────────────

export function UsuariosClient({
  usuarios,
  vendedores,
  currentUserId,
  corAtual,
  nomeEmpresa,
  slugConta,
}: Props) {
  const router = useRouter();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("usuarios");
  const [modalCriacaoAberto, setModalCriacaoAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioRow | null>(null);

  const vendedorOpcoes = vendedores.map((v) => ({
    value: String(v.id_vhsys),
    label: v.nome,
  }));

  const usuariosFiltrados = usuarios.filter((u) => u.id !== currentUserId);

  return (
    <div className="space-y-6">
      {/* Sub-navbar de abas */}
      <nav className="flex gap-1 border-b border-gray-200">
        {ABAS.map((aba) => (
          <button
            key={aba.id}
            type="button"
            onClick={() => setAbaAtiva(aba.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
              abaAtiva === aba.id
                ? "border-b-2 border-primary-600 text-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {aba.label}
          </button>
        ))}
      </nav>

      {/* Conteúdo da aba */}
      {abaAtiva === "usuarios" && (
        <>
          <TabelaUsuarios
            usuarios={usuariosFiltrados}
            currentUserId={currentUserId}
            onEditar={(u) => setUsuarioEditando(u)}
            onMutacao={() => router.refresh()}
          />
          <div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setModalCriacaoAberto(true)}
            >
              Adicionar usuário
            </button>
          </div>
        </>
      )}

      {abaAtiva === "cores" && (
        <CoresClient corAtual={corAtual} nomeEmpresa={nomeEmpresa} />
      )}

      {/* Modal de criação */}
      {modalCriacaoAberto && (
        <ModalCriacaoUsuario
          vendedorOpcoes={vendedorOpcoes}
          slugConta={slugConta}
          onSucesso={() => {
            setModalCriacaoAberto(false);
            router.refresh();
          }}
          onFechar={() => setModalCriacaoAberto(false)}
        />
      )}

      {/* Modal de edição */}
      {usuarioEditando && (
        <ModalEdicaoUsuario
          usuario={usuarioEditando}
          vendedorOpcoes={vendedorOpcoes}
          onSucesso={() => {
            setUsuarioEditando(null);
            router.refresh();
          }}
          onFechar={() => setUsuarioEditando(null)}
        />
      )}
    </div>
  );
}

// ── Modal de criação ──────────────────────────────────────────────────────

function ModalCriacaoUsuario({
  vendedorOpcoes,
  slugConta,
  onSucesso,
  onFechar,
}: {
  vendedorOpcoes: { value: string; label: string }[];
  slugConta: string;
  onSucesso: () => void;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [confirmarSenhaVisivel, setConfirmarSenhaVisivel] = useState(false);
  const [role, setRole] = useState("entregador");
  const [vendedorId, setVendedorId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const overlayRef = useRef<HTMLDivElement>(null);

  // Fechar no ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onFechar]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onFechar();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha !== confirmarSenha) {
      setErro("As senhas não conferem.");
      return;
    }

    startTransition(async () => {
      const res = await criarUsuario({
        nome,
        email,
        senha,
        role,
        vendedorId: role === "vendedor" && vendedorId ? Number(vendedorId) : null,
      });
      if (!res.ok) {
        setErro(res.erro);
        return;
      }
      onSucesso();
    });
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Novo usuário</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form
          id="form-criar-usuario"
          onSubmit={handleSubmit}
          className="flex-1 space-y-4 overflow-y-auto px-6 py-5"
        >
          {erro && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
          )}

          {/* Nome */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
            <div className="flex items-stretch">
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="input-base rounded-r-none"
                required
              />
              {slugConta && (
                <span className="inline-flex items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 font-mono text-sm text-gray-500">
                  -{slugConta}
                </span>
              )}
            </div>
            {slugConta && (
              <p className="mt-1 text-xs text-gray-500">
                O slug da conta é adicionado automaticamente — login:{" "}
                <span className="font-mono text-gray-700">{(nome.trim() || "nome")}-{slugConta}</span>
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base"
              required
            />
          </div>

          {/* Senha */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Senha</label>
            <div className="relative">
              <input
                type={senhaVisivel ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="input-base pr-10"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setSenhaVisivel((v) => !v)}
                aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
              >
                <IconeOlho visivel={senhaVisivel} />
              </button>
            </div>
          </div>

          {/* Confirmar senha */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirmar senha</label>
            <div className="relative">
              <input
                type={confirmarSenhaVisivel ? "text" : "password"}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="input-base pr-10"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setConfirmarSenhaVisivel((v) => !v)}
                aria-label={confirmarSenhaVisivel ? "Ocultar confirmação" : "Mostrar confirmação"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
              >
                <IconeOlho visivel={confirmarSenhaVisivel} />
              </button>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
            <Select
              options={ROLE_OPCOES}
              value={role}
              onChange={setRole}
              ariaLabel="Role do usuário"
            />
          </div>

          {/* Vendedor VHSYS — só quando role === "vendedor" */}
          {role === "vendedor" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Vendedor VHSYS</label>
              <Select
                options={vendedorOpcoes}
                value={vendedorId}
                onChange={setVendedorId}
                placeholder="Selecione o vendedor..."
                ariaLabel="Vendedor VHSYS"
              />
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button type="button" onClick={onFechar} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="submit"
            form="form-criar-usuario"
            disabled={pending}
            className="btn-primary"
          >
            {pending ? "Criando..." : "Criar usuário"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de edição ───────────────────────────────────────────────────────

function ModalEdicaoUsuario({
  usuario,
  vendedorOpcoes,
  onSucesso,
  onFechar,
}: {
  usuario: UsuarioRow;
  vendedorOpcoes: { value: string; label: string }[];
  onSucesso: () => void;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(usuario.nome);
  const [email, setEmail] = useState(usuario.email);
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [confirmarSenhaVisivel, setConfirmarSenhaVisivel] = useState(false);
  const [role, setRole] = useState(usuario.role);
  const [vendedorId, setVendedorId] = useState(
    usuario.vendedorId != null ? String(usuario.vendedorId) : ""
  );
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const overlayRef = useRef<HTMLDivElement>(null);

  // Fechar no ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onFechar]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onFechar();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha && senha !== confirmarSenha) {
      setErro("As senhas não conferem.");
      return;
    }

    startTransition(async () => {
      const res = await atualizarUsuario(usuario.id, {
        nome,
        email,
        senha: senha || undefined,
        role,
        vendedorId: role === "vendedor" && vendedorId ? Number(vendedorId) : null,
      });
      if (!res.ok) {
        setErro(res.erro);
        return;
      }
      onSucesso();
    });
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Editar usuário</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form
          id="form-editar-usuario"
          onSubmit={handleSubmit}
          className="flex-1 space-y-4 overflow-y-auto px-6 py-5"
        >
          {erro && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
          )}

          {/* Nome */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="input-base"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base"
              required
            />
          </div>

          {/* Senha nova (opcional) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Senha nova</label>
            <div className="relative">
              <input
                type={senhaVisivel ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="input-base pr-10"
                placeholder="Deixe em branco para manter"
                minLength={senha ? 6 : undefined}
              />
              <button
                type="button"
                onClick={() => setSenhaVisivel((v) => !v)}
                aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
              >
                <IconeOlho visivel={senhaVisivel} />
              </button>
            </div>
          </div>

          {/* Confirmar senha nova */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirmar senha nova</label>
            <div className="relative">
              <input
                type={confirmarSenhaVisivel ? "text" : "password"}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="input-base pr-10"
                placeholder="Deixe em branco para manter"
                minLength={confirmarSenha ? 6 : undefined}
              />
              <button
                type="button"
                onClick={() => setConfirmarSenhaVisivel((v) => !v)}
                aria-label={confirmarSenhaVisivel ? "Ocultar confirmação" : "Mostrar confirmação"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
              >
                <IconeOlho visivel={confirmarSenhaVisivel} />
              </button>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
            <Select
              options={ROLE_OPCOES}
              value={role}
              onChange={setRole}
              ariaLabel="Role do usuário"
            />
          </div>

          {/* Vendedor VHSYS — só quando role === "vendedor" */}
          {role === "vendedor" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Vendedor VHSYS</label>
              <Select
                options={vendedorOpcoes}
                value={vendedorId}
                onChange={setVendedorId}
                placeholder="Selecione o vendedor..."
                ariaLabel="Vendedor VHSYS"
              />
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button type="button" onClick={onFechar} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="submit"
            form="form-editar-usuario"
            disabled={pending}
            className="btn-primary"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tabela de usuários ───────────────────────────────────────────────────────

function TabelaUsuarios({
  usuarios,
  currentUserId,
  onEditar,
  onMutacao,
}: {
  usuarios: UsuarioRow[];
  currentUserId: string;
  onEditar: (u: UsuarioRow) => void;
  onMutacao: () => void;
}) {
  if (usuarios.length === 0) {
    return (
      <div className="card px-6 py-16 text-center text-sm text-gray-500">
        Nenhum usuário encontrado.
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nome</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {usuarios.map((u) => (
            <LinhaUsuario
              key={u.id}
              usuario={u}
              isSelf={u.id === currentUserId}
              onEditar={onEditar}
              onMutacao={onMutacao}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LinhaUsuario({
  usuario,
  isSelf,
  onEditar,
  onMutacao,
}: {
  usuario: UsuarioRow;
  isSelf: boolean;
  onEditar: (u: UsuarioRow) => void;
  onMutacao: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [pending, startTransition] = useTransition();

  function excluir() {
    setErro(null);
    startTransition(async () => {
      const res = await excluirUsuario(usuario.id);
      if (!res.ok) {
        setErro(res.erro);
        setConfirmar(false);
        return;
      }
      onMutacao();
    });
  }

  return (
    <tr>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{usuario.nome}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{usuario.email || "—"}</td>
      <td className="px-4 py-3 text-sm text-gray-700">
        {ROLE_LABEL[usuario.role] ?? usuario.role}
        {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onEditar(usuario)}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Editar
          </button>
          {!isSelf &&
            (confirmar ? (
              <>
                <button onClick={excluir} disabled={pending} className="btn-danger text-xs px-3 py-1.5">
                  {pending ? "Excluindo..." : "Confirmar"}
                </button>
                <button
                  onClick={() => setConfirmar(false)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmar(true)}
                className="btn-danger text-xs px-3 py-1.5"
              >
                Excluir
              </button>
            ))}
        </div>
      </td>
    </tr>
  );
}
