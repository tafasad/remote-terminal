@echo off
title Friends Crypto - Rotador de Tunel
color 1F
cls
echo.
echo ===========================================
echo    FRIENDS CRYPTO - TUNEL COM ROTACAO
echo ===========================================
echo.
echo Iniciando servidor...
cd /d "%~dp0"
start "RemoteTerminal-Server" cmd /c "npm start"

timeout /t 3 /nobreak >nul
echo Servidor ativo.
echo Criando/atualizando tunel publico...
echo URL atual sera enviada para o servidor a cada 30s.
echo Use https://xxxx.loca.lt no celular.
echo.
echo Pressione CTRL+C aqui para parar.
echo.

:loop
for /f "delims=" %%i in ('lt --port 3000 ^| findstr /i "your url is"') do (
  set line=%%i
)
set url=
for /f "tokens=3 delims= " %%a in ("%line%") do set url=%%a

if defined url (
  curl -s -X POST http://localhost:3000/api/tunnel-url -H "Content-Type: application/json" -d "{\"url\":\"%url%\"}" >nul
  echo Tunel atual: %url%
)

timeout /t 30 /nobreak >nul
goto loop
