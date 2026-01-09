# 📱 App Finanças Mobile - React Native

Aplicativo mobile de gestão financeira pessoal com banco de dados SQLite local.

## 🚀 Como Executar

### Pré-requisitos
- Node.js instalado (v16 ou superior)
- npm ou yarn
- Expo Go app instalado no telemóvel ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) | [iOS](https://apps.apple.com/app/expo-go/id982107779))

### Passo 1: Instalar Dependências

Abra o terminal na pasta do projeto e execute:

```bash
npm install
```

### Passo 2: Iniciar o Servidor de Desenvolvimento

```bash
npm start
```

ou

```bash
npx expo start
```

### Passo 3: Executar no Dispositivo

Após iniciar o servidor, você verá um QR code no terminal.

#### No Android:
1. Abra o app **Expo Go**
2. Toque em "Scan QR code"
3. Aponte para o QR code no terminal

#### No iOS:
1. Abra a **Câmera** nativa do iPhone
2. Aponte para o QR code
3. Toque na notificação que aparece

#### No Emulador Android Studio:
```bash
npm run android
```

## 🗄️ Banco de Dados

O app usa **SQLite** para armazenamento local persistente:

- ✅ Dados salvos automaticamente
- ✅ Funciona offline
- ✅ 3 tabelas: `accounts`, `transactions`, `config`

### Schema do Banco

**accounts**
- id (PK)
- name
- balance
- color
- created_at

**transactions**
- id (PK)
- description
- amount
- type (income/expense)
- category
- account_id (FK)
- account_name
- date

**config**
- id (sempre 1)
- daily_rate
- days_per_week
- manual_override
- manual_amount

## 📦 Funcionalidades

- ✅ Dashboard com resumo financeiro
- ✅ Adicionar receitas e despesas
- ✅ Gestão de múltiplas contas
- ✅ Categorização de gastos
- ✅ Cálculo automático de lucro mensal
- ✅ Configuração de renda (por dia ou fixa)
- ✅ Visualização de transações por categoria
- ✅ Barra de progresso de gastos mensais

## 🛠️ Tecnologias

- React Native
- Expo
- Expo SQLite (banco de dados local)
- Ionicons

## 📂 Estrutura do Projeto

```
financias/
├── App.js              # Componente principal
├── src/
│   └── database/
│       └── database.js # Configuração e queries SQLite
├── package.json
├── app.json
└── babel.config.js
```

## 🔧 Comandos Úteis

```bash
# Iniciar em modo desenvolvimento
npm start

# Executar no Android
npm run android

# Executar no iOS
npm run ios

# Executar no navegador (web)
npm run web

# Limpar cache
npx expo start -c
```

## 📱 Testar no Android Studio

1. Instale o Android Studio
2. Configure um emulador Android (AVD)
3. Inicie o emulador
4. Execute `npm run android`

## 🐛 Resolução de Problemas

**Erro ao instalar dependências:**
```bash
npm cache clean --force
npm install
```

**App não carrega no Expo Go:**
- Certifique-se de que o telemóvel e PC estão na mesma rede Wi-Fi
- Tente usar a opção "Tunnel" em vez de "LAN"

**Banco de dados não persiste:**
- Verifique se não está em modo de desenvolvimento com hot reload ativo
- Reinstale o app no dispositivo

## 📝 Licença

Projeto pessoal de estudos.
