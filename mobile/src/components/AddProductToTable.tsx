import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productService, categoryService } from '../services/api';
import ProductSelectorModal from './ProductSelectorModal';
import SearchAndFilter from './SearchAndFilter';
import { Product, CartItem } from '../types/index';

const { width: screenWidth } = Dimensions.get('window');

interface AddProductToTableProps {
  saleItems: CartItem[];
  onAddProduct: (product: Product) => void;
  onUpdateItem: (item: CartItem, newQuantity: number) => void;
  onRemoveItem: (item: CartItem) => void;
  isViewMode?: boolean;
}

const AddProductToTable: React.FC<AddProductToTableProps> = ({
  saleItems,
  onAddProduct,
  onUpdateItem,
  onRemoveItem,
  isViewMode = false,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [productSelectorVisible, setProductSelectorVisible] = useState(false);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      console.log('📦 Carregando produtos...');
      const response = await productService.getAll();
      console.log('📦 Produtos carregados:', response.data?.length || 0);
      setProducts(response.data || []);
    } catch (error) {
      console.error('❌ Erro ao carregar produtos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      console.log('📦 Carregando categorias do banco...');
      const data = await categoryService.getAll();
      
      const categoryFilters = [
        { key: 'todos', label: 'Todos' },
        ...data.map((cat: any) => ({
          key: cat._id,
          label: cat.nome
        }))
      ];
      
      console.log('📦 Categorias carregadas:', categoryFilters.length);
      setCategories(categoryFilters);
    } catch (error) {
      console.error('❌ Erro ao carregar categorias:', error);
      // Fallback para categorias padrão apenas em caso de erro
      console.log('⚠️ Usando categorias padrão como fallback');
      setCategories([
        { key: 'todos', label: 'Todos' },
        { key: 'bebidas-alcoolicas', label: 'Bebidas Alcoólicas' },
        { key: 'bebidas-nao-alcoolicas', label: 'Bebidas Não Alcoólicas' },
        { key: 'pratos-principais', label: 'Pratos Principais' },
        { key: 'aperitivos', label: 'Aperitivos' },
        { key: 'sobremesas', label: 'Sobremesas' },
      ]);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nome.toLowerCase().includes(searchText.toLowerCase()) ||
                         product.descricao?.toLowerCase().includes(searchText.toLowerCase());
    
    // Filtro de categoria corrigido
    let matchesCategory = true;
    if (selectedCategory !== 'todos') {
      // Verifica se o produto pertence à categoria selecionada (por ID ou nome)
      matchesCategory = product.categoria === selectedCategory || 
                       product.categoria?.toLowerCase() === selectedCategory.toLowerCase();
    }
    
    return matchesSearch && matchesCategory && product.ativo && product.disponivel;
  });

  const handleProductSelect = (product: Product) => {
    console.log('🟢 Produto selecionado:', product.nome);
    
    if (isViewMode) {
      console.log('⚠️ Modo visualização ativo');
      return;
    }
    
    try {
      onAddProduct(product);
      console.log('✅ Produto adicionado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao adicionar produto:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o produto');
    }
  };

  const handleCategorySelect = (categoryKey: string) => {
    console.log('🏷️ Categoria selecionada:', categoryKey);
    setSelectedCategory(categoryKey);
  };

  const handleFilterChange = (filterKey: string) => {
    setSelectedCategory(filterKey);
    console.log('🏷️ Filtro de categoria alterado:', filterKey);
  };

  const handleProductSelectorSelect = (product: Product, quantity: number) => {
    for (let i = 0; i < quantity; i++) {
      onAddProduct(product);
    }
    setProductSelectorVisible(false);
  };

  // Novo layout em linha única para produtos
  const renderProductRow = ({ item }: { item: Product }) => (
    <View style={styles.productRow}>
      <View style={styles.productLeftSection}>
        <Text style={styles.productName}>{item.nome}</Text>
        {item.descricao && (
          <Text style={styles.productDescription}>{item.descricao}</Text>
        )}
      </View>
      
      <View style={styles.productRightSection}>
        <Text style={styles.productPrice}>
          R$ {item.precoVenda?.toFixed(2) || '0.00'}
        </Text>
        
        {!isViewMode && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleProductSelect(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderSaleItem = ({ item }: { item: CartItem }) => (
    <View style={styles.saleItem}>
      <View style={styles.saleItemLeft}>
        <Text style={styles.saleItemName}>{item.nomeProduto}</Text>
        <Text style={styles.saleItemPrice}>
          R$ {item.precoUnitario?.toFixed(2) || '0.00'} cada
        </Text>
      </View>
      
      <View style={styles.saleItemRight}>
        {!isViewMode && (
          <View style={styles.saleItemActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onRemoveItem(item)}
            >
              <Ionicons name="remove" size={16} color="#ff4444" />
            </TouchableOpacity>
            
            <Text style={styles.saleItemQuantity}>{item.quantidade}</Text>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onUpdateItem(item, item.quantidade + 1)}
            >
              <Ionicons name="add" size={16} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        )}
        
        <Text style={styles.saleItemTotal}>
          R$ {item.subtotal?.toFixed(2) || '0.00'}
        </Text>
      </View>
    </View>
  );

  const total = saleItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  return (
    <View style={styles.container}>
      {!isViewMode && (
        <SearchAndFilter
          searchText={searchText}
          onSearchChange={setSearchText}
          searchPlaceholder="Buscar produtos..."
          filters={categories}
          selectedFilter={selectedCategory}
          onFilterChange={handleFilterChange}
        />
      )}

      <View style={[styles.content, screenWidth < 768 && styles.contentMobile]}>
        {!isViewMode && (
          <View style={[
            styles.productsSection,
            screenWidth < 768 && styles.productsSectionMobile
          ]}>
            <Text style={styles.sectionTitle}>Produtos Disponíveis</Text>
            <FlatList
              data={filteredProducts}
              renderItem={renderProductRow}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.productsList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        )}

        <View style={[
          styles.saleSection,
          screenWidth < 768 && styles.saleSectionMobile,
          isViewMode && styles.saleSectionFullWidth
        ]}>
          <View style={styles.saleHeader}>
            <View style={styles.saleHeaderLeft}>
              <Text style={styles.saleTitle}>Itens da Venda</Text>
              <Text style={styles.saleItemCount}>({saleItems.length} itens)</Text>
            </View>
            <Text style={styles.saleTotal}>R$ {total.toFixed(2)}</Text>
          </View>

          {saleItems.length === 0 ? (
            <View style={styles.emptySale}>
              <Ionicons name="receipt-outline" size={48} color="#ccc" />
              <Text style={styles.emptySaleText}>Nenhum item adicionado</Text>
              <Text style={styles.emptySaleSubtext}>
                Adicione produtos para começar a venda
              </Text>
            </View>
          ) : (
            <FlatList
              data={saleItems}
              renderItem={renderSaleItem}
              keyExtractor={(item) => item._id}
              style={styles.saleList}
              contentContainerStyle={styles.saleListContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>

      <ProductSelectorModal
        visible={productSelectorVisible}
        onClose={() => setProductSelectorVisible(false)}
        onProductSelect={handleProductSelectorSelect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#fff',
  },
  productsSectionMobile: {
    flex: 1,
    maxHeight: '50%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  productsList: {
    paddingBottom: 16,
  },
  // Novo estilo para layout em linha
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productLeftSection: {
    flex: 1,
    marginRight: 12,
  },
  productRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    minWidth: 80,
    textAlign: 'right',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  saleSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: '#ddd',
  },
  saleSectionFullWidth: {
    borderLeftWidth: 0,
  },
  saleSectionMobile: {
    borderLeftWidth: 0,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    flex: 1,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  saleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  saleItemCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  emptySale: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptySaleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySaleSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  saleListContent: {
    paddingBottom: 16,
  },
  saleTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  saleList: {
    flex: 1,
  },
  saleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  saleItemLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  saleItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saleItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  saleItemPrice: {
    fontSize: 12,
    color: '#666',
  },
  saleItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  actionButton: {
    padding: 4,
  },
  saleItemQuantity: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  saleItemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    minWidth: 60,
    textAlign: 'right',
  },
});

export default AddProductToTable;