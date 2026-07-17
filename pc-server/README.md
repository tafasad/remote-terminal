# Remote Terminal - Servidor PC

## Como usar

1. Abra um terminal nesta pasta:
   ```
   cd C:\Users\rafae\Projetos\remote-terminal\pc-server
   ```

2. Instale dependencias:
   ```
   npm install
   ```

3. Rode o servidor:
   ```
   npm start
   ```

4. Configure usuarios em `server.js` na variavel USERS.

5. No celular, use o IP do PC na rede (ex: 192.168.18.14).

## Portas
- API: 3000
- WS: 3000 (mesma porta, rota /terminal)
