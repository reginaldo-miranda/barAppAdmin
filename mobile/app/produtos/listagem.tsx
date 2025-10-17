import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useProduct } from '../../src/contexts/ProductContext';
import { productService } from '../../src/services/api';

interface Produto {
  _id: string;
  nome: string;
  descricao?: string;
  precoCusto: number;
  precoVenda: number;
  categoria: string;
  grupo?: string;
  unidade: string;
  quantidade: number;
  ativo: boolean;
  disponivel: boolean;
  dadosFiscais?: string;
  imagem?: string;
  tempoPreparoMinutos?: number;
  dataInclusao?: Date;
}

export default function ListagemProdutos() {
  const { hasPermission } = useAuth() as any;
  const { refreshTrigger, lastAction } = useProduct();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [filteredProdutos, setFilteredProdutos] = useState<Produto[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProdutos = async () => {
    try {
      const response = await productService.getAll();
      setProdutos(response.data);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  };

  const filterProdutos = () => {
    if (!searchText.trim()) {
      setFilteredProdutos(produtos);
      return;
    }

    const filtered = produtos.filter(produto =>
      produto.nome.toLowerCase().includes(searchText.toLowerCase()) ||
      produto.categoria.toLowerCase().includes(searchText.toLowerCase()) ||
      (produto.grupo && produto.grupo.toLowerCase().includes(searchText.toLowerCase())) ||
      (produto.descricao && produto.descricao.toLowerCase().includes(searchText.toLowerCase()))
    );
    setFilteredProdutos(filtered);
  };

  useEffect(() => {
    if (hasPermission('produtos')) {
      loadProdutos();
    }
  }, [hasPermission]);

  useEffect(() => {
    filterProdutos();
  }, [searchText, produtos]);

  // Escuta mudanças no refreshTrigger para atualizar automaticamente
  useEffect(() => {
    if (refreshTrigger > 0 && hasPermission('produtos')) {
      loadProdutos();
      
      // Mostra mensagem de confirmação baseada na ação
      if (lastAction === 'create') {
        setTimeout(() => {
          Alert.alert('Sucesso', 'Produto cadastrado com sucesso!');
        }, 500);
      } else if (lastAction === 'update') {
        setTimeout(() => {
          Alert.alert('Sucesso', 'Alterado com sucesso');
        }, 500);
      }
    }
  }, [refreshTrigger, hasPermission, lastAction]);

  // Atualiza a lista sempre que a tela receber foco (retorno da edição)
  useFocusEffect(
    useCallback(() => {
      if (hasPermission('produtos')) {
        loadProdutos();
      }
    }, [hasPermission])
  );

  // Verificar permissões
  if (!hasPermission('produtos')) {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name="lock-closed" size={64} color="#666" />
        <Text style={styles.accessDeniedText}>Acesso Negado</Text>
        <Text style={styles.accessDeniedSubtext}>
          Você não tem permissão para acessar esta tela
        </Text>
      </View>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProdutos();
    setRefreshing(false);
    
    // Mostra mensagem de confirmação após atualização manual
    setTimeout(() => {
      Alert.alert('Sucesso', 'Lista de produtos atualizada!');
    }, 300);
  };

  const handleEdit = (produto: Produto) => {
    try {
      router.push(`/produtos/cadastro?id=${produto._id}` as any);
    } catch (error) {
      console.error('Erro ao navegar para edição:', error);
      Alert.alert('Erro', 'Erro ao abrir tela de edição. Tente novamente.');
    }
  };

  const handleDelete = async (produto: Produto) => {
    Alert.alert(
      'Excluir Produto',
      `Tem certeza que deseja excluir o produto "${produto.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await productService.delete(produto._id);
              
              // Recarregar a lista completa para garantir consistência
              await loadProdutos();
              
              Alert.alert('Sucesso', 'Produto excluído com sucesso!');
            } catch (error) {
              console.error('Erro ao excluir produto:', error);
              Alert.alert('Erro', 'Erro ao excluir produto. Tente novamente.');
            } finally {
              setLoading(false);
            }
          }
        },
      ]
    );
  };

  const toggleStatus = async (produto: Produto) => {
    const newStatus = !produto.ativo;
    const action = newStatus ? 'ativar' : 'desativar';
    
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Produto`,
      `Deseja ${action} o produto "${produto.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: action.charAt(0).toUpperCase() + action.slice(1), 
          onPress: async () => {
            try {
              setLoading(true);
              await productService.update(produto._id, { ativo: newStatus });
              
              // Recarregar a lista completa para garantir consistência
              await loadProdutos();
              
              Alert.alert('Sucesso', `Produto ${action}do com sucesso!`);
            } catch (error) {
              console.error(`Erro ao ${action} produto:`, error);
              Alert.alert('Erro', `Erro ao ${action} produto. Tente novamente.`);
            } finally {
              setLoading(false);
            }
          }
        },
      ]
    );
  };

  const getStatusColor = (produto: Produto) => {
    if (!produto.ativo) return '#f44336';
    if (!produto.disponivel) return '#ff9800';
    if (produto.quantidade <= 0) return '#ff9800';
    return '#4caf50';
  };

  const getStatusText = (produto: Produto) => {
    if (!produto.ativo) return 'Inativo';
    if (!produto.disponivel) return 'Indisponível';
    if (produto.quantidade <= 0) return 'Sem Estoque';
    return 'Ativo';
  };

  const renderProduto = ({ item }: { item: Produto }) => (
    <View style={styles.produtoCard}>
      <View style={styles.produtoHeader}>
        <View style={styles.produtoInfo}>
          <Text style={styles.produtoNome}>{item.nome}</Text>
          {item.descricao && <Text style={styles.produtoDescricao}>{item.descricao}</Text>}
          <View style={styles.produtoDetails}>
            <Text style={styles.produtoCategoria}>{item.categoria}</Text>
            <Text style={styles.produtoPreco}>R$ {item.precoVenda.toFixed(2)}</Text>
          </View>
          <View style={styles.produtoEstoque}>
            <Text style={styles.estoqueText}>
              Estoque: {item.quantidade} {item.unidade}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item) }]}>
              <Text style={styles.statusText}>{getStatusText(item)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.produtoActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item)}
        >
          <Ionicons name="pencil" size={16} color="#2196F3" />
          <Text style={[styles.actionText, { color: '#2196F3' }]}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.toggleButton]}
          onPress={() => toggleStatus(item)}
        >
          <Ionicons 
            name={item.ativo ? "pause" : "play"} 
            size={16} 
            color={item.ativo ? "#ff9800" : "#4caf50"} 
          />
          <Text style={[styles.actionText, { color: item.ativo ? "#ff9800" : "#4caf50" }]}>
            {item.ativo ? 'Desativar' : 'Ativar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash" size={16} color="#f44336" />
          <Text style={[styles.actionText, { color: '#f44336' }]}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Carregando produtos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2196F3" />
          </TouchableOpacity>
          <Text style={styles.title}>Produtos</Text>
          <TouchableOpacity 
            onPress={() => router.push('/produtos/cadastro' as any)} 
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="#2196F3" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar produtos..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filteredProdutos}
          renderItem={renderProduto}
          keyExtractor={(item) => item._id}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            filteredProdutos.length === 0 && styles.emptyListContent
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={true}
          bounces={true}
          alwaysBounceVertical={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchText ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
              </Text>
              {!searchText && (
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => router.push('/produtos/cadastro' as any)}
                >
                  <Text style={styles.emptyButtonText}>Cadastrar Primeiro Produto</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 15,
  },
  emptyListContent: {
    flexGrow: 1,
    padding: 15,
  },
  produtoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  produtoHeader: {
    marginBottom: 15,
  },
  produtoInfo: {
    flex: 1,
  },
  produtoNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  produtoDescricao: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  produtoDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  produtoCategoria: {
    fontSize: 12,
    color: '#999',
  },
  produtoPreco: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  produtoEstoque: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estoqueText: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  produtoActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  editButton: {
    backgroundColor: '#e3f2fd',
  },
  toggleButton: {
    backgroundColor: '#f3e5f5',
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#f44336',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  accessDeniedSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});