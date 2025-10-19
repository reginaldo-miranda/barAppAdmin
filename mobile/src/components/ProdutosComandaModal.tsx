import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productService, comandaService, categoryService } from '../services/api';
import SearchAndFilter from './SearchAndFilter';
interface Categoria {
  id: string;
  nome: string;
  icon: string;
}

interface ProdutoExtendido {
  _id: string;
  nome: string;
  descricao: string;
  precoVenda: number;
  categoria: string;
  ativo: boolean;
  disponivel: boolean;
  grupo?: string;
}

interface CartItem {
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

interface Comanda {
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

interface Props {
  visible: boolean;
  onClose: () => void;
  comanda: Comanda | null;
  onUpdateComanda: () => void;
}

export default function ProdutosComandaModal({ visible, onClose, comanda, onUpdateComanda }: Props) {
  const [produtos, setProdutos] = useState<ProdutoExtendido[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProdutoExtendido[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  
  // Novos estados para os modais
  const [itensSelecionadosModalVisible, setItensSelecionadosModalVisible] = useState(false);
  const [fecharComandaModalVisible, setFecharComandaModalVisible] = useState(false);

  useEffect(() => {
    if (visible && comanda) {
      loadProdutos();
      loadCategories();
    }
  }, [visible, comanda]);

  // Aplicar filtros sempre que os dados ou filtros mudarem
  useEffect(() => {
    filterProducts();
  }, [searchText, produtos, selectedCategory]);

  const loadProdutos = async () => {
    try {
      console.log('📦 Carregando produtos do banco...');
      const response = await productService.getAll();
      const produtosAtivos = response.data?.filter((prod: ProdutoExtendido) => prod.ativo && prod.disponivel) || [];
      
      console.log('📦 Produtos carregados:', produtosAtivos.length);
      setProdutos(produtosAtivos);
      setLoading(false);
    } catch (error) {
      console.error('❌ Erro ao carregar produtos:', error);
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      console.log('📦 Carregando categorias do banco...');
      const data = await categoryService.getAll();
      
      // Configuração dos filtros de categoria igual à tela de produtos
      const categoryFilters = [
        { key: '', label: 'Todas', icon: 'apps' },
        ...data.map((categoria: any) => ({
          key: categoria.nome,
          label: categoria.nome,
          icon: 'pricetag'
        }))
      ];
      
      console.log('📦 Categorias carregadas:', categoryFilters.length);
      setCategories(categoryFilters);
    } catch (error) {
      console.error('❌ Erro ao carregar categorias:', error);
      // Fallback para categorias padrão apenas em caso de erro
      console.log('⚠️ Usando categorias padrão como fallback');
      setCategories([
        { key: '', label: 'Todas', icon: 'apps' },
        { key: 'bebidas-alcoolicas', label: 'Bebidas Alcoólicas', icon: 'pricetag' },
        { key: 'bebidas-nao-alcoolicas', label: 'Bebidas Não Alcoólicas', icon: 'pricetag' },
        { key: 'pratos-principais', label: 'Pratos Principais', icon: 'pricetag' },
        { key: 'aperitivos', label: 'Aperitivos', icon: 'pricetag' },
        { key: 'sobremesas', label: 'Sobremesas', icon: 'pricetag' },
      ]);
    }
  };

  const adicionarItem = async (produto: ProdutoExtendido) => {
    if (!comanda || !produto?._id) {
      Alert.alert('Erro', 'Dados inválidos');
      return;
    }

    // Adicionar produto ao loading
    setLoadingItems(prev => new Set(prev).add(produto._id));
    
    const itemData = {
      produto: produto,
      quantidade: quantidade || 1
    };
    
    try {
      await comandaService.addItem(comanda._id, itemData);
      Alert.alert('Sucesso', `${produto.nome} adicionado à comanda!`);
      onUpdateComanda();
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o item');
    } finally {
      // Remover produto do loading
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(produto._id);
        return newSet;
      });
    }
  };

  const removerItem = async (produto: ProdutoExtendido) => {
    if (!comanda || !produto?._id) {
      Alert.alert('Erro', 'Dados inválidos');
      return;
    }

    // Adicionar produto ao loading
    setLoadingItems(prev => new Set(prev).add(produto._id));
    
    try {
      await comandaService.removeItem(comanda._id, produto._id);
      Alert.alert('Sucesso', `${produto.nome} removido da comanda!`);
      onUpdateComanda();
    } catch (error) {
      console.error('Erro ao remover item:', error);
      Alert.alert('Erro', 'Não foi possível remover o item');
    } finally {
      // Remover produto do loading
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(produto._id);
        return newSet;
      });
    }
  };

  // Função para incrementar quantidade no modal de itens selecionados
  const incrementarQuantidadeItem = async (item: CartItem) => {
    if (!comanda || !item?.produto?._id) {
      Alert.alert('Erro', 'Dados inválidos');
      return;
    }

    // Criar objeto produto a partir do item da comanda
    const produtoFromItem: ProdutoExtendido = {
      _id: item.produto._id,
      nome: item.nomeProduto,
      descricao: '',
      precoVenda: item.precoUnitario,
      categoria: '',
      ativo: true,
      disponivel: true,
      grupo: ''
    };

    await adicionarItem(produtoFromItem);
  };

  // Função para decrementar quantidade no modal de itens selecionados
  const decrementarQuantidadeItem = async (item: CartItem) => {
    if (!comanda || !item?.produto?._id) {
      Alert.alert('Erro', 'Dados inválidos');
      return;
    }

    // Criar objeto produto a partir do item da comanda
    const produtoFromItem: ProdutoExtendido = {
      _id: item.produto._id,
      nome: item.nomeProduto,
      descricao: '',
      precoVenda: item.precoUnitario,
      categoria: '',
      ativo: true,
      disponivel: true,
      grupo: ''
    };

    await removerItem(produtoFromItem);
  };

  // Função para fechar comanda
  const fecharComanda = async () => {
    if (!comanda) {
      Alert.alert('Erro', 'Nenhuma comanda selecionada');
      return;
    }

    try {
      await comandaService.close(comanda._id);
      Alert.alert('Sucesso', 'Comanda fechada com sucesso!');
      setFecharComandaModalVisible(false);
      onUpdateComanda();
      onClose();
    } catch (error) {
      console.error('Erro ao fechar comanda:', error);
      Alert.alert('Erro', 'Não foi possível fechar a comanda');
    }
  };

  const filterProducts = () => {
    console.log('🔍 Aplicando filtros...');
    console.log('🔍 Texto de busca:', searchText);
    console.log('🔍 Categoria selecionada:', selectedCategory);
    console.log('🔍 Total de produtos:', produtos.length);

    let filtered = produtos;

    // Filtro por categoria (usando categoria.nome em vez de grupo)
    if (selectedCategory && selectedCategory !== '') {
      filtered = filtered.filter(product => 
        product.categoria && product.categoria.toLowerCase() === selectedCategory.toLowerCase()
      );
      console.log('🔍 Após filtro de categoria:', filtered.length);
    }

    // Filtro por texto de busca
    if (searchText && searchText.trim() !== '') {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(product =>
        product.nome.toLowerCase().includes(searchLower) ||
        (product.descricao && product.descricao.toLowerCase().includes(searchLower)) ||
        (product.categoria && product.categoria.toLowerCase().includes(searchLower))
      );
      console.log('🔍 Após filtro de texto:', filtered.length);
    }

    console.log('🔍 Produtos filtrados final:', filtered.length);
    setFilteredProducts(filtered);
  };

  const handleSearchChange = (newSearchText: string) => {
    console.log('🔄 Mudança de busca:', newSearchText);
    setSearchText(newSearchText);
  };

  const handleFilterChange = (newSelectedFilter: string) => {
    console.log('🔄 Mudança de filtro:', newSelectedFilter);
    setSelectedCategory(newSelectedFilter);
  };

  const renderProduto = ({ item: produto }: { item: ProdutoExtendido }) => {
    // Calcular quantidade já adicionada na comanda
    const itemNaComanda = comanda?.itens?.find((item: CartItem) => item.produto._id === produto._id);
    const quantidadeNaComanda = itemNaComanda ? itemNaComanda.quantidade : 0;
    const isLoading = loadingItems.has(produto._id);
    
    return (
      <View style={[styles.produtoCard, quantidadeNaComanda > 0 && styles.produtoAdicionado]}>
        {/* Nome do produto à esquerda */}
        <View style={styles.produtoInfo}>
          <Text style={styles.produtoNome}>{produto.nome}</Text>
        </View>
        
        {/* Preço e controles à direita */}
        <View style={styles.produtoRightSection}>
          <Text style={styles.produtoPreco}>R$ {produto.precoVenda?.toFixed(2)}</Text>
          
          <View style={styles.produtoControles}>
            <TouchableOpacity 
              style={[styles.btnControle, (quantidadeNaComanda === 0 || isLoading) && styles.btnControleDisabled]}
              onPress={() => removerItem(produto)}
              disabled={quantidadeNaComanda === 0 || isLoading}
            >
              <Text style={styles.btnControleText}>-</Text>
            </TouchableOpacity>
            
            <Text style={styles.quantidadeDisplay}>{quantidadeNaComanda}</Text>
            
            <TouchableOpacity 
              style={[styles.btnControle, isLoading && styles.btnControleDisabled]}
              onPress={() => {
                console.log('BOTÃO CLICADO! Produto:', produto.nome);
                Alert.alert('Teste', `Clicou no produto: ${produto.nome}`);
                adicionarItem(produto);
              }}
              disabled={isLoading}
            >
              <Text style={styles.btnControleText}>
                {isLoading ? '...' : `+${quantidade > 1 ? quantidade : ''}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Total em linha separada se houver quantidade */}
        {quantidadeNaComanda > 0 && (
          <View style={styles.produtoTotalContainer}>
            <Text style={styles.produtoTotal}>
              Total: R$ {(quantidadeNaComanda * produto.precoVenda).toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!comanda) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.comandaInfo}>
              <Text style={styles.modalTitle}>Adicionar Produtos</Text>
              <Text style={styles.comandaDetalhes}>
                {comanda?.numeroComanda || comanda?.nomeComanda}
              </Text>
              <Text style={styles.comandaDetalhes}>
                Cliente: {comanda?.cliente?.nome || 'Não informado'}
              </Text>
              <Text style={styles.comandaTotal}>
                Total: R$ {comanda?.total?.toFixed(2) || '0,00'}
              </Text>
            </View>
            <TouchableOpacity style={styles.btnFechar} onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Botões de Ação */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setItensSelecionadosModalVisible(true)}
            >
              <Ionicons name="list-outline" size={20} color="white" />
              <Text style={styles.actionButtonText}>Itens Selecionados</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.closeComandaButton]}
              onPress={() => setFecharComandaModalVisible(true)}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="white" />
              <Text style={styles.actionButtonText}>Fechar Comanda</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.modalBody}>
            {/* Filtros */}
            <SearchAndFilter
              searchText={searchText}
              onSearchChange={handleSearchChange}
              selectedFilter={selectedCategory}
              filters={categories}
              onFilterChange={handleFilterChange}
              searchPlaceholder="Buscar produtos..."
            />

            {/* Controle de Quantidade */}
            <View style={styles.quantidadeControl}>
              <Text style={styles.quantidadeLabel}>Qtd:</Text>
              <TextInput
                style={styles.quantidadeInput}
                value={quantidade.toString()}
                onChangeText={(text) => setQuantidade(parseInt(text) || 1)}
                keyboardType="numeric"
              />
            </View>

            {/* Lista de Produtos */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Carregando produtos...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredProducts}
                renderItem={renderProduto}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.produtosList}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {searchText || selectedCategory 
                        ? 'Nenhum produto encontrado com os filtros aplicados'
                        : 'Nenhum produto disponível'
                      }
                    </Text>
                  </View>
                }
              />
            )}
          </ScrollView>
        </View>
      </View>

      {/* Modal de Itens Selecionados */}
      <Modal visible={itensSelecionadosModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.comandaInfo}>
                <Text style={styles.modalTitle}>Itens Selecionados</Text>
                <Text style={styles.comandaDetalhes}>
                  {comanda?.numeroComanda || comanda?.nomeComanda}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.btnFechar} 
                onPress={() => setItensSelecionadosModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {comanda?.itens && comanda.itens.length > 0 ? (
                comanda.itens.map((item: CartItem, index: number) => (
                  <View key={`${item._id}-${index}`} style={styles.itemSelecionadoCard}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemNome}>{item.nomeProduto}</Text>
                      <Text style={styles.itemPreco}>R$ {item.precoUnitario?.toFixed(2)}</Text>
                    </View>
                    
                    <View style={styles.itemControles}>
                      <TouchableOpacity 
                        style={styles.btnControle}
                        onPress={() => decrementarQuantidadeItem(item)}
                      >
                        <Text style={styles.btnControleText}>-</Text>
                      </TouchableOpacity>
                      
                      <Text style={styles.quantidadeDisplay}>{item.quantidade}</Text>
                      
                      <TouchableOpacity 
                        style={styles.btnControle}
                        onPress={() => incrementarQuantidadeItem(item)}
                      >
                        <Text style={styles.btnControleText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.itemTotal}>
                      R$ {item.subtotal?.toFixed(2)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.semItens}>Nenhum item adicionado à comanda</Text>
              )}
              
              {comanda?.itens && comanda.itens.length > 0 && (
                <View style={styles.totalGeralContainer}>
                  <Text style={styles.totalGeralText}>
                    Total Geral: R$ {comanda.total?.toFixed(2)}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmação para Fechar Comanda */}
      <Modal visible={fecharComandaModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmHeader}>
              <Ionicons name="warning-outline" size={48} color="#ff9800" />
              <Text style={styles.confirmTitle}>Fechar Comanda</Text>
            </View>
            
            <Text style={styles.confirmMessage}>
              Tem certeza que deseja fechar a comanda {comanda?.numeroComanda || comanda?.nomeComanda}?
            </Text>
            
            <Text style={styles.confirmSubMessage}>
              Total: R$ {comanda?.total?.toFixed(2)}
            </Text>
            
            <View style={styles.confirmButtons}>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setFecharComandaModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmButton, styles.confirmButtonPrimary]}
                onPress={fecharComanda}
              >
                <Text style={styles.confirmButtonText}>Fechar Comanda</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '95%',
    height: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#27ae60',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  comandaInfo: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  comandaDetalhes: {
    fontSize: 14,
    color: 'white',
    marginBottom: 2,
  },
  comandaTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  btnFechar: {
    padding: 5,
  },
  
  // Novos estilos para botões de ação
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  closeComandaButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  modalBody: {
    flex: 1,
    padding: 15,
  },
  categoriasContainer: {
    marginBottom: 15,
  },
  categoriaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoriaBtnActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  categoriaIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  categoriaText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoriaTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  buscaContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
  },
  buscaInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 10,
    backgroundColor: '#f9f9f9',
  },
  quantidadeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  quantidadeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
    color: '#333',
  },
  quantidadeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: '#fff',
     minWidth: 60,
   },
   produtosList: {
     flex: 1,
   },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
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
  produtoCard: {
     flexDirection: 'column',
     padding: 12,
     marginBottom: 8,
     backgroundColor: 'white',
     borderRadius: 8,
     borderWidth: 1,
     borderColor: '#ddd',
     elevation: 1,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.05,
     shadowRadius: 2,
   },
   produtoAdicionado: {
     backgroundColor: '#e8f5e8',
     borderColor: '#4caf50',
   },
   produtoInfo: {
     flex: 1,
     marginBottom: 8,
   },
   produtoNome: {
     fontSize: 16,
     fontWeight: '600',
     color: '#333',
     textAlign: 'left',
   },
   produtoRightSection: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     width: '100%',
   },
   produtoPreco: {
     fontSize: 16,
     fontWeight: '600',
     color: '#27ae60',
   },
   produtoControles: {
     flexDirection: 'row',
     alignItems: 'center',
   },
  btnControle: {
    width: 35,
    height: 35,
    borderRadius: 17,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  btnControleDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  btnControleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  quantidadeDisplay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  produtoTotalContainer: {
     marginTop: 8,
     paddingTop: 8,
     borderTopWidth: 1,
     borderTopColor: '#e0e0e0',
   },
   produtoTotal: {
     fontSize: 14,
     color: '#4caf50',
     fontWeight: '600',
     textAlign: 'right',
   },
  semProdutos: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontSize: 16,
  },
  
  // Estilos para modal de itens selecionados
  itemSelecionadoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  itemInfo: {
    flex: 1,
  },
  itemNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemPreco: {
    fontSize: 14,
    color: '#666',
  },
  itemControles: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    minWidth: 80,
    textAlign: 'right',
  },
  semItens: {
    textAlign: 'center',
    color: '#666',
    marginTop: 40,
    fontSize: 16,
    fontStyle: 'italic',
  },
  totalGeralContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#27ae60',
    borderRadius: 10,
    alignItems: 'center',
  },
  totalGeralText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  
  // Estilos para modal de confirmação
  confirmModalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  confirmMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
  confirmSubMessage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
    textAlign: 'center',
    marginBottom: 25,
  },
  confirmButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonPrimary: {
    backgroundColor: '#dc3545',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
