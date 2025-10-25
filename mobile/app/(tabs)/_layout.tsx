import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import ProductsTabButton from '../../src/components/ProductsTabButton';
import { useAuth } from '../../src/contexts/AuthContext';

export default function TabLayout() {
  const authContext = useAuth() as any;
  const { user, isAuthenticated, loading, hasPermission, isAdmin } = authContext;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Redireciona para a tela de login sempre que a autenticação ficar falsa
      router.replace('/login');
    }
  }, [loading, isAuthenticated]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#666',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          headerTitle: 'BarApp - Sistema de Vendas',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mesas"
        options={{
          title: 'Mesas',
          headerTitle: 'Gerenciar Mesas',
          tabBarIcon: ({ color }) => <Ionicons name="restaurant" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="comandas"
        options={{
          title: 'Comandas',
          headerTitle: 'Comandas Abertas',
          tabBarIcon: ({ color }) => <Ionicons name="receipt" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="caixa"
        options={{
          title: 'Caixa',
          headerTitle: 'Caixa - Vendas Abertas',
          tabBarIcon: () => <Ionicons name="cash" size={24} color="#FF0000" />,
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: 'Histórico',
          headerTitle: 'Histórico de Vendas',
          tabBarIcon: ({ color }) => <Ionicons name="time" size={24} color={color} />,
        }}
      />
      
      {/* Abas Administrativas - Visíveis apenas para usuários com permissões */}
      {hasPermission('produtos') && (
        <Tabs.Screen
          name="admin-produtos"
          options={{
            title: 'Produtos',
            headerTitle: 'Gerenciar Produtos',
            tabBarButton: (props) => (
              <ProductsTabButton 
                focused={props.accessibilityState?.selected || false} 
              />
            ),
          }}
        />
      )}
      
      {hasPermission('funcionarios') && (
        <Tabs.Screen
          name="admin-funcionarios"
          options={{
            title: 'Funcionários',
            headerTitle: 'Gerenciar Funcionários',
            tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
          }}
        />
      )}
      
      {hasPermission('clientes') && (
        <Tabs.Screen
          name="admin-clientes"
          options={{
            title: 'Clientes',
            headerTitle: 'Gerenciar Clientes',
            tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
          }}
        />
      )}
      
      {isAdmin() && (
        <Tabs.Screen
          name="admin-configuracoes"
          options={{
            title: 'Config',
            headerTitle: 'Configurações do Sistema',
            tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
          }}
        />
      )}
    </Tabs>
  );
}
