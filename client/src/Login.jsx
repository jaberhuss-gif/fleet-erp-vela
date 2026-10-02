import { useState } from 'react';
import axios from 'axios';

const API = '/api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.user, res.data.token);
    } catch (e) {
      setError(e.response?.data?.error || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: 'Arial'
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 40,
        maxWidth: 420,
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#1e3a8a', margin: 0 }}>
            Fleet ERP
          </div>
          <div style={{ color: '#64748b', marginTop: 8, fontSize: 14 }}>
            Enterprise Resource Planning System
          </div>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 14
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6, color: '#475569' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              placeholder="Enter your username"
              autoComplete="username"
              style={{
                width: '100%',
                padding: 14,
                fontSize: 15,
                border: '2px solid #e2e8f0',
                borderRadius: 8,
                boxSizing: 'border-box',
                background: 'white',
                color: 'black'
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6, color: '#475569' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: 14,
                fontSize: 15,
                border: '2px solid #e2e8f0',
                borderRadius: 8,
                boxSizing: 'border-box',
                background: 'white',
                color: 'black'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 14,
              fontSize: 16,
              fontWeight: 'bold',
              background: loading ? '#94a3b8' : '#1e3a8a',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
