import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:4000/api/driver';

function DriverPortal() {
  const [phone, setPhone] = useState('');
  const [driver, setDriver] = useState(null);
  const [lastKm, setLastKm] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    reading_km: '',
    reading_date: new Date().toISOString().split('T')[0],
    notes: '',
    is_oil_change: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem('driver_id');
    if (saved) {
      loadDriver(saved);
    }
  }, []);

  const loadDriver = async (id) => {
    try {
      const res = await axios.get(`${API}/${id}`);
      setDriver(res.data);
      setLastKm(res.data.last_km);
      const hist = await axios.get(`${API}/${id}/km-history`);
      setHistory(hist.data);
      localStorage.setItem('driver_id', id);
    } catch (err) {
      console.error(err);
      localStorage.removeItem('driver_id');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/login`, { phone });
      await loadDriver(res.data.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await axios.post(`${API}/km`, {
        driver_id: driver.id,
        vehicle_id: driver.vehicle_id,
        reading_km: parseInt(formData.reading_km),
        reading_date: formData.reading_date,
        notes: formData.notes,
        is_oil_change: formData.is_oil_change,
      });
      setSuccess('KM saved successfully!');
      setFormData({
        reading_km: '',
        reading_date: new Date().toISOString().split('T')[0],
        notes: '',
        is_oil_change: false,
      });
      await loadDriver(driver.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('driver_id');
    setDriver(null);
    setPhone('');
    setHistory([]);
    setLastKm(null);
  };

  if (!driver) {
    return (
      <div style={loginPageStyle}>
        <div style={loginCardStyle}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>DRIVER</div>
            <h2 style={{ margin: 0 }}>Driver Portal</h2>
            <p style={{ color: '#666', marginTop: 5 }}>Enter your phone number</p>
          </div>

          <form onSubmit={handleLogin}>
            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={bigInputStyle}
              autoFocus
              required
            />
            {error && <div style={errorStyle}>{error}</div>}
            <button type="submit" disabled={loading} style={bigBtnStyle}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div style={{ marginTop: 20, fontSize: 12, color: '#999', textAlign: 'center' }}>
            Try: 581960526, 0558701125, 0537991162
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Arial', background: '#f5f7fa', minHeight: '100vh' }}>
      <div style={headerStyle}>
        <div>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>Welcome, Driver</div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{driver.name}</div>
        </div>
        <button onClick={handleLogout} style={logoutBtnStyle}>Logout</button>
      </div>

      <div style={vehicleCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Your Vehicle</div>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: 'white' }}>
              {driver.plate_number} {driver.plate_code}
            </div>
            <div style={{ fontSize: 14, color: '#cbd5e1' }}>
              {driver.make} {driver.model}
            </div>
          </div>
          {lastKm && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Last Reading</div>
              <div style={{ fontSize: 22, fontWeight: 'bold', color: '#00d4ff' }}>
                {Number(lastKm).toLocaleString()} km
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={formCardStyle}>
        <h3 style={{ marginTop: 0 }}>Today's KM Reading</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 15 }}>
            <label style={labelStyle}>Odometer Reading (km)</label>
            <input
              type="number"
              placeholder="e.g. 290200"
              value={formData.reading_km}
              onChange={(e) => setFormData({ ...formData, reading_km: e.target.value })}
              style={bigInputStyle}
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 15 }}>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={formData.reading_date}
              onChange={(e) => setFormData({ ...formData, reading_date: e.target.value })}
              style={bigInputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: 15 }}>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea
              placeholder="Any notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{ ...bigInputStyle, minHeight: 60 }}
            />
          </div>

          <div style={{ marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              id="oil"
              checked={formData.is_oil_change}
              onChange={(e) => setFormData({ ...formData, is_oil_change: e.target.checked })}
              style={{ width: 20, height: 20 }}
            />
            <label htmlFor="oil" style={{ fontSize: 14 }}>Oil changed today</label>
          </div>

          {error && <div style={errorStyle}>{error}</div>}
          {success && <div style={successStyle}>{success}</div>}

          <button type="submit" disabled={loading} style={bigBtnStyle}>
            {loading ? 'Saving...' : 'Save Reading'}
          </button>
        </form>
      </div>

      {history.length > 0 && (
        <div style={formCardStyle}>
          <h3 style={{ marginTop: 0 }}>Recent History</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>KM</th>
                <th style={thStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 10).map((h) => (
                <tr key={h.id}>
                  <td style={tdStyle}>{new Date(h.reading_date).toLocaleDateString('en-US')}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>{Number(h.reading_km).toLocaleString()}</td>
                  <td style={tdStyle}>{h.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const loginPageStyle = {
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  minHeight: '100vh', background: '#1e293b', padding: 20,
};

const loginCardStyle = {
  background: 'white', padding: 30, borderRadius: 12,
  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
  width: '100%', maxWidth: 400,
};

const headerStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  background: '#1e293b', color: 'white', padding: 20,
  borderRadius: 8, marginBottom: 15,
};

const vehicleCardStyle = {
  background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
  color: 'white', padding: 20, borderRadius: 8, marginBottom: 15,
  boxShadow: '0 4px 12px rgba(0,123,255,0.3)',
};

const formCardStyle = {
  background: 'white', padding: 20, borderRadius: 8,
  marginBottom: 15, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

const bigInputStyle = {
  width: '100%', padding: 14, fontSize: 16,
  border: '2px solid #e2e8f0', borderRadius: 8,
  boxSizing: 'border-box', background: 'white', color: 'black',
};

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 'bold',
  marginBottom: 6, color: '#475569',
};

const bigBtnStyle = {
  width: '100%', padding: 16, fontSize: 16, fontWeight: 'bold',
  background: '#28a745', color: 'white', border: 'none',
  borderRadius: 8, cursor: 'pointer', marginTop: 10,
};

const logoutBtnStyle = {
  background: 'transparent', color: 'white',
  border: '1px solid #475569', padding: '8px 16px',
  borderRadius: 5, cursor: 'pointer', fontSize: 13,
};

const errorStyle = {
  background: '#fee2e2', color: '#991b1b',
  padding: 10, borderRadius: 5, marginTop: 10, fontSize: 13,
};

const successStyle = {
  background: '#dcfce7', color: '#166534',
  padding: 10, borderRadius: 5, marginTop: 10, fontSize: 13,
};

const thStyle = { padding: 10, textAlign: 'left', fontSize: 12, borderBottom: '2px solid #e2e8f0' };
const tdStyle = { padding: 10, textAlign: 'left', fontSize: 13, borderBottom: '1px solid #f1f5f9' };

export default DriverPortal;