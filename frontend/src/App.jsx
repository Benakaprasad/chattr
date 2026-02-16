import { useState, useEffect, useRef } from 'react';
import socket from './config/socket';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const messagesEndRef = useRef(null);

  const getUserColor = (name) => {
    const colors = [
      '#c9a84c', '#7eb8d4', '#a8d4a8', '#d4a8a8', '#b8a8d4',
      '#d4c4a8', '#a8d4c4', '#d4b8a8', '#c4a8d4', '#a8c4d4'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true);
      if (username) socket.emit('setUsername', username);
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    socket.on('userJoined', (data) => {
      setMessages(prev => [...prev, {
        id: 'system',
        username: 'System',
        text: data.message,
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
    });

    socket.on('userLeft', (data) => {
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

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  if (!isLoggedIn) {
    return (
      <>
        <div className="noise-overlay" />
        <div className="grid-overlay" />
        <div className="login-container">
          <div className="login-left">
            <div className="login-brand">
              <div className="login-brand-logo">
                <img src="/chattr-logo.svg" alt="Chattr" width="48" height="48" />
                <div className="login-brand-name">Chattr</div>
              </div>
              <div className="login-tagline">Real-time global messaging</div>
            </div>

            <div className="login-headline">
              <h1>
                Talk to
                <span>the world.</span>
              </h1>
            </div>

            <div className="login-meta">
              <div className="login-status-dot">
                <span className={`dot ${isConnected ? 'active' : ''}`} />
                {isConnected ? 'Server online' : 'Connecting...'}
              </div>
            </div>
          </div>

          <div className="login-right">
            <div className="login-form-header">
              <div className="login-form-label">Step 01</div>
              <div className="login-form-title">Choose your name</div>
              <div className="login-form-subtitle">
                This is how others will see you in the chat.
                <br />No account required.
              </div>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              <div className="input-wrapper">
                <label className="input-label">Display name</label>
                <input
                  type="text"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  placeholder="e.g. benaka"
                  className="login-input"
                  maxLength={20}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="login-button"
                disabled={!tempUsername.trim()}
              >
                Enter the room
              </button>
            </form>

            <div className="login-footer">
              <span className="login-footer-text">
                {messages.length > 0 ? `${messages.length} messages` : 'No messages yet'}
              </span>
              <span className={`login-status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="noise-overlay" />
      <div className="grid-overlay" />
      <div className="app">
        <header className="chat-header">
          <div className="header-left">
            <img src="/chattr-logo.svg" alt="Chattr" width="28" height="28" />
            <span className="header-wordmark">Chattr</span>
            <span className="header-divider" />
            <span className="header-username">{username}</span>
          </div>
          <div className="header-right">
            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className={`dot ${isConnected ? 'active' : ''}`} />
              {isConnected ? 'Online' : 'Offline'}
            </div>
          </div>
        </header>

        <div className="chat-container">
          <div className="messages">
            {messages.length === 0 && (
              <div className="welcome-message">
                <div className="welcome-rule" />
                <h2>You're in.</h2>
                <p>
                  Say something. Anyone connected right now<br />
                  will see your message instantly.
                </p>
              </div>
            )}

            {messages.map((msg, index) => (
              msg.isSystem ? (
                <div key={index} className="message system-message">
                  <span className="system-text">{msg.text}</span>
                </div>
              ) : (
                <div
                  key={index}
                  className={`message ${msg.username === username ? 'own-message' : ''}`}
                >
                  <span
                    className="message-username"
                    style={{ color: getUserColor(msg.username) }}
                  >
                    {msg.username}
                  </span>
                  <span className="message-text">{msg.text}</span>
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
              )
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={sendMessage} className="message-form">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={isConnected ? 'Type a message...' : 'Reconnecting...'}
            disabled={!isConnected}
            className="message-input"
            autoFocus
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
    </>
  );
}

export default App;