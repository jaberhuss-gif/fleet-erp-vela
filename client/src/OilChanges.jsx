import { useEffect, useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:4000/api/fleet/oil-changes';
const VEHICLES_API = 'http://localhost:4000/api/fleet/vehicles';

function OilChanges() {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    vehicle_id: '',
    oil_change_km: '',
    oil_change_date: new Date().toISOString().split('T')[0],
    changed_by: '',
    notes: '',
  });

  const loadData = () => {
    setLoading(true);
    axios.get(API)
      .then((res) => {
        setRecords(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const loadVehicles = () => {
    axios.get(VEHICLES_API)
      .then((res) => setVehicles(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadData();
    loadVehicles();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post(API, formData)
      .then(() => {
        alert('✅ Oil change added!');
        setFormData({
          vehicle_id: '',
          oil_change_km: '',
          oil_change_date: new Date().toISOString().split('T')[0],
          changed_by: '',
          notes: '',
        });
        setShowForm(false);
        loadData();
      })
      .catch((err) => alert('Error: ' + (err.response?.data?.error || err.message)));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this oil change record?')) return;
    try {
      await axios.delete(`${API}/${id}`);
      loadData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ margin: 0 }}>🔧 Oil Changes ({records.length})</h1>
        <button onClick={() => setShowForm(!showForm)} style={btnStyle('#007bff')}>
          {showForm ? 'Cancel' : '+ Add Oil Change'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <h3 style={{ marginTop: 0 }}>➕ New Oil Change</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <select
              value={formData.vehicle_id}
              onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
              required
              style={inputStyle}
            >
              <option value="">-- Select Vehicle --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate_number} {v.plate_code} - {v.make} {v.model}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Oil Change KM"
              value={formData.oil_change_km}
              onChange={(e) => setFormData({ ...formData, oil_change_km: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="date"
              value={formData.oil_change_date}
              onChange={(e) => setFormData({ ...formData, oil_change_date: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              placeholder="Changed By"
              value={formData.changed_by}
              onChange={(e) => setFormData({ ...formData, changed_by: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={inputStyle}
            />
          </div>
          <button type="submit" style={{ ...btnStyle('#28a745'), marginTop: 15 }}>
            💾 Save
          </button>
        </form>
      )}

      <div style={{ overflowX: 'auto', marginTop: 20 }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#1e293b', color: 'white' }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Vehicle</th>
              <th style={thStyle}>Driver</th>
              <th style={thStyle}>Oil Change KM</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Changed By</th>
              <th style={thStyle}>Notes</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan="8" style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>No oil changes found</td></tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>{r.id}</td>
                  <td style={tdStyle}><strong>{r.plate_number} {r.plate_code}</strong></td>
                  <td style={tdStyle}>{r.driver_name || r.driver || '-'}</td>
                  <td style={tdStyle}>{Number(r.oil_change_km).toLocaleString()} km</td>
                  <td style={tdStyle}>{new Date(r.oil_change_date).toLocaleDateString('en-US')}</td>
                  <td style={tdStyle}>{r.changed_by || '-'}</td>
                  <td style={tdStyle}>{r.notes || '-'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => handleDelete(r.id)} style={{ ...btnStyle('#dc3545'), padding: '5px 10px', fontSize: 12 }}>
                      🗑️
                    </button>
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
  padding: '8px 16px',
  borderRadius: 5,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 'bold',
});

const formStyle = {
  background: 'white',
  padding: 20,
  borderRadius: 8,
  marginTop: 20,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

const inputStyle = {
  padding: 10,
  border: '1px solid #ddd',
  borderRadius: 5,
  fontSize: 14,
  width: '100%',
  boxSizing: 'border-box',
  background: 'white',
  color: 'black',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  background: 'white',
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  minWidth: 900,
};

const thStyle = { padding: 12, textAlign: 'left', fontSize: 13 };
const tdStyle = { padding: 12, textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 13 };

export default OilChanges;