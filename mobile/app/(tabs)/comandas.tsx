import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import CriarComandaModal from '../../src/components/CriarComandaModal';
import ProdutosComandaModal from '../../src/components/ProdutosComandaModal';
import { comandaService } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Comanda } from '../../src/types/index';

export default function ComandasAbertasScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [produtosModalVisible, setProdutosModalVisible] = useState(false);
  const [comandaSelecionada, setComandaSelecionada] = useState<any>(null);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth() as any;

  const loadComandas = async () => {
    try {
      setLoading(true);
      const response = await comandaService.getAll();
      console.log('Resposta da API:', response.data);
      // Filtrar apenas comandas abertas do tipo comanda (igual ao frontend web)
      const comandasAbertas = response.data?.filter((venda: Comanda) => 
        venda.tipoVenda === 'comanda' && venda.status === 'aberta'
      ) || [];
      setComandas(comandasAbertas);
    } catch (error) {
      console.error('Erro ao carregar comandas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as comandas abertas.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadComandas();
    }, [])
  );

  const handleOpenModal = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const handleOpenProdutosModal = (comanda: any) => {
    setComandaSelecionada(comanda);
    setProdutosModalVisible(true);
  };

  const handleCloseProdutosModal = () => {
    setProdutosModalVisible(false);
    setComandaSelecionada(null);
  };

  const handleUpdateComanda = async () => {
    // Recarrega as comandas após adicionar/remover produtos
    await loadComandas();
    
    // Se há uma comanda selecionada no modal, atualiza seus dados também
    if (comandaSelecionada) {
      try {
        const response = await comandaService.getById(comandaSelecionada._id);
        setComandaSelecionada(response.data);
      } catch (error) {
        console.error('Erro ao atualizar comanda selecionada:', error);
      }
    }
  };

  const handleSubmitComanda = async (data: any) => {
    const newComandaData = {
      tipoVenda: 'comanda',
      nomeComanda: data.nomeComanda,
      cliente: data.cliente || null,
      funcionario: data.funcionario,
      valorTotal: data.valorTotalEstimado || 0,
      observacoes: data.observacoes || '',
    };

    console.log('Enviando dados para criar comanda:', JSON.stringify(newComandaData, null, 2));

    try {
      console.log('Criando comanda com dados:', newComandaData);
      const response = await comandaService.create(newComandaData);
      console.log('Resposta da criação:', response.data);
      Alert.alert('Sucesso', 'Comanda criada com sucesso!');
      handleCloseModal();
      loadComandas(); // Recarrega as comandas
    } catch (error: any) {
      console.error('Erro detalhado ao criar comanda:', error);
      console.error('Response error:', error.response?.data);
      Alert.alert('Erro', `Não foi possível criar a comanda: ${error.response?.data?.error || error.message || 'Erro desconhecido'}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comandas Abertas</Text>
      <TouchableOpacity style={styles.button} onPress={handleOpenModal}>
        <Text style={styles.buttonText}>Nova Comanda</Text>
      </TouchableOpacity>
      <CriarComandaModal
        visible={modalVisible}
        onClose={handleCloseModal}
        onSubmit={handleSubmitComanda}
      />
      
      <ProdutosComandaModal
        visible={produtosModalVisible}
        onClose={handleCloseProdutosModal}
        comanda={comandaSelecionada}
        onUpdateComanda={handleUpdateComanda}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" />
      ) : (
        <FlatList
          data={comandas}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.comandaItem}
              onPress={() => handleOpenProdutosModal(item)}
            >
              <View style={styles.comandaInfo}>
                <Text style={styles.comandaNome}>{item.nomeComanda || 'Sem nome'}</Text>
                <Text style={styles.comandaFuncionario}>Funcionário: {item.funcionario?.nome || 'Não definido'}</Text>
                <Text style={styles.comandaItens}>{item.itens?.length || 0} itens</Text>
              </View>
              <View style={styles.comandaTotal}>
                <Text style={styles.comandaValor}>R$ {item.total?.toFixed(2) || '0.00'}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text>Nenhuma comanda aberta.</Text>}
          style={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  list: {
    width: '100%',
    marginTop: 20,
  },
  comandaItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  comandaInfo: {
    flex: 1,
  },
  comandaNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  comandaFuncionario: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  comandaItens: {
    fontSize: 14,
    color: '#666',
  },
  comandaTotal: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  comandaValor: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
});