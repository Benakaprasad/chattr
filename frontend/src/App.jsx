import { useState, useEffect } from 'react';
import socket from './config/socket';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const getUserColor = (name) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B195', '#F67280',
      '#C06C84', '#6C5B7B', '#355C7D', '#2A9D8F', '#E76F51',
      '#E9C46A', '#F4A261', '#8338EC', '#FF006E', '#FB5607'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true);
      if (username) {
        socket.emit('setUsername', username);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    socket.on('userJoined', (data) => {
      console.log('', data.message);
      setMessages(prev => [...prev, {
        id: 'system',
        username: 'System',
        text: data.message,
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
    });

    socket.on('userLeft', (data) => {
      console.log('', data.message);
      setMessages(prev => [...prev, {
        id: 'system',
        username: 'System',
        text: data.message,
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('message');
      socket.off('userJoined');
      socket.off('userLeft');
    };
  }, [username]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (tempUsername.trim()) {
      setUsername(tempUsername.trim());
      setIsLoggedIn(true);
      socket.emit('setUsername', tempUsername.trim());
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    
    if (inputMessage.trim()) {
      socket.emit('message', { text: inputMessage });
      setInputMessage('');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="stars"></div>
        <div className="twinkling"></div>
        
        <div className="login-box">
          <div className="login-header">
            <h1> World Chat</h1>
            <p>Connect with people around the globe</p>
          </div>
          
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="text"
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              placeholder="Enter your name..."
              className="login-input"
              maxLength={20}
              autoFocus
            />
            <button 
              type="submit" 
              className="login-button"
              disabled={!tempUsername.trim()}
            >
              Join the Conversation
            </button>
          </form>
          
          <div className="login-status">
            {isConnected ? (
              <span className="status-connected"> Server Connected</span>
            ) : (
              <span className="status-disconnected"> Connecting...</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="stars"></div>
      <div className="twinkling"></div>
      
      <header className="chat-header">
        <div className="header-left">
          <h1> World Chat</h1>
          <span className="username-badge" style={{ color: getUserColor(username) }}>
            {username}
          </span>
        </div>
        <div className="header-right">
          <span className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? ' Online' : ' Offline'}
          </span>
        </div>
      </header>

      <div className="chat-container">
        <div className="messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2> Welcome to World Chat!</h2>
              <p>Start chatting with people from around the world</p>
            </div>
          )}
          
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`message ${msg.isSystem ? 'system-message' : ''} ${msg.username === username ? 'own-message' : ''}`}
            >
              {!msg.isSystem && (
                <>
                  <span 
                    className="message-username" 
                    style={{ color: getUserColor(msg.username) }}
                  >
                    {msg.username}
                  </span>
                  <span className="message-text">{msg.text}</span>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </>
              )}
              {msg.isSystem && (
                <span className="system-text">{msg.text}</span>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} className="message-form">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={!isConnected}
            className="message-input"
          />
          <button 
            type="submit" 
            disabled={!isConnected || !inputMessage.trim()}
            className="send-button"
          >
            Send 
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;