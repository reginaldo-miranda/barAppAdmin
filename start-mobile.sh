#!/bin/bash

echo "📱 Iniciando Aplicativo Mobile..."
cd /Users/reginaldomiranda/Documents/barAppAdmin/mobile

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Configurar IP da LAN e URL da API (evitar localhost/127.0.0.1)
export REACT_NATIVE_PACKAGER_HOSTNAME=${REACT_NATIVE_PACKAGER_HOSTNAME:-192.168.0.176}
export EXPO_PUBLIC_API_URL="http://${REACT_NATIVE_PACKAGER_HOSTNAME}:4000/api"
echo "🔗 EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}"

# Iniciar Expo em modo LAN (aceito pelo CLI) na porta 8082
# Nota: 'network' não é aceito pelo CLI atual; 'lan' cumpre o mesmo objetivo
echo "🔧 Iniciando Expo em modo LAN na porta 8082..."
npx expo start --host lan --port 8082

