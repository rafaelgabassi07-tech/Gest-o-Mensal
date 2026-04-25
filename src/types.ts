import React from "react";

export type TipoTransacao = "receita" | "despesa";

export interface Transacao {
  id: string;
  tipo: TipoTransacao;
  categoria: string;
  valor: number;
  data: string;
  descricao: string;
  custoFixo?: boolean;
  tags?: string[];
  versao?: string;
}

export interface Categoria {
  id: string;
  nome: string;
  icone: React.ElementType;
}

export interface SemanaAgrupada {
  id: string;
  label: string;
  transacoes: Transacao[];
  receitas: number;
  despesas: number;
  lucro: number;
}

export interface UserProfile {
  nome: string;
  profissao: string;
  metaMensal: number;
  primeiroAcesso: boolean;
}
