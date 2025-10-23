import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Resolve dinamicamente a URL base da API
function resolveApiBaseUrl() {
  const DEFAULT_PORT = 4000;

  // 1) Permite override via AsyncStorage (carregado async no interceptor)
  //    Aqui só definimos um fallback síncrono, override real é aplicado no request.

  // 2) Ambiente Web: usa hostname atual e porta 4000
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:${DEFAULT_PORT}/api`;
  }

  // 3) Expo Go / Native: tenta obter IP do dev server
  const expoHost = Constants?.expoGo?.developer?.host; // ex: "192.168.0.10:19000"
  if (expoHost) {
    const hostIp = expoHost.split(':')[0];
    return `http://${hostIp}:${DEFAULT_PORT}/api`;
  }

  // 4) Fallback final
  return `http://localhost:${DEFAULT_PORT}/api`;
}

const API_BASE_URL = resolveApiBaseUrl();
export const API_URL = API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token e permitir override dinâmico de baseURL
api.interceptors.request.use(
  async (config) => {
    try {
      // Override de baseURL via AsyncStorage (opcional)
      const storedBaseUrl = await AsyncStorage.getItem('API_BASE_URL');
      if (storedBaseUrl) {
        config.baseURL = storedBaseUrl;
      }

      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Erro no request interceptor:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  async (error) => {
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    console.error('Error details:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      // Aqui você pode redirecionar para tela de login
    }
    return Promise.reject(error);
  }
);

export default api;

// Serviços específicos
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
};

export const employeeService = {
  getAll: () => api.get('/employee/list'),
  getById: (id) => api.get(`/employee/${id}`),
  create: (data) => api.post('/employee/create', data),
  update: (id, data) => api.put(`/employee/${id}`, data),
  delete: (id) => api.delete(`/employee/${id}`),
};

export const customerService = {
  getAll: () => api.get('/customer/list'),
  getById: (id) => api.get(`/customer/${id}`),
  create: (data) => api.post('/customer/create', data),
  update: (id, data) => api.put(`/customer/${id}`, data),
  delete: (id) => api.delete(`/customer/${id}`),
};

export const productService = {
  list: () => api.get('/product/list'),
  getAll: () => api.get('/product/list'),
  getById: (id) => api.get(`/product/${id}`),
  create: (data) => api.post('/product/create', data),
  update: (id, data) => api.put(`/product/${id}`, data),
  delete: (id) => api.delete(`/product/${id}`),
};

// Alias com retorno direto dos dados para compatibilidade dos componentes
export const categoryService = {
  getAll: async () => (await api.get('/categoria/list')).data,
};

export const categoriaService = {
  list: () => api.get('/categoria/list'),
};

export const tipoService = {
  list: () => api.get('/tipo/list'),
};

export const unidadeMedidaService = {
  list: () => api.get('/unidade-medida/list'),
};

export const saleService = {
  create: (data) => api.post('/sale/create', data),
  addItem: (id, item) => api.post(`/sale/${id}/item`, item),
  removeItem: (id, produtoId) => api.delete(`/sale/${id}/item/${produtoId}`),
  finalize: (id, payload) => {
    const body = typeof payload === 'string'
      ? { formaPagamento: payload }
      : payload && payload.metodoPagamento
        ? { formaPagamento: payload.metodoPagamento }
        : { formaPagamento: payload?.formaPagamento || 'dinheiro' };
    return api.put(`/sale/${id}/finalize`, body);
  },
  open: () => api.get('/sale/open'),
  list: (params) => api.get('/sale/list', { params }),
  getAll: () => api.get('/sale/list'),
  getById: (id) => api.get(`/sale/${id}`),
  getByMesa: (mesaId) => api.get(`/sale/mesa/${mesaId}`),
};

export const mesaService = {
  list: () => api.get('/mesa/list'),
  getAll: () => api.get('/mesa/list'),
  getById: (id) => api.get(`/mesa/${id}`),
  create: (data) => api.post('/mesa/create', data),
  update: (id, data) => api.put(`/mesa/${id}`, data),
  delete: (id) => api.delete(`/mesa/${id}`),
  abrir: (id, funcionarioId, nomeResponsavel, observacoes) => 
    api.post(`/mesa/${id}/abrir`, { funcionarioId, nomeResponsavel, observacoes }),
  fechar: (id) => api.post(`/mesa/${id}/fechar`),
};

export const comandaService = {
  getAll: () => api.get('/sale/list'),
  getById: (id) => api.get(`/sale/${id}`),
  create: (data) => api.post('/sale/create', { ...data, tipoVenda: 'comanda' }),
  addItem: (id, item) => {
    const produtoId = item?.produto?._id || item?.produtoId || item?._id;
    const quantidade = item?.quantidade || 1;
    return api.post(`/sale/${id}/item`, { produtoId, quantidade });
  },
  removeItem: (id, produtoId) => api.delete(`/sale/${id}/item/${produtoId}`),
  close: (id) => api.put(`/sale/${id}/finalize`, { formaPagamento: 'dinheiro' }),
  finalize: (id, payload) => saleService.finalize(id, payload),
};

// Novo serviço: Caixa
export const caixaService = {
  statusAberto: () => api.get('/caixa/status/aberto'),
  abrir: (funcionarioId, valorAbertura = 0, observacoes = '') => 
    api.post('/caixa/abrir', { funcionarioId, valorAbertura, observacoes }),
  fechar: (id, funcionarioId, valorFechamento, observacoes = '') => 
    api.put(`/caixa/${id}/fechar`, { funcionarioId, valorFechamento, observacoes }),
  registrarVenda: (vendaId, valor, formaPagamento) => 
    api.post('/caixa/registrar-venda', { vendaId, valor, formaPagamento }),
};