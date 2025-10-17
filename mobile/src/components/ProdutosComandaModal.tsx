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
import { productService, comandaService } from '../services/api';
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
  const [categorias, setCategorias] = useState<Categoria[]>([
    { id: 'todos', nome: 'Todos', icon: '🍽️' }
  ]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('todos');
  const [buscarProduto, setBuscarProduto] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  
  // Novos estados para os modais
  const [itensSelecionadosModalVisible, setItensSelecionadosModalVisible] = useState(false);
  const [fecharComandaModalVisible, setFecharComandaModalVisible] = useState(false);

  useEffect(() => {
    if (visible && comanda) {
      loadProdutos();
    }
  }, [visible, comanda]);

  const loadProdutos = async () => {
    try {
      const response = await productService.getAll();
      const produtosAtivos = response.data?.filter((prod: ProdutoExtendido) => prod.ativo) || [];
      setProdutos(produtosAtivos);
      
      // Extrair grupos únicos dos produtos para criar categorias dinâmicas
      const grupos = produtosAtivos
        .map((produto: ProdutoExtendido) => produto.grupo)
        .filter((grupo: string | undefined): grupo is string => grupo !== undefined && grupo.trim() !== '');
      const gruposUnicos: string[] = Array.from(new Set(grupos));
      
      // Mapear grupos para categorias com ícones
      const iconesPorGrupo: { [key: string]: string } = {
        'bebidas': '🥤',
        'comidas': '🍖',
        'limpeza': '🧽',
        'sobremesas': '🍰',
        'petiscos': '🍿',
        'default': '📦'
      };
      
      const novasCategorias: Categoria[] = [
        { id: 'todos', nome: 'Todos', icon: '🍽️' },
        ...gruposUnicos.map((grupo: string) => ({
          id: grupo,
          nome: grupo.charAt(0).toUpperCase() + grupo.slice(1),
          icon: iconesPorGrupo[grupo.toLowerCase()] || iconesPorGrupo.default
        }))
      ];
      
      setCategorias(novasCategorias);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
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

  const produtosFiltrados = produtos.filter((produto: ProdutoExtendido) => {
    const matchCategoria = categoriaSelecionada === 'todos' || produto.grupo === categoriaSelecionada;
    const matchBusca = produto.nome.toLowerCase().includes(buscarProduto.toLowerCase());
    return matchCategoria && matchBusca;
  });

  const renderProduto = ({ item: produto }: { item: ProdutoExtendido }) => {
    // Calcular quantidade já adicionada na comanda
    const itemNaComanda = comanda?.itens?.find((item: CartItem) => item.produto._id === produto._id);
    const quantidadeNaComanda = itemNaComanda ? itemNaComanda.quantidade : 0;
    const isLoading = loadingItems.has(produto._id);
    
    return (
      <View style={[styles.produtoCard, quantidadeNaComanda > 0 && styles.produtoAdicionado]}>
        <View style={styles.produtoInfo}>
          <Text style={styles.produtoNome}>{produto.nome}</Text>
          <Text style={styles.produtoPreco}>R$ {produto.precoVenda?.toFixed(2)}</Text>
        </View>
        
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
        
        {quantidadeNaComanda > 0 && (
          <Text style={styles.produtoTotal}>
            Total: R$ {(quantidadeNaComanda * produto.precoVenda).toFixed(2)}
          </Text>
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
            {/* Categorias */}
            <View style={styles.categoriasContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categorias.map((categoria) => (
                  <TouchableOpacity
                    key={categoria.id}
                    style={[
                      styles.categoriaBtn,
                      categoriaSelecionada === categoria.id && styles.categoriaBtnActive
                    ]}
                    onPress={() => setCategoriaSelecionada(categoria.id)}
                  >
                    <Text style={styles.categoriaIcon}>{categoria.icon}</Text>
                    <Text style={[
                      styles.categoriaText,
                      categoriaSelecionada === categoria.id && styles.categoriaTextActive
                    ]}>
                      {categoria.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Busca de Produtos */}
            <View style={styles.buscaContainer}>
              <TextInput
                style={styles.buscaInput}
                placeholder="🔍 Buscar produto..."
                value={buscarProduto}
                onChangeText={setBuscarProduto}
              />
              <View style={styles.quantidadeControl}>
                <Text style={styles.quantidadeLabel}>Qtd:</Text>
                <TextInput
                  style={styles.quantidadeInput}
                  value={quantidade.toString()}
                  onChangeText={(text) => setQuantidade(parseInt(text) || 1)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Lista de Produtos */}
            <ScrollView style={styles.produtosList}>
              {produtosFiltrados.length > 0 ? (
                produtosFiltrados.map((produto: ProdutoExtendido) => {
                  // Calcular quantidade já adicionada na comanda
                  const itemNaComanda = comanda?.itens?.find((item: CartItem) => item.produto._id === produto._id);
                  const quantidadeNaComanda = itemNaComanda ? itemNaComanda.quantidade : 0;
                  const isLoading = loadingItems.has(produto._id);
                  
                  return (
                    <View key={produto._id} style={styles.produtoCard}>
                      <View style={styles.produtoInfo}>
                        <Text style={styles.produtoNome}>{produto.nome}</Text>
                        <Text style={styles.produtoPreco}>R$ {produto.precoVenda?.toFixed(2)}</Text>
                      </View>
                      
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
                          onPress={() => adicionarItem(produto)}
                          disabled={isLoading}
                        >
                          <Text style={styles.btnControleText}>
                            {isLoading ? '...' : `+${quantidade > 1 ? quantidade : ''}`}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      {quantidadeNaComanda > 0 && (
                        <Text style={styles.produtoTotal}>
                          Total: R$ {(quantidadeNaComanda * produto.precoVenda).toFixed(2)}
                        </Text>
                      )}
                    </View>
                  );
                })
              ) : (
                <Text style={styles.semProdutos}>Nenhum produto encontrado</Text>
              )}
            </ScrollView>
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
  },
  quantidadeLabel: {
    fontSize: 14,
    marginRight: 5,
    color: '#666',
  },
  quantidadeInput: {
    width: 50,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
  },
  produtosList: {
    flex: 1,
  },
  produtoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  produtoNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  produtoPreco: {
    fontSize: 14,
    color: '#666',
  },
  produtoControles: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
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
  produtoTotal: {
    position: 'absolute',
    bottom: 2,
    right: 12,
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '600',
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
