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
  hideSaleSection?: boolean;
}

const AddProductToTable: React.FC<AddProductToTableProps> = ({
  saleItems,
  onAddProduct,
  onUpdateItem,
  onRemoveItem,
  isViewMode = false,
  hideSaleSection = false,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [productSelectorVisible, setProductSelectorVisible] = useState(false);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  // Aplicar filtros sempre que os dados ou filtros mudarem
  useEffect(() => {
    filterProducts();
  }, [searchText, products, selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      console.log('📦 Carregando produtos...');
      const response = await productService.getAll();
      console.log('📦 Produtos carregados:', response.data?.length || 0);
      const normalized = (response?.data || []).map((p: any) => ({
        ...p,
        nome: p?.nome ?? p?.nomeProduto ?? p?.produto?.nome ?? p?.name ?? 'Produto',
      }));
      setProducts(normalized as Product[]);
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

  // Lógica de filtragem igual à tela de produtos
  const filterProducts = () => {
    let filtered = products;

    // Filtro por categoria (igual à tela de produtos)
    if (selectedCategory) {
      filtered = filtered.filter(produto => produto.categoria === selectedCategory);
    }

    // Filtro por texto de busca (igual à tela de produtos)
    if (searchText.trim()) {
      filtered = filtered.filter(produto =>
        produto.nome.toLowerCase().includes(searchText.toLowerCase()) ||
        produto.categoria.toLowerCase().includes(searchText.toLowerCase()) ||
        (produto.grupo && produto.grupo.toLowerCase().includes(searchText.toLowerCase())) ||
        (produto.descricao && produto.descricao.toLowerCase().includes(searchText.toLowerCase()))
      );
    }

    // Filtrar apenas produtos ativos e disponíveis
    filtered = filtered.filter(produto => produto.ativo && produto.disponivel);

    setFilteredProducts(filtered);
  };

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

  // Função de mudança de filtro igual à tela de produtos
  const handleFilterChange = (filterKey: string) => {
    setSelectedCategory(filterKey);
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
        <Text style={styles.productName} numberOfLines={1} ellipsizeMode="tail">
          {(item as any)?.nome ?? (item as any)?.nomeProduto ?? (item as any)?.produto?.nome ?? 'Produto'}
        </Text>
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

        {!hideSaleSection && (
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
        )}
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
    padding: 12,
    backgroundColor: '#fff',
  },
  productsSectionMobile: {
    flex: 1,
    // maxHeight removido para aproveitar melhor a área visível
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  productsList: {
    paddingBottom: 0,
  },
  // Novo estilo para layout em linha
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  productLeftSection: {
    flex: 1,
    marginRight: 8,
  },
  productRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 1,
  },
  productDescription: {
    fontSize: 11,
    color: '#666',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2196F3',
    minWidth: 70,
    textAlign: 'right',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 12,
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