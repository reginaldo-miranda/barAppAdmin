# 🍺 Sistema Bar - Guia de Configuração

## 📋 Visão Geral
Este projeto consiste em dois sistemas integrados:
- **API Backend** (sisbarnew) - Node.js + MongoDB
- **App Mobile** (barApp) - React Native + Expo

## 🚀 Como Executar

### Opção 1: Scripts Automáticos (Recomendado)
```bash
# Para iniciar apenas a API
./start-api.sh

# Para iniciar apenas o mobile
./start-mobile.sh

# Para iniciar ambos os sistemas
./start-all.sh
```

### Opção 2: Manual

#### 1. Iniciar API (Terminal 1)
```bash
cd /Users/reginaldomiranda/Documents/sisbarnew
npm install
npm start
```

#### 2. Iniciar Mobile (Terminal 2)
```bash
cd /Users/reginaldomiranda/Documents/barApp/mobile
npm install
npm start
```

## 🌐 URLs dos Sistemas
- **API**: http://localhost:4000
- **Mobile (Expo)**: http://localhost:8081
- **Expo DevTools**: http://localhost:8081

## 📱 Como Testar no Dispositivo
1. Instale o app **Expo Go** no seu celular
2. Escaneie o QR code que aparece no terminal
3. O app será carregado no seu dispositivo

## 🔧 Configurações
- **Porta da API**: 4000 (configurada no .env)
- **MongoDB**: Conectado via string do Atlas
- **Autenticação**: JWT habilitado

## 🐛 Solução de Problemas

### API não inicia
- Verifique se a porta 4000 está livre
- Confirme se o arquivo .env existe
- Verifique a conexão com MongoDB

### Mobile não carrega
- Verifique se o Expo está instalado: `npm install -g @expo/cli`
- Limpe o cache: `npx expo start --clear`

### Conexão entre sistemas
- Confirme se a API está rodando na porta 4000
- Verifique o IP no arquivo `mobile/src/services/api.js`

## 📞 Suporte
Para problemas ou dúvidas, verifique os logs nos terminais onde os sistemas estão rodando.

