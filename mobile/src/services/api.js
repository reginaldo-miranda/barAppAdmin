import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuração base da API
const API_BASE_URL = 'http://127.0.0.1:4000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Erro ao recuperar token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
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

export const productService = {
  getAll: () => api.get('/product/list'),
  getById: (id) => api.get(`/product/${id}`),
  getByCategory: (category) => api.get(`/product/category/${category}`),
  create: (data) => api.post('/product/create', data),
  update: (id, data) => api.put(`/product/${id}`, data),
  delete: (id) => api.delete(`/product/${id}`),
};

export const mesaService = {
  getAll: () => api.get('/mesa/list'),
  getById: (id) => api.get(`/mesa/${id}`),
  create: (data) => api.post('/mesa/create', data),
  update: (id, data) => api.put(`/mesa/${id}`, data),
  abrir: (id, funcionarioId, nomeResponsavel, observacoes) => api.post(`/mesa/${id}/abrir`, { funcionarioId, nomeResponsavel, observacoes }),
  fechar: (id) => api.post(`/mesa/${id}/fechar`),
};

export const saleService = {
  getAll: () => api.get('/sale/list'),
  getOpen: () => api.get('/sale/open'),
  getById: (id) => api.get(`/sale/${id}`),
  getByMesa: (mesaId) => api.get(`/sale/mesa/${mesaId}`),
  create: (data) => api.post('/sale/create', data),
  addItem: (id, item) => api.post(`/sale/${id}/item`, item),
  removeItem: (id, itemId) => api.delete(`/sale/${id}/item/${itemId}`),
  updateItem: (id, itemId, data) => api.put(`/sale/${id}/item/${itemId}`, data),
  applyDiscount: (id, discount) => api.put(`/sale/${id}/discount`, { desconto: discount }),
  finalize: (id, formaPagamento) => api.put(`/sale/${id}/finalize`, { formaPagamento }),
  cancel: (id) => api.put(`/sale/${id}/cancel`),
};

export const customerService = {
  getAll: () => api.get('/customer/list'),
  getById: (id) => api.get(`/customer/${id}`),
  create: (data) => api.post('/customer/create', data),
  update: (id, data) => api.put(`/customer/${id}`, data),
  delete: (id) => api.delete(`/customer/${id}`),
};

export const productGroupService = {
  getAll: () => api.get('/product-group/list'),
  getById: (id) => api.get(`/product-group/${id}`),
  create: (data) => api.post('/product-group/create', data),
  update: (id, data) => api.put(`/product-group/update/${id}`, data),
  delete: (id) => api.delete(`/product-group/delete/${id}`),
};

export const comandaService = {
  getAll: () => api.get('/sale/list'),
  getOpen: () => api.get('/sale/open'),
  getById: (id) => api.get(`/sale/${id}`),
  getByCustomer: (customerId) => api.get(`/sale/list?cliente=${customerId}`),
  create: (data) => api.post('/sale/create', {
    funcionario: data.funcionario || '68bf331631cb3776a24a2dbe', // ID do João Silva
    cliente: data.cliente,
    tipoVenda: 'comanda',
    nomeComanda: data.nomeComanda,
    observacoes: data.observacoes
  }),
  addItem: (id, item) => api.post(`/sale/${id}/item`, {
    produtoId: item.produto._id,
    quantidade: item.quantidade
  }),
  removeItem: (id, produtoId) => api.delete(`/sale/${id}/item/${produtoId}`),
  updateItem: (id, produtoId, data) => api.put(`/sale/${id}/item/${produtoId}`, data),
  applyDiscount: (id, discount) => api.put(`/sale/${id}/discount`, { desconto: discount }),
  finalize: (id, formaPagamento) => api.put(`/sale/${id}/finalize`, { formaPagamento }),
  cancel: (id) => api.put(`/sale/${id}/cancel`),
  close: (id) => api.put(`/sale/${id}/finalize`, { formaPagamento: 'pendente' }),
};

export const userService = {
  getAll: () => api.get('/user/list'),
  getById: (id) => api.get(`/user/${id}`),
  create: (data) => api.post('/user/create', data),
  update: (id, data) => api.put(`/user/${id}`, data),
  updatePermissions: (id, permissoes) => api.put(`/user/${id}/permissions`, { permissoes }),
  updateStatus: (id, ativo) => api.put(`/user/${id}/status`, { ativo }),
  delete: (id) => api.delete(`/user/${id}`),
};

// Alias para categorias (usando ProductGroup da API)
export const categoryService = {
  getAll: async () => {
    try {
      const response = await api.get('/categoria/list');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/categoria/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar categoria:', error);
      throw error;
    }
  },
  create: (data) => {
    return api.post('/categoria/create', data);
  },
  update: (id, data) => {
    return api.put(`/categoria/update/${id}`, data);
  },
  delete: (id) => {
    return api.delete(`/categoria/delete/${id}`);
  },
};

export const typeService = {
  getAll: async () => {
    try {
      const response = await api.get('/tipo/list');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar tipos:', error);
      throw error;
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/tipo/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar tipo:', error);
      throw error;
    }
  },
  create: (data) => {
    return api.post('/tipo/create', data);
  },
  update: (id, data) => {
    return api.put(`/tipo/update/${id}`, data);
  },
  delete: (id) => {
    return api.delete(`/tipo/delete/${id}`);
  },
};

export const unidadeMedidaService = {
  getAll: async () => {
    try {
      const response = await api.get('/unidade-medida/list');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar unidades de medida:', error);
      throw error;
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/unidade-medida/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar unidade de medida:', error);
      throw error;
    }
  },
  create: (data) => {
    return api.post('/unidade-medida/create', data);
  },
  update: (id, data) => {
    return api.put(`/unidade-medida/update/${id}`, data);
  },
  delete: (id) => {
    return api.delete(`/unidade-medida/delete/${id}`);
  },
};