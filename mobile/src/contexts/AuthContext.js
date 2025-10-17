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

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('userData');
      
      console.log('🔍 Verificando estado de autenticação:', { token: !!token, userData: !!userData });
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        console.log('👤 Usuário carregado do storage:', parsedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } else {
        console.log('❌ Nenhum usuário encontrado no storage');
      }
    } catch (error) {
      console.error('Erro ao verificar estado de autenticação:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await authService.login(credentials);
      console.log('🔐 Resposta do login:', response.data);
      
      if (response.data.token) {
        await AsyncStorage.setItem('authToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
        
        console.log('👤 Dados do usuário salvos:', response.data.user);
        setUser(response.data.user);
        setIsAuthenticated(true);
        
        return { success: true, data: response.data };
      }
      
      return { success: false, message: 'Credenciais inválidas' };
    } catch (error) {
      console.error('Erro no login:', error);
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

  // Funções para verificar permissões
  const hasPermission = (permission) => {
    console.log('🔍 hasPermission chamado:', { permission, user, userTipo: user?.tipo, userPermissoes: user?.permissoes });
    if (!user) {
      console.log('❌ Usuário não encontrado');
      return false;
    }
    if (user.tipo === 'admin') {
      console.log('✅ Usuário é admin, acesso liberado');
      return true;
    }
    const hasAccess = user.permissoes?.[permission] || false;
    console.log(`🔐 Verificando permissão '${permission}':`, hasAccess);
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