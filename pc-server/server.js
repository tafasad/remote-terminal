const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const pty = require('node-pty');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// ============================================================
// CONFIG - usuarios autorizados (amigos + bots)
// Adicione aqui: username: senha
// ============================================================
const USERS = {
  rafae: 'senha123',
  bot1: 'botpass',
  amigo1: 'amigopass'
};

// Sessoes ativas: token -> { ws, ptyProcess, owner, created }
const sessions = new Map();

// Arquivo simples de log
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

// Criar token de acesso
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

// Status do servidor e sessoes
app.get('/api/status', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Nao autorizado' });
  }
  const sess = sessions.get(token);
  res.json({
    user: sess.owner,
    active_session: !!sess.ptyProcess,
    uptime: process.uptime()
  });
});

// Health check (sem auth)
app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ----------------------------------------
// WebSocket - Terminal
// ----------------------------------------
wss.on('connection', (ws, req) => {
  const token = new URL(req.url, 'http://localhost').searchParams.get('token');
  
  if (!token || !sessions.has(token)) {
    ws.send(JSON.stringify({ type: 'error', data: 'Token invalido' }));
    ws.close(1008, 'Unauthorized');
    return;
  }

  const sess = sessions.get(token);
  sess.ws = ws;
  log(`WS CONNECT ${sess.owner}`);

  // Se ja tem pty, avisa que pode continuar
  if (sess.ptyProcess) {
    ws.send(JSON.stringify({ type: 'welcome', data: 'Sessao existente restaurada' }));
  } else {
    // Cria novo PTY no Windows (cmd.exe)
    const ptyProcess = pty.spawn('cmd.exe', [], {
      name: 'xterm-256color',
      cwd: process.env.USERPROFILE || 'C:\\',
      env: process.env,
      cols: 120,
      rows: 30
    });

    sess.ptyProcess = ptyProcess;

    ptyProcess.onData((data) => {
      try {
        ws.send(JSON.stringify({ type: 'output', data }));
      } catch (e) {
        log(`ERRO WS SEND ${sess.owner}: ${e.message}`);
      }
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      log(`PTY EXIT ${sess.owner} code=${exitCode} signal=${signal}`);
      ws.send(JSON.stringify({ type: 'exit', data: `Processo encerrado (code=${exitCode})` }));
      cleanup(token);
    });

    ws.send(JSON.stringify({ type: 'welcome', data: 'Terminal conectado' }));
  }

  ws.on('message', (msg) => {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'input') {
        if (sess.ptyProcess) {
          sess.ptyProcess.write(parsed.data);
        }
      } else if (parsed.type === 'resize') {
        if (sess.ptyProcess) {
          sess.ptyProcess.resize(parsed.cols, parsed.rows);
        }
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', data: 'Mensagem invalida' }));
    }
  });

  ws.on('close', () => {
    log(`WS CLOSE ${sess.owner}`);
    // Nao mata o pty - permite reconexao
  });

  ws.on('error', (err) => {
    log(`WS ERROR ${sess.owner}: ${err.message}`);
  });
});

function cleanup(token) {
  const sess = sessions.get(token);
  if (sess && sess.ptyProcess) {
    try { sess.ptyProcess.kill(); } catch (e) {}
    sess.ptyProcess = null;
  }
}

// Inicia servidor
server.listen(PORT, '0.0.0.0', () => {
  log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  log(`Usuarios configurados: ${Object.keys(USERS).join(', ')}`);
});
