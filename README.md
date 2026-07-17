# Friends Crypto Chat

Servidor Node.js + interface web para chat E2EE entre amigos e bots.
Roda no Termux, PC ou servidor. Criptografia AES-256-GCM com chave derivada de palavra secreta via PBKDF2.

## Como rodar

```bash
git clone https://github.com/tafasad/remote-terminal.git
cd remote-terminal
npm install
npm start
```

Acesse `http://IP_DO_SERVIDOR:3000` pelo celular ou PC.

## Como usar

Opcao 1 — Criar sala: digite codigo de 4 digitos + palavra secreta.
Opcao 2 — Entrar na sala: digite o mesmo codigo + mesma palavra.

Ambos os lados conectam em tempo real. Trafego criptografado de ponta a ponta.

## Estrutura

- `server.js` — HTTP + WebSocket + criptografia server-side (PBKDF2 100k iteracoes, AES-256-GCM)
- `public/index.html` — cliente unico, roda em qualquer browser
- `package.json` — dependencias

## Seguranca

- Palavra secreta deriva chave AES-256 via PBKDF2-SHA256
- IV aleatorio de 12 bytes por mensagem
- Servidor nao armazena nem descriptografa mensagens
- Sem tokens ou credenciais no codigo
