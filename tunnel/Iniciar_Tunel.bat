@echo.
title Remote Terminal - Servidor + Tunel Publico
color 1F
cls
echo.
echo ===========================================
echo    REMOTE TERMINAL - PUBLICAR NA INTERNET
echo ===========================================
echo.

cd /d "%~dp0pc-server"

echo [1/3] Iniciando servidor ...
start "RemoteTerminal-Server" cmd /c "npm start"

:: Espera 3s pro servidor subir
timeout /t 3 /nobreak >nul

echo [2/3] Criando tunel publico (localtunnel) ...
echo.
echo      AGUARDE - vai aparecer uma URL tipo:
echo      https://xxxx.loca.lt
echo.
echo      ESSA URL e o que voce coloca no app.
echo.

lt --port 3000 > tunnel_log.txt 2>&1

echo.
echo [3/3] Tunel encerrado.
echo.
pause
