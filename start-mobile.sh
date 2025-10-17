#!/bin/bash

echo "📱 Iniciando Aplicativo Mobile..."
cd /Users/reginaldomiranda/Documents/barApp/mobile

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

echo "🔧 Iniciando Expo..."
npm start

