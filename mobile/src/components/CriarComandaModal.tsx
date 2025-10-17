import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { employeeService, customerService } from '../services/api';

interface Funcionario {
  _id: string;
  nome: string;
}

interface Cliente {
  _id: string;
  nome: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function CriarComandaModal({ visible, onClose, onSubmit }: Props) {
  const [nomeComanda, setNomeComanda] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [valorTotalEstimado, setValorTotalEstimado] = useState('0');
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedFuncionario, setSelectedFuncionario] = useState('');
  const [selectedCliente, setSelectedCliente] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadFuncionarios();
      loadClientes();
    }
  }, [visible]);

  const loadFuncionarios = async () => {
    try {
      const response = await employeeService.getAll();
      setFuncionarios(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    }
  };

  const loadClientes = async () => {
    try {
      const response = await customerService.getAll();
      const clientesAtivos = response.data.filter((cliente: any) => cliente.ativo);
      // Adicionar opção de cliente avulso
      setClientes([
        { _id: 'avulso', nome: 'Cliente avulso' },
        ...clientesAtivos
      ]);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      // Em caso de erro, usar apenas cliente avulso
      setClientes([
        { _id: 'avulso', nome: 'Cliente avulso' }
      ]);
    }
  };

  const handleSubmit = () => {
    if (!nomeComanda.trim()) {
      alert('Digite um nome para a comanda');
      return;
    }

    if (!selectedFuncionario) {
      alert('Selecione um funcionário para criar a comanda');
      return;
    }

    onSubmit({ 
      nomeComanda: nomeComanda.trim(),
      funcionario: selectedFuncionario,
      cliente: selectedCliente || null,
      valorTotalEstimado: parseFloat(valorTotalEstimado) || 0,
      observacoes: observacoes.trim()
    });
    
    // Limpar campos após o submit
    setNomeComanda('');
    setObservacoes('');
    setValorTotalEstimado('0');
    setSelectedFuncionario('');
    setSelectedCliente('');
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Nova Comanda</Text>
          
          <ScrollView style={styles.scrollContent}>
            {/* Nome da Comanda */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Nome da Comanda: *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Mesa 5, João Silva, Aniversário..."
                value={nomeComanda}
                onChangeText={setNomeComanda}
              />
            </View>

            {/* Seleção de Funcionário */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Funcionário: *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedFuncionario}
                  onValueChange={(itemValue) => setSelectedFuncionario(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecione um funcionário..." value="" />
                  {funcionarios.map((funcionario) => (
                    <Picker.Item 
                      key={funcionario._id} 
                      label={funcionario.nome} 
                      value={funcionario._id} 
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Seleção de Cliente */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Cliente (opcional):</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedCliente}
                  onValueChange={(itemValue) => setSelectedCliente(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Cliente avulso" value="" />
                  {clientes.map((cliente) => (
                    <Picker.Item 
                      key={cliente._id} 
                      label={cliente.nome} 
                      value={cliente._id} 
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Valor Total Estimado */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Valor Total Estimado:</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={valorTotalEstimado}
                onChangeText={setValorTotalEstimado}
                keyboardType="numeric"
              />
            </View>

            {/* Observações */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Observações:</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Cliente preferencial, desconto especial..."
                value={observacoes}
                onChangeText={setObservacoes}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={onClose}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.buttonCreate]} 
              onPress={handleSubmit}
            >
              <Text style={styles.buttonText}>{loading ? 'Criando...' : 'Criar Comanda'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  scrollContent: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  picker: {
    height: 45,
    backgroundColor: '#f9f9f9',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: '#f44336',
  },
  buttonCreate: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});