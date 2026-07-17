# Remote Terminal > Acesse o PC pelo celular

## Pastas
- `pc-server/` -> API Node.js que roda no PC
- `android-app/` -> App Android para acessar o terminal
- `tunnel/` -> Script para publicar o servidor na internet

---

## Setup rapido

### 1. Servidor (PC)
```bash
cd C:\Users\rafae\Projetos\remote-terminal\pc-server
npm install
```
Edite `server.js` e adicione usuarios/senhas em `USERS`.

### 2. App (Android)
1. Abra o Android Studio
2. Importe a pasta `android-app`
3. Sincronize Gradle
4. Compile e instale no celular

### 3. Testar localmente
Rode o servidor:
```bash
npm start
```
No app, digite o IP do PC (ex: 192.168.18.14) + porta 3000 + usuario/senha.

---

## Acesso remoto (fora de casa)

### Opcao 1: localtunnel (recomendado)
Nao precisa de conta, nem configurar roteador.

1. Instale o localtunnel:
```bash
npm install -g localtunnel
```

2. Rode o servidor:
```bash
npm start
```

3. Em outro terminal, abra o tunel:
```bash
lt --port 3000
```

4. O localtunnel vai mostrar uma URL, tipo:
```
your url is: https://abc123.loca.lt
```

5. No app Android, cole essa URL no campo de host (com https://).

OBS: A porta 3000 nao precisa estar aberta no roteador. So precisa de saida de internet.

### Opcao 2: ngrok
1. Faca conta em https://ngrok.com
2. Instale o ngrok no Windows
3. Rode:
```bash
ngrok http 3000 --host-header=localhost:3000
```

4. Use a URL HTTPS fornecida no app Android.

### Opcao 3: VPS / Cloud
- Hospede o `pc-server` numa VPS barata (Hetzner, Oracle Free Tier)
- Rode com: `PORT=3000 npm start`
- Use a URL da VPS no app.

---

## Seguranca
- O servidor nao tem criptografia nativa — use apenas em rede local ou atraves de tunel HTTPS (localtunnel/ngrok).
- Nao faca deploy publico sem HTTPS.
- Adicione usuarios/senhas em `server.js` antes de expor.

## Portas
- API: 3000
- WS: 3000 (mesma porta, rota /terminal)

## Como funciona
- API REST cria token de login
- WebSocket estabiliza terminal real (cmd.exe) do PC
- Session persiste por usuario; reconexao mantem o terminal aberto
