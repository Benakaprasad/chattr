import express from "express";
import { createServer } from "http";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import { Server } from "socket.io";

dotenv.config();

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

const server = createServer(app);

const io = new Server(server, { 
    cors:{
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('setUsername', (username) => {
        socket.username = username;
        console.log(`User ${socket.id} set username to: ${username}`);
        
        socket.broadcast.emit('userJoined', {
            username: username,
            message: `${username} joined the chat`
        });
    });
    
    socket.on('message', (data) => {
        console.log('Message from', socket.username || socket.id, ':', data);
        
        io.emit('message', {
            id: socket.id,
            username: socket.username || 'Anonymous',
            text: data.text,
            timestamp: new Date().toISOString()
        });
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

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Database connection established');
    } catch(error) {
        console.error('Database connection failed', error);
        process.exit(1);
    }
}
connectDB();

app.get('/api/health', (req, res) => {
    res.status(200).json({ message: "hello world!" });
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});