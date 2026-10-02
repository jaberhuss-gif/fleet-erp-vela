import { useEffect, useState } from 'react';
import axios from 'axios';

const API = '/api/fleet/oil-status';

function OilStatus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const loadData = () => {
    setLoading(true);
    axios.get(API)
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
  }, []);

  const sendWhatsApp = (phone, driver, plate, remaining) => {
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
      `Dear ${driver},\n\nYour vehicle ${plate} is overdue for an oil change (${Math.abs(remaining).toLocaleString()} km past due). Please visit the workshop as soon as possible to protect the engine.\n\nThank you.\n\n---\n\nمحترم ${driver}،\n\nآپ کی گاڑی ${plate} کا آئل چینج اوور ڈیو ہے (${Math.abs(remaining).toLocaleString()} کلومیٹر زیادہ)۔ براہ کرم انجن کی حفاظت کے لیے جلد از جلد ورکشاپ تشریف لائیں۔\n\nشکریہ۔`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;

  const filtered = filter === 'all'
    ? data.vehicles
    : data.vehicles.filter((v) => v.status === filter);

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0 }}>🛢️ Oil Status</h1>
          <p style={{ color: '#666', marginTop: 5 }}>Vehicle oil change status tracking</p>
        </div>
        <button onClick={loadData} style={btnStyle('#007bff')}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 15, marginBottom: 25 }}>
        <div style={statCard('#007bff')} onClick={() => setFilter('all')}>
          <div style={{ fontSize: 28, marginBottom: 5 }}>🚗</div>
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>{data.stats.total}</div>
          <div style={{ fontSize: 12, color: '#666' }}>Total</div>
        </div>
        <div style={{ ...statCard('#28a745'), borderColor: filter === 'OK' ? '#28a745' : '#ddd' }} onClick={() => setFilter('OK')}>
          <div style={{ fontSize: 28, marginBottom: 5 }}>✅</div>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#28a745' }}>{data.stats.ok}</div>
          <div style={{ fontSize: 12, color: '#666' }}>OK</div>
        </div>
        <div style={{ ...statCard('#ffc107'), borderColor: filter === 'DUE_SOON' ? '#ffc107' : '#ddd' }} onClick={() => setFilter('DUE_SOON')}>
          <div style={{ fontSize: 28, marginBottom: 5 }}>⚠️</div>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ffc107' }}>{data.stats.dueSoon}</div>
          <div style={{ fontSize: 12, color: '#666' }}>Due Soon</div>
        </div>
        <div style={{ ...statCard('#dc3545'), borderColor: filter === 'OVERDUE' ? '#dc3545' : '#ddd' }} onClick={() => setFilter('OVERDUE')}>
          <div style={{ fontSize: 28, marginBottom: 5 }}>❌</div>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#dc3545' }}>{data.stats.overdue}</div>
          <div style={{ fontSize: 12, color: '#666' }}>Overdue</div>
        </div>
        <div style={{ ...statCard('#6c757d'), borderColor: filter === 'NO_DATA' ? '#6c757d' : '#ddd' }} onClick={() => setFilter('NO_DATA')}>
          <div style={{ fontSize: 28, marginBottom: 5 }}>⚪</div>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#6c757d' }}>{data.stats.noData}</div>
          <div style={{ fontSize: 12, color: '#666' }}>No Data</div>
        </div>
      </div>

      {/* Filter Badge */}
      {filter !== 'all' && (
        <div style={{ marginBottom: 15 }}>
          <span style={{ background: '#e7f3ff', padding: '8px 15px', borderRadius: 20, fontSize: 13 }}>
            Showing: <strong>{filter}</strong>
            <button onClick={() => setFilter('all')} style={{ marginLeft: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc3545', fontWeight: 'bold' }}>
              ✕ Clear
            </button>
          </span>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#1e293b', color: 'white' }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Vehicle</th>
              <th style={thStyle}>Driver</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Current KM</th>
              <th style={thStyle}>Last Oil KM</th>
              <th style={thStyle}>Driven</th>
              <th style={thStyle}>Remaining</th>
              <th style={thStyle}>Progress</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="11" style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>No vehicles found</td></tr>
            ) : (
              filtered.map((v) => (
                <tr key={v.id} style={{ background: v.status === 'OVERDUE' ? '#fff5f5' : v.status === 'DUE_SOON' ? '#fffbf0' : 'white' }}>
                  <td style={tdStyle}>{v.id}</td>
                  <td style={tdStyle}><strong>{v.plate}</strong></td>
                  <td style={tdStyle}>{v.driver}</td>
                  <td style={tdStyle}>{v.location || '-'}</td>
                  <td style={tdStyle}>{Number(v.current_km).toLocaleString()}</td>
                  <td style={tdStyle}>{Number(v.last_oil_km).toLocaleString()}</td>
                  <td style={tdStyle}>{Number(v.driven).toLocaleString()} km</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold', color: v.remaining <= 0 ? '#dc3545' : '#28a745' }}>
                    {v.remaining <= 0
                      ? `${Number(Math.abs(v.remaining)).toLocaleString()} km over`
                      : `${Number(v.remaining).toLocaleString()} km`}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ background: '#f0f0f0', borderRadius: 10, height: 20, overflow: 'hidden', minWidth: 100 }}>
                      <div style={{
                        width: `${Math.min(v.percentage, 100)}%`,
                        background: v.statusColor,
                        height: '100%',
                        transition: 'width 0.3s',
                      }}></div>
                    </div>
                    <small style={{ color: '#666' }}>{v.percentage}%</small>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      background: v.statusColor,
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 'bold',
                    }}>
                      {v.statusLabel}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {v.status === 'OVERDUE' && v.phone && (
                      <button
                        onClick={() => sendWhatsApp(v.phone, v.driver, v.plate, v.remaining)}
                        style={{ ...btnStyle('#25D366'), padding: '5px 10px', fontSize: 11 }}
                      >
                        📱 WhatsApp
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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

const statCard = (color) => ({
  background: 'white',
  borderTop: `4px solid ${color}`,
  borderRadius: 8,
  padding: 15,
  textAlign: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  cursor: 'pointer',
});

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  background: 'white',
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  minWidth: 1200,
};

const thStyle = { padding: 12, textAlign: 'left', fontSize: 12 };
const tdStyle = { padding: 12, textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 12 };

export default OilStatus;
