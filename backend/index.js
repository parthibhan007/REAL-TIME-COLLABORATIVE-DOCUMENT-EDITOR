require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/collab-editor';

mongoose.connect(MONGO_URI).then(()=> {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err.message);
});

const DocumentSchema = new mongoose.Schema({
  title: { type: String, default: 'Untitled Document' },
  ops: { type: Array, default: [] }, // store Quill deltas
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Document = mongoose.model('Document', DocumentSchema);

// REST API: create & fetch docs
app.post('/api/documents', async (req, res) => {
  const { title } = req.body;
  const doc = new Document({ title });
  await doc.save();
  res.json(doc);
});

app.get('/api/documents/:id', async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

app.get('/api/documents', async (req, res) => {
  const docs = await Document.find().sort({ updatedAt: -1 }).limit(50);
  res.json(docs);
});

// Socket.IO collaboration
io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('join-doc', async ({ docId, user }) => {
    socket.join(docId);
    socket.data.user = user || { id: socket.id, name: 'Anonymous' };

    // load document ops and send to this client
    const doc = await Document.findById(docId);
    if (doc) {
      socket.emit('doc-load', { ops: doc.ops || [] });
    } else {
      // create doc if not exist
      const newDoc = new Document({ _id: docId, title: 'Untitled Document' });
      await newDoc.save();
      socket.emit('doc-load', { ops: newDoc.ops || [] });
    }

    // notify presence
    const clients = await io.in(docId).fetchSockets();
    const presence = clients.map(s => ({ id: s.id, user: s.data.user }));
    io.to(docId).emit('presence-update', presence);
  });

  socket.on('send-delta', async ({ docId, delta }) => {
    // broadcast to other clients
    socket.to(docId).emit('receive-delta', { delta, user: socket.data.user });

    // persist delta (append)
    try {
      await Document.findByIdAndUpdate(docId, {
        $push: { ops: delta },
        $set: { updatedAt: new Date() }
      }, { upsert: true });
    } catch (err) {
      console.error('Failed to persist delta', err.message);
    }
  });

  socket.on('cursor-update', ({ docId, cursor }) => {
    socket.to(docId).emit('cursor-update', { id: socket.id, user: socket.data.user, cursor });
  });

  socket.on('disconnecting', async () => {
    const rooms = Array.from(socket.rooms); // includes socket.id
    rooms.forEach(room => {
      if (room !== socket.id) {
        // notify leaving
        socket.to(room).emit('presence-leave', { id: socket.id, user: socket.data.user });
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log('Server listening on', PORT);
});
