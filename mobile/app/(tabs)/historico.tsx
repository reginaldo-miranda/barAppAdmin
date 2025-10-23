import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { saleService } from '../../src/services/api';
import SearchAndFilter from '../../src/components/SearchAndFilter';
import ScreenIdentifier from '../../src/components/ScreenIdentifier';

interface Sale {
  _id: string;
  numeroComanda?: string;
  nomeComanda?: string;
  tipoVenda: 'balcao' | 'mesa' | 'comanda' | 'delivery';
  total: number;
  status: 'finalizada' | 'cancelada' | 'aberta';
  formaPagamento?: string;
  cliente?: {
    nome: string;
  };
  funcionario?: {
    nome: string;
  };
  mesa?: {
    numero: number;
  };
  dataVenda: string;
  itens: SaleItem[];
}

interface SaleItem {
  _id: string;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

type FilterType = 'all' | 'mesa' | 'balcao' | 'comanda' | 'delivery';
type DateFilter = 'today' | 'week' | 'month' | 'all';

export default function HistoricoScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');

  const loadSales = async () => {
    try {
      const response = await saleService.getAll();
      const finishedSales = response.data.filter((sale: Sale) => 
        sale.status === 'finalizada' || sale.status === 'cancelada'
      );
      setSales(finishedSales);
      applyFilters(finishedSales, typeFilter, dateFilter, searchText);
    } catch (error: any) {
      console.error('Erro ao carregar vendas:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico de vendas');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSales();
    setRefreshing(false);
  };

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    applyFilters(sales, typeFilter, dateFilter, searchText);
  }, [sales, typeFilter, dateFilter, searchText]);

  const applyFilters = (salesData: Sale[], type: FilterType, date: DateFilter, search: string) => {
    let filtered = [...salesData];

    // Filtro por tipo
    if (type !== 'all') {
      filtered = filtered.filter(sale => sale.tipoVenda === type);
    }

    // Filtro por data
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (date) {
      case 'today':
        filtered = filtered.filter(sale => 
          new Date(sale.dataVenda) >= today
        );
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        filtered = filtered.filter(sale => 
          new Date(sale.dataVenda) >= weekAgo
        );
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        filtered = filtered.filter(sale => 
          new Date(sale.dataVenda) >= monthAgo
        );
        break;
      case 'all':
      default:
        break;
    }

    // Filtro por busca
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(sale => 
        (sale.numeroComanda && sale.numeroComanda.toLowerCase().includes(searchLower)) ||
        (sale.nomeComanda && sale.nomeComanda.toLowerCase().includes(searchLower)) ||
        (sale.cliente?.nome && sale.cliente.nome.toLowerCase().includes(searchLower)) ||
        (sale.funcionario?.nome && sale.funcionario.nome.toLowerCase().includes(searchLower)) ||
        (sale.mesa?.numero && sale.mesa.numero.toString().includes(searchLower)) ||
        sale._id.toLowerCase().includes(searchLower)
      );
    }

    setFilteredSales(filtered);
  };

  const handleSalePress = (sale: Sale) => {
    setSelectedSale(sale);
    setModalVisible(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mesa':
        return 'restaurant';
      case 'balcao':
        return 'storefront';
      case 'comanda':
        return 'receipt';
      case 'delivery':
        return 'bicycle';
      default:
        return 'bag';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'mesa':
        return 'Mesa';
      case 'balcao':
        return 'Balcão';
      case 'comanda':
        return 'Comanda';
      case 'delivery':
        return 'Delivery';
      default:
        return 'Outros';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mesa':
        return '#2196F3';
      case 'balcao':
        return '#FF9800';
      case 'comanda':
        return '#9C27B0';
      case 'delivery':
        return '#4CAF50';
      default:
        return '#757575';
    }
  };

  const renderSale = ({ item }: { item: Sale }) => (
    <TouchableOpacity
      style={[styles.saleCard, { borderLeftColor: getTypeColor(item.tipoVenda) }]}
      onPress={() => handleSalePress(item)}
    >
      <View style={styles.saleHeader}>
        <View style={styles.saleInfo}>
          <Text style={styles.saleNumber}>
            #{item.numeroComanda || item.nomeComanda || item._id.slice(-6)}
          </Text>
          <View style={styles.typeContainer}>
            <Ionicons name={getTypeIcon(item.tipoVenda) as any} size={16} color={getTypeColor(item.tipoVenda)} />
            <Text style={[styles.typeText, { color: getTypeColor(item.tipoVenda) }]}>
              {getTypeText(item.tipoVenda)}
              {item.mesa?.numero && ` ${item.mesa.numero}`}
            </Text>
          </View>
        </View>
        <View style={styles.saleAmount}>
          <Text style={styles.totalText}>R$ {item.total.toFixed(2)}</Text>
          <Text style={[styles.statusText, { 
            color: item.status === 'finalizada' ? '#4CAF50' : '#F44336' 
          }]}>
            {item.status === 'finalizada' ? 'Finalizada' : 'Cancelada'}
          </Text>
        </View>
      </View>
      
      <View style={styles.saleDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person" size={14} color="#666" />
          <Text style={styles.detailText}>
            {item.cliente?.nome || 'Cliente não informado'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={14} color="#666" />
          <Text style={styles.detailText}>
            {new Date(item.dataVenda).toLocaleString('pt-BR')}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card" size={14} color="#666" />
          <Text style={styles.detailText}>
            {item.formaPagamento || 'Não informado'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDateFilterButton = (filter: DateFilter, label: string) => (
    <TouchableOpacity
      style={[styles.dateFilterButton, dateFilter === filter && styles.activeDateFilterButton]}
      onPress={() => setDateFilter(filter)}
    >
      <Text style={[styles.dateFilterButtonText, dateFilter === filter && styles.activeDateFilterButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Configuração dos filtros para o componente SearchAndFilter
  const typeFilters = [
    { key: 'all', label: 'Todos' },
    { key: 'mesa', label: 'Mesa' },
    { key: 'balcao', label: 'Balcão' },
    { key: 'comanda', label: 'Comanda' },
    { key: 'delivery', label: 'Delivery' },
  ];

  const handleFilterChange = (filterKey: string) => {
    setTypeFilter(filterKey as FilterType);
  };

  // Estatísticas
  const totalSales = filteredSales.length;
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

  return (
    <View style={styles.container}>
      <ScreenIdentifier screenName="Histórico" />
      {/* Estatísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalSales}</Text>
          <Text style={styles.statLabel}>Vendas</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>R$ {totalRevenue.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Faturamento</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>R$ {averageTicket.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Ticket Médio</Text>
        </View>
      </View>

      {/* Filtros de Data */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateFiltersContainer}>
        {renderDateFilterButton('today', 'Hoje')}
        {renderDateFilterButton('week', 'Semana')}
        {renderDateFilterButton('month', 'Mês')}
        {renderDateFilterButton('all', 'Todos')}
      </ScrollView>

      {/* Busca e Filtros de Tipo */}
      <SearchAndFilter
        searchText={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="Buscar por número, cliente ou funcionário..."
        filters={typeFilters}
        selectedFilter={typeFilter}
        onFilterChange={handleFilterChange}
      />

      {/* Lista de Vendas */}
      <FlatList
        data={filteredSales}
        renderItem={renderSale}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma venda encontrada</Text>
          </View>
        }
      />

      {/* Modal de Detalhes da Venda */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedSale && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes da Venda</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.saleDetailCard}>
                <Text style={styles.saleDetailNumber}>
                  {selectedSale.numeroComanda || selectedSale.nomeComanda || `#${selectedSale._id.slice(-6)}`}
                </Text>
                <Text style={styles.saleDetailTotal}>R$ {selectedSale.total.toFixed(2)}</Text>
                
                <View style={styles.saleDetailInfo}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Tipo:</Text>
                    <Text style={styles.infoValue}>{getTypeText(selectedSale.tipoVenda)}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Cliente:</Text>
                    <Text style={styles.infoValue}>{selectedSale.cliente?.nome || 'Não informado'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Funcionário:</Text>
                    <Text style={styles.infoValue}>{selectedSale.funcionario?.nome || 'Não informado'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Pagamento:</Text>
                    <Text style={styles.infoValue}>{selectedSale.formaPagamento || 'Não informado'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Data:</Text>
                    <Text style={styles.infoValue}>
                      {new Date(selectedSale.dataVenda).toLocaleString('pt-BR')}
                    </Text>
                  </View>
                  {selectedSale.mesa?.numero && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Mesa:</Text>
                      <Text style={styles.infoValue}>{selectedSale.mesa.numero}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.itemsContainer}>
                <Text style={styles.itemsTitle}>Itens da Venda</Text>
                {selectedSale.itens.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.nomeProduto}</Text>
                      <Text style={styles.itemQuantity}>Qtd: {item.quantidade}</Text>
                    </View>
                    <Text style={styles.itemTotal}>R$ {item.subtotal.toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  dateFiltersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  activeDateFilterButton: {
    backgroundColor: '#2196F3',
  },
  dateFilterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeDateFilterButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  listContainer: {
    paddingHorizontal: 16,
  },
  saleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  saleInfo: {
    flex: 1,
  },
  saleNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  saleAmount: {
    alignItems: 'flex-end',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  saleDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  saleDetailCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  saleDetailNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  saleDetailTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  saleDetailInfo: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  itemsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
  },
});