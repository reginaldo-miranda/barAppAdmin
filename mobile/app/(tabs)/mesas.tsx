import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mesaService, saleService, employeeService } from '../../src/services/api';
import ProductSelector from '../../src/components/ProductSelector.js';
import { useAuth } from '../../src/contexts/AuthContext';

interface Mesa {
  _id: string;
  numero: number;
  status: 'livre' | 'ocupada' | 'reservada' | 'manutencao';
  capacidade: number;
  observacoes?: string;
  nomeResponsavel?: string;
  funcionarioResponsavel?: {
    _id: string;
    nome: string;
  };
}

export default function MesasScreen() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [productSelectorVisible, setProductSelectorVisible] = useState(false);
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [currentSale, setCurrentSale] = useState<any>(null);
  const [gerarMesasModalVisible, setGerarMesasModalVisible] = useState(false);
  const [gerandoMesas, setGerandoMesas] = useState(false);
  const [quantidades, setQuantidades] = useState({
    interna: 10,
    externa: 5,
    vip: 3,
    balcao: 2
  });
  
  // Estados para tooltips
  const [showTooltipCriar, setShowTooltipCriar] = useState(false);
  const [showTooltipGerar, setShowTooltipGerar] = useState(false);
  
  // Refs para timers dos tooltips
  const tooltipCriarTimer = useRef<number | null>(null);
  const tooltipGerarTimer = useRef<number | null>(null);

  // Estados para modal de abertura de mesa
  const [abrirMesaModalVisible, setAbrirMesaModalVisible] = useState(false);
  const [mesaSelecionada, setMesaSelecionada] = useState<Mesa | null>(null);
  const [responsavelMesa, setResponsavelMesa] = useState('');
  const [numeroClientes, setNumeroClientes] = useState('');
  
  // Estados para funcionários
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<any>(null);
  
  // Estados para filtros e busca
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'livre' | 'ocupada' | 'reservada'>('todos');
  const [textoBusca, setTextoBusca] = useState('');
  const [funcionarioDropdownOpen, setFuncionarioDropdownOpen] = useState(false);
  
  // Estado para observações
  const [observacoesMesa, setObservacoesMesa] = useState('');

  // Funções para gerenciar tooltips
  const showTooltipWithDelay = (setTooltip: (value: boolean) => void, timerRef: React.MutableRefObject<number | null>) => {
    timerRef.current = setTimeout(() => {
      setTooltip(true);
    }, 100); // 100ms delay - quase instantâneo
  };

  const hideTooltip = (setTooltip: (show: boolean) => void, timerRef: React.MutableRefObject<number | null>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setTooltip(false);
  };
  
  // Estados para o formulário de criação de mesa
  const [criarMesaModalVisible, setCriarMesaModalVisible] = useState(false);
  const [criandoMesa, setCriandoMesa] = useState(false);
  const [formMesa, setFormMesa] = useState({
    numero: '',
    nome: '',
    capacidade: '',
    tipo: 'interna',
    observacoes: ''
  });
  
  const { user } = useAuth() as any;

  const loadMesas = async () => {
    try {
      const response = await mesaService.getAll();
      const mesasData = response.data;
      
      // Para cada mesa ocupada, buscar a venda ativa para obter o nome do responsável
      const mesasComResponsavel = await Promise.all(
        mesasData.map(async (mesa: Mesa) => {
          if (mesa.status === 'ocupada') {
            try {
              // Buscar venda ativa da mesa
              const vendaResponse = await saleService.getByMesa(mesa._id);
              const vendas = vendaResponse.data;
              
              // Encontrar venda aberta
              const vendaAberta = vendas.find((venda: any) => venda.status === 'aberta');
              
              if (vendaAberta && vendaAberta.observacoes) {
                // Extrair nome do responsável das observações
                const match = vendaAberta.observacoes.match(/Responsavel:\s*(.+)/i);
                if (match) {
                  mesa.nomeResponsavel = match[1].trim();
                }
              }
              
              console.log(`Mesa ${mesa.numero} - Responsável: ${mesa.nomeResponsavel || 'Não encontrado'}`);
            } catch (error) {
              console.error(`Erro ao buscar venda da mesa ${mesa.numero}:`, error);
            }
          }
          return mesa;
        })
      );
      
      setMesas(mesasComResponsavel);
    } catch (error) {
      console.error('Erro ao carregar mesas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as mesas');
    } finally {
      setLoading(false);
    }
  };

  const loadFuncionarios = async () => {
    try {
      const response = await employeeService.getAll();
      const funcionariosAtivos = response.data.filter((func: any) => func.ativo);
      setFuncionarios(funcionariosAtivos);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
      Alert.alert('Erro', 'Não foi possível carregar os funcionários');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMesas();
    setRefreshing(false);
  };

  useEffect(() => {
    loadMesas();
    loadFuncionarios();
  }, []);

  const handleMesaPress = (mesa: Mesa) => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }
    
    if (mesa.status === 'livre') {
      Alert.alert(
        'Abrir Mesa',
        `Deseja abrir a mesa ${mesa.numero}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir', onPress: () => openMesa(mesa) },
        ]
      );
    } else if (mesa.status === 'ocupada') {
      Alert.alert(
        'Mesa Ocupada',
        `A mesa ${mesa.numero} está ocupada. O que deseja fazer?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Adicionar Produtos', onPress: () => openProductSelector(mesa) },
          { text: 'Ver Vendas', onPress: () => router.push(`/sale?mesaId=${mesa._id}&viewMode=view`) },
          { text: 'Fechar Mesa', style: 'destructive', onPress: () => closeMesa(mesa._id) },
        ]
      );
    } else if (mesa.status === 'reservada') {
      Alert.alert(
        'Mesa Reservada',
        `A mesa ${mesa.numero} está reservada. O que deseja fazer?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Mesa', onPress: () => openMesa(mesa) },
          { text: 'Liberar Reserva', onPress: () => liberarReserva(mesa._id) },
        ]
      );
    } else if (mesa.status === 'manutencao') {
      Alert.alert('Mesa em Manutenção', 'Esta mesa está em manutenção e não pode ser utilizada.');
    } else {
      Alert.alert('Status Desconhecido', `Status da mesa: ${mesa.status}`);
    }
  };

  const limparEstadosModal = () => {
    setFuncionarioSelecionado('');
    setResponsavelMesa('');
    setObservacoesMesa('');
    setFuncionarioDropdownOpen(false);
    setMesaSelecionada(null);
  };

  const openMesa = async (mesa: Mesa) => {
    // Verificar se a mesa está livre antes de abrir o modal
    if (mesa.status !== 'livre') {
      Alert.alert('Erro', 'Esta mesa não está disponível para abertura.');
      return;
    }
    
    // Abrir modal para solicitar número de clientes
    setMesaSelecionada(mesa);
    setNumeroClientes('');
    setFuncionarioSelecionado('');
    setFuncionarioDropdownOpen(false);
    setAbrirMesaModalVisible(true);
  };

  const confirmarAberturaMesa = async () => {
    if (!mesaSelecionada) return;

    if (!funcionarioSelecionado) {
      Alert.alert('Erro', 'Por favor, selecione um funcionário responsável');
      return;
    }

    // Validações de status da mesa
    if (mesaSelecionada.status === 'ocupada') {
      Alert.alert('Erro', 'Esta mesa já está ocupada.');
      return;
    }
    
    if (mesaSelecionada.status === 'manutencao') {
      Alert.alert('Erro', 'Esta mesa está em manutenção e não pode ser aberta.');
      return;
    }



    await executarAberturaMesa();
  };

  const executarAberturaMesa = async () => {
    if (!mesaSelecionada) return;

    try {
      // Usar a rota correta da API: POST /:id/abrir
      const response = await mesaService.abrir(mesaSelecionada._id, funcionarioSelecionado, responsavelMesa, observacoesMesa);
      
      // Recarregar lista de mesas
      await loadMesas();
      
      // Fechar modal e limpar estados
      setAbrirMesaModalVisible(false);
      limparEstadosModal();
      
      // Navegar para a tela de vendas
      router.push({
        pathname: '/sale',
        params: { 
          mesaId: mesaSelecionada._id, 
          mesaNumero: mesaSelecionada.numero 
        }
      });
      
    } catch (error: any) {
      console.error('Erro ao abrir mesa:', error);
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao abrir mesa. Tente novamente.');
    }
  };

  const closeMesa = async (mesaId: string) => {
    try {
      await mesaService.update(mesaId, { status: 'livre' });
      await loadMesas();
      Alert.alert('Sucesso', 'Mesa fechada com sucesso!');
    } catch (error) {
      console.error('Erro ao fechar mesa:', error);
      Alert.alert('Erro', 'Não foi possível fechar a mesa');
    }
  };

  const liberarReserva = async (mesaId: string) => {
    try {
      await mesaService.update(mesaId, { status: 'livre' });
      Alert.alert('Sucesso', 'Reserva liberada com sucesso');
      loadMesas();
    } catch (error) {
      console.error('Erro ao liberar reserva:', error);
      Alert.alert('Erro', 'Não foi possível liberar a reserva');
    }
  };

  const gerarMesas = () => {
    setGerarMesasModalVisible(true);
  };

  const abrirModalCriarMesa = () => {
    setCriarMesaModalVisible(true);
  };

  const fecharModalCriarMesa = () => {
    setCriarMesaModalVisible(false);
    limparFormulario();
  };

  const limparFormulario = () => {
    setFormMesa({
      numero: '',
      nome: '',
      capacidade: '',
      tipo: 'interna',
      observacoes: ''
    });
  };

  const criarMesaIndividual = async () => {
    try {
      // Validação dos campos obrigatórios
      if (!formMesa.numero.trim()) {
        Alert.alert('Erro', 'Número da mesa é obrigatório');
        return;
      }
      if (!formMesa.nome.trim()) {
        Alert.alert('Erro', 'Nome da mesa é obrigatório');
        return;
      }
      if (!formMesa.capacidade.trim() || isNaN(Number(formMesa.capacidade)) || Number(formMesa.capacidade) < 1) {
        Alert.alert('Erro', 'Capacidade deve ser um número maior que 0');
        return;
      }

      setCriandoMesa(true);

      const mesaData = {
        numero: formMesa.numero.trim(),
        nome: formMesa.nome.trim(),
        capacidade: Number(formMesa.capacidade),
        tipo: formMesa.tipo,
        observacoes: formMesa.observacoes.trim() || undefined
      };

      const response = await mesaService.create(mesaData);
      const novaMesa = response.data || response;
      
      Alert.alert('Sucesso', `Mesa ${novaMesa.numero || formMesa.numero} criada com sucesso!`);
      await loadMesas();
      fecharModalCriarMesa();
      
    } catch (error: any) {
      console.error('Erro ao criar mesa:', error);
      if (error.response?.status === 400 && error.response?.data?.message?.includes('duplicate')) {
        Alert.alert('Erro', `Mesa com número ${formMesa.numero} já existe`);
      } else {
        Alert.alert('Erro', 'Erro ao criar mesa. Tente novamente.');
      }
    } finally {
      setCriandoMesa(false);
    }
  };

  const criarMesasAutomaticamente = async () => {
    try {
      setGerandoMesas(true);
      
      let numeroAtual = 1;
      let mesasCriadas = 0;
      let mesasJaExistentes = 0;
      const mesasParaCriar = [];

      // Criar mesas internas
      for (let i = 0; i < quantidades.interna; i++) {
        mesasParaCriar.push({
          numero: numeroAtual.toString().padStart(2, '0'),
          nome: `Mesa ${numeroAtual.toString().padStart(2, '0')}`,
          capacidade: 4,
          tipo: 'interna'
        });
        numeroAtual++;
      }

      // Criar mesas externas
      for (let i = 0; i < quantidades.externa; i++) {
        mesasParaCriar.push({
          numero: numeroAtual.toString().padStart(2, '0'),
          nome: `Mesa ${numeroAtual.toString().padStart(2, '0')} - Externa`,
          capacidade: 6,
          tipo: 'externa'
        });
        numeroAtual++;
      }

      // Criar mesas VIP
      for (let i = 0; i < quantidades.vip; i++) {
        mesasParaCriar.push({
          numero: `VIP${i + 1}`,
          nome: `Mesa VIP ${i + 1}`,
          capacidade: 8,
          tipo: 'vip'
        });
      }

      // Criar balcões
      for (let i = 0; i < quantidades.balcao; i++) {
        mesasParaCriar.push({
          numero: `B${(i + 1).toString().padStart(2, '0')}`,
          nome: `Balcão ${i + 1}`,
          capacidade: 1,
          tipo: 'balcao'
        });
      }

      for (const mesaData of mesasParaCriar) {
        try {
          await mesaService.create(mesaData);
          mesasCriadas++;
        } catch (error: any) {
          if (error.response?.data?.message?.includes('Já existe uma mesa')) {
            mesasJaExistentes++;
          } else {
            console.error(`Erro ao criar mesa ${mesaData.numero}:`, error);
          }
        }
      }

      let mensagem = '';
      if (mesasCriadas > 0) {
        mensagem += `${mesasCriadas} mesas criadas com sucesso!`;
      }
      if (mesasJaExistentes > 0) {
        if (mensagem) mensagem += '\n';
        mensagem += `${mesasJaExistentes} mesas já existiam.`;
      }

      Alert.alert('Resultado', mensagem || 'Nenhuma mesa foi criada.');
      await loadMesas();
      setGerarMesasModalVisible(false);
      
    } catch (error) {
      console.error('Erro ao gerar mesas:', error);
      Alert.alert('Erro', 'Erro inesperado ao gerar mesas');
    } finally {
      setGerandoMesas(false);
    }
  };

  const openProductSelector = async (mesa: Mesa) => {
    try {
      setSelectedMesa(mesa);
      // Buscar ou criar venda para a mesa
      const openSales = await saleService.getOpen();
      let sale = openSales.data.find((s: any) => s.mesa === mesa._id);
      
      if (!sale) {
        // Criar nova venda para a mesa
        const newSaleData = {
          funcionario: user?._id,
          mesa: mesa._id,
          tipoVenda: 'mesa',
          status: 'aberta'
        };
        const response = await saleService.create(newSaleData);
        sale = response.data;
      }
      
      setCurrentSale(sale);
      setProductSelectorVisible(true);
    } catch (error) {
      console.error('Erro ao abrir seletor de produtos:', error);
      Alert.alert('Erro', 'Não foi possível abrir o seletor de produtos');
    }
  };

  const handleProductSelect = async (product: any, quantity: number) => {
    try {
      if (!currentSale) {
        Alert.alert('Erro', 'Nenhuma venda ativa encontrada');
        return;
      }

      await saleService.addItem(currentSale._id, {
        produtoId: product._id,
        quantidade: quantity
      });

      Alert.alert(
        'Sucesso', 
        `${quantity}x ${product.nome} adicionado à mesa ${selectedMesa?.numero}!`
      );
      
      setProductSelectorVisible(false);
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o produto');
    }
  };

  const handleCloseProductSelector = () => {
    setProductSelectorVisible(false);
    setSelectedMesa(null);
    setCurrentSale(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'livre':
        return '#4CAF50';
      case 'ocupada':
        return '#F44336';
      case 'reservada':
        return '#FF9800';
      case 'manutencao':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'livre': return 'Livre';
      case 'ocupada': return 'Ocupada';
      case 'reservada': return 'Reservada';
      case 'manutencao': return 'Manutenção';
      default: return 'Desconhecido';
    }
  };

  // Função para filtrar mesas
  const mesasFiltradas = mesas.filter(mesa => {
    // Filtro por status
    const passaFiltroStatus = filtroStatus === 'todos' || mesa.status === filtroStatus;
    
    // Filtro por busca (número da mesa)
    const passaFiltroBusca = textoBusca === '' || 
      mesa.numero.toString().toLowerCase().includes(textoBusca.toLowerCase());
    
    return passaFiltroStatus && passaFiltroBusca;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'livre':
        return 'checkmark-circle';
      case 'ocupada':
        return 'people';
      case 'reservada':
        return 'time';
      case 'manutencao':
        return 'construct';
      default:
        return 'help-circle';
    }
  };

  const renderMesa = ({ item }: { item: Mesa }) => (
    <TouchableOpacity
      style={[styles.mesaCard, { borderLeftColor: getStatusColor(item.status) }]}
      onPress={() => handleMesaPress(item)}
      activeOpacity={0.7}
    >
        <View style={styles.mesaHeader}>
          <Text style={styles.mesaNumero}>
            Mesa {item.numero}
            {(item.nomeResponsavel || item.funcionarioResponsavel?.nome) && 
              ` - ${item.nomeResponsavel || item.funcionarioResponsavel?.nome}`}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Ionicons name={getStatusIcon(item.status) as any} size={16} color="#fff" />
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        <View style={styles.mesaInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="people" size={16} color="#666" />
            <Text style={styles.infoText}>Capacidade: {item.capacidade} pessoas</Text>
          </View>
          {item.observacoes && (
            <View style={styles.infoRow}>
              <Ionicons name="document-text" size={16} color="#666" />
              <Text style={styles.infoText}>{item.observacoes}</Text>
            </View>
          )}
        </View>
        
        {/* Botões de ação baseados no status */}
        <View style={styles.actionButtons}>
          {item.status === 'livre' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.openButton]}
              onPress={() => openMesa(item)}
            >
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Abrir Mesa</Text>
            </TouchableOpacity>
          )}
          
          {item.status === 'ocupada' && (
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.addButton]}
                onPress={() => openProductSelector(item)}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Produtos</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]}
                onPress={() => router.push(`/sale?mesaId=${item._id}&viewMode=view`)}
              >
                <Ionicons name="eye" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Ver Vendas</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.closeButton]}
                onPress={() => closeMesa(item._id)}
              >
                <Ionicons name="close" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {item.status === 'reservada' && (
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.openButton]}
                onPress={() => openMesa(item)}
              >
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Abrir</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.releaseButton]}
                onPress={() => liberarReserva(item._id)}
              >
                <Ionicons name="lock-open-outline" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Liberar</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {item.status === 'manutencao' && (
            <View style={styles.maintenanceInfo}>
              <Ionicons name="construct" size={16} color="#FF9800" />
              <Text style={styles.maintenanceText}>Mesa em manutenção</Text>
            </View>
          )}
        </View>
       </TouchableOpacity>
   );

  const mesasLivres = mesas.filter(m => m.status === 'livre').length;
  const mesasOcupadas = mesas.filter(m => m.status === 'ocupada').length;
  const mesasReservadas = mesas.filter(m => m.status === 'reservada').length;

  return (
    <View style={styles.container}>
      {/* Barra de busca */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar mesa por número..."
          value={textoBusca}
          onChangeText={setTextoBusca}
          keyboardType="numeric"
        />
      </View>

      {/* Estatísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statsLeft}>
          <TouchableOpacity 
            style={[
              styles.statItem,
              filtroStatus === 'livre' && styles.statItemSelected
            ]}
            onPress={() => setFiltroStatus(filtroStatus === 'livre' ? 'todos' : 'livre')}
          >
            <Text style={styles.statNumber}>{mesasLivres}</Text>
            <Text style={styles.statLabel}>Livres</Text>
            <View style={[styles.statIndicator, { backgroundColor: '#4CAF50' }]} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.statItem,
              filtroStatus === 'ocupada' && styles.statItemSelected
            ]}
            onPress={() => setFiltroStatus(filtroStatus === 'ocupada' ? 'todos' : 'ocupada')}
          >
            <Text style={styles.statNumber}>{mesasOcupadas}</Text>
            <Text style={styles.statLabel}>Ocupadas</Text>
            <View style={[styles.statIndicator, { backgroundColor: '#F44336' }]} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.statItem,
              filtroStatus === 'reservada' && styles.statItemSelected
            ]}
            onPress={() => setFiltroStatus(filtroStatus === 'reservada' ? 'todos' : 'reservada')}
          >
            <Text style={styles.statNumber}>{mesasReservadas}</Text>
            <Text style={styles.statLabel}>Reservadas</Text>
            <View style={[styles.statIndicator, { backgroundColor: '#FF9800' }]} />
          </TouchableOpacity>
        </View>
        
        {/* Botões de Ação */}
        <View style={styles.headerButtons}>
          <View style={styles.tooltipContainer}>
            <TouchableOpacity
              style={[styles.headerButton, styles.headerButtonSecondary]}
              onPress={abrirModalCriarMesa}
              onPressIn={() => showTooltipWithDelay(setShowTooltipCriar, tooltipCriarTimer)}
              onPressOut={() => hideTooltip(setShowTooltipCriar, tooltipCriarTimer)}
            >
              <Ionicons name="restaurant" size={18} color="#fff" />
            </TouchableOpacity>
            {showTooltipCriar && (
              <View style={[styles.tooltip, styles.tooltipVisible]}>
                <Text style={styles.tooltipText}>Criar mesa individual</Text>
              </View>
            )}
          </View>
          
          <View style={styles.tooltipContainer}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={gerarMesas}
              onPressIn={() => showTooltipWithDelay(setShowTooltipGerar, tooltipGerarTimer)}
              onPressOut={() => hideTooltip(setShowTooltipGerar, tooltipGerarTimer)}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
            {showTooltipGerar && (
              <View style={[styles.tooltip, styles.tooltipVisible]}>
                <Text style={styles.tooltipText}>Gerar várias mesas</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Lista de Mesas */}
      <FlatList
        data={mesasFiltradas}
        renderItem={renderMesa}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />



      {/* Product Selector Modal */}
      <ProductSelector
        visible={productSelectorVisible}
        onClose={handleCloseProductSelector}
        onProductSelect={handleProductSelect}
        title={selectedMesa ? `Adicionar à Mesa ${selectedMesa.numero}` : 'Selecionar Produto'}
      />

      {/* Modal de Geração Automática de Mesas */}
      <Modal
        visible={gerarMesasModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setGerarMesasModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gerar Mesas Automaticamente</Text>
              <TouchableOpacity
                onPress={() => setGerarMesasModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                Defina a quantidade de mesas para cada tipo:
              </Text>
              
              <View style={styles.quantidadeContainer}>
                <View style={styles.quantidadeItem}>
                  <Text style={styles.quantidadeLabel}>Mesas Internas:</Text>
                  <View style={styles.quantidadeControls}>
                    <TouchableOpacity
                      style={styles.quantidadeButton}
                      onPress={() => setQuantidades(prev => ({
                        ...prev,
                        interna: Math.max(0, prev.interna - 1)
                      }))}
                    >
                      <Ionicons name="remove" size={20} color="#666" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.quantidadeInput}
                      value={quantidades.interna.toString()}
                      onChangeText={(text) => {
                        const num = parseInt(text) || 0;
                        setQuantidades(prev => ({ ...prev, interna: Math.max(0, num) }));
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <TouchableOpacity
                      style={styles.quantidadeButton}
                      onPress={() => setQuantidades(prev => ({
                        ...prev,
                        interna: Math.min(50, prev.interna + 1)
                      }))}
                    >
                      <Ionicons name="add" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.quantidadeItem}>
                  <Text style={styles.quantidadeLabel}>Mesas Externas:</Text>
                  <View style={styles.quantidadeControls}>
                    <TouchableOpacity
                      style={styles.quantidadeButton}
                      onPress={() => setQuantidades(prev => ({
                        ...prev,
                        externa: Math.max(0, prev.externa - 1)
                      }))}
                    >
                      <Ionicons name="remove" size={20} color="#666" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.quantidadeInput}
                      value={quantidades.externa.toString()}
                      onChangeText={(text) => {
                        const num = parseInt(text) || 0;
                        setQuantidades(prev => ({ ...prev, externa: Math.max(0, num) }));
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <TouchableOpacity
                      style={styles.quantidadeButton}
                      onPress={() => setQuantidades(prev => ({
                        ...prev,
                        externa: Math.min(50, prev.externa + 1)
                      }))}
                    >
                      <Ionicons name="add" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.quantidadeItem}>
                  <Text style={styles.quantidadeLabel}>Mesas VIP:</Text>
                  <View style={styles.quantidadeControls}>
                    <TouchableOpacity
                      style={styles.quantidadeButton}
                      onPress={() => setQuantidades(prev => ({
                        ...prev,
                        vip: Math.max(0, prev.vip - 1)
                      }))}
                    >
                      <Ionicons name="remove" size={20} color="#666" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.quantidadeInput}
                      value={quantidades.vip.toString()}
                      onChangeText={(text) => {
                        const num = parseInt(text) || 0;
                        setQuantidades(prev => ({ ...prev, vip: Math.max(0, num) }));
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <TouchableOpacity
                      style={styles.quantidadeButton}
                      onPress={() => setQuantidades(prev => ({
                        ...prev,
                        vip: Math.min(50, prev.vip + 1)
                      }))}
                    >
                      <Ionicons name="add" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.quantidadeItem}>
                  <Text style={styles.quantidadeLabel}>Balcões:</Text>
                  <View style={styles.quantidadeControls}>
                    <TouchableOpacity
                      style={styles.quantidadeButton}
                      onPress={() => setQuantidades(prev => ({
                        ...prev,
                        balcao: Math.max(0, prev.balcao - 1)
                      }))}
                    >
                      <Ionicons name="remove" size={20} color="#666" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.quantidadeInput}
                      value={quantidades.balcao.toString()}
                      onChangeText={(text) => {
                        const num = parseInt(text) || 0;
                        setQuantidades(prev => ({ ...prev, balcao: Math.max(0, num) }));
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <TouchableOpacity
                      style={styles.quantidadeButton}
                      onPress={() => setQuantidades(prev => ({
                        ...prev,
                        balcao: Math.min(50, prev.balcao + 1)
                      }))}
                    >
                      <Ionicons name="add" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.totalContainer}>
                <Text style={styles.totalText}>
                  Total: {quantidades.interna + quantidades.externa + quantidades.vip + quantidades.balcao} mesas
                </Text>
              </View>
              
              <Text style={styles.warningText}>
                ⚠️ Mesas com números já existentes serão ignoradas.
              </Text>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setGerarMesasModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={criarMesasAutomaticamente}
                disabled={gerandoMesas || (quantidades.interna + quantidades.externa + quantidades.vip + quantidades.balcao) === 0}
              >
                {gerandoMesas ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Gerar Mesas</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Criação Individual de Mesa */}
      <Modal
        visible={criarMesaModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={fecharModalCriarMesa}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Criar Nova Mesa</Text>
              <TouchableOpacity
                onPress={fecharModalCriarMesa}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Número da Mesa *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formMesa.numero}
                  onChangeText={(text) => setFormMesa({...formMesa, numero: text})}
                  placeholder="Ex: 1, A1, VIP01"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nome da Mesa *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formMesa.nome}
                  onChangeText={(text) => setFormMesa({...formMesa, nome: text})}
                  placeholder="Ex: Mesa Principal, Mesa da Janela"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Capacidade *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formMesa.capacidade}
                  onChangeText={(text) => setFormMesa({...formMesa, capacidade: text})}
                  placeholder="Número de pessoas"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tipo da Mesa</Text>
                <View style={styles.tipoSelector}>
                  {['interna', 'externa', 'vip', 'reservada', 'balcao'].map((tipo) => (
                    <TouchableOpacity
                      key={tipo}
                      style={[
                        styles.tipoOption,
                        formMesa.tipo === tipo && styles.tipoOptionSelected
                      ]}
                      onPress={() => setFormMesa({...formMesa, tipo})}
                    >
                      <Text style={[
                        styles.tipoOptionText,
                        formMesa.tipo === tipo && styles.tipoOptionTextSelected
                      ]}>
                        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Observações</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={formMesa.observacoes}
                  onChangeText={(text) => setFormMesa({...formMesa, observacoes: text})}
                  placeholder="Observações adicionais (opcional)"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={fecharModalCriarMesa}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={criarMesaIndividual}
                disabled={criandoMesa}
              >
                {criandoMesa ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Criar Mesa</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para abrir mesa */}
      <Modal
        visible={abrirMesaModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => limparEstadosModal()}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Abrir Mesa {mesaSelecionada?.numero}</Text>
              <TouchableOpacity
                onPress={() => {
                  setAbrirMesaModalVisible(false);
                  limparEstadosModal();
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                Preencha as informações para abrir a mesa:
              </Text>
              
              <View style={styles.dropdownFormGroup}>
                <Text style={styles.formLabel}>Funcionário Responsável *</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setFuncionarioDropdownOpen(!funcionarioDropdownOpen)}
                >
                  <Text style={[
                    styles.dropdownButtonText,
                    !funcionarioSelecionado && styles.dropdownPlaceholder
                  ]}>
                    {funcionarioSelecionado 
                      ? funcionarios.find(f => f._id === funcionarioSelecionado)?.nome || 'Selecione um funcionário'
                      : 'Selecione um funcionário'
                    }
                  </Text>
                  <Ionicons 
                    name={funcionarioDropdownOpen ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
                
                {funcionarioDropdownOpen && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={styles.dropdownScrollView} showsVerticalScrollIndicator={false}>
                      {funcionarios.map((funcionario) => (
                        <TouchableOpacity
                          key={funcionario._id}
                          style={[
                            styles.dropdownItem,
                            funcionarioSelecionado === funcionario._id && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            setFuncionarioSelecionado(funcionario._id);
                            setFuncionarioDropdownOpen(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            funcionarioSelecionado === funcionario._id && styles.dropdownItemTextSelected
                          ]}>
                            {funcionario.nome}
                          </Text>
                          {funcionarioSelecionado === funcionario._id && (
                            <Ionicons name="checkmark" size={18} color="#4CAF50" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nome do Responsável</Text>
                <TextInput
                  style={styles.formInput}
                  value={responsavelMesa}
                  onChangeText={setResponsavelMesa}
                  placeholder="Digite o nome do responsável pela mesa"
                  maxLength={100}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Observações</Text>
                <TextInput
                  style={[styles.formInput, styles.textAreaSmall]}
                  value={observacoesMesa}
                  onChangeText={setObservacoesMesa}
                  placeholder="Observações sobre a mesa (opcional)"
                  multiline={true}
                  numberOfLines={2}
                  maxLength={200}
                />
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setAbrirMesaModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmarAberturaMesa}
              >
                <Text style={styles.confirmButtonText}>Abrir Mesa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statsLeft: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  tooltipContainer: {
    position: 'relative',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  headerButtonSecondary: {
    backgroundColor: '#4CAF50',
  },
  tooltip: {
    position: 'absolute',
    top: 50,
    left: '50%',
    transform: [{ translateX: -60 }],
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    opacity: 0,
    zIndex: 1000,
    minWidth: 120,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tooltipVisible: {
    opacity: 1,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  statItem: {
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  mesaCard: {
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
  mesaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mesaNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  mesaInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actionButtons: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    minWidth: 80,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  openButton: {
    backgroundColor: '#4CAF50',
  },
  addButton: {
    backgroundColor: '#2196F3',
  },
  viewButton: {
    backgroundColor: '#FF9800',
  },
  closeButton: {
    backgroundColor: '#F44336',
  },
  releaseButton: {
    backgroundColor: '#9C27B0',
  },
  maintenanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  maintenanceText: {
    color: '#FF9800',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
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
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
    maxHeight: 400,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  mesaTypesList: {
    gap: 12,
    marginBottom: 16,
  },
  mesaTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  mesaTypeText: {
    fontSize: 14,
    color: '#333',
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#2196F3',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 20,
    position: 'relative',
    zIndex: 1,
  },
  dropdownFormGroup: {
    marginBottom: 20,
    position: 'relative',
    zIndex: 10,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  textAreaSmall: {
    height: 60,
    textAlignVertical: 'top',
  },
  tipoSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tipoOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  tipoOptionSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  tipoOptionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tipoOptionTextSelected: {
    color: '#fff',
  },
  quantidadeContainer: {
    gap: 16,
    marginBottom: 16,
  },
  quantidadeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  quantidadeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  quantidadeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantidadeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantidadeInput: {
    width: 50,
    height: 36,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  totalContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    minHeight: 44,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  dropdownScrollView: {
    maxHeight: 200,
    flexGrow: 0,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
});