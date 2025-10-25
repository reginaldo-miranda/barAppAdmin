import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getSecureItem, STORAGE_KEYS } from './storage';

// Hosts locais que devem ser evitados em produção/dispositivos móveis
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

const getEnvBaseUrl = () => {
  try {
    return typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_URL : undefined;
  } catch {
    return undefined;
  }
};

// Helper para detectar URLs locais inválidas em dispositivos
function isLocalUrl(url) {
  try {
    const u = new URL(String(url));
    return LOCAL_HOSTNAMES.has(u.hostname);
  } catch {
    return false;
  }
}

// Resolve dinamicamente a URL base da API
function resolveApiBaseUrl() {
  const DEFAULT_PORT = 4000;

  // Prioridade absoluta para variável de ambiente, se existir
  const ENV_URL = getEnvBaseUrl();
  if (ENV_URL) return ENV_URL;

  // Ambiente Web
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    // Sempre apontar para a API do backend na porta 4000, mesmo em localhost
    return `http://${hostname}:${DEFAULT_PORT}/api`;
  }

  // Expo Go / Native: múltiplos fallbacks
  const expoHost = Constants?.expoGo?.developer?.host;
  const manifestHost = Constants?.manifest?.debuggerHost;
  const configHostUri = Constants?.expoConfig?.hostUri;
  const hostCandidates = [expoHost, manifestHost, configHostUri].filter(Boolean);

  for (const h of hostCandidates) {
    const hostPart = String(h).split(':')[0];
    if (hostPart && !LOCAL_HOSTNAMES.has(hostPart)) {
      return `http://${hostPart}:${DEFAULT_PORT}/api`;
    }
  }

  // Fallback final: manter vazio para evitar localhost/127.0.0.1
  return '';
}

// Primeiro: variável de ambiente pública
const ENV_BASE_URL = getEnvBaseUrl();

// Segundo: override salvo em storage
let initialBaseUrl = ENV_BASE_URL || resolveApiBaseUrl();

const api = axios.create({
  baseURL: initialBaseUrl || '',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor para adicionar token e permitir override dinâmico de baseURL
api.interceptors.request.use(
  async (config) => {
    try {
      // Override de baseURL via AsyncStorage (opcional)
      const storedBaseUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_BASE_URL);
      if (storedBaseUrl) {
        if (isLocalUrl(storedBaseUrl)) {
          // Remove override inválido para evitar regressão a localhost/127.0.0.1
          await AsyncStorage.removeItem(STORAGE_KEYS.API_BASE_URL);
        } else {
          config.baseURL = storedBaseUrl;
        }
      } else if (ENV_BASE_URL) {
        config.baseURL = ENV_BASE_URL;
      }

      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const apiKey = await getSecureItem(STORAGE_KEYS.API_AUTH_KEY);
      if (apiKey) {
        config.headers['X-API-Key'] = apiKey;
      }
    } catch (error) {
      console.error('Erro no request interceptor:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Inicialização assíncrona para aplicar override salvo assim que o app inicia
(async () => {
  try {
    const storedBaseUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_BASE_URL);
    if (storedBaseUrl) {
      if (isLocalUrl(storedBaseUrl)) {
        // Limpa override local inválido e aplica ENV se disponível
        await AsyncStorage.removeItem(STORAGE_KEYS.API_BASE_URL);
        if (ENV_BASE_URL) {
          initialBaseUrl = ENV_BASE_URL;
          api.defaults.baseURL = ENV_BASE_URL;
        }
      } else {
        initialBaseUrl = storedBaseUrl;
        api.defaults.baseURL = storedBaseUrl;
      }
    } else if (ENV_BASE_URL) {
      initialBaseUrl = ENV_BASE_URL;
      api.defaults.baseURL = ENV_BASE_URL;
    }
  } catch {
    // silencioso
  }
})();

// Helper: persistir override no storage (para ajustes via tela de Configurações)
export async function setApiBaseUrl(url) {
  await AsyncStorage.setItem(STORAGE_KEYS.API_BASE_URL, url);
  initialBaseUrl = url;
  api.defaults.baseURL = url;
}

// Adicionado: função de teste de conexão da API usada pela tela de Configurações
export async function testApiConnection(baseUrl, apiKey) {
  try {
    const baseCandidate = baseUrl || ENV_BASE_URL || initialBaseUrl || '';
    const effectiveBase = String(baseCandidate).replace(/\/$/, '');
    const url = `${effectiveBase}/tipo/list`;
    const res = await axios.get(url, {
      timeout: 7000,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      },
    });
    return { ok: true, status: res.status };
  } catch (error) {
    const status = error?.response?.status ?? 0;
    const reason = error?.response?.data ?? error?.message ?? 'Erro desconhecido';
    return { ok: false, status, reason };
  }
}

export const API_URL = initialBaseUrl;
export default api;

// Serviços específicos (restaurados)
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

export const caixaService = {
  statusAberto: () => api.get('/caixa/status/aberto'),
  abrir: (funcionarioId, valorAbertura = 0, observacoes = '') => 
    api.post('/caixa/abrir', { funcionarioId, valorAbertura, observacoes }),
  fechar: (id, funcionarioId, valorFechamento, observacoes = '') => 
    api.put(`/caixa/${id}/fechar`, { funcionarioId, valorFechamento, observacoes }),
  registrarVenda: (vendaId, valor, formaPagamento) => 
    api.post('/caixa/registrar-venda', { vendaId, valor, formaPagamento }),
};