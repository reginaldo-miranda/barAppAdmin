import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import CriarComandaModal from '../../src/components/CriarComandaModal';
import ProdutosComandaModal from '../../src/components/ProdutosComandaModal';
import SearchAndFilter from '../../src/components/SearchAndFilter';
import { comandaService, employeeService } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Comanda } from '../../src/types/index';
import ScreenIdentifier from '../../src/components/ScreenIdentifier';

export default function ComandasAbertasScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [produtosModalVisible, setProdutosModalVisible] = useState(false);
  const [comandaSelecionada, setComandaSelecionada] = useState<any>(null);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [filteredComandas, setFilteredComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para filtros (igual à tela de produtos)
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');
  const [statusFilters, setStatusFilters] = useState<any[]>([]);
  
  const { user } = useAuth() as any;

  useEffect(() => {
    loadStatusFilters();
  }, []);

  // Aplicar filtros sempre que os dados ou filtros mudarem (igual à tela de produtos)
  useEffect(() => {
    filterComandas();
  }, [searchText, comandas, selectedFilter]);

  const loadStatusFilters = () => {
    // Configuração dos filtros de status igual à tela de produtos
    const filters = [
      { key: '', label: 'Todas', icon: 'apps' },
      { key: 'aberta', label: 'Abertas', icon: 'checkmark-circle' },
      { key: 'fechada', label: 'Fechadas', icon: 'close-circle' },
      { key: 'cancelada', label: 'Canceladas', icon: 'ban' }
    ];
    setStatusFilters(filters);
  };

  const loadComandas = async () => {
    try {
      setLoading(true);
      const response = await comandaService.getAll();
      console.log('Resposta da API:', response.data);
      // Carregar todas as comandas do tipo comanda (não apenas abertas para permitir filtros)
      const todasComandas = response.data?.filter((venda: Comanda) => 
        venda.tipoVenda === 'comanda'
      ) || [];
      setComandas(todasComandas);
    } catch (error: any) {
      console.error('Erro ao carregar comandas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as comandas.');
    } finally {
      setLoading(false);
    }
  };

  // Lógica de filtragem igual à tela de produtos
  const filterComandas = () => {
    let filtered = comandas;

    // Filtro por status (igual à tela de produtos)
    if (selectedFilter) {
      filtered = filtered.filter(comanda => comanda.status === selectedFilter);
    }

    // Filtro por texto de busca (igual à tela de produtos)
    if (searchText.trim()) {
      filtered = filtered.filter(comanda =>
        (comanda.nomeComanda && comanda.nomeComanda.toLowerCase().includes(searchText.toLowerCase())) ||
        (comanda.numeroComanda && comanda.numeroComanda.toLowerCase().includes(searchText.toLowerCase())) ||
        (comanda.funcionario?.nome && comanda.funcionario.nome.toLowerCase().includes(searchText.toLowerCase())) ||
        (comanda.cliente?.nome && comanda.cliente.nome.toLowerCase().includes(searchText.toLowerCase()))
      );
    }

    setFilteredComandas(filtered);
  };

  // Função de mudança de filtro igual à tela de produtos
  const handleFilterChange = (filterKey: string) => {
    setSelectedFilter(filterKey);
  };

  useFocusEffect(
    useCallback(() => {
      loadComandas();
    }, [])
  );

  const handleOpenModal = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const handleOpenProdutosModal = (comanda: any) => {
    setComandaSelecionada(comanda);
    setProdutosModalVisible(true);
  };

  const handleCloseProdutosModal = () => {
    setProdutosModalVisible(false);
    setComandaSelecionada(null);
  };

  const handleUpdateComanda = async () => {
    // Recarrega as comandas após adicionar/remover produtos
    await loadComandas();
    
    // Se há uma comanda selecionada no modal, atualiza seus dados também
    if (comandaSelecionada) {
      try {
        const response = await comandaService.getById(comandaSelecionada._id);
        setComandaSelecionada(response.data);
      } catch (error: any) {
        console.error('Erro ao atualizar comanda selecionada:', error);
      }
    }
  };

  const handleSubmitComanda = async (data: any) => {
    const newComandaData = {
      tipoVenda: 'comanda',
      nomeComanda: data.nomeComanda,
      cliente: data.cliente || null,
      funcionario: data.funcionario,
      valorTotal: data.valorTotalEstimado || 0,
      observacoes: data.observacoes || '',
    };

    console.log('Enviando dados para criar comanda:', JSON.stringify(newComandaData, null, 2));

    try {
      console.log('Criando comanda com dados:', newComandaData);
      const response = await comandaService.create(newComandaData);
      console.log('Resposta da criação:', response.data);
      Alert.alert('Sucesso', 'Comanda criada com sucesso!');
      handleCloseModal();
      loadComandas(); // Recarrega as comandas
    } catch (error: any) {
      console.error('Erro detalhado ao criar comanda:', error);
      console.error('Response error:', error.response?.data);
      Alert.alert('Erro', `Não foi possível criar a comanda: ${error.response?.data?.error || error.message || 'Erro desconhecido'}`);
    }
  };

  // Função para obter a cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberta':
        return '#4CAF50';
      case 'fechada':
        return '#2196F3';
      case 'cancelada':
        return '#f44336';
      default:
        return '#666';
    }
  };

  // Função para obter o texto do status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'aberta':
        return 'Aberta';
      case 'fechada':
        return 'Fechada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  return (
    <View style={styles.container}>
      <ScreenIdentifier screenName="Comandas" />
      
      {/* Componente de busca e filtros igual à tela de produtos */}
      <SearchAndFilter
        searchText={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="Buscar comandas..."
        filters={statusFilters}
        selectedFilter={selectedFilter}
        onFilterChange={handleFilterChange}
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>Comandas</Text>
        <TouchableOpacity style={styles.button} onPress={handleOpenModal}>
          <Text style={styles.buttonText}>Nova Comanda</Text>
        </TouchableOpacity>
      </View>
      
      <CriarComandaModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSubmit={handleSubmitComanda}
      />
      
      <ProdutosComandaModal
        visible={produtosModalVisible}
        onClose={handleCloseProdutosModal}
        comanda={comandaSelecionada}
        onUpdateComanda={handleUpdateComanda}
      />
      
      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" />
      ) : (
        <FlatList
          data={filteredComandas}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.comandaItem}
              onPress={() => handleOpenProdutosModal(item)}
            >
              <View style={styles.comandaInfo}>
                <View style={styles.comandaHeader}>
                  <Text style={styles.comandaNome}>{item.nomeComanda || item.numeroComanda || 'Sem nome'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                  </View>
                </View>
                <Text style={styles.comandaFuncionario}>Funcionário: {item.funcionario?.nome || 'Não definido'}</Text>
                {item.cliente?.nome && (
                  <Text style={styles.comandaCliente}>Cliente: {item.cliente.nome}</Text>
                )}
                <Text style={styles.comandaItens}>{item.itens?.length || 0} itens</Text>
              </View>
              <View style={styles.comandaTotal}>
                <Text style={styles.comandaValor}>R$ {item.total?.toFixed(2) || '0.00'}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhuma comanda encontrada.</Text>
            </View>
          }
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  comandaItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  comandaInfo: {
    flex: 1,
  },
  comandaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  comandaNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  comandaFuncionario: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  comandaCliente: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  comandaItens: {
    fontSize: 14,
    color: '#666',
  },
  comandaTotal: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  comandaValor: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});