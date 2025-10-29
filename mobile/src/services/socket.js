import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform, NativeModules } from 'react-native';
import { STORAGE_KEYS } from './storage';
import { API_URL } from './api';

let socket = null;
let currentUrl = '';

function resolveServerOriginFromUrl(url) {
  try {
    const base = String(url || '').replace(/\/$/, '');
    const u = new URL(base);
    const protocol = u.protocol || 'http:';
    const port = u.port || '4000';
    return `${protocol}//${u.hostname}:${port}`;
  } catch {
    return '';
  }
}

function resolveFallbackServerOrigin() {
  const DEFAULT_PORT = 4000;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:${DEFAULT_PORT}`;
  }
  const expoHost = Constants?.expoGo?.developer?.host;
  const manifestHost = Constants?.manifest?.debuggerHost;
  const configHostUri = Constants?.expoConfig?.hostUri;
  let bundleHost = '';
  try {
    const scriptUrl = NativeModules?.SourceCode?.scriptURL;
    if (scriptUrl) {
      const parsed = new URL(String(scriptUrl));
      bundleHost = parsed.hostname;
    }
  } catch {}
  const hostCandidates = [expoHost, manifestHost, configHostUri, bundleHost].filter(Boolean);
  for (const h of hostCandidates) {
    const hostPart = String(h).split(':')[0];
    if (hostPart) return `http://${hostPart}:${DEFAULT_PORT}`;
  }
  // Sem fallback fixo — exige configuração via ENV/Storage
  return '';
}

async function deriveServerUrl() {
  // Prioridade: override explícito de Socket
  const storedSocketOrigin = await AsyncStorage.getItem(STORAGE_KEYS.SOCKET_ORIGIN);
  const envSocketOrigin = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_SOCKET_ORIGIN : '';
  if (storedSocketOrigin) return String(storedSocketOrigin);
  if (envSocketOrigin) return String(envSocketOrigin);

  // Derivar da base da API
  const storedBaseUrl = await AsyncStorage.getItem(STORAGE_KEYS.API_BASE_URL);
  const envBaseUrl = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_URL : '';
  const baseCandidate = storedBaseUrl || envBaseUrl || API_URL || '';
  let origin = resolveServerOriginFromUrl(baseCandidate);
  if (!origin) origin = resolveFallbackServerOrigin();
  return origin;
}

export async function connectSocket(options = {}) {
  const url = await deriveServerUrl();
  if (!url) {
    console.warn('Socket origin não definido. Configure EXPO_PUBLIC_SOCKET_ORIGIN ou API_BASE_URL.');
    return null;
  }
  if (socket && socket.connected && url === currentUrl) {
    return socket;
  }
  currentUrl = url;
  if (socket) {
    try { socket.disconnect(); } catch {}
    socket = null;
  }
  socket = io(url, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 8000,
    ...options,
  });

  socket.on('connect', () => {
    // console.log('🔌 Socket conectado em', url);
  });
  socket.on('connect_error', (err) => {
    console.warn('⚠️ Erro de conexão Socket:', err?.message || err);
  });
  socket.on('error', (err) => {
    console.warn('⚠️ Erro no Socket:', err?.message || err);
  });
  socket.on('reconnect_attempt', () => {
    // console.log('🔁 Tentando reconectar Socket...');
  });
  socket.on('reconnect_failed', () => {
    console.warn('❌ Falha ao reconectar ao Socket');
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function socketOn(event, handler) {
  if (!socket) return;
  try {
    socket.on(event, handler);
  } catch (e) {
    console.warn('Erro ao registrar listener Socket:', e);
  }
}

export function socketOff(event, handler) {
  if (!socket) return;
  try {
    socket.off(event, handler);
  } catch {}
}

export function disconnectSocket() {
  if (!socket) return;
  try {
    socket.disconnect();
  } catch {}
  socket = null;
}

export async function shouldEnableRealtime() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.ENABLE_REALTIME);
    const envVal = typeof process !== 'undefined' ? (process.env?.EXPO_PUBLIC_ENABLE_REALTIME || '') : '';
    const val = String(stored ?? envVal ?? '').trim().toLowerCase();
    if (!val) return true; // padrão: habilitado
    return val === 'true' || val === '1' || val === 'yes' || val === 'on';
  } catch {
    return true;
  }
}