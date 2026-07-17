const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const rooms = new Map();
let tunnelUrl = '';

function deriveKey(code, word) {
  return crypto.pbkdf2Sync(word, code, 100000, 32, 'sha256').toString('hex');
}

function encryptMessage(keyHex, plaintext) {
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString('base64'), data: Buffer.concat([encrypted, tag]).toString('base64') };
}

function decryptMessage(keyHex, ivB64, dataB64) {
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivB64, 'base64');
  const buffer = Buffer.from(dataB64, 'base64');
  const tag = buffer.slice(buffer.length - 16);
  const encrypted = buffer.slice(0, buffer.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());

app.post('/api/create', (req, res) => {
  const { code, word } = req.body;
  if (!code || !word || code.length !== 4) return res.status(400).json({ error: 'Codigo 4 digitos e palavra obrigatorios' });
  const keyHex = deriveKey(code, word);
  if (rooms.has(code)) return res.status(409).json({ error: 'Sala ja existe' });
  rooms.set(code, { keyHex, clients: new Set() });
  res.json({ ok: true, code });
});

app.post('/api/join', (req, res) => {
  const { code, word } = req.body;
  if (!code || !word || code.length !== 4) return res.status(400).json({ error: 'Codigo 4 digitos e palavra obrigatorios' });
  const keyHex = deriveKey(code, word);
  if (!rooms.has(code)) return res.status(404).json({ error: 'Sala nao encontrada' });
  if (rooms.get(code).keyHex !== keyHex) return res.status(401).json({ error: 'Palavra incorreta' });
  res.json({ ok: true });
});

app.post('/api/tunnel-url', (req, res) => {
  const url = (req.body && req.body.url) ? req.body.url.trim() : '';
  if (url) tunnelUrl = url;
  res.json({ ok: true, tunnelUrl });
});

app.get('/api/tunnel-url', (req, res) => {
  res.json({ tunnelUrl });
});

wss.on('connection', (ws, req) => {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const room = params.get('room');
  const keyHex = params.get('key');

  if (!room || !keyHex || room.length !== 4) {
    ws.send(JSON.stringify({ type: 'error', data: 'Sala invalida' }));
    ws.close();
    return;
  }

  if (!rooms.has(room)) {
    rooms.set(room, { keyHex, clients: new Set() });
  }

  const roomData = rooms.get(room);
  if (roomData.keyHex !== keyHex) {
    ws.send(JSON.stringify({ type: 'error', data: 'Chave invalida' }));
    ws.close();
    return;
  }

  roomData.clients.add(ws);
  ws.room = room;
  ws.isAlive = true;
  ws.send(JSON.stringify({ type: 'joined' }));
  ws.send(JSON.stringify({ type: 'tunnel_url', url: tunnelUrl }));

  ws.on('message', (raw) => {
    const parsed = JSON.parse(raw);
    if (parsed.type === 'encrypted') {
      roomData.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'encrypted', iv: parsed.iv, data: parsed.data }));
        }
      });
    }
  });

  ws.on('close', () => {
    roomData.clients.delete(ws);
    if (roomData.clients.size === 0) rooms.delete(room);
  });

  ws.on('pong', () => { ws.isAlive = true; });
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(interval));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
});
