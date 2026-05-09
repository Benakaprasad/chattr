import express from "express";
import { createServer } from "http";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcrypt";
import { Server } from "socket.io";
import Message from "./models/Message.js";
import User from "./models/User.js";

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;
const server = createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'https://chattr-1-6bsw.onrender.com'
].filter(Boolean);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: false }
});

app.use(cors({ origin: "*", credentials: false }));

// ─── SOCKET EVENTS ────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send last 50 messages when user connects — READ
  socket.on('setUsername', async (username) => {
    socket.username = username;
    console.log(`${socket.id} set username: ${username}`);

    // READ — fetch history from DB and send only to this socket
    const history = await Message.find()
      .sort({ sentAt: 1 })
      .limit(50);
    socket.emit('history', history);

    socket.broadcast.emit('userJoined', {
      username,
      message: `${username} joined the chat`
    });
  });

  // CREATE — save message to DB, broadcast to all
  socket.on('message', async (data) => {
    const msg = await Message.create({
      username: socket.username || 'Anonymous',
      text: data.text,
    });

    io.emit('message', {
      _id:       msg._id,
      id:        socket.id,
      username:  msg.username,
      text:      msg.text,
      timestamp: msg.sentAt.toISOString()
    });
  });

  // UPDATE — edit own message
  socket.on('editMessage', async ({ messageId, newText }) => {
    const updated = await Message.findOneAndUpdate(
      { _id: messageId, username: socket.username }, // only own messages
      { $set: { text: newText } },
      { new: true }
    );
    if (updated) {
      io.emit('messageEdited', {
        _id:  updated._id,
        text: updated.text
      });
    }
  });

  // DELETE — delete own message
  socket.on('deleteMessage', async ({ messageId }) => {
    const deleted = await Message.findOneAndDelete({
      _id: messageId,
      username: socket.username  // only own messages
    });
    if (deleted) {
      io.emit('messageDeleted', { _id: messageId });
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      console.log('User disconnected:', socket.username);
      io.emit('userLeft', {
        username: socket.username,
        message: `${socket.username} left the chat`
      });
    }
  });
});

// ─── AUTH ROUTES ──────────────────────────────────────────────────

// CREATE — register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: "Username already taken" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashed });
    res.status(201).json({ message: "Registered successfully", username: user.username });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// READ — login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Wrong password" });

    res.status(200).json({ message: "Login successful", username: user.username });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// UPDATE — change username
app.put('/api/user/:username', async (req, res) => {
  const { newUsername } = req.body;
  try {
    const updated = await User.findOneAndUpdate(
      { username: req.params.username },
      { $set: { username: newUsername } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ message: "Username updated", username: updated.username });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

// DELETE — delete account
app.delete('/api/user/:username', async (req, res) => {
  try {
    await User.findOneAndDelete({ username: req.params.username });
    res.status(200).json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ─── MISC ROUTES ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: "hello world!" });
});

app.get('/api/debug', (req, res) => {
  res.status(200).json({ frontend_url: process.env.FRONTEND_URL, allowedOrigins });
});

// ─── DB + SERVER ──────────────────────────────────────────────────
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Database connection established');
  } catch (error) {
    console.error('Database connection failed', error);
    process.exit(1);
  }
};
connectDB();

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});