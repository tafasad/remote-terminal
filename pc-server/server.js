const express = require('express');
const http = require('https');
const WebSocket = require('ws');
const pty = require('node-pty');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer({
  key: fs.readFileSync(path.join(__dirname, 'certs', 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'server.crt'))
});
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// ============================================================
// CONFIG - usuarios autorizados (amigos + bots)
// ============================================================
const USERS = {
  rafae: 'senha123',
  bot1: 'botpass',
  amigo1: 'amigopass'
};

const sessions = new Map();
const LOG_FILE = path.join(__dirname, 'terminal.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  fs.appendFileSync(LOG_FILE, line + '\n');
  console.log(line);
}

// ----------------------------------------
// API REST
// ----------------------------------------
app.use(express.json());

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username e password obrigatorios' });
  }
  if (USERS[username] !== password) {
    return res.status(401).json({ error: 'Usuario ou senha invalidos' });
  }
  const token = uuidv4();
  sessions.set(token, { owner: username, ws: null, ptyProcess: null, created: Date.now() });
  log(`LOGIN ${username} token=${token}`);
  res.json({ token, username });
});

app.get('/api/status', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Nao autorizado' });
  }
  const sess = sessions.get(token);
  res.json({ user: sess.owner, active_session: !!sess.ptyProcess, uptime: process.uptime() });
});

app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ----------------------------------------
// WebSocket - Terminal
// ----------------------------------------
wss.on('connection', (ws, req) => {
  const token = new URL(req.url, 'https://localhost').searchParams.get('token');
  
  if (!token || !sessions.has(token)) {
    ws.send(JSON.stringify({ type: 'error', data: 'Token invalido' }));
    ws.close(1008, 'Unauthorized');
    return;
  }

  const sess = sessions.get(token);
  sess.ws = ws;
  log(`WS CONNECT ${sess.owner}`);

  if (sess.ptyProcess) {
    ws.send(JSON.stringify({ type: 'welcome', data: 'Sessao existente restaurada' }));
  } else {
    const ptyProcess = pty.spawn('cmd.exe', [], {
      name: 'xterm-256color',
      cwd: process.env.USERPROFILE || 'C:\\',
      env: process.env,
      cols: 120,
      rows: 30
    });

    sess.ptyProcess = ptyProcess;

    ptyProcess.onData((data) => {
      try { ws.send(JSON.stringify({ type: 'output', data })); }
      catch (e) { log(`ERRO WS SEND ${sess.owner}: ${e.message}`); }
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      log(`PTY EXIT ${sess.owner} code=${exitCode} signal=${signal}`);
      ws.send(JSON.stringify({ type: 'exit', data: `Processo encerrado (code=${exitCode})` }));
      cleanup(token);
    });

    ws.send(JSON.stringify({ type: 'welcome', data: 'Terminal conectado (HTTPS/WSS)' }));
  }

  ws.on('message', (msg) => {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'input' && sess.ptyProcess) {
        sess.ptyProcess.write(parsed.data);
      } else if (parsed.type === 'resize' && sess.ptyProcess) {
        sess.ptyProcess.resize(parsed.cols, parsed.rows);
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', data: 'Mensagem invalida' }));
    }
  });

  ws.on('close', () => { log(`WS CLOSE ${sess.owner}`); });
  ws.on('error', (err) => { log(`WS ERROR ${sess.owner}: ${err.message}`); });
});

function cleanup(token) {
  const sess = sessions.get(token);
  if (sess && sess.ptyProcess) {
    try { sess.ptyProcess.kill(); } catch (e) {}
    sess.ptyProcess = null;
  }
}

server.listen(PORT, '0.0.0.0', () => {
  log(`Servidor HTTPS rodando em https://0.0.0.0:${PORT}`);
  log(`Usuarios configurados: ${Object.keys(USERS).join(', ')}`);
});
