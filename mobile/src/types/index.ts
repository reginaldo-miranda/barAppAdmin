import { Ionicons } from '@expo/vector-icons';

export interface CartItem {
  _id: string;
  produto: {
    _id: string;
    nome: string;
    preco: number;
  };
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  observacoes?: string;
}

export interface Sale {
  _id: string;
  status: 'aberta' | 'fechada' | 'cancelada';
  itens: CartItem[];
  observacoes?: string;
  total: number;
}

export interface Product {
  _id: string;
  nome: string;
  descricao: string;
  precoVenda: number;
  categoria: string;
  ativo: boolean;
  disponivel: boolean;
}

export interface PaymentMethod {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export interface Comanda {
  _id: string;
  numeroComanda?: string;
  nomeComanda?: string;
  cliente?: {
    _id: string;
    nome: string;
    fone?: string;
    email?: string;
  };
  customerId?: string;
  funcionario: {
    _id: string;
    nome: string;
  };
  status: 'aberta' | 'fechada' | 'cancelada';
  total: number;
  itens: CartItem[];
  observacoes?: string;
  tipoVenda: string;
  createdAt: string;
  updatedAt: string;
}