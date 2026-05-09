import { useState, useEffect, useRef } from 'react';
import socket from './config/socket';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

function App() {
  const [messages, setMessages]       = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername]       = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [password, setPassword]       = useState('');
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError]     = useState('');
  const [editingId, setEditingId]     = useState(null);
  const [editText, setEditText]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

    // Load chat history from DB on join
    socket.on('history', (history) => {
      const formatted = history.map(msg => ({
        _id:       msg._id,
        username:  msg.username,
        text:      msg.text,
        timestamp: msg.sentAt,
      }));
      setMessages(formatted);
    });

    socket.on('message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    // UPDATE — reflect edited message in UI
    socket.on('messageEdited', ({ _id, text }) => {
      setMessages(prev =>
        prev.map(m => m._id === _id ? { ...m, text } : m)
      );
    });

    // DELETE — remove deleted message from UI
    socket.on('messageDeleted', ({ _id }) => {
      setMessages(prev => prev.filter(m => m._id !== _id));
    });

    socket.on('userJoined', (data) => {
      setMessages(prev => [...prev, {
        id: 'system', username: 'System',
        text: data.message,
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
    });

    socket.on('userLeft', (data) => {
      setMessages(prev => [...prev, {
        id: 'system', username: 'System',
        text: data.message,
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('history');
      socket.off('message');
      socket.off('messageEdited');
      socket.off('messageDeleted');
      socket.off('userJoined');
      socket.off('userLeft');
    };
  }, [username]);

  // READ — login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: tempUsername.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) return setAuthError(data.error);
      setUsername(data.username);
      setIsLoggedIn(true);
      socket.emit('setUsername', data.username);
    } catch {
      setAuthError('Login failed. Try again.');
    }
  };

  // CREATE — register
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: tempUsername.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) return setAuthError(data.error);
      setIsRegistering(false);
      setAuthError('Registered! Please log in.');
    } catch {
      setAuthError('Registration failed. Try again.');
    }
  };

  // CREATE — send message
  const sendMessage = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      socket.emit('message', { text: inputMessage });
      setInputMessage('');
    }
  };

  // UPDATE — emit edit
  const submitEdit = (messageId) => {
    if (editText.trim()) {
      socket.emit('editMessage', { messageId, newText: editText });
      setEditingId(null);
      setEditText('');
    }
  };

  // DELETE — emit delete
  const deleteMessage = (messageId) => {
    socket.emit('deleteMessage', { messageId });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  };

  // ── LOGIN / REGISTER UI ──────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <>
        <div className="noise-overlay" />
        <div className="grid-overlay" />
        <div className="login-container">
          <div className="login-left">
            <div className="login-brand">
              <img src="/chattr.svg" alt="Chattr" width="52" height="52" />
              <div className="login-brand-name">Chattr</div>
              <div className="login-tagline">Real-time global messaging</div>
            </div>
            <div className="login-headline">
              <h1>Talk to<span>the world.</span></h1>
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
              <div className="login-form-label">{isRegistering ? 'Create account' : 'Welcome back'}</div>
              <div className="login-form-title">{isRegistering ? 'Register' : 'Login'}</div>
            </div>

            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="login-form">
              <div className="input-wrapper">
                <label className="input-label">Username</label>
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
             <div className="input-wrapper">
  <label className="input-label">Password</label>
  <div className="password-wrapper">
    <input
      type={showPassword ? 'text' : 'password'}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="Enter password"
      className="login-input password-input"
    />
    <button
      type="button"
      className="password-toggle"
      onClick={() => setShowPassword(!showPassword)}
    >
      {showPassword ? (
        // Eye OFF icon
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        // Eye ON icon
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  </div>
</div>
              {authError && <div className="auth-error">{authError}</div>}
              <button
                type="submit"
                className="login-button"
                disabled={!tempUsername.trim() || !password.trim()}
              >
                {isRegistering ? 'Create account' : 'Enter the room'}
              </button>
            </form>

            <div className="login-footer">
  <span
    className="login-footer-text"
    style={{ cursor: 'pointer', textDecoration: 'underline' }}
    onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); setPassword(''); }}
  >
    {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
  </span>
</div>
          </div>
        </div>
      </>
    );
  }

  // ── CHAT UI ──────────────────────────────────────────────────────
  return (
    <>
      <div className="noise-overlay" />
      <div className="grid-overlay" />
      <div className="app">
        <header className="chat-header">
          <div className="header-left">
            <img src="/chattr.svg" alt="Chattr" width="32" height="32" />
            <span className="header-divider" />
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
                <p>Say something. Anyone connected right now<br />will see your message instantly.</p>
              </div>
            )}

            {messages.map((msg, index) => (
              msg.isSystem ? (
                <div key={index} className="message system-message">
                  <span className="system-text">{msg.text}</span>
                </div>
              ) : (
                <div key={index} className={`message ${msg.username === username ? 'own-message' : ''}`}>
                  <span className="message-username" style={{ color: getUserColor(msg.username) }}>
                    {msg.username}
                  </span>

                  {/* Inline edit UI */}
                  {editingId === msg._id ? (
                    <span className="message-edit-inline">
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="edit-input"
                        autoFocus
                      />
                      <button onClick={() => submitEdit(msg._id)} className="edit-save-btn">Save</button>
                      <button onClick={() => setEditingId(null)} className="edit-cancel-btn">Cancel</button>
                    </span>
                  ) : (
                    <span className="message-text">{msg.text}</span>
                  )}

                  <span className="message-time">{formatTime(msg.timestamp)}</span>

                  {/* Edit/Delete only for own messages */}
                  {msg.username === username && !msg.isSystem && (
                    <span className="message-actions">
                      <button onClick={() => { setEditingId(msg._id); setEditText(msg.text); }} className="msg-action-btn">Edit</button>
                      <button onClick={() => deleteMessage(msg._id)} className="msg-action-btn delete">Delete</button>
                    </span>
                  )}
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
          <button type="submit" disabled={!isConnected || !inputMessage.trim()} className="send-button">
            Send
          </button>
        </form>
      </div>
    </>
  );
}

export default App;