import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenIdentifier from '../src/components/ScreenIdentifier';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, getSecureItem, setSecureItem } from '../src/services/storage';
import { testApiConnection } from '../src/services/api';
import { scanWifiNetworks, connectToWifi } from '../src/services/wifi';

export default function ConfiguracoesScreen() {
  // API
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<null | { ok: boolean; message: string }>(null);

  // WiFi
  const [wifiModalVisible, setWifiModalVisible] = useState(false);
  const [wifiNetworks, setWifiNetworks] = useState<{ ssid: string; signal?: number; security?: string }[]>([]);
  const [selectedSSID, setSelectedSSID] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [savingWifi, setSavingWifi] = useState(false);
  const [savingApi, setSavingApi] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const storedUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_BASE_URL);
        const storedKey = await getSecureItem(STORAGE_KEYS.API_AUTH_KEY);
        const storedSsid = await getSecureItem(STORAGE_KEYS.WIFI_SSID);
        const storedPwd = await getSecureItem(STORAGE_KEYS.WIFI_PASSWORD);
        if (storedUrl) setApiUrl(storedUrl);
        if (storedKey) setApiKey(storedKey);
        if (storedSsid) setSelectedSSID(storedSsid);
        if (storedPwd) setWifiPassword(storedPwd);
      } catch (e) {
        console.warn('Falha ao carregar configurações:', e);
      }
    })();
  }, []);

  const handleScanWifi = async () => {
    setScanning(true);
    setTestStatus(null);
    try {
      const list = await scanWifiNetworks();
      if (!list || list.length === 0) {
        Alert.alert('WiFi', 'A listagem de redes reais requer build nativa Android. No navegador/Expo Go, use o campo SSID manual.');
      } else {
        setWifiNetworks(list);
        setWifiModalVisible(true);
      }
    } catch (e) {
      Alert.alert('WiFi', 'Falha ao listar redes disponíveis. Verifique permissões e build nativa.');
    } finally {
      setScanning(false);
    }
  };

  const handleSaveApi = async () => {
    if (!apiUrl || !/^https?:\/\//i.test(apiUrl)) {
      Alert.alert('Configuração da API', 'Informe uma URL válida (http/https).');
      return;
    }
    setSavingApi(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.API_BASE_URL, apiUrl);
      if (apiKey) await setSecureItem(STORAGE_KEYS.API_AUTH_KEY, apiKey);
      else await setSecureItem(STORAGE_KEYS.API_AUTH_KEY, '');
      Alert.alert('Configuração da API', 'Configurações salvas com sucesso.');
    } catch (e) {
      Alert.alert('Configuração da API', 'Falha ao salvar as configurações.');
    } finally {
      setSavingApi(false);
    }
  };

  const handleTestConnection = async () => {
    if (!apiUrl || !/^https?:\/\//i.test(apiUrl)) {
      Alert.alert('Teste de Conexão', 'Informe uma URL válida para a API.');
      return;
    }
    setTesting(true);
    setTestStatus(null);
    const result = await testApiConnection(apiUrl, apiKey);
    if (result.ok) {
      setTestStatus({ ok: true, message: `Conectado (status ${result.status}).` });
    } else {
      setTestStatus({ ok: false, message: `Falha (status ${result.status}): ${String(result.reason)}` });
    }
    setTesting(false);
  };

  const handleSaveWifi = async () => {
    if (!selectedSSID) {
      Alert.alert('Configuração de WiFi', 'Selecione uma rede WiFi (SSID).');
      return;
    }
    if (!wifiPassword) {
      Alert.alert('Configuração de WiFi', 'Informe a senha da rede WiFi.');
      return;
    }
    setSavingWifi(true);
    try {
      // Simula tentativa de conexão (mock) e salva credenciais com segurança
      await connectToWifi(selectedSSID, wifiPassword);
      await setSecureItem(STORAGE_KEYS.WIFI_SSID, selectedSSID);
      await setSecureItem(STORAGE_KEYS.WIFI_PASSWORD, wifiPassword);
      Alert.alert('Configuração de WiFi', 'Configurações salvas com sucesso.');
    } catch (e) {
      Alert.alert('Configuração de WiFi', 'Falha ao conectar/salvar configuração.');
    } finally {
      setSavingWifi(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <ScreenIdentifier screenName="Configurações" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configurações do Aplicativo</Text>
        <Text style={styles.headerSubtitle}>Defina a URL da API e as credenciais WiFi.</Text>
      </View>

      {/* Seção API */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="globe" size={20} color="#2196F3" />
          <Text style={styles.sectionTitle}>Configuração da API</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>URL da API</Text>
          <TextInput
            placeholder="http://192.168.0.10:4000/api"
            style={styles.input}
            value={apiUrl}
            onChangeText={setApiUrl}
            autoCapitalize="none"
            keyboardType={Platform.OS === 'ios' ? 'url' : 'default'}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Chave de Autenticação (opcional)</Text>
          <TextInput
            placeholder="Cole aqui a chave (se aplicável)"
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleTestConnection} activeOpacity={0.8}>
            {testing ? (
              <ActivityIndicator color="#2196F3" />
            ) : (
              <>
                <Ionicons name="link" size={18} color="#2196F3" />
                <Text style={[styles.buttonText, { color: '#2196F3' }]}> Testar Conexão</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleSaveApi} activeOpacity={0.8}>
            {savingApi ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}> Salvar API</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {testStatus && (
          <View style={[styles.testResult, testStatus.ok ? styles.testOk : styles.testFail]}>
            <Ionicons name={testStatus.ok ? 'checkmark-circle' : 'alert-circle'} size={18} color={testStatus.ok ? '#2e7d32' : '#b71c1c'} />
            <Text style={[styles.testResultText, { color: testStatus.ok ? '#2e7d32' : '#b71c1c' }]}>
              {testStatus.message}
            </Text>
          </View>
        )}
      </View>

      {/* Seção WiFi */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="wifi" size={20} color="#2196F3" />
          <Text style={styles.sectionTitle}>Configuração de WiFi</Text>
        </View>

        {/* Campo para SSID manual */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Rede (SSID)</Text>
          <TextInput
            placeholder="Digite o SSID ou use Buscar Redes"
            style={styles.input}
            value={selectedSSID}
            onChangeText={setSelectedSSID}
            autoCapitalize="none"
          />
          <View style={[styles.row, { marginTop: 10 }]}>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleScanWifi} activeOpacity={0.8}>
              {scanning ? (
                <ActivityIndicator color="#2196F3" />
              ) : (
                <>
                  <Ionicons name="search" size={18} color="#2196F3" />
                  <Text style={[styles.buttonText, { color: '#2196F3' }]}> Buscar Redes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Senha</Text>
          <View style={styles.passwordRow}>
            <TextInput
              placeholder="Senha do WiFi"
              style={[styles.input, { flex: 1 }]}
              secureTextEntry={!showPassword}
              value={wifiPassword}
              onChangeText={setWifiPassword}
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((v) => !v)} activeOpacity={0.8}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleSaveWifi} activeOpacity={0.8}>
          {savingWifi ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}> Salvar WiFi</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de Seleção de WiFi */}
      <Modal visible={wifiModalVisible} transparent animationType="fade" onRequestClose={() => setWifiModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Redes Disponíveis</Text>
              <TouchableOpacity onPress={() => setWifiModalVisible(false)}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {wifiNetworks.map((net, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.networkItem, selectedSSID === net.ssid && styles.networkItemSelected]}
                  onPress={() => {
                    setSelectedSSID(net.ssid);
                    setWifiModalVisible(false);
                  }}
                >
                  <View style={styles.networkRow}>
                    <Text style={styles.networkSsid}>{net.ssid}</Text>
                    <Text style={styles.networkMeta}>{net.security || '—'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, backgroundColor: '#2196F3' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#fff', opacity: 0.9, marginTop: 4 },

  section: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { marginLeft: 8, fontSize: 16, fontWeight: 'bold', color: '#333' },

  formGroup: { marginBottom: 14 },
  label: { fontSize: 14, color: '#555', marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  primaryButton: { backgroundColor: '#2196F3' },
  primaryButtonText: { color: '#fff', fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#BBDEFB' },
  buttonText: { fontWeight: '600' },

  testResult: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: '#f5f5f5' },
  testOk: { backgroundColor: '#E8F5E9' },
  testFail: { backgroundColor: '#FFEBEE' },
  testResultText: { fontSize: 13 },

  selectedField: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  selectedText: { marginLeft: 8, color: '#333' },

  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeButton: { marginLeft: 8, padding: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContainer: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  networkItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  networkItemSelected: { backgroundColor: '#E3F2FD' },
  networkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  networkSsid: { fontSize: 14, color: '#333', fontWeight: '600' },
  networkMeta: { fontSize: 12, color: '#666' },
});