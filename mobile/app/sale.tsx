import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { saleService, mesaService, comandaService } from '../src/services/api';
import { useAuth } from '../src/contexts/AuthContext';
import AddProductToTable from '../src/components/AddProductToTable';
import ScreenIdentifier from '../src/components/ScreenIdentifier';
import { Sale, CartItem, PaymentMethod, Product } from '../src/types/index';
import SaleItemsModal from '../src/components/SaleItemsModal';

export default function SaleScreen() {
  const { tipo, mesaId, vendaId, viewMode } = useLocalSearchParams();
  const { user } = useAuth() as any;
  // const { confirmRemove } = useConfirmation();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [isViewMode, setIsViewMode] = useState(false);
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [mesa, setMesa] = useState<any>(null);
  const [comanda, setComanda] = useState<any>(null);
  const [itemsModalVisible, setItemsModalVisible] = useState(false);
  const isPhone = Dimensions.get('window').width < 768;
  const [initialItemsModalShown, setInitialItemsModalShown] = useState(false);

  useEffect(() => {
    if (isPhone && !isViewMode && cart.length > 0 && !initialItemsModalShown) {
      setItemsModalVisible(true);
      setInitialItemsModalShown(true);
    }
  }, [isPhone, isViewMode, cart.length, initialItemsModalShown]);

  const paymentMethods: PaymentMethod[] = [
    { key: 'dinheiro', label: 'Dinheiro', icon: 'cash' },
    { key: 'cartao', label: 'Cartão', icon: 'card' },
    { key: 'pix', label: 'PIX', icon: 'phone-portrait' },
  ];

  useEffect(() => {
    if (viewMode === 'view') {
      setIsViewMode(true);
      loadMesaSale();
    } else {
      setIsViewMode(false);
      
      if (vendaId) {
        if (tipo === 'comanda') {
          loadComandaSale();
        } else {
          loadSale();
        }
      } else if (mesaId) {
        loadMesaSale();
      } else {
        createNewSale();
      }
    }
  }, []);

  const loadSale = async () => {
    try {
      setLoading(true);
      const response = await saleService.getById(vendaId as string);
      setSale(response.data);
      setCart(response.data.itens || []);
      
      if (response.data.mesa) {
        setMesa(response.data.mesa);
        setNomeResponsavel(response.data.mesa.nomeResponsavel || '');
      }
    } catch (error) {
      console.error('Erro ao carregar venda:', error);
      Alert.alert('Erro', 'Não foi possível carregar a venda');
    } finally {
      setLoading(false);
    }
  };

  const loadComandaSale = async () => {
    try {
      setLoading(true);
      const response = await comandaService.getById(vendaId as string);
      setSale(response.data);
      setCart(response.data.itens || []);
      setComanda(response.data);
    } catch (error) {
      console.error('Erro ao carregar comanda:', error);
      Alert.alert('Erro', 'Não foi possível carregar a comanda');
    } finally {
      setLoading(false);
    }
  };

  const loadMesaSale = async () => {
    try {
      setLoading(true);
      await loadMesaData();
      
      const response = await saleService.getByMesa(mesaId as string);
      if (response.data && response.data.length > 0) {
        // Pega SOMENTE a venda ativa (status 'aberta') em modo normal
        const activeSale = response.data.find((sale: Sale) => sale.status === 'aberta');
        if (activeSale) {
          setSale(activeSale);
          setCart(activeSale.itens || []);
        } else if (!isViewMode) {
          // Sem venda aberta: cria uma nova venda para evitar reutilizar itens antigos
          await createNewSale();
        } else {
          // Em modo visualização, permitir ver a última venda (mesmo finalizada)
          const lastSale = response.data[0];
          setSale(lastSale);
          setCart(lastSale.itens || []);
        }
      } else if (!isViewMode) {
        await createNewSale();
      }
    } catch (error) {
      console.error('Erro ao carregar venda da mesa:', error);
      if (!isViewMode) {
        createNewSale();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMesaData = async () => {
    try {
      const response = await mesaService.getById(mesaId as string);
      setMesa(response.data);
      setNomeResponsavel(response.data.nomeResponsavel || '');
    } catch (error) {
      console.error('Erro ao carregar dados da mesa:', error);
    }
  };

  const createNewSale = async () => {
    try {
      console.log('=== CRIANDO NOVA VENDA ===');
      console.log('User:', user);
      console.log('User ID:', user?._id);
      console.log('Mesa ID:', mesaId);
      console.log('Tipo:', tipo);

      if (!user || !user._id) {
        console.log('❌ Usuário não está logado');
        Alert.alert('Erro', 'Usuário não está logado');
        return;
      }

      const saleData = {
        funcionario: user._id,
        tipoVenda: tipo || 'mesa',
        ...(mesaId && { mesa: mesaId }),
        status: 'aberta',
        itens: [],
        total: 0
      };

      console.log('Dados da venda a serem enviados:', saleData);

      const response = await saleService.create(saleData);
      console.log('✅ Venda criada com sucesso:', response.data);
      
      setSale(response.data);
      setCart([]);
    } catch (error: any) {
      console.error('❌ Erro ao criar venda:', error);
      console.error('Detalhes do erro:', error.response?.data);
      Alert.alert('Erro ao criar venda', `Detalhes: ${JSON.stringify(error.response?.data || error.message)}`);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (product: Product) => {
    if (!sale) {
      Alert.alert('Erro', 'Nenhuma venda ativa encontrada');
      return;
    }

    try {
      // Adiciona o item no backend
      const itemData = {
        produtoId: product._id,
        quantidade: 1
      };
      
      console.log('Adicionando item ao carrinho:', itemData);
      const response = await saleService.addItem(sale._id, itemData);
      
      // Atualiza o estado local com os dados do backend
      setSale(response.data);
      setCart(response.data.itens || []);
      
      console.log('Item adicionado com sucesso via backend');
      
    } catch (error: any) {
      console.error('Erro ao adicionar item no backend:', error);
      
      // Fallback: adiciona localmente se o backend falhar
      console.log('Adicionando item localmente como fallback');
      
      setCart(prevCart => {
        const existingItem = prevCart.find(item => 
          item.produto && item.produto._id === product._id
        );
        
        if (existingItem) {
          // Se o item já existe, aumenta a quantidade
          return prevCart.map(item => {
            if (item.produto && item.produto._id === product._id) {
              const newQuantity = item.quantidade + 1;
              return {
                  ...item,
                  quantidade: newQuantidade,
                  subtotal: item.precoUnitario * newQuantidade
                };
            }
            return item;
          });
        } else {
          // Se é um item novo, adiciona ao carrinho
          const newItem: CartItem = {
            _id: `temp_${Date.now()}_${Math.random()}`,
            produto: {
              _id: product._id,
              nome: product.nome,
              preco: product.precoVenda
            },
            nomeProduto: product.nome,
            quantidade: 1,
            precoUnitario: product.precoVenda,
            subtotal: product.precoVenda
          };
          return [...prevCart, newItem];
        }
      });
      
      // Mostra feedback visual de que o item foi adicionado
      Alert.alert('Sucesso', `${product.nome} foi adicionado ao carrinho!`);
    }
  };

  // Helper: confirmação via Alert (nativa)
  const confirmRemoveAlert = (itemName: string): Promise<boolean> => {
    console.log('[Alert] solicitando confirmação para remover', itemName);
    return new Promise((resolve) => {
      Alert.alert(
        'Confirmar Remoção',
        `Tem certeza que deseja remover ${itemName}?`,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => { console.log('[Alert] cancelou remoção'); resolve(false); } },
          { text: 'Remover', style: 'destructive', onPress: () => { console.log('[Alert] confirmou remoção'); resolve(true); } },
        ],
        { cancelable: true }
      );
    });
  };
  const updateCartItem = async (item: CartItem, newQuantity: number) => {
    console.log('[Sale] updateCartItem', { itemId: item._id, from: item.quantidade, to: newQuantity });
    if (!sale || !item?.produto?._id) {
      Alert.alert('Erro', 'Venda não encontrada ou item inválido. Recarregando...');
      try {
        if (tipo === 'comanda' && vendaId) {
          const response = await comandaService.getById(vendaId as string);
          setSale(response.data);
          setCart(response.data.itens || []);
        } else if (sale?._id) {
          const response = await saleService.getById(sale._id);
          setSale(response.data);
          setCart(response.data.itens || []);
        }
      } catch {}
      return;
    }

    // Confirmar decremento (inclui quando vai para 0)
    if (newQuantity < item.quantidade) {
      const confirmed = await confirmRemoveAlert(
        newQuantity <= 0
          ? `${item.nomeProduto} do carrinho`
          : `uma unidade de ${item.nomeProduto}`
      );
      if (!confirmed) return;
    }

    const produtoId = item.produto._id;

    try {
      let response;
      if (newQuantity <= 0) {
        // Remover item por completo via API
        if (tipo === 'comanda') {
          response = await comandaService.removeItem(sale._id, produtoId);
        } else {
          response = await saleService.removeItem(sale._id, produtoId);
        }
      } else {
        // Atualizar quantidade via API
        if (tipo === 'comanda') {
          response = await comandaService.updateItemQuantity(sale._id, produtoId, newQuantity);
        } else {
          response = await saleService.updateItemQuantity(sale._id, produtoId, newQuantity);
        }
      }

      // Sincronizar estado local com resposta do backend
      if (response?.data) {
        setSale(response.data);
        setCart(response.data.itens || []);
      } else {
        // Fallback: atualizar localmente
        if (newQuantity <= 0) {
          setCart(prevCart => prevCart.filter(cartItem => cartItem._id !== item._id));
        } else {
          setCart(prevCart => prevCart.map(cartItem => (
            cartItem._id === item._id
              ? { ...cartItem, quantidade: newQuantity, subtotal: cartItem.precoUnitario * newQuantity }
              : cartItem
          )));
        }
      }
    } catch (error: any) {
      console.error('Erro ao atualizar item:', error);
      Alert.alert('Erro', error?.response?.data?.error || 'Não foi possível atualizar o item.');
      // Tentar re-sincronizar com backend
      try {
        if (tipo === 'comanda') {
          const refreshed = await comandaService.getById(sale._id);
          setSale(refreshed.data);
          setCart(refreshed.data.itens || []);
        } else {
          const refreshed = await saleService.getById(sale._id);
          setSale(refreshed.data);
          setCart(refreshed.data.itens || []);
        }
      } catch {}
    }
  };

  const removeFromCart = async (item: CartItem) => {
    if (!sale || !item?.produto?._id) {
      Alert.alert('Erro', 'Venda não encontrada ou item inválido.');
      return;
    }

    const confirmed = await confirmRemoveAlert(`${item.nomeProduto} do carrinho`);
    if (!confirmed) return;

    const produtoId = item.produto._id;

    try {
      let response;
      if (tipo === 'comanda') {
        response = await comandaService.removeItem(sale._id, produtoId);
      } else {
        response = await saleService.removeItem(sale._id, produtoId);
      }

      if (response?.data) {
        setSale(response.data);
        setCart(response.data.itens || []);
      } else {
        setCart(prevCart => prevCart.filter(cartItem => cartItem._id !== item._id));
      }
    } catch (error: any) {
      console.error('Erro ao remover item:', error);
      Alert.alert('Erro', error?.response?.data?.error || 'Não foi possível remover o item.');
    }
  };

  const finalizeSale = async () => {
    console.log('🔄 FINALIZAR VENDA - Iniciando processo');
    console.log('📊 Estado atual:', {
      sale: sale?._id,
      cartLength: cart.length,
      paymentMethod,
      tipo
    });

    if (!sale || cart.length === 0) {
      console.log('❌ ERRO: Venda ou carrinho inválido');
      Alert.alert('Erro', 'Adicione pelo menos um item à venda');
      return;
    }

    try {
      const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
      const finalizeData = {
        formaPagamento: paymentMethod, // Corrigindo para usar 'formaPagamento' como a API espera
        total: total
      };
      
      console.log('📤 Dados sendo enviados para API:', finalizeData);
      console.log('🎯 Tipo de venda:', tipo);
      console.log('🆔 ID da venda:', sale._id);
      
      let response;
      if (tipo === 'comanda') {
        console.log('🌐 Chamando comandaService.finalize...');
        response = await comandaService.finalize(sale._id, finalizeData);
      } else {
        console.log('🌐 Chamando saleService.finalize...');
        response = await saleService.finalize(sale._id, finalizeData);
      }
      
      console.log('✅ Resposta da API recebida:', response.data);
      
      // Limpar dados após finalização bem-sucedida
      console.log('🧹 Limpando dados após finalização...');
      setCart([]);
      setSale(null);
      setNomeResponsavel('');
      setMesa(null);
      setComanda(null);
      
      Alert.alert('Sucesso', 'Venda finalizada com sucesso!', [
        { text: 'OK', onPress: () => {
          console.log('🔄 Voltando para tela anterior...');
          router.back();
        }}
      ]);
      
      // Fechar o modal
      setModalVisible(false);
      
    } catch (error: any) {
      console.error('❌ ERRO DETALHADO ao finalizar venda:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        config: error?.config,
        stack: error?.stack
      });
      
      let errorMessage = 'Não foi possível finalizar a venda';
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Erro', errorMessage);
    }
  };

  const formatMesaNumero = (numero: number | undefined | null) => {
    if (numero === undefined || numero === null) {
      return '00';
    }
    return numero.toString().padStart(2, '0');
  };

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenIdentifier screenName="Nova Venda" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isViewMode ? 'Visualizar Venda' : 'Nova Venda'}
          </Text>
          {mesa && (
            <Text style={styles.headerSubtitle}>
              Mesa {formatMesaNumero(mesa.numero)} {nomeResponsavel && `- ${nomeResponsavel}`}
            </Text>
          )}
          {sale && tipo === 'comanda' && comanda && (
             <Text style={styles.headerSubtitle}>
               Comanda: {comanda.nomeComanda || comanda.numeroComanda || 'Sem nome'}
             </Text>
           )}
        </View>
        
        <View style={styles.headerRight}>
          {isPhone && !isViewMode && cart.length > 0 && (
            <TouchableOpacity onPress={() => setItemsModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="list" size={18} color="#fff" />
              <Text style={styles.headerRightButtonText}>Ver itens</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <AddProductToTable
        saleItems={isPhone ? [] : cart}
        onAddProduct={addToCart}
        onUpdateItem={(item, newQty) => { updateCartItem(item, newQty); }}
        onRemoveItem={removeFromCart}
        isViewMode={isViewMode}
        hideSaleSection={isPhone}
      />

      {isPhone && (
        <SaleItemsModal
          visible={itemsModalVisible}
          items={cart}
          total={total}
          onClose={() => setItemsModalVisible(false)}
          onAddItems={() => setItemsModalVisible(false)}
          onIncrementItem={(item) => updateCartItem(item, item.quantidade + 1)}
          onDecrementItem={(item) => updateCartItem(item, Math.max(item.quantidade - 1, 0))}
          onRemoveItem={removeFromCart}
        />
      )}

      {!isViewMode && cart.length > 0 && (
        <TouchableOpacity
          style={[styles.finalizeButton, cart.length === 0 && styles.finalizeButtonDisabled]}
          onPress={() => {
            console.log('🔥 BOTÃO FINALIZAR CLICADO!');
            console.log('📊 Estado do carrinho:', cart.length);
            console.log('💰 Total:', total);
            setModalVisible(true);
          }}
          disabled={cart.length === 0}
        >
          <Text style={styles.finalizeButtonText}>
            Finalizar Venda - R$ {total.toFixed(2)}
          </Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Finalizar Venda</Text>
            <Text style={styles.modalSubtitle}>R$ {total.toFixed(2)}</Text>
            
            <Text style={styles.modalLabel}>Método de Pagamento:</Text>
            {paymentMethods.map(method => (
              <TouchableOpacity
                key={method.key}
                style={[
                  styles.paymentOption,
                  paymentMethod === method.key && styles.paymentOptionSelected
                ]}
                onPress={() => setPaymentMethod(method.key)}
              >
                <Ionicons 
                  name={method.icon} 
                  size={20} 
                  color={paymentMethod === method.key ? '#2196F3' : '#666'} 
                />
                <Text style={[
                  styles.paymentOptionText,
                  paymentMethod === method.key && styles.paymentOptionTextSelected
                ]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => {
                  console.log('🔥 BOTÃO CONFIRMAR CLICADO!');
                  console.log('💳 Método de pagamento selecionado:', paymentMethod);
                  console.log('💰 Total da venda:', total);
                  finalizeSale();
                }}
              >
                <Text style={styles.confirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  finalizeButton: {
    backgroundColor: '#4CAF50',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  finalizeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  finalizeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  paymentOptionSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#f0f8ff',
  },
  paymentOptionText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  paymentOptionTextSelected: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  headerRightButton: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerRightButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});