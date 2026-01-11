# Sistema de Atualizações OTA (Over-The-Air)

## Como Funciona

O app agora verifica automaticamente se há atualizações disponíveis toda vez que é iniciado. Quando uma atualização é detectada, o usuário recebe um alerta perguntando se deseja atualizar.

## Configuração Implementada

### 1. Pacote instalado
- `expo-updates` - Gerencia atualizações automáticas

### 2. Configuração em app.json
```json
"updates": {
  "enabled": true,
  "checkAutomatically": "ON_LOAD",
  "fallbackToCacheTimeout": 0
}
```

### 3. Código no App.js
- Verifica atualizações na inicialização
- Mostra alerta ao usuário quando atualização disponível
- Baixa e aplica a atualização automaticamente

## Como Publicar Atualizações

### Método 1: EAS Update (Recomendado)

1. Instalar EAS CLI (se ainda não tiver):
```bash
npm install -g eas-cli
```

2. Login no Expo:
```bash
eas login
```

3. Publicar atualização:
```bash
eas update --branch production --message "Descrição da atualização"
```

### Método 2: Expo Publish (Clássico)

```bash
expo publish
```

## Quando Usar Updates OTA

✅ **Use para:**
- Correções de bugs
- Mudanças de UI/UX
- Atualizações de conteúdo
- Pequenas melhorias
- Mudanças em JavaScript/React

❌ **NÃO use para:**
- Mudanças em código nativo (Java/Kotlin/Swift/Objective-C)
- Atualização de dependências nativas
- Mudanças em permissões
- Atualização de versão do Expo SDK

**Para esses casos, você precisa gerar um novo APK/IPA.**

## Fluxo de Atualização

1. Você publica uma atualização via EAS Update
2. Usuário abre o app
3. App verifica automaticamente se há atualização
4. Mostra alerta ao usuário
5. Se aceitar, baixa e aplica a atualização
6. App reinicia com a nova versão

## Verificação Manual

Para adicionar um botão de verificação manual de updates, você pode usar:

```javascript
const manualUpdateCheck = async () => {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } else {
      Alert.alert('Sem Atualizações', 'Você está usando a versão mais recente!');
    }
  } catch (error) {
    Alert.alert('Erro', 'Não foi possível verificar atualizações');
  }
};
```

## Controle de Versão

Sempre que publicar uma atualização:
1. Atualize a versão no `package.json`
2. Atualize a versão no `app.json`
3. Faça commit das mudanças
4. Publique a atualização

## Download do App

Link atual: https://expo.dev/accounts/thyag0o/projects/financias-mobile/builds/0f343302-1f2e-4e5f-8a4b-0bb849fb9331

## Comandos Úteis

```bash
# Ver status atual do update
eas update:list

# Ver configuração do projeto
eas update:configure

# Publicar update para branch específica
eas update --branch production

# Publicar update para canal específico  
eas update --channel production
```

## Observações Importantes

- Updates OTA **só funcionam em apps de produção** (não no Expo Go)
- Em modo de desenvolvimento (`__DEV__`), a verificação é desabilitada
- Usuários precisam estar conectados à internet para receber updates
- A primeira vez que o app abre após o update, ele baixa em background
- Updates são aplicados no próximo carregamento do app
