import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../services/api';

const { width: screenWidth } = Dimensions.get('window');

interface Product {
  _id: string;
  nome: string;
  descricao: string;
  precoVenda: number;
  categoria: string;
  ativo: boolean;
  disponivel: boolean;
}

interface ProductSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onProductSelect: (product: Product, quantity: number) => void;
  title?: string;
}

export default function ProductSelectorModal({
  visible,
  onClose,
  onProductSelect,
  title = 'Selecionar Produto'
}: ProductSelectorModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);

  const categories = [
    { key: 'todos', label: 'Todos' },
    { key: 'bebidas-alcoolicas', label: 'Bebidas Alcoólicas' },
    { key: 'bebidas-nao-alcoolicas', label: 'Bebidas' },
    { key: 'petiscos', label: 'Petiscos' },
    { key: 'pratos-principais', label: 'Pratos' },
    { key: 'sobremesas', label: 'Sobremesas' },
  ];

  useEffect(() => {
    if (visible) {
      loadProducts();
    }
  }, [visible]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await productService.getAll();
      const activeProducts = response.data.filter((product: Product) => 
        product.ativo && product.disponivel
      );
      setProducts(activeProducts);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nome.toLowerCase().includes(searchText.toLowerCase()) ||
                         product.descricao.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || product.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleProductPress = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
  };

  const handleConfirm = () => {
    if (selectedProduct && quantity > 0) {
      onProductSelect(selectedProduct, quantity);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setSearchText('');
    setSelectedCategory('todos');
    onClose();
  };

  const increaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        selectedProduct?._id === item._id && styles.productCardSelected
      ]}
      onPress={() => handleProductPress(item)}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.nome}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.descricao}
        </Text>
        <Text style={styles.productPrice}>
          R$ {item.precoVenda.toFixed(2)}
        </Text>
      </View>
      {selectedProduct?._id === item._id && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar produtos..."
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
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

        {/* Products List */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Carregando produtos...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              renderItem={renderProduct}
              keyExtractor={(item) => item._id}
              numColumns={screenWidth > 768 ? 2 : 1}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
                  <Text style={styles.emptySubtext}>
                    Tente ajustar os filtros de busca
                  </Text>
                </View>
              }
            />
          )}
        </View>

        {/* Quantity Selector */}
        {selectedProduct && (
          <View style={styles.quantityContainer}>
            <View style={styles.selectedProductInfo}>
              <Text style={styles.selectedProductName}>{selectedProduct.nome}</Text>
              <Text style={styles.selectedProductPrice}>
                R$ {selectedProduct.precoVenda.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.quantitySelector}>
              <Text style={styles.quantityLabel}>Quantidade:</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
                  onPress={decreaseQuantity}
                  disabled={quantity <= 1}
                >
                  <Ionicons name="remove" size={20} color={quantity <= 1 ? "#ccc" : "#333"} />
                </TouchableOpacity>
                
                <Text style={styles.quantityValue}>{quantity}</Text>
                
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={increaseQuantity}
                >
                  <Ionicons name="add" size={20} color="#333" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>
                R$ {(selectedProduct.precoVenda * quantity).toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.confirmButton,
              !selectedProduct && styles.confirmButtonDisabled
            ]}
            onPress={handleConfirm}
            disabled={!selectedProduct}
          >
            <Text style={[
              styles.confirmButtonText,
              !selectedProduct && styles.confirmButtonTextDisabled
            ]}>
              Adicionar ao Carrinho
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  productsList: {
    padding: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productCardSelected: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#f0f8ff',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  selectedIndicator: {
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  quantityContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  selectedProductInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedProductName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  selectedProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  quantitySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  quantityLabel: {
    fontSize: 16,
    color: '#333',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    marginRight: 8,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  confirmButtonTextDisabled: {
    color: '#999',
  },
});