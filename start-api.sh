#!/bin/bash

echo "🚀 Iniciando API do Sistema Bar..."
cd /Users/reginaldomiranda/Documents/barAppAdmin/api

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "📋 Criando arquivo .env..."
    cp env.example .env
    sed -i '' 's/PORT=5000/PORT=4000/' .env
fi

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

echo "🔧 Iniciando servidor na porta 4000..."
npm start

