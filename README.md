# Remote Terminal - Projeto Completo

## Pastas
- `pc-server/` -> API Node.js que roda no PC
- `android-app/` -> App Android para acessar o terminal

## Setup PC (servidor)
1. Abra o terminal na pasta `pc-server`
2. Rode `npm install`
3. Edite `server.js` e adicione/remova usuarios em `USERS`
4. Rode `npm start`
5. Verifique o IP do PC (`ipconfig`)

## Setup Android (app)
1. Abra o Android Studio
2. Importe a pasta `android-app`
3. Sincronize Gradle
4. Compile e instale no celular
5. No app: digite IP do PC + porta 3000 + usuario e senha do server.js

## Como funciona
- API REST cria token de login
- WebSocket estabiliza terminal real (cmd.exe) do PC
- Session persiste por usuario; reconexao mantem o terminal aberto
