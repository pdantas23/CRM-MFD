export type Role = "admin" | "entregador";
export type Periodo = "manha" | "tarde";
export type StatusEntrega = "entrega_final" | "entrega_parcial";

export interface Profile {
  id: string;
  nome: string;
  role: Role;
  created_at: string;
}

export interface Entrega {
  id: string;
  data: string;
  periodo: Periodo;
  status: StatusEntrega;
  nome_cliente: string;
  cpf_cnpj: string;
  numero_orcamento: string;
  bairro: string;
  endereco: string;
  anexo_url: string | null;
  anexo_nome: string | null;
  ordem: number | null;
  created_by: string | null;
  created_at: string;
}

export interface EntregaFormData {
  data: string;
  periodo: Periodo;
  status: StatusEntrega;
  nome_cliente: string;
  cpf_cnpj: string;
  numero_orcamento: string;
  bairro: string;
  endereco: string;
  anexo?: File | null;
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nome: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          nome: string;
          role: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          nome?: string;
          role?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      entregas: {
        Row: {
          id: string;
          data: string;
          periodo: string;
          status: string;
          nome_cliente: string;
          cpf_cnpj: string;
          numero_orcamento: string;
          bairro: string;
          endereco: string;
          anexo_url: string | null;
          anexo_nome: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          data: string;
          periodo: string;
          status: string;
          nome_cliente: string;
          cpf_cnpj: string;
          numero_orcamento: string;
          bairro: string;
          endereco: string;
          anexo_url?: string | null;
          anexo_nome?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          data?: string;
          periodo?: string;
          status?: string;
          nome_cliente?: string;
          cpf_cnpj?: string;
          numero_orcamento?: string;
          bairro?: string;
          endereco?: string;
          anexo_url?: string | null;
          anexo_nome?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
