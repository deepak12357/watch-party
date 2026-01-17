// server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const app = express();

// Serve static files (index.html, etc.)
app.use(express.static("public"));

// HTTP server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

// Keep track of rooms and clients
const rooms = {}; // { roomId: Set of ws connections }

wss.on("connection", (ws, req) => {
  // Extract room from query ?room=abc
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get("room") || "default";

  if (!rooms[roomId]) rooms[roomId] = new Set();
  rooms[roomId].add(ws);

  console.log(`New connection in room ${roomId}. Total: ${rooms[roomId].size}`);

  ws.on("message", (message) => {
    let msg;
    try {
      msg = JSON.parse(message);
    } catch (e) {
      console.error("Invalid JSON", message);
      return;
    }

    // Broadcast to all other clients in the same room
    rooms[roomId].forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    });
  });

  ws.on("close", () => {
    rooms[roomId].delete(ws);
    console.log(`Connection closed in room ${roomId}. Total: ${rooms[roomId].size}`);
    if (rooms[roomId].size === 0) delete rooms[roomId];
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
