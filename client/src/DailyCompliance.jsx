import { useEffect, useState } from 'react';
import axios from 'axios';

const API = '/api/fleet/daily-compliance';

function DailyCompliance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [syncing, setSyncing] = useState(false);

  const loadData = () => {
    setLoading(true);
    axios.get(`${API}?date=${selectedDate}`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await axios.post('/api/fleet/sync');
      alert(`✅ ${res.data.message}\n\nNew: ${res.data.inserted}\nSkipped: ${res.data.skipped}`);
      loadData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
    setSyncing(false);
  };

  const sendWhatsApp = (phone, driver, plate) => {
    if (!phone) {
      alert('⚠️ Phone number not found for this driver');
      return;
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '966' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('966')) {
      cleanPhone = '966' + cleanPhone;
    }

    const message = encodeURIComponent(
      `Dear ${driver},\n\nPlease record the current odometer reading for vehicle ${plate} now, as this protects you from engine damage.\n\nThank you.\n\n---\n\nمحترم ${driver}،\n\nبراہ کرم گاڑی ${plate} کی موجودہ اوڈومیٹر ریڈنگ ابھی ریکارڈ کریں، کیونکہ یہ آپ کو انجن کی خرابی سے بچاتا ہے۔\n\nشکریہ۔`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const sendAllWhatsApp = () => {
    if (!data || data.pending.length === 0) return;
    if (!window.confirm(`Send reminder to ${data.pending.length} drivers?`)) return;

    data.pending.forEach((v, index) => {
      setTimeout(() => {
        sendWhatsApp(v.phone, v.driver, v.plate);
      }, index * 1500);
    });
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>📋 Daily Compliance</h1>
          <p style={{ color: '#666', marginTop: 5 }}>Daily odometer reading tracking</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleSync} style={btnStyle('#28a745')} disabled={syncing}>
            {syncing ? '⏳ Syncing...' : '🔄 Sync Now'}
          </button>
          <button onClick={loadData} style={btnStyle('#007bff')} disabled={syncing}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 15, marginBottom: 25 }}>
        <div style={statCard('#007bff')}>
          <div style={{ fontSize: 32, marginBottom: 5 }}>🚗</div>
          <div style={{ fontSize: 28, fontWeight: 'bold' }}>{data.total}</div>
          <div style={{ fontSize: 13, color: '#666' }}>Total Vehicles</div>
        </div>
        <div style={statCard('#28a745')}>
          <div style={{ fontSize: 32, marginBottom: 5 }}>✅</div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#28a745' }}>{data.submitted_count}</div>
          <div style={{ fontSize: 13, color: '#666' }}>Submitted Today</div>
        </div>
        <div style={statCard('#dc3545')}>
          <div style={{ fontSize: 32, marginBottom: 5 }}>❌</div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#dc3545' }}>{data.pending_count}</div>
          <div style={{ fontSize: 13, color: '#666' }}>Pending</div>
        </div>
        <div style={statCard('#6f42c1')}>
          <div style={{ fontSize: 32, marginBottom: 5 }}>📊</div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#6f42c1' }}>{Number(data.compliance_pct).toFixed(1)}%</div>
          <div style={{ fontSize: 13, color: '#666' }}>Compliance Rate</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ background: 'white', borderRadius: 8, padding: 20, marginBottom: 25, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontWeight: 'bold' }}>Compliance Rate</span>
          <span style={{ fontWeight: 'bold', color: '#28a745' }}>{Number(data.compliance_pct).toFixed(1)}%</span>
        </div>
        <div style={{ background: '#f0f0f0', borderRadius: 10, height: 20, overflow: 'hidden' }}>
          <div style={{
            width: `${data.compliance_pct}%`,
            background: data.compliance_pct >= 80 ? '#28a745' : data.compliance_pct >= 50 ? '#ffc107' : '#dc3545',
            height: '100%',
            transition: 'width 0.3s',
          }}></div>
        </div>
      </div>

      {/* Pending Section */}
      {data.pending_count > 0 && (
        <div style={sectionStyle('#fef2f2', '#dc3545')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ margin: 0, color: '#dc3545' }}>
              ❌ Pending ({data.pending_count})
            </h2>
            <button onClick={sendAllWhatsApp} style={btnStyle('#25D366')}>
              📱 Send Reminder to All
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: '#dc3545', color: 'white' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Vehicle</th>
                  <th style={thStyle}>Driver</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.pending.map((v) => (
                  <tr key={v.id}>
                    <td style={tdStyle}>{v.id}</td>
                    <td style={tdStyle}><strong>{v.plate}</strong></td>
                    <td style={tdStyle}>{v.driver}</td>
                    <td style={tdStyle}>{v.phone || '—'}</td>
                    <td style={tdStyle}>{v.location || '—'}</td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => sendWhatsApp(v.phone, v.driver, v.plate)}
                        style={{ ...btnStyle('#25D366'), padding: '6px 12px', fontSize: 12 }}
                      >
                        📱 WhatsApp
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submitted Section */}
      {data.submitted_count > 0 && (
        <div style={sectionStyle('#f0fdf4', '#28a745')}>
          <h2 style={{ margin: 0, color: '#28a745', marginBottom: 15 }}>
            ✅ Submitted ({data.submitted_count})
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: '#28a745', color: 'white' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Vehicle</th>
                  <th style={thStyle}>Driver</th>
                  <th style={thStyle}>Reading</th>
                  <th style={thStyle}>Submitted At</th>
                  <th style={thStyle}>Location</th>
                </tr>
              </thead>
              <tbody>
                {data.submitted.map((v) => (
                  <tr key={v.id}>
                    <td style={tdStyle}>{v.id}</td>
                    <td style={tdStyle}><strong>{v.plate}</strong></td>
                    <td style={tdStyle}>{v.driver}</td>
                    <td style={tdStyle}>{Number(v.reading_km).toLocaleString()} km</td>
                    <td style={tdStyle}>{new Date(v.submitted_at).toLocaleString('en-US')}</td>
                    <td style={tdStyle}>{v.location || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle = (bg) => ({
  background: bg,
  color: 'white',
  border: 'none',
  padding: '10px 20px',
  borderRadius: 5,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 'bold',
});

const inputStyle = {
  padding: 10,
  border: '1px solid #ddd',
  borderRadius: 5,
  fontSize: 14,
  background: 'white',
  color: 'black',
};

const statCard = (color) => ({
  background: 'white',
  borderTop: `4px solid ${color}`,
  borderRadius: 8,
  padding: 20,
  textAlign: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
});

const sectionStyle = (bg, borderColor) => ({
  background: bg,
  border: `2px solid ${borderColor}`,
  borderRadius: 8,
  padding: 20,
  marginBottom: 25,
});

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  background: 'white',
  borderRadius: 8,
  overflow: 'hidden',
  minWidth: 700,
};

const thStyle = {
  padding: 12,
  textAlign: 'left',
  fontSize: 13,
};

const tdStyle = {
  padding: 12,
  textAlign: 'left',
  borderBottom: '1px solid #eee',
  fontSize: 13,
};

export default DailyCompliance;
