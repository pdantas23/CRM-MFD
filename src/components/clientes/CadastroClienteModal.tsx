"use client";
// Modal de cadastro rápido de cliente — cria no VHSYS e devolve { id_vhsys, razao }.
// Buscas auxiliares: CNPJ (BrasilAPI) e CEP (ViaCEP) preenchem os campos.

import { useState, useTransition } from "react";
import { criarCliente } from "@/lib/vhsys/acoes-clientes";
import type { PayloadCriarCliente } from "@/lib/vhsys/types";

interface Props {
  onClose: () => void;
  onCriado: (cliente: { id_vhsys: number; razao: string }) => void;
}

// 27 UFs brasileiras
const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

// Ícone de lupa (heroicons — magnifying glass)
function IconeLupa() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

export function CadastroClienteModal({ onClose, onCriado }: Props) {
  const [tipoPessoa, setTipoPessoa] = useState<"PJ" | "PF">("PJ");
  const [cnpj, setCnpj] = useState("");
  const [inscEstadual, setInscEstadual] = useState("");
  const [razao, setRazao] = useState("");
  const [fantasia, setFantasia] = useState("");
  const [celular, setCelular] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [complemento, setComplemento] = useState("");
  const [dataNascimento, setDataNascimento] = useState(""); // só PF

  const [erro, setErro] = useState<string | null>(null);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function buscarCnpj() {
    setErro(null);
    const digitos = cnpj.replace(/\D/g, "");
    if (digitos.length !== 14) {
      setErro("Informe um CNPJ com 14 dígitos.");
      return;
    }
    setBuscandoCnpj(true);
    try {
      const res = await fetch(`/api/buscar-cnpj?cnpj=${digitos}`, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) {
        setErro(d.erro ?? "Erro ao consultar CNPJ.");
        return;
      }
      // Só sobrescreve com o que vier preenchido.
      if (d.razao) setRazao(d.razao);
      if (d.fantasia) setFantasia(d.fantasia);
      if (d.cep) setCep(d.cep);
      if (d.endereco) setEndereco(d.endereco);
      if (d.numero) setNumero(d.numero);
      if (d.bairro) setBairro(d.bairro);
      if (d.cidade) setCidade(d.cidade);
      if (d.uf) setUf(d.uf);
      if (d.telefone) setTelefone(d.telefone);
      if (d.email) setEmail(d.email);
    } catch {
      setErro("Erro ao consultar CNPJ.");
    } finally {
      setBuscandoCnpj(false);
    }
  }

  async function buscarCep() {
    setErro(null);
    const digitos = cep.replace(/\D/g, "");
    if (digitos.length !== 8) {
      setErro("Informe um CEP com 8 dígitos.");
      return;
    }
    setBuscandoCep(true);
    try {
      const res = await fetch(`/api/buscar-cep?cep=${digitos}`, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) {
        setErro(d.erro ?? "Erro ao consultar CEP.");
        return;
      }
      if (d.endereco) setEndereco(d.endereco);
      if (d.bairro) setBairro(d.bairro);
      if (d.cidade) setCidade(d.cidade);
      if (d.uf) setUf(d.uf);
      if (d.complemento) setComplemento(d.complemento);
    } catch {
      setErro("Erro ao consultar CEP.");
    } finally {
      setBuscandoCep(false);
    }
  }

  function handleSalvar() {
    setErro(null);
    if (!razao.trim()) {
      setErro("Informe a razão social.");
      return;
    }

    const payload: PayloadCriarCliente = {
      razao_cliente: razao.trim(),
      tipo_pessoa: tipoPessoa,
      ...(cnpj.trim() ? { cnpj_cliente: cnpj.trim() } : {}),
      // Campos exclusivos de PJ
      ...(tipoPessoa === "PJ" && inscEstadual.trim() ? { insc_estadual_cliente: inscEstadual.trim() } : {}),
      ...(tipoPessoa === "PJ" && fantasia.trim() ? { fantasia_cliente: fantasia.trim() } : {}),
      // Campo exclusivo de PF
      ...(tipoPessoa === "PF" && dataNascimento.trim() ? { data_nasc_cliente: dataNascimento.trim() } : {}),
      ...(celular.trim() ? { celular_cliente: celular.trim() } : {}),
      ...(telefone.trim() ? { fone_cliente: telefone.trim() } : {}),
      ...(email.trim() ? { email_cliente: email.trim() } : {}),
      ...(cep.trim() ? { cep_cliente: cep.trim() } : {}),
      ...(endereco.trim() ? { endereco_cliente: endereco.trim() } : {}),
      ...(numero.trim() ? { numero_cliente: numero.trim() } : {}),
      ...(bairro.trim() ? { bairro_cliente: bairro.trim() } : {}),
      ...(cidade.trim() ? { cidade_cliente: cidade.trim() } : {}),
      ...(uf.trim() ? { uf_cliente: uf.trim() } : {}),
      ...(complemento.trim() ? { complemento_cliente: complemento.trim() } : {}),
    };

    startTransition(async () => {
      const res = await criarCliente(payload);
      if (!res.ok) {
        setErro(res.erro ?? "Erro ao cadastrar cliente.");
        return;
      }
      onCriado(res.cliente!);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Cadastro de cliente</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Corpo */}
        <div className="max-h-[80vh] overflow-y-auto px-6 py-4 space-y-4">
          {/* Linha 1: Tipo de pessoa, CNPJ + lupa, Inscrição Estadual */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de pessoa</label>
              <select
                value={tipoPessoa}
                onChange={(e) => setTipoPessoa(e.target.value as "PJ" | "PF")}
                className="input-base w-full"
              >
                <option value="PJ">Jurídica</option>
                <option value="PF">Física</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {tipoPessoa === "PF" ? "CPF" : "CNPJ"}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="input-base w-full"
                />
                {/* Busca automática só existe para CNPJ (BrasilAPI); CPF não tem consulta pública. */}
                {tipoPessoa === "PJ" && (
                  <button
                    type="button"
                    onClick={buscarCnpj}
                    disabled={buscandoCnpj}
                    className="rounded-md bg-blue-600 px-3 text-white hover:bg-blue-700 disabled:opacity-50"
                    title="Buscar dados do CNPJ"
                    aria-label="Buscar dados do CNPJ"
                  >
                    <IconeLupa />
                  </button>
                )}
              </div>
            </div>
            {/* Inscrição Estadual é exclusiva de Pessoa Jurídica. */}
            {tipoPessoa === "PJ" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Inscrição Estadual</label>
                <input
                  type="text"
                  value={inscEstadual}
                  onChange={(e) => setInscEstadual(e.target.value)}
                  className="input-base w-full"
                />
              </div>
            )}
          </div>

          {/* Linha 2: PJ → Razão social + Nome fantasia; PF → Nome + Data de nascimento */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {tipoPessoa === "PF" ? "Nome" : "Razão social"} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={razao}
                onChange={(e) => setRazao(e.target.value)}
                className="input-base w-full"
              />
            </div>
            {tipoPessoa === "PJ" ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nome fantasia</label>
                <input
                  type="text"
                  value={fantasia}
                  onChange={(e) => setFantasia(e.target.value)}
                  className="input-base w-full"
                />
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Data de nascimento</label>
                <input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="input-base w-full"
                />
              </div>
            )}
          </div>

          {/* Linha 3: Celular, Telefone, E-mail */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Celular</label>
              <input
                type="text"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                className="input-base w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="input-base w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base w-full"
              />
            </div>
          </div>

          {/* Bloco endereço */}
          <div className="rounded-lg border border-dashed border-gray-300 p-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">CEP</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    className="input-base w-full"
                  />
                  <button
                    type="button"
                    onClick={buscarCep}
                    disabled={buscandoCep}
                    className="rounded-md bg-blue-600 px-3 text-white hover:bg-blue-700 disabled:opacity-50"
                    title="Buscar endereço pelo CEP"
                    aria-label="Buscar endereço pelo CEP"
                  >
                    <IconeLupa />
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Endereço</label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="input-base w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Número</label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="input-base w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Bairro</label>
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className="input-base w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Cidade</label>
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="input-base w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
                <select
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                  className="input-base w-full"
                >
                  <option value="">Selecione</option>
                  {UFS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Complemento</label>
              <input
                type="text"
                value={complemento}
                onChange={(e) => setComplemento(e.target.value)}
                className="input-base w-full"
              />
            </div>
          </div>

          {erro && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={isPending}
            className="btn-primary disabled:opacity-50"
          >
            {isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
