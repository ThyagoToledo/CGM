# EAS Workflows - Automação

Este diretório contém workflows automatizados para o projeto.

## 📋 Workflows Disponíveis

### 🔨 `build-android-production.yml`
**Build automática de Android APK**
- **Quando executa:** Push na branch `main` (exceto alterações em arquivos `.md`)
- **O que faz:** Cria uma nova build Android APK (versão de produção)
- **Perfil:** `production` (configurado no `eas.json`)
- **Execução manual:** `eas workflow:run build-android-production.yml`

### ⚡ `update-production.yml`
**Update OTA automático**
- **Quando executa:** Push na branch `main` com alterações em `src/`, `App.js` ou `package.json`
- **O que faz:** Publica atualização OTA (Over-The-Air) para usuários
- **Branch:** `production`
- **Execução manual:** `eas workflow:run update-production.yml`

## 🚀 Como Funciona

1. **Faça commit e push das suas alterações:**
   ```bash
   git add .
   git commit -m "feat: nova funcionalidade"
   git push origin main
   ```

2. **Os workflows executam automaticamente:**
   - Se você alterou código (`src/`, `App.js`): Update OTA é publicado
   - Se você alterou assets/config: Build APK é criada

3. **Acompanhe no EAS:**
   - Builds: https://expo.dev/accounts/thyag0o/projects/financias-mobile/builds
   - Updates: https://expo.dev/accounts/thyag0o/projects/financias-mobile/updates

## ⚙️ Execução Manual

Você também pode executar workflows manualmente:

```bash
# Build Android
eas workflow:run build-android-production.yml

# Update OTA
eas workflow:run update-production.yml
```

## 📝 Notas

- **Builds APK:** Necessárias para mudanças de assets (ícones, splash screen)
- **Updates OTA:** Automáticos para mudanças de código JavaScript
- **Paths ignored:** Arquivos `.md` não disparam builds para economizar recursos
