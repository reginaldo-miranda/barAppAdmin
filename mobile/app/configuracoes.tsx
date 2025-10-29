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
import { testApiConnection, API_URL } from '../src/services/api';
import { scanWifiNetworks, connectToWifi, isWifiConnectionRealPossible } from '../src/services/wifi';
import { SafeIcon } from '../components/SafeIcon';
import { useAuth } from '../src/contexts/AuthContext';
import { isValidIPv4, isValidIPv4Mask, sameSubnet, isValidIPv6, isValidIPv6Prefix, buildApiUrlFromIPv4 } from '../src/utils/net';

export default function ConfiguracoesScreen() {
  const { isAdmin } = useAuth() as any;
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
  const [testingWifi, setTestingWifi] = useState(false);
  const [wifiTestStatus, setWifiTestStatus] = useState<null | { ok: boolean; message: string }>(null);
  const [wifiRealCapable, setWifiRealCapable] = useState<boolean | null>(null);
  const [apiTimeoutMs, setApiTimeoutMs] = useState('');

  // Rede (IPv4 / IPv6)
  const [dhcpEnabled, setDhcpEnabled] = useState(true);
  const [ipv4Address, setIpv4Address] = useState('');
  const [ipv4Mask, setIpv4Mask] = useState('');
  const [ipv4Gateway, setIpv4Gateway] = useState('');
  const [ipv4Dns1, setIpv4Dns1] = useState('');
  const [ipv4Dns2, setIpv4Dns2] = useState('');
  const [ipv6Address, setIpv6Address] = useState('');
  const [ipv6Prefix, setIpv6Prefix] = useState('');
  const [ipv6Gateway, setIpv6Gateway] = useState('');
  const [ipv6Dns1, setIpv6Dns1] = useState('');
  const [ipv6Dns2, setIpv6Dns2] = useState('');
  const [netErrors, setNetErrors] = useState<Record<string, string>>({});
  const [savingNet, setSavingNet] = useState(false);
  const [testingNet, setTestingNet] = useState(false);
  const [netTestStatus, setNetTestStatus] = useState<null | { ok: boolean; message: string }>(null);

  useEffect(() => {
    (async () => {
      try {
        const storedUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_BASE_URL);
        const storedKey = await getSecureItem(STORAGE_KEYS.API_AUTH_KEY);
        const storedSsid = await getSecureItem(STORAGE_KEYS.WIFI_SSID);
        const storedPwd = await getSecureItem(STORAGE_KEYS.WIFI_PASSWORD);
        const savedTimeoutStr = await AsyncStorage.getItem(STORAGE_KEYS.API_TIMEOUT_MS);
        if (storedUrl) setApiUrl(storedUrl);
        if (!storedUrl) setApiUrl(API_URL);
        if (storedKey) setApiKey(storedKey);
        if (storedSsid) setSelectedSSID(storedSsid);
        if (storedPwd) setWifiPassword(storedPwd);
        if (savedTimeoutStr) setApiTimeoutMs(savedTimeoutStr);

        // Rede
        const dhcpStr = await AsyncStorage.getItem(STORAGE_KEYS.NETWORK_DHCP);
        setDhcpEnabled(!dhcpStr ? true : dhcpStr === 'true');
        const v4ip = await AsyncStorage.getItem(STORAGE_KEYS.IPV4_ADDRESS);
        const v4mask = await AsyncStorage.getItem(STORAGE_KEYS.IPV4_MASK);
        const v4gw = await AsyncStorage.getItem(STORAGE_KEYS.IPV4_GATEWAY);
        const v4dns1 = await AsyncStorage.getItem(STORAGE_KEYS.IPV4_DNS1);
        const v4dns2 = await AsyncStorage.getItem(STORAGE_KEYS.IPV4_DNS2);
        if (v4ip) setIpv4Address(v4ip);
        if (v4mask) setIpv4Mask(v4mask);
        if (v4gw) setIpv4Gateway(v4gw);
        if (v4dns1) setIpv4Dns1(v4dns1);
        if (v4dns2) setIpv4Dns2(v4dns2);

        const v6ip = await AsyncStorage.getItem(STORAGE_KEYS.IPV6_ADDRESS);
        const v6prefix = await AsyncStorage.getItem(STORAGE_KEYS.IPV6_PREFIX);
        const v6gw = await AsyncStorage.getItem(STORAGE_KEYS.IPV6_GATEWAY);
        const v6dns1 = await AsyncStorage.getItem(STORAGE_KEYS.IPV6_DNS1);
        const v6dns2 = await AsyncStorage.getItem(STORAGE_KEYS.IPV6_DNS2);
        if (v6ip) setIpv6Address(v6ip);
        if (v6prefix) setIpv6Prefix(v6prefix);
        if (v6gw) setIpv6Gateway(v6gw);
        if (v6dns1) setIpv6Dns1(v6dns1);
        if (v6dns2) setIpv6Dns2(v6dns2);
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

  // Helpers para evitar URLs locais e facilitar preenchimento
  const isLocalUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
};

const getEnvApiUrl = (): string | undefined => {
  try {
    // @ts-ignore
    return typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_URL : undefined;
  } catch {
    return undefined;
  }
};

  const handleSaveApi = async () => {
    if (!apiUrl || !/^https?:\/\//i.test(apiUrl)) {
      Alert.alert('Configuração da API', 'Informe uma URL válida (http/https).');
      return;
    }
    // Evita salvar localhost/127.0.0.1
    if (isLocalUrl(apiUrl)) {
      Alert.alert('Configuração da API', 'URL local (localhost/127.0.0.1) não funciona fora do servidor. Informe a URL pública ou IP acessível na rede.');
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

  const handleFillAuto = () => {
    const envUrl = getEnvApiUrl();
    const candidate = envUrl || API_URL;
    if (!candidate || isLocalUrl(candidate)) {
      Alert.alert('Configuração da API', 'Detecção automática retornou endereço local (localhost/127.0.0.1). Informe manualmente a URL pública (ex: https://small-trees-rescue.loca.lt/api) ou o IP/DNS acessível da rede.');
      return;
    }
    setApiUrl(candidate);
  };

  const handleClearApi = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.API_BASE_URL);
      const envUrl = getEnvApiUrl();
      setApiUrl(envUrl || '');
      Alert.alert('Configuração da API', 'URL salva removida. Defina novamente ou use ENV.');
    } catch (e) {
      Alert.alert('Configuração da API', 'Falha ao limpar URL.');
    }
  };

  const handleUseEnv = () => {
    const envUrl = getEnvApiUrl();
    if (!envUrl) {
      Alert.alert('Configuração da API', 'Nenhuma EXPO_PUBLIC_API_URL disponível. Informe manualmente.');
      return;
    }
    if (isLocalUrl(envUrl)) {
      Alert.alert('Configuração da API', 'ENV aponta para localhost/127.0.0.1, isso não funciona fora da máquina do servidor.');
      return;
    }
    setApiUrl(envUrl);
  };

  // Salvar Timeout da API (ms)
  const handleSaveApiTimeout = async () => {
    const val = Number(apiTimeoutMs);
    if (!Number.isFinite(val) || val < 3000 || val > 60000) {
      Alert.alert('Timeout da API', 'Informe um valor entre 3000 e 60000 ms.');
      return;
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.API_TIMEOUT_MS, String(val));
      Alert.alert('Timeout da API', 'Timeout salvo com sucesso. As próximas requisições usarão este valor.');
    } catch (e) {
      Alert.alert('Timeout da API', 'Falha ao salvar o timeout.');
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

  // ====== Validações e persistência de Rede ======
  const validateNetwork = (): boolean => {
    const errors: Record<string, string> = {};

    if (!dhcpEnabled) {
      // IPv4 obrigatórios
      if (!ipv4Address || !isValidIPv4(ipv4Address)) errors.ipv4Address = 'Endereço IPv4 inválido';
      if (!ipv4Mask || !isValidIPv4Mask(ipv4Mask)) errors.ipv4Mask = 'Máscara IPv4 inválida';
      if (!ipv4Gateway || !isValidIPv4(ipv4Gateway)) errors.ipv4Gateway = 'Gateway IPv4 inválido';
      if (!errors.ipv4Address && !errors.ipv4Mask && !errors.ipv4Gateway && !sameSubnet(ipv4Address, ipv4Mask, ipv4Gateway)) {
        errors.subnet = 'IP e Gateway devem pertencer à mesma sub-rede';
      }
      if (ipv4Dns1 && !isValidIPv4(ipv4Dns1)) errors.ipv4Dns1 = 'DNS primário IPv4 inválido';
      if (ipv4Dns2 && !isValidIPv4(ipv4Dns2)) errors.ipv4Dns2 = 'DNS secundário IPv4 inválido';
    }

    // IPv6 opcionais, mas se preenchidos validar
    if (ipv6Address && !isValidIPv6(ipv6Address)) errors.ipv6Address = 'Endereço IPv6 inválido';
    if (ipv6Prefix && !isValidIPv6Prefix(ipv6Prefix)) errors.ipv6Prefix = 'Prefixo IPv6 deve estar entre 0 e 128';
    if (ipv6Gateway && !isValidIPv6(ipv6Gateway)) errors.ipv6Gateway = 'Gateway IPv6 inválido';
    if (ipv6Dns1 && !isValidIPv6(ipv6Dns1)) errors.ipv6Dns1 = 'DNS primário IPv6 inválido';
    if (ipv6Dns2 && !isValidIPv6(ipv6Dns2)) errors.ipv6Dns2 = 'DNS secundário IPv6 inválido';

    setNetErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveNetwork = async () => {
    setNetTestStatus(null);
    if (!validateNetwork()) {
      Alert.alert('Configuração de Rede', 'Corrija os campos destacados antes de salvar.');
      return;
    }
    setSavingNet(true);
    try {
      // Registrar log da alteração
      const prev = {
        dhcp: await AsyncStorage.getItem(STORAGE_KEYS.NETWORK_DHCP),
        v4ip: await AsyncStorage.getItem(STORAGE_KEYS.IPV4_ADDRESS),
        v4mask: await AsyncStorage.getItem(STORAGE_KEYS.IPV4_MASK),
        v4gw: await AsyncStorage.getItem(STORAGE_KEYS.IPV4_GATEWAY),
        v4dns1: await AsyncStorage.getItem(STORAGE_KEYS.IPV4_DNS1),
        v4dns2: await AsyncStorage.getItem(STORAGE_KEYS.IPV4_DNS2),
        v6ip: await AsyncStorage.getItem(STORAGE_KEYS.IPV6_ADDRESS),
        v6prefix: await AsyncStorage.getItem(STORAGE_KEYS.IPV6_PREFIX),
        v6gw: await AsyncStorage.getItem(STORAGE_KEYS.IPV6_GATEWAY),
        v6dns1: await AsyncStorage.getItem(STORAGE_KEYS.IPV6_DNS1),
        v6dns2: await AsyncStorage.getItem(STORAGE_KEYS.IPV6_DNS2),
      };

      await AsyncStorage.setItem(STORAGE_KEYS.NETWORK_DHCP, String(dhcpEnabled));
      await AsyncStorage.setItem(STORAGE_KEYS.IPV4_ADDRESS, ipv4Address || '');
      await AsyncStorage.setItem(STORAGE_KEYS.IPV4_MASK, ipv4Mask || '');
      await AsyncStorage.setItem(STORAGE_KEYS.IPV4_GATEWAY, ipv4Gateway || '');
      await AsyncStorage.setItem(STORAGE_KEYS.IPV4_DNS1, ipv4Dns1 || '');
      await AsyncStorage.setItem(STORAGE_KEYS.IPV4_DNS2, ipv4Dns2 || '');
      await AsyncStorage.setItem(STORAGE_KEYS.IPV6_ADDRESS, ipv6Address || '');
      await AsyncStorage.setItem(STORAGE_KEYS.IPV6_PREFIX, ipv6Prefix || '');
      await AsyncStorage.setItem(STORAGE_KEYS.IPV6_GATEWAY, ipv6Gateway || '');
      await AsyncStorage.setItem(STORAGE_KEYS.IPV6_DNS1, ipv6Dns1 || '');
      await AsyncStorage.setItem(STORAGE_KEYS.IPV6_DNS2, ipv6Dns2 || '');

      const logItem = {
        at: new Date().toISOString(),
        actor: 'usuario',
        prev,
        next: {
          dhcp: dhcpEnabled,
          v4ip: ipv4Address,
          v4mask: ipv4Mask,
          v4gw: ipv4Gateway,
          v4dns1: ipv4Dns1,
          v4dns2: ipv4Dns2,
          v6ip: ipv6Address,
          v6prefix: ipv6Prefix,
          v6gw: ipv6Gateway,
          v6dns1: ipv6Dns1,
          v6dns2: ipv6Dns2,
        },
      };
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.NETWORK_CONFIG_LOG);
        const arr = raw ? JSON.parse(raw) : [];
        arr.push(logItem);
        await AsyncStorage.setItem(STORAGE_KEYS.NETWORK_CONFIG_LOG, JSON.stringify(arr));
      } catch {}

      Alert.alert('Configuração de Rede', 'Configurações de rede salvas com sucesso.');
    } catch (e) {
      Alert.alert('Configuração de Rede', 'Falha ao salvar configurações.');
    } finally {
      setSavingNet(false);
    }
  };

  const buildIpv6ApiUrl = (address: string, port = 4000) => {
    const addr = String(address).trim();
    return `http://[${addr}]:${port}/api`;
  };

  const handleTestNetworkConnectivity = async () => {
    setTestingNet(true);
    setNetTestStatus(null);
    try {
      let baseCandidate = apiUrl;
      // Se IPs foram preenchidos, permitir teste direto pelo endereço
      if (!dhcpEnabled && isValidIPv4(ipv4Address)) {
        baseCandidate = buildApiUrlFromIPv4(ipv4Address);
      } else if (ipv6Address && isValidIPv6(ipv6Address)) {
        baseCandidate = buildIpv6ApiUrl(ipv6Address);
      }
      if (!baseCandidate) {
        setNetTestStatus({ ok: false, message: 'Nenhuma base de API para teste. Preencha URL da API ou IP.' });
        setTestingNet(false);
        return;
      }
      const res = await testApiConnection(baseCandidate, apiKey);
      setNetTestStatus({ ok: res.ok, message: res.ok ? `Conectado (status ${res.status}).` : `Falha (${res.status}): ${String(res.reason)}` });
    } catch (e) {
      setNetTestStatus({ ok: false, message: 'Erro no teste de conectividade.' });
    } finally {
      setTestingNet(false);
    }
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

  useEffect(() => {
    (async () => {
      try {
        const capable = await isWifiConnectionRealPossible();
        setWifiRealCapable(capable);
      } catch {
        setWifiRealCapable(false);
      }
    })();
  }, []);

  const handleTestWifi = async () => {
    setWifiTestStatus(null);
    const realPossible = await isWifiConnectionRealPossible();
    if (!selectedSSID) {
      Alert.alert('Teste de WiFi', 'Informe ou selecione uma rede WiFi (SSID).');
      setWifiTestStatus({ ok: false, message: 'SSID ausente.' });
      return;
    }
    if (!wifiPassword) {
      Alert.alert('Teste de WiFi', 'Informe a senha da rede WiFi.');
      setWifiTestStatus({ ok: false, message: 'Senha ausente.' });
      return;
    }
    setTestingWifi(true);
    try {
      const res = await connectToWifi(selectedSSID, wifiPassword);
      const msg = res?.success
        ? realPossible
          ? `Conexão bem-sucedida à rede ${selectedSSID}.`
          : `Teste simulado concluído com sucesso para ${selectedSSID} (Web/Expo Go/iOS).`
        : 'Falha ao conectar.';
      setWifiTestStatus({ ok: !!res?.success, message: msg });
      Alert.alert('Teste de WiFi', msg);
    } catch (e) {
      const msg = realPossible ? 'Falha ao conectar. Verifique SSID/senha e permissões.' : 'Falha ao simular teste. Verifique SSID/senha.';
      setWifiTestStatus({ ok: false, message: msg });
      Alert.alert('Teste de WiFi', msg);
    } finally {
      setTestingWifi(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <ScreenIdentifier screenName="Configurações" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configurações do Aplicativo</Text>
        <Text style={styles.headerSubtitle}>Defina rede, URL da API e credenciais WiFi.</Text>
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
          <View style={[styles.row, { marginTop: 10 }]}> 
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleFillAuto} activeOpacity={0.8}>
              <Ionicons name="flash" size={18} color="#2196F3" />
              <Text style={[styles.buttonText, { color: '#2196F3' }]}> Preencher automaticamente</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
            Detectado: {API_URL || '(sem detecção)'}
          </Text>
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
                <SafeIcon name="link" size={18} color="#2196F3" fallbackText="🔗" />
                <Text style={[styles.buttonText, { color: '#2196F3' }]}> Testar Conexão</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleSaveApi} activeOpacity={0.8}>
            {savingApi ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <SafeIcon name="save" size={18} color="#fff" fallbackText="💾" />
                <Text style={styles.primaryButtonText}> Salvar API</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.row, { marginTop: 10 }]}> 
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleClearApi} activeOpacity={0.8}>
            <Ionicons name="trash" size={18} color="#b71c1c" />
            <Text style={[styles.buttonText, { color: '#b71c1c' }]}> Limpar URL da API</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleUseEnv} activeOpacity={0.8}>
            <Ionicons name="globe-outline" size={18} color="#2196F3" />
            <Text style={[styles.buttonText, { color: '#2196F3' }]}> Usar ENV</Text>
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

      {/* Seção Rede */}
      {isAdmin() && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="server" size={20} color="#2196F3" />
            <Text style={styles.sectionTitle}>Configuração de Rede</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Modo de Endereçamento</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.button, dhcpEnabled ? styles.primaryButton : styles.secondaryButton]}
                onPress={() => setDhcpEnabled(true)}
              >
                <Text style={[styles.buttonText, dhcpEnabled ? styles.primaryButtonText : { color: '#2196F3' }]}>DHCP automático</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, !dhcpEnabled ? styles.primaryButton : styles.secondaryButton]}
                onPress={() => setDhcpEnabled(false)}
              >
                <Text style={[styles.buttonText, !dhcpEnabled ? styles.primaryButtonText : { color: '#2196F3' }]}>IP estático</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!dhcpEnabled && (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Endereço IP (IPv4)</Text>
                <TextInput
                  placeholder="ex: 192.168.0.50"
                  style={styles.input}
                  value={ipv4Address}
                  onChangeText={setIpv4Address}
                  keyboardType="numeric"
                />
                {netErrors.ipv4Address && <Text style={styles.errorText}>{netErrors.ipv4Address}</Text>}
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Máscara de Sub-rede</Text>
                <TextInput
                  placeholder="ex: 255.255.255.0"
                  style={styles.input}
                  value={ipv4Mask}
                  onChangeText={setIpv4Mask}
                  keyboardType="numeric"
                />
                {netErrors.ipv4Mask && <Text style={styles.errorText}>{netErrors.ipv4Mask}</Text>}
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Gateway Padrão</Text>
                <TextInput
                  placeholder="ex: 192.168.0.1"
                  style={styles.input}
                  value={ipv4Gateway}
                  onChangeText={setIpv4Gateway}
                  keyboardType="numeric"
                />
                {netErrors.ipv4Gateway && <Text style={styles.errorText}>{netErrors.ipv4Gateway}</Text>}
                {netErrors.subnet && <Text style={styles.errorText}>{netErrors.subnet}</Text>}
              </View>
              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1 }] }>
                  <Text style={styles.label}>DNS Primário</Text>
                  <TextInput
                    placeholder="ex: 8.8.8.8"
                    style={styles.input}
                    value={ipv4Dns1}
                    onChangeText={setIpv4Dns1}
                    keyboardType="numeric"
                  />
                  {netErrors.ipv4Dns1 && <Text style={styles.errorText}>{netErrors.ipv4Dns1}</Text>}
                </View>
                <View style={[styles.formGroup, { flex: 1 }] }>
                  <Text style={styles.label}>DNS Secundário</Text>
                  <TextInput
                    placeholder="ex: 1.1.1.1"
                    style={styles.input}
                    value={ipv4Dns2}
                    onChangeText={setIpv4Dns2}
                    keyboardType="numeric"
                  />
                  {netErrors.ipv4Dns2 && <Text style={styles.errorText}>{netErrors.ipv4Dns2}</Text>}
                </View>
              </View>
            </>
          )}

          {/* IPv6 Opcional */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Endereço IPv6 (opcional)</Text>
            <TextInput
              placeholder="ex: 2804:14d:1234::10"
              style={styles.input}
              value={ipv6Address}
              onChangeText={setIpv6Address}
              autoCapitalize="none"
            />
            {netErrors.ipv6Address && <Text style={styles.errorText}>{netErrors.ipv6Address}</Text>}
          </View>
          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1 }] }>
              <Text style={styles.label}>Prefixo IPv6</Text>
              <TextInput
                placeholder="ex: 64"
                style={styles.input}
                value={ipv6Prefix}
                onChangeText={setIpv6Prefix}
                keyboardType="numeric"
              />
              {netErrors.ipv6Prefix && <Text style={styles.errorText}>{netErrors.ipv6Prefix}</Text>}
            </View>
            <View style={[styles.formGroup, { flex: 1 }] }>
              <Text style={styles.label}>Gateway IPv6</Text>
              <TextInput
                placeholder="ex: 2804:14d:1234::1"
                style={styles.input}
                value={ipv6Gateway}
                onChangeText={setIpv6Gateway}
                autoCapitalize="none"
              />
              {netErrors.ipv6Gateway && <Text style={styles.errorText}>{netErrors.ipv6Gateway}</Text>}
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1 }] }>
              <Text style={styles.label}>DNS Primário IPv6</Text>
              <TextInput
                placeholder="ex: 2804:10:ffff::8"
                style={styles.input}
                value={ipv6Dns1}
                onChangeText={setIpv6Dns1}
                autoCapitalize="none"
              />
              {netErrors.ipv6Dns1 && <Text style={styles.errorText}>{netErrors.ipv6Dns1}</Text>}
            </View>
            <View style={[styles.formGroup, { flex: 1 }] }>
              <Text style={styles.label}>DNS Secundário IPv6</Text>
              <TextInput
                placeholder="ex: 2804:10:ffff::1"
                style={styles.input}
                value={ipv6Dns2}
                onChangeText={setIpv6Dns2}
                autoCapitalize="none"
              />
              {netErrors.ipv6Dns2 && <Text style={styles.errorText}>{netErrors.ipv6Dns2}</Text>}
            </View>
          </View>

          <View style={styles.row}>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleTestNetworkConnectivity} activeOpacity={0.8}>
              {testingNet ? (
                <ActivityIndicator color="#2196F3" />
              ) : (
                <>
                  <SafeIcon name="link" size={18} color="#2196F3" fallbackText="🔗" />
                  <Text style={[styles.buttonText, { color: '#2196F3' }]}> Testar Conexão</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleSaveNetwork} activeOpacity={0.8}>
              {savingNet ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <SafeIcon name="save" size={18} color="#fff" fallbackText="💾" />
                  <Text style={styles.primaryButtonText}> Salvar Rede</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {netTestStatus && (
            <View style={[styles.testResult, netTestStatus.ok ? styles.testOk : styles.testFail]}>
              <Ionicons name={netTestStatus.ok ? 'checkmark-circle' : 'alert-circle'} size={18} color={netTestStatus.ok ? '#2e7d32' : '#b71c1c'} />
              <Text style={[styles.testResultText, { color: netTestStatus.ok ? '#2e7d32' : '#b71c1c' }]}>
                {netTestStatus.message}
              </Text>
            </View>
          )}

          <Text style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
            Nota: esta configuração não altera o IP do dispositivo; serve para padronizar acesso à rede/API pelo app.
          </Text>
        </View>
      )}

      {/* Seção WiFi */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="wifi" size={20} color="#2196F3" />
          <Text style={styles.sectionTitle}>Configuração de WiFi</Text>
          {wifiRealCapable !== null && (
            <View style={[styles.statusBadge, wifiRealCapable ? styles.statusBadgeReal : styles.statusBadgeSimulated]}>
              <Ionicons name={wifiRealCapable ? 'checkmark' : 'information-circle'} size={14} color={wifiRealCapable ? '#2e7d32' : '#1a237e'} />
              <Text style={[styles.statusBadgeText, { color: wifiRealCapable ? '#2e7d32' : '#1a237e' }]}>
                {wifiRealCapable ? 'Modo: Real' : 'Modo: Simulado'}
              </Text>
            </View>
          )}
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
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleTestWifi} activeOpacity={0.8}>
              {testingWifi ? (
                <ActivityIndicator color="#2196F3" />
              ) : (
                <>
                  <Ionicons name="wifi" size={18} color="#2196F3" />
                  <Text style={[styles.buttonText, { color: '#2196F3' }]}> Testar WiFi</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setWifiTestStatus(null)} activeOpacity={0.8}>
              <Ionicons name="close-circle" size={18} color="#9E9E9E" />
              <Text style={[styles.buttonText, { color: '#9E9E9E' }]}> Limpar resultado</Text>
            </TouchableOpacity>
          </View>

          {wifiTestStatus && (
            <View style={[styles.testResult, wifiTestStatus.ok ? styles.testOk : styles.testFail]}>
              <Ionicons name={wifiTestStatus.ok ? 'checkmark-circle' : 'alert-circle'} size={18} color={wifiTestStatus.ok ? '#2e7d32' : '#b71c1c'} />
              <Text style={[styles.testResultText, { color: wifiTestStatus.ok ? '#2e7d32' : '#b71c1c' }]}>
                {wifiTestStatus.message}
              </Text>
            </View>
          )}
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

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#BBDEFB' },
  statusBadgeReal: { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' },
  statusBadgeSimulated: { backgroundColor: '#EDE7F6', borderColor: '#D1C4E9' },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },

  testResult: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: '#f5f5f5' },
  testOk: { backgroundColor: '#E8F5E9' },
  testFail: { backgroundColor: '#FFEBEE' },
  testResultText: { fontSize: 13 },
  errorText: { fontSize: 12, color: '#b71c1c', marginTop: 6 },

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