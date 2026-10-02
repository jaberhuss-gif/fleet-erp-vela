import { useEffect, useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:4000/api/fleet/km-records';
const VEHICLES_API = 'http://localhost:4000/api/fleet/vehicles';

function KMRecords() {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterPlate, setFilterPlate] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    vehicle_id: '',
    plate: '',
    reading_km: '',
    reading_date: new Date().toISOString().split('T')[0],
    is_oil_change: 0,
    notes: '',
  });

  const loadData = () => {
  setLoading(true);
  let url = `${API}?limit=500`;
  
  // إذا لم يتم تحديد فلتر، اعرض قراءات اليوم فقط
  const today = new Date().toISOString().split('T')[0];
  const fromDate = filterFrom || today;
  const toDate = filterTo || today;
  
  url += `&from_date=${fromDate}`;
  url += `&to_date=${toDate}`;
  
  if (filterPlate) url += `&plate=${filterPlate}`;

    axios.get(url)
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

  const handleFilter = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleVehicleChange = (vehicleId) => {
    const v = vehicles.find((x) => x.id === parseInt(vehicleId));
    setFormData({
      ...formData,
      vehicle_id: vehicleId,
      plate: v ? `${v.plate_number} ${v.plate_code}` : '',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post(API, formData)
      .then(() => {
        alert('✅ Reading added!');
        setFormData({
          vehicle_id: '',
          plate: '',
          reading_km: '',
          reading_date: new Date().toISOString().split('T')[0],
          is_oil_change: 0,
          notes: '',
        });
        setShowForm(false);
        loadData();
      })
      .catch((err) => alert('Error: ' + (err.response?.data?.error || err.message)));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
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
        <h1 style={{ margin: 0 }}>📊 KM Records ({records.length})</h1>
        <button onClick={() => setShowForm(!showForm)} style={btnStyle('#007bff')}>
          {showForm ? 'Cancel' : '+ Add Reading'}
        </button>
      </div>

      {/* Filters */}
      <form onSubmit={handleFilter} style={formStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <input
            placeholder="🔍 Plate (e.g. 1709)"
            value={filterPlate}
            onChange={(e) => setFilterPlate(e.target.value)}
            style={inputStyle}
          />
          <input
            type="date"
            placeholder="From Date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            style={inputStyle}
          />
          <input
            type="date"
            placeholder="To Date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            style={inputStyle}
          />
          <button type="submit" style={btnStyle('#28a745')}>
            🔍 Filter
          </button>
        </div>
      </form>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ ...formStyle, background: '#e7f3ff' }}>
          <h3 style={{ marginTop: 0 }}>➕ New KM Reading</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <select
              value={formData.vehicle_id}
              onChange={(e) => handleVehicleChange(e.target.value)}
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
              placeholder="Reading KM"
              value={formData.reading_km}
              onChange={(e) => setFormData({ ...formData, reading_km: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="date"
              value={formData.reading_date}
              onChange={(e) => setFormData({ ...formData, reading_date: e.target.value })}
              required
              style={inputStyle}
            />
            <select
              value={formData.is_oil_change}
              onChange={(e) => setFormData({ ...formData, is_oil_change: parseInt(e.target.value) })}
              style={inputStyle}
            >
              <option value="0">Regular Reading</option>
              <option value="1">Oil Change</option>
            </select>
            <input
              placeholder="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={inputStyle}
            />
          </div>
          <button type="submit" style={{ ...btnStyle('#28a745'), marginTop: 10 }}>
            💾 Save
          </button>
        </form>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto', marginTop: 20 }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#1e293b', color: 'white' }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Vehicle</th>
              <th style={thStyle}>Reading KM</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Oil Change</th>
              <th style={thStyle}>Notes</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan="7" style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>No records found</td></tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>{r.id}</td>
                  <td style={tdStyle}><strong>{r.plate}</strong></td>
                  <td style={tdStyle}>{Number(r.reading_km).toLocaleString()} km</td>
                  <td style={tdStyle}>{new Date(r.reading_date).toLocaleDateString('en-US')}</td>
                  <td style={tdStyle}>
                    {r.is_oil_change === 1 ? (
                      <span style={badgeStyle('#28a745')}>✅ Oil Change</span>
                    ) : (
                      <span style={badgeStyle('#6c757d')}>Regular</span>
                    )}
                  </td>
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
  padding: '10px 20px',
  borderRadius: 5,
  cursor: 'pointer',
  fontSize: 14,
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
  minWidth: 800,
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

const badgeStyle = (bg) => ({
  background: bg,
  color: 'white',
  padding: '4px 10px',
  borderRadius: 12,
  fontSize: 12,
});

export default KMRecords;