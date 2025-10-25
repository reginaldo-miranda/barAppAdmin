#!/bin/bash

echo "📱 Iniciando Aplicativo Mobile..."
cd /Users/reginaldomiranda/Documents/barAppAdmin/mobile

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Configurar URL pública da API (LocalTunnel fixo)
export EXPO_PUBLIC_API_URL="https://small-trees-rescue.loca.lt/api"
echo "🔗 EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}"

echo "🔧 Iniciando Expo em modo túnel na porta 8086..."
npx expo start --tunnel --port 8086

