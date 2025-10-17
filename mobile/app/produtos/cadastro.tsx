import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../src/contexts/AuthContext';
import { useProduct } from '../../src/contexts/ProductContext';
import { productService, typeService, unidadeMedidaService, categoryService } from '../../src/services/api';

interface Categoria {
  id: string;
  nome: string;
}

interface Tipo {
  id: string;
  nome: string;
}

interface UnidadeMedida {
  id: string;
  nome: string;
  sigla: string;
}

interface ValidationErrors {
  nome?: string;
  preco?: string;
  categoria?: string;
  descricao?: string;
  estoque?: string;
}

export default function CadastroProduto() {
  const { hasPermission } = useAuth() as any;
  const { triggerRefresh } = useProduct();
  const { id } = useLocalSearchParams();
  const isEditing = !!id;
  
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [precoCusto, setPrecoCusto] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [unidadeId, setUnidadeId] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [estoque, setEstoque] = useState('');
  const [estoqueMinimo, setEstoqueMinimo] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [dataInclusao, setDataInclusao] = useState(new Date());
  const [dataAlteracao, setDataAlteracao] = useState(new Date());

  // Estados para validação
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [hasInteracted, setHasInteracted] = useState({
    nome: false,
    preco: false,
    categoria: false,
    descricao: false,
    estoque: false,
  });

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [unidades, setUnidades] = useState<UnidadeMedida[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [loadingTipos, setLoadingTipos] = useState(false);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [showUnidadeModal, setShowUnidadeModal] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState<UnidadeMedida | null>(null);

  // Estados para feedback visual
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Validação em tempo real
  const validateField = (fieldName: string, value: string): string | undefined => {
    switch (fieldName) {
      case 'nome':
        if (!value.trim()) return 'Nome é obrigatório';
        if (value.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres';
        return undefined;
      
      case 'preco':
        if (!value.trim()) return 'Preço é obrigatório';
        const precoNum = parseFloat(value.replace(',', '.'));
        if (isNaN(precoNum) || precoNum <= 0) return 'Preço deve ser maior que zero';
        return undefined;
      
      case 'categoria':
        if (!value) return 'Categoria é obrigatória';
        return undefined;
      
      case 'descricao':
        if (value.length > 500) return 'Descrição não pode ter mais de 500 caracteres';
        return undefined;
      
      case 'estoque':
        if (value && isNaN(parseInt(value))) return 'Estoque deve ser um número válido';
        return undefined;
      
      default:
        return undefined;
    }
  };

  // Validação completa do formulário
  const isFormValid = useMemo(() => {
    const errors: ValidationErrors = {};
    
    errors.nome = validateField('nome', nome);
    errors.preco = validateField('preco', preco);
    errors.categoria = validateField('categoria', categoriaId);
    errors.descricao = validateField('descricao', descricao);
    errors.estoque = validateField('estoque', estoque);

    setValidationErrors(errors);
    
    return !Object.values(errors).some(error => error !== undefined);
  }, [nome, preco, categoriaId, descricao, estoque]);

  useEffect(() => {
    if (!hasPermission('produtos')) {
      Alert.alert(
        'Acesso Negado',
        'Você não tem permissão para acessar esta funcionalidade.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [hasPermission]);

  // Carregar tipos e unidades da API
  useEffect(() => {
    loadCategorias();
    loadTipos();
    loadUnidades();
  }, []);

  const loadCategorias = async () => {
    setLoadingCategorias(true);
    try {
      const categoriasData = await categoryService.getAll();
      setCategorias(categoriasData.map((categoria: any) => ({
        id: categoria._id,
        nome: categoria.nome
      })));
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
    } finally {
      setLoadingCategorias(false);
    }
  };

  const loadTipos = async () => {
    setLoadingTipos(true);
    try {
      const tiposData = await typeService.getAll();
      setTipos(tiposData.map((tipo: any) => ({
        id: tipo._id,
        nome: tipo.nome
      })));
    } catch (error) {
      console.error('Erro ao carregar tipos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os tipos');
    } finally {
      setLoadingTipos(false);
    }
  };

  const loadUnidades = async () => {
    setLoadingUnidades(true);
    try {
      const unidadesData = await unidadeMedidaService.getAll();
      setUnidades(unidadesData.map((unidade: any) => ({
        id: unidade._id,
        nome: unidade.nome,
        sigla: unidade.sigla
      })));
    } catch (error) {
      console.error('Erro ao carregar unidades:', error);
      Alert.alert('Erro', 'Não foi possível carregar as unidades de medida');
    } finally {
      setLoadingUnidades(false);
    }
  };

  // Funções para gerenciar seleção de unidades
  const handleUnidadeSelect = (unidade: UnidadeMedida) => {
    setSelectedUnidade(unidade);
    setUnidadeId(unidade.id);
    setShowUnidadeModal(false);
  };

  const getSelectedUnidadeText = () => {
    if (selectedUnidade) {
      return `${selectedUnidade.nome} (${selectedUnidade.sigla})`;
    }
    const unidade = unidades.find(u => u.id === unidadeId);
    if (unidade) {
      return `${unidade.nome} (${unidade.sigla})`;
    }
    return 'Selecione uma unidade';
  };

  // Carregar dados do produto para edição
  useEffect(() => {
    if (isEditing && id && categorias.length > 0 && tipos.length > 0 && unidades.length > 0) {
      loadProduct(id as string);
    }
  }, [isEditing, id, categorias, tipos, unidades]);

  const loadProduct = async (productId: string) => {
    setLoadingProduct(true);
    try {
      const response = await productService.getById(productId);
      const produto = response.data;
      
      if (produto) {
        setNome(produto.nome || '');
        setDescricao(produto.descricao || '');
        setPreco(produto.precoVenda ? produto.precoVenda.toFixed(2) : '');
        setPrecoCusto(produto.precoCusto ? produto.precoCusto.toFixed(2) : '');
        
        // Buscar categoria pelo nome para obter o ID
        const categoriaEncontrada = categorias.find(categoria => categoria.nome === produto.categoria);
        setCategoriaId(categoriaEncontrada?.id || (categorias.length > 0 ? categorias[0].id : ''));
        
        // Mapear grupo para tipo (se existir)
        const tipoEncontrado = tipos.find(tipo => tipo.nome === produto.grupo);
        setTipoId(tipoEncontrado?.id || (tipos.length > 0 ? tipos[0].id : ''));
        
        // Mapear unidade
        const unidadeEncontrada = unidades.find(unidade => unidade.sigla === produto.unidade);
        setUnidadeId(unidadeEncontrada?.id || (unidades.length > 0 ? unidades[0].id : ''));
        setSelectedUnidade(unidadeEncontrada || null);
        
        setCodigoBarras(''); // Não existe no modelo atual
        setEstoque(produto.quantidade ? produto.quantidade.toString() : '0');
        setEstoqueMinimo('5'); // Valor padrão
        setAtivo(produto.ativo !== undefined ? produto.ativo : true);
        setDataInclusao(produto.dataInclusao ? new Date(produto.dataInclusao) : new Date());
        setDataAlteracao(new Date());
      } else {
        Alert.alert('Erro', 'Produto não encontrado.');
        router.back();
      }
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do produto.');
      router.back();
    } finally {
      setLoadingProduct(false);
    }
  };

  if (!hasPermission('produtos')) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Acesso negado</Text>
      </View>
    );
  }

  if (loadingProduct) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2196F3" />
          </TouchableOpacity>
          <Text style={styles.title}>Carregando...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Carregando dados do produto...</Text>
        </View>
      </View>
    );
  }

  const handleSave = async () => {
    // Marcar todos os campos como interagidos para mostrar erros
    setHasInteracted({
      nome: true,
      preco: true,
      categoria: true,
      descricao: true,
      estoque: true,
    });

    if (!isFormValid) {
      setSaveError('Por favor, corrija os erros no formulário antes de continuar.');
      return;
    }

    setLoading(true);
    setSaveError(null);
    setSaveSuccess(false);
    setDataAlteracao(new Date());

    try {
      // Buscar categoria, tipo e unidade selecionados pelos IDs
      const categoriaSelecionada = categorias.find(categoria => categoria.id === categoriaId);
      const tipoSelecionado = tipos.find(tipo => tipo.id === tipoId);
      const unidadeSelecionada = unidades.find(unidade => unidade.id === unidadeId);

      const productData = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        preco: parseFloat(preco.replace(',', '.')),
        precoCusto: precoCusto ? parseFloat(precoCusto.replace(',', '.')) : 0,
        categoria: categoriaSelecionada?.nome || '',
        grupo: tipoSelecionado?.nome || '',
        unidade: unidadeSelecionada?.sigla || 'un',
        estoque: estoque ? parseInt(estoque) : 0,
        estoqueMinimo: estoqueMinimo ? parseInt(estoqueMinimo) : 0,
        ativo: ativo
      };

      let response;
      if (isEditing && id) {
        response = await productService.update(id as string, productData);
      } else {
        response = await productService.create(productData);
      }

      // Sucesso
      setSaveSuccess(true);
      setLoading(false);

      const successMessage = isEditing ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!';
      
      setTimeout(() => {
        Alert.alert(
          'Sucesso',
          successMessage,
          [
            {
              text: 'OK',
              onPress: () => {
                if (isEditing) {
                  triggerRefresh('update');
                  setTimeout(() => {
                    router.back();
                  }, 100);
                } else {
                  triggerRefresh('create');
                  // Limpar formulário para novo cadastro
                  setNome('');
                  setDescricao('');
                  setPreco('');
                  setPrecoCusto('');
                  setCategoriaId('');
                  setTipoId('');
                  setUnidadeId('');
                  setEstoque('');
                  setEstoqueMinimo('');
                  setAtivo(true);
                  setDataAlteracao(new Date());
                  setSaveSuccess(false);
                  // Resetar interações
                  setHasInteracted({
                    nome: false,
                    preco: false,
                    categoria: false,
                    descricao: false,
                    estoque: false,
                  });
                }
              }
            }
          ]
        );
      }, 100);
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      const errorMessage = error?.response?.data?.message || 
        (isEditing ? 'Erro ao atualizar produto. Tente novamente.' : 'Erro ao cadastrar produto. Tente novamente.');
      setSaveError(errorMessage);
      setLoading(false);
    }
  };

  const formatPrice = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    const formattedValue = (parseInt(numericValue) / 100).toFixed(2);
    return formattedValue;
  };

  const handlePriceChange = (value: string) => {
    const formatted = formatPrice(value);
    setPreco(formatted);
    setDataAlteracao(new Date());
    setHasInteracted(prev => ({ ...prev, preco: true }));
  };

  const handleCostPriceChange = (value: string) => {
    const formatted = formatPrice(value);
    setPrecoCusto(formatted);
    setDataAlteracao(new Date());
  };

  const handleFieldChange = (setter: (value: any) => void, value: any, fieldName?: string) => {
    setter(value);
    setDataAlteracao(new Date());
    if (fieldName) {
      setHasInteracted(prev => ({ ...prev, [fieldName]: true }));
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInputStyle = (fieldName: string) => {
    const hasError = hasInteracted[fieldName as keyof typeof hasInteracted] && validationErrors[fieldName as keyof ValidationErrors];
    return [
      styles.input,
      hasError && styles.inputError,
      saveSuccess && styles.inputSuccess
    ];
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Compacto */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#2196F3" />
          </TouchableOpacity>
          <Text style={styles.title}>{isEditing ? 'Editar Produto' : 'Novo Produto'}</Text>
          {saveSuccess && (
            <View style={styles.successIndicator}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            </View>
          )}
        </View>

        {/* Mensagem de erro global */}
        {saveError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#f44336" />
            <Text style={styles.errorMessage}>{saveError}</Text>
          </View>
        )}

        <View style={styles.form}>
          {/* Card de Informações Básicas */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="information-circle" size={20} color="#2196F3" />
              <Text style={styles.cardTitle}>Informações Básicas</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome *</Text>
              <TextInput
                style={getInputStyle('nome')}
                value={nome}
                onChangeText={(value) => handleFieldChange(setNome, value, 'nome')}
                placeholder="Nome do produto"
                placeholderTextColor="#999"
              />
              {hasInteracted.nome && validationErrors.nome && (
                <Text style={styles.errorText}>{validationErrors.nome}</Text>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Preço Venda (R$) *</Text>
                <TextInput
                  style={getInputStyle('preco')}
                  value={preco}
                  onChangeText={handlePriceChange}
                  placeholder="0,00"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                {hasInteracted.preco && validationErrors.preco && (
                  <Text style={styles.errorText}>{validationErrors.preco}</Text>
                )}
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Preço Custo (R$)</Text>
                <TextInput
                  style={styles.input}
                  value={precoCusto}
                  onChangeText={handleCostPriceChange}
                  placeholder="0,00"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código de Barras</Text>
              <TextInput
                style={styles.input}
                value={codigoBarras}
                onChangeText={(value) => handleFieldChange(setCodigoBarras, value)}
                placeholder="Código de barras"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descrição</Text>
              <TextInput
                style={[getInputStyle('descricao'), styles.textArea]}
                value={descricao}
                onChangeText={(value) => handleFieldChange(setDescricao, value, 'descricao')}
                placeholder="Descrição do produto"
                placeholderTextColor="#999"
                multiline
                numberOfLines={2}
              />
              {hasInteracted.descricao && validationErrors.descricao && (
                <Text style={styles.errorText}>{validationErrors.descricao}</Text>
              )}
            </View>
          </View>

          {/* Card de Classificação */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="library" size={20} color="#FF9800" />
              <Text style={styles.cardTitle}>Classificação</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Categoria *</Text>
              <View style={[
                styles.pickerContainer,
                hasInteracted.categoria && validationErrors.categoria && styles.inputError
              ]}>
                <Picker
                  selectedValue={categoriaId}
                  onValueChange={(value) => handleFieldChange(setCategoriaId, value, 'categoria')}
                  style={styles.picker}
                  enabled={!loadingCategorias}
                >
                  <Picker.Item 
                    label={loadingCategorias ? "Carregando categorias..." : "Selecione uma categoria"} 
                    value="" 
                  />
                  {categorias.map((categoria) => (
                    <Picker.Item
                      key={categoria.id}
                      label={categoria.nome}
                      value={categoria.id}
                    />
                  ))}
                </Picker>
              </View>
              {hasInteracted.categoria && validationErrors.categoria && (
                <Text style={styles.errorText}>{validationErrors.categoria}</Text>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Tipo</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={tipoId}
                    onValueChange={(value) => handleFieldChange(setTipoId, value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Tipo" value="" />
                    {tipos.map((tipo) => (
                      <Picker.Item
                        key={tipo.id}
                        label={tipo.nome}
                        value={tipo.id}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Unidade</Text>
                <TouchableOpacity
                  style={styles.unidadeSelector}
                  onPress={() => setShowUnidadeModal(true)}
                >
                  <Text style={[styles.unidadeSelectorText, !unidadeId && styles.placeholderText]}>
                    {getSelectedUnidadeText()}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Card de Estoque */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="cube" size={20} color="#4CAF50" />
              <Text style={styles.cardTitle}>Controle de Estoque</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Estoque Atual</Text>
                <TextInput
                  style={getInputStyle('estoque')}
                  value={estoque}
                  onChangeText={(value) => handleFieldChange(setEstoque, value, 'estoque')}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
                {hasInteracted.estoque && validationErrors.estoque && (
                  <Text style={styles.errorText}>{validationErrors.estoque}</Text>
                )}
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Estoque Mínimo</Text>
                <TextInput
                  style={styles.input}
                  value={estoqueMinimo}
                  onChangeText={(value) => handleFieldChange(setEstoqueMinimo, value)}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.switchContainer}>
              <Text style={styles.label}>Produto Ativo</Text>
              <Switch
                value={ativo}
                onValueChange={(value) => handleFieldChange(setAtivo, value)}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
                thumbColor={ativo ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Card de Datas */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="time" size={20} color="#9C27B0" />
              <Text style={styles.cardTitle}>Controle de Datas</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Data de Inclusão</Text>
                <View style={styles.dateContainer}>
                  <Text style={styles.dateText}>{formatDate(dataInclusao)}</Text>
                </View>
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Última Alteração</Text>
                <View style={styles.dateContainer}>
                  <Text style={styles.dateText}>{formatDate(dataAlteracao)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Botão de Salvar */}
          <TouchableOpacity
            style={[
              styles.saveButton, 
              loading && styles.saveButtonDisabled,
              !isFormValid && styles.saveButtonDisabled,
              saveSuccess && styles.saveButtonSuccess
            ]}
            onPress={handleSave}
            disabled={loading || !isFormValid}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons 
                name={saveSuccess ? "checkmark" : "save"} 
                size={20} 
                color="#fff" 
              />
            )}
            <Text style={styles.saveButtonText}>
              {loading ? 
                (isEditing ? 'Atualizando...' : 'Salvando...') : 
                saveSuccess ? 'Salvo!' :
                (isEditing ? 'Atualizar Produto' : 'Salvar Produto')
              }
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de Seleção de Unidades */}
      <Modal
        visible={showUnidadeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUnidadeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Unidade de Medida</Text>
              <TouchableOpacity
                onPress={() => setShowUnidadeModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={unidades}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={true}
              style={styles.unidadesList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.unidadeItem,
                    item.id === unidadeId && styles.unidadeItemSelected
                  ]}
                  onPress={() => handleUnidadeSelect(item)}
                >
                  <View style={styles.unidadeItemContent}>
                    <Text style={[
                      styles.unidadeItemName,
                      item.id === unidadeId && styles.unidadeItemSelectedText
                    ]}>
                      {item.nome}
                    </Text>
                    <Text style={[
                      styles.unidadeItemSigla,
                      item.id === unidadeId && styles.unidadeItemSelectedText
                    ]}>
                      ({item.sigla})
                    </Text>
                  </View>
                  {item.id === unidadeId && (
                    <Ionicons name="checkmark" size={20} color="#2196F3" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  successIndicator: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    margin: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorMessage: {
    flex: 1,
    marginLeft: 8,
    color: '#c62828',
    fontSize: 14,
  },
  form: {
    padding: 8,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    marginBottom: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#333',
  },
  inputError: {
    borderColor: '#f44336',
    backgroundColor: '#ffebee',
  },
  inputSuccess: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e8',
  },
  textArea: {
    height: 40,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  picker: {
    height: 40,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 4,
  },
  dateContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#f8f9fa',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonSuccess: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  unidadeSelector: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,
  },
  unidadeSelectorText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '70%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  unidadesList: {
    maxHeight: 300,
  },
  unidadeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unidadeItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  unidadeItemContent: {
    flex: 1,
  },
  unidadeItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  unidadeItemSigla: {
    fontSize: 14,
    color: '#666',
  },
  unidadeItemSelectedText: {
    color: '#2196F3',
  },
});