import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { productService, saleService, mesaService, comandaService } from '../src/services/api';
import { useAuth } from '../src/contexts/AuthContext';
import { useConfirmation } from '../src/contexts/ConfirmationContext';
import ProductSelectorModal from '../src/components/ProductSelectorModal';
import { Sale, CartItem, PaymentMethod, Product } from '../src/types/index';

const { width: screenWidth } = Dimensions.get('window');

export default function SaleScreen() {
  const { tipo, mesaId, vendaId, viewMode } = useLocalSearchParams();
  const { user } = useAuth() as any;
  const { confirmRemove } = useConfirmation();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [productSelectorVisible, setProductSelectorVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [mesa, setMesa] = useState<any>(null);
  const [comanda, setComanda] = useState<any>(null);
  const [cartAnimation] = useState(new Animated.Value(0));

  const categories = [
    { key: 'todos', label: 'Todos' },
    { key: 'bebidas-alcoolicas', label: 'Bebidas Alcoólicas' },
    { key: 'bebidas-nao-alcoolicas', label: 'Bebidas' },
    { key: 'petiscos', label: 'Petiscos' },
    { key: 'pratos-principais', label: 'Pratos' },
    { key: 'sobremesas', label: 'Sobremesas' },
  ];

  const paymentMethods: PaymentMethod[] = [
    { key: 'dinheiro', label: 'Dinheiro', icon: 'cash' },
    { key: 'cartao', label: 'Cartão', icon: 'card' },
    { key: 'pix', label: 'PIX', icon: 'phone-portrait' },
  ];

  useEffect(() => {
    // Verificar se estamos em modo de visualização (vindo do botão 'Ver Vendas')
    if (viewMode === 'view' || (mesaId && !vendaId)) {
      setIsViewMode(true);
      loadMesaSale();
    } else {
      setIsViewMode(false);
      loadProducts();
      if (vendaId) {
        if (tipo === 'comanda') {
          loadComandaSale();
        } else {
          loadSale();
        }
      } else {
        createNewSale();
      }
    }
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productService.getAll();
      setProducts(response.data.filter((p: Product) => p.ativo && p.disponivel));
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos');
    } finally {
      setLoading(false);
    }
  };

  const loadSale = async () => {
    try {
      const response = await saleService.getById(vendaId);
      console.log('🔍 loadSale response:', response.data);
      console.log('🔍 loadSale itens:', response.data.itens);
      setSale(response.data);
      setCart(response.data.itens || []);
    } catch (error) {
      console.error('Erro ao carregar venda:', error);
      Alert.alert('Erro', 'Não foi possível carregar a venda');
    }
  };

  const loadComandaSale = async () => {
    try {
      const response = await comandaService.getById(vendaId);
      console.log('🔍 loadComandaSale response:', response.data);
      console.log('🔍 loadComandaSale itens:', response.data.itens);
      setSale(response.data);
      setComanda(response.data);
      setCart(response.data.itens || []);
    } catch (error) {
      console.error('Erro ao carregar comanda:', error);
      Alert.alert('Erro', 'Não foi possível carregar a comanda');
    }
  };

  const loadMesaData = async () => {
    try {
      const response = await mesaService.getAll();
      const mesaData = response.data.find((m: any) => m._id === mesaId);
      if (mesaData) {
        setMesa(mesaData);
        console.log('🔍 Mesa data loaded:', mesaData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da mesa:', error);
    }
  };

  const loadMesaSale = async () => {
    try {
      // Carregar dados da mesa primeiro
      await loadMesaData();
      
      const response = await saleService.getByMesa(mesaId);
      console.log('🔍 loadMesaSale response:', response.data);
      if (response.data && response.data.length > 0) {
        // Pega a venda ativa da mesa
        const activeSale = response.data.find((sale: Sale) => sale.status === 'aberta') || response.data[0];
        console.log('🔍 loadMesaSale activeSale:', activeSale);
        console.log('🔍 loadMesaSale activeSale.itens:', activeSale.itens);
        
        // Extrair nome do responsável das observações
        if (activeSale.observacoes) {
          const match = activeSale.observacoes.match(/Responsavel:\s*(.+)/i);
          if (match) {
            setNomeResponsavel(match[1].trim());
            console.log('🔍 Nome do responsável encontrado:', match[1].trim());
          }
        }
        
        setSale(activeSale);
        setCart(activeSale.itens || []);
      } else {
        // Se não há venda ativa, cria uma nova
        createNewSale();
      }
    } catch (error) {
      console.error('Erro ao carregar venda da mesa:', error);
      // Se der erro, cria uma nova venda
      createNewSale();
    }
  };

  const createNewSale = async () => {
    try {
      const saleData: any = {
        funcionario: user._id,
        tipoVenda: tipo || 'balcao',
      };

      if (mesaId) {
        saleData.mesa = mesaId;
      }

      console.log('🔍 createNewSale saleData:', saleData);
      const response = await saleService.create(saleData);
      console.log('🔍 createNewSale response:', response.data);
      setSale(response.data);
    } catch (error) {
      console.error('Erro ao criar venda:', error);
      Alert.alert('Erro', 'Não foi possível criar a venda');
      router.back();
    }
  };

  const addToCart = async (product: Product, quantity = 1) => {
    if (!sale) return;

    try {
      const existingItem = cart.find(item => item.produto._id === product._id);
      
      if (existingItem) {
        // Atualizar quantidade
        const newQuantity = existingItem.quantidade + quantity;
        if (tipo === 'comanda') {
          await comandaService.updateItem(sale._id, existingItem._id, {
            quantidade: newQuantity,
            subtotal: newQuantity * product.precoVenda
          });
        } else {
          await saleService.updateItem(sale._id, existingItem._id, {
            quantidade: newQuantity,
            subtotal: newQuantity * product.precoVenda
          });
        }
      } else {
        // Adicionar novo item
        const itemData = {
          produto: product._id,
          nomeProduto: product.nome,
          quantidade: quantity,
          precoUnitario: product.precoVenda,
          subtotal: product.precoVenda * quantity
        };
        if (tipo === 'comanda') {
          const response = await comandaService.addItem(sale._id, itemData);
          setCart(prevCart => [...prevCart, response.data]);
        } else {
          const response = await saleService.addItem(sale._id, itemData);
          setCart(prevCart => [...prevCart, response.data]);
        }
      }
      
      animateCart();
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o item');
    }
  };

  const animateCart = () => {
    Animated.sequence([
      Animated.timing(cartAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(cartAnimation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const openProductSelector = (product: any) => {
    setSelectedProduct(product);
    setProductSelectorVisible(true);
  };

  const handleProductSelect = async (product: any, quantity: number) => {
    await addToCart(product, quantity);
    setProductSelectorVisible(false);
    setSelectedProduct(null);
  };

  const handleCloseProductSelector = () => {
    setProductSelectorVisible(false);
    setSelectedProduct(null);
  };

  const increaseQuantity = (item: any) => {
    console.log('🔍 increaseQuantity chamada com item:', item);
    
    setCart(prevCart => {
      return prevCart.map(cartItem => {
        if (cartItem._id === item._id) {
          const newQuantity = cartItem.quantidade + 1;
          return {
            ...cartItem,
            quantidade: newQuantity,
            subtotal: cartItem.precoUnitario * newQuantity
          };
        }
        return cartItem;
      });
    });
  };

  const removeFromCart = async (item: any) => {
    console.log('🔍 removeFromCart chamada com item:', item);
    
    const confirmed = await confirmRemove(
      item.quantidade > 1 
        ? `uma unidade de ${item.nomeProduto}`
        : `${item.nomeProduto} do carrinho`
    );

    if (!confirmed) return;

    setCart(prevCart => {
      if (item.quantidade > 1) {
        // Diminui a quantidade
        return prevCart.map(cartItem => {
          if (cartItem._id === item._id) {
            const newQuantity = cartItem.quantidade - 1;
            return {
              ...cartItem,
              quantidade: newQuantity,
              subtotal: cartItem.precoUnitario * newQuantity
            };
          }
          return cartItem;
        });
      } else {
        // Remove o item completamente
        return prevCart.filter(cartItem => cartItem._id !== item._id);
      }
    });
  };

  const finalizeSale = async () => {
    if (!sale || cart.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos um item à venda');
      return;
    }

    try {
      const finalizeData = {
        metodoPagamento: paymentMethod,
        total: total
      };
      
      if (tipo === 'comanda') {
        await comandaService.finalize(sale._id, finalizeData);
      } else {
        await saleService.finalize(sale._id, finalizeData);
      }
      
      setModalVisible(false);
      Alert.alert(
        'Sucesso',
        'Venda finalizada com sucesso!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      Alert.alert('Erro', 'Não foi possível finalizar a venda');
    }
  };

  const filteredProducts = products.filter((p: Product) => {
    const matchesSearch = p.nome.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || p.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const total = cart.reduce((sum, item) => sum + (item.quantidade * item.precoUnitario), 0);

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.productCard} onPress={() => openProductSelector(item)}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.nome}</Text>
        <Text style={styles.productDescription}>{item.descricao}</Text>
        <Text style={styles.productPrice}>
          R$ {item.precoVenda.toFixed(2)}
        </Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => openProductSelector(item)}>
        <Ionicons name="add" size={20} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }: { item: any }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.nomeProduto}</Text>
        <Text style={styles.cartItemPrice}>
          R$ {item.precoUnitario.toFixed(2)} x {item.quantidade}
        </Text>
      </View>
      <View style={styles.cartItemActions}>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => removeFromCart(item)}
        >
          <Ionicons name="remove" size={16} color="#FF5722" />
        </TouchableOpacity>
        <Text style={styles.cartItemQuantity}>{item.quantidade}</Text>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => increaseQuantity(item)}
        >
          <Ionicons name="add" size={16} color="#4CAF50" />
        </TouchableOpacity>
      </View>
      <Text style={styles.cartItemTotal}>
        R$ {item.subtotal.toFixed(2)}
      </Text>
    </View>
  );

  // Função para formatar o número da mesa com zero à esquerda
  const formatMesaNumero = (numero: number) => {
    if (!numero && numero !== 0) return '00';
    const numeroStr = numero.toString();
    return numeroStr.padStart(2, '0');
  };

  // Função para formatar data e hora separadamente
  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('pt-BR');
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
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
          {!isViewMode && (
            <TouchableOpacity 
              style={styles.addProductButton}
              onPress={() => setProductSelectorVisible(true)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!isViewMode && (
        <>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar produtos..."
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
            {categories.map(category => (
              <TouchableOpacity
                key={category.key}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.key && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(category.key)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === category.key && styles.categoryButtonTextActive
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <View style={[styles.content, screenWidth < 768 && styles.contentMobile]}>
        {!isViewMode && (
          <View style={[styles.productsSection, screenWidth < 768 && styles.productsSectionMobile]}>
            <FlatList
              data={filteredProducts}
              renderItem={renderProduct}
              keyExtractor={(item) => item._id}
              numColumns={screenWidth < 768 ? 1 : 2}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
            />
          </View>
        )}

        <View style={[
          styles.cartSection, 
          isViewMode && styles.cartSectionFullWidth,
          screenWidth < 768 && styles.cartSectionMobile
        ]}>
          <Animated.View 
            style={[
              styles.cartHeader,
              {
                transform: [{
                  scale: cartAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.05],
                  }),
                }],
              },
            ]}
          >
            <View style={styles.cartHeaderLeft}>
              <Text style={styles.cartTitle}>Carrinho</Text>
              <Text style={styles.cartItemCount}>({cart.length} {cart.length === 1 ? 'item' : 'itens'})</Text>
            </View>
            <Text style={styles.cartTotal}>R$ {total.toFixed(2)}</Text>
          </Animated.View>
          
          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Ionicons name="cart-outline" size={48} color="#ccc" />
              <Text style={styles.emptyCartText}>Carrinho vazio</Text>
              <Text style={styles.emptyCartSubtext}>
                {isViewMode ? 'Nenhum item nesta venda' : 'Adicione produtos para começar'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={cart}
              renderItem={renderCartItem}
              keyExtractor={(item) => item._id}
              style={styles.cartList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.cartListContent}
            />
          )}
          
          {!isViewMode && (
            <TouchableOpacity
              style={[styles.finalizeButton, cart.length === 0 && styles.finalizeButtonDisabled]}
              onPress={() => setModalVisible(true)}
              disabled={cart.length === 0}
            >
              <Text style={styles.finalizeButtonText}>Finalizar Venda</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Finalizar Venda</Text>
            
            <Text style={styles.modalSubtitle}>
              Total: R$ {total.toFixed(2)}
            </Text>
            
            <Text style={styles.modalLabel}>Forma de Pagamento:</Text>
            
            {paymentMethods.map(method => (
              <TouchableOpacity
                key={method.key}
                style={[
                  styles.paymentOption,
                  paymentMethod === method.key && styles.paymentOptionSelected
                ]}
                onPress={() => setPaymentMethod(method.key)}
              >
                <Ionicons name={method.icon} size={20} color={paymentMethod === method.key ? '#2196F3' : '#666'} />
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
                onPress={finalizeSale}
              >
                <Text style={styles.confirmButtonText}>Finalizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ProductSelectorModal
        visible={productSelectorVisible}
        onClose={handleCloseProductSelector}
        onProductSelect={handleProductSelect}
        title="Adicionar Produto"
      />
    </SafeAreaView>
  );
}

// Estilos iguais ao SaleScreen.js anterior
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  addProductButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#2196F3',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  contentMobile: {
    flexDirection: 'column',
  },
  productsSection: {
    flex: 2,
    padding: 16,
  },
  productsSectionMobile: {
    flex: 1,
    maxHeight: '50%',
  },
  productsList: {
    paddingBottom: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    margin: 4,
    flex: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  cartSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: '#ddd',
  },
  cartSectionFullWidth: {
    borderLeftWidth: 0,
  },
  cartSectionMobile: {
    borderLeftWidth: 0,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    flex: 1,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  cartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cartItemCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  cartListContent: {
    paddingBottom: 16,
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#666',
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cartButton: {
    padding: 4,
  },
  cartItemQuantity: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    minWidth: 60,
    textAlign: 'right',
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
});