import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/api';

// Interface para o contexto de autenticação
const defaultAuthContext = {
  user: null,
  loading: false,
  isAuthenticated: false,
  login: async (credentials) => ({ success: false, message: 'Contexto não inicializado' }),
  logout: async () => {},
  hasPermission: () => false,
};

const AuthContext = createContext(defaultAuthContext);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar se há usuário logado ao inicializar
  useEffect(() => {
    checkAuthState();
  }, []);

  const clearAllData = async () => {
    try {
      await AsyncStorage.clear();
      console.log('🧹 AuthContext: AsyncStorage limpo completamente');
    } catch (error) {
      console.error('🧹 AuthContext: Erro ao limpar AsyncStorage:', error);
    }
  };

  const checkAuthState = async () => {
    try {
      setLoading(true);
      console.log('🔍 AuthContext: Verificando estado de autenticação...');
      
      // Limpar dados antigos primeiro
      await clearAllData();
      
      // Forçar estado não autenticado
      setIsAuthenticated(false);
      setUser(null);
      console.log('🔍 AuthContext: Estado limpo - usuário não autenticado');
    } catch (error) {
      console.error('🔍 AuthContext: Erro ao verificar autenticação:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
      console.log('🔍 AuthContext: Verificação de autenticação concluída');
    }
  };

  const login = async (credentials) => {
    try {
      console.log('🔐 AuthContext: Iniciando login...');
      setLoading(true);
      const response = await authService.login(credentials);
      console.log('🔐 AuthContext: Resposta do login:', response.data);
      
      if (response.data.token) {
        console.log('🔐 AuthContext: Login bem-sucedido, salvando dados...');
        await AsyncStorage.setItem('authToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
        
        console.log('🔐 AuthContext: Dados do usuário salvos:', response.data.user);
        setUser(response.data.user);
        setIsAuthenticated(true);
        console.log('🔐 AuthContext: Usuário autenticado:', response.data.user);
        
        return { success: true, data: response.data };
      }
      
      console.log('🔐 AuthContext: Login falhou - credenciais inválidas');
      return { success: false, message: 'Credenciais inválidas' };
    } catch (error) {
      console.error('🔐 AuthContext: Erro no login:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Erro ao fazer login' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Tentar fazer logout no servidor
      try {
        await authService.logout();
      } catch (error) {
        console.warn('Erro ao fazer logout no servidor:', error);
      }
      
      // Limpar dados locais
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para limpar completamente o AsyncStorage (para debug)
  const clearAllStorage = async () => {
    try {
      console.log('🧹 AuthContext: Limpando todo o AsyncStorage...');
      await AsyncStorage.clear();
      setUser(null);
      setIsAuthenticated(false);
      console.log('🧹 AuthContext: AsyncStorage limpo com sucesso');
    } catch (error) {
      console.error('Erro ao limpar AsyncStorage:', error);
    }
  };

  // Funções para verificar permissões
  const hasPermission = (permission) => {
    if (!user) {
      return false;
    }
    if (user.tipo === 'admin') {
      return true;
    }
    const hasAccess = user.permissoes?.[permission] || false;
    return hasAccess;
  };

  const isAdmin = () => {
    return user?.tipo === 'admin';
  };

  const isFuncionario = () => {
    return user?.tipo === 'funcionario';
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    checkAuthState,
    clearAllStorage,
    hasPermission,
    isAdmin,
    isFuncionario,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;