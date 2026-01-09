@echo off
chcp 65001 >nul
color 0A
cls

echo ╔════════════════════════════════════════════════════════════════╗
echo ║                   📱 APP FINANÇAS MOBILE                       ║
echo ║                    Servidor de Desenvolvimento                 ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo ┌─ COMANDOS DISPONÍVEIS NO TERMINAL ─────────────────────────────┐
echo │                                                                 │
echo │  📱 DISPOSITIVOS:                                               │
echo │     a  →  Abrir no Android (emulador)                          │
echo │     i  →  Abrir no iOS (emulador)                              │
echo │     w  →  Abrir no navegador web                               │
echo │                                                                 │
echo │  🔧 DESENVOLVIMENTO:                                            │
echo │     r  →  Recarregar aplicação                                 │
echo │     m  →  Abrir menu de desenvolvimento                        │
echo │     j  →  Abrir debugger                                       │
echo │     c  →  Limpar cache e recarregar                            │
echo │                                                                 │
echo │  📊 OUTROS:                                                     │
echo │     ?  →  Mostrar todos os comandos                            │
echo │     Ctrl+C  →  Parar servidor                                  │
echo │                                                                 │
echo └─────────────────────────────────────────────────────────────────┘
echo.
echo ┌─ COMO USAR NO TELEMÓVEL ───────────────────────────────────────┐
echo │                                                                 │
echo │  1. Instale o app "Expo Go" (Play Store ou App Store)          │
echo │  2. Certifique-se que PC e telemóvel estão na mesma Wi-Fi      │
echo │  3. Leia o QR CODE que vai aparecer abaixo:                    │
echo │     • Android: Expo Go → "Scan QR code"                        │
echo │     • iOS: Câmara → Aponte para o QR code                      │
echo │                                                                 │
echo └─────────────────────────────────────────────────────────────────┘
echo.
echo [INFO] A iniciar servidor Expo...
echo.

npm start

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                    ⚠️  SERVIDOR PARADO                         ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Pressione qualquer tecla para fechar...
pause >nul
