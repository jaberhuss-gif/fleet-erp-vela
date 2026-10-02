import { useEffect, useState } from 'react';
import axios from 'axios';

const API = '/api/fleet/vehicles';

function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    plate_number: '',
    plate_code: '',
    make: '',
    model: '',
    year: 2013,
    location: '',
    driver_name: '',
    driver_phone: '',
    current_km: 0,
    last_oil_km: 0,
    oil_change_interval: 5000,
    status: 'Active',
  });

  const loadData = () => {
    setLoading(true);
    axios.get(API)
      .then((res) => {
        setVehicles(res.data);
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

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (value.trim() === '') {
      loadData();
    } else {
      axios.get(`${API}?search=${value}`)
        .then((res) => setVehicles(res.data))
        .catch((err) => console.error(err));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const url = editingId ? `${API}/${editingId}` : API;
    const method = editingId ? 'put' : 'post';

    axios[method](url, formData)
      .then(() => {
        alert(editingId ? '✅ Vehicle updated!' : '✅ Vehicle added!');
        resetForm();
        loadData();
      })
      .catch((err) => alert('Error: ' + err.message));
  };

  const resetForm = () => {
    setFormData({
      plate_number: '',
      plate_code: '',
      make: '',
      model: '',
      year: 2013,
      location: '',
      driver_name: '',
      driver_phone: '',
      current_km: 0,
      last_oil_km: 0,
      oil_change_interval: 5000,
      status: 'Active',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (v) => {
    setFormData({
      plate_number: v.plate_number || '',
      plate_code: v.plate_code || '',
      make: v.make || '',
      model: v.model || '',
      year: v.year || 2013,
      location: v.location || '',
      driver_name: v.driver_name || v.driver || '',
      driver_phone: v.driver_phone || v.phone || '',
      current_km: v.current_km || 0,
      last_oil_km: v.last_oil_km || 0,
      oil_change_interval: v.oil_change_interval || 5000,
      status: v.status || 'Active',
    });
    setEditingId(v.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id, plate) => {
    if (!window.confirm(`Delete vehicle "${plate}"?`)) return;
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
        <h1 style={{ margin: 0 }}>🚙 Vehicles ({vehicles.length})</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="🔍 Search..."
            value={search}
            onChange={handleSearch}
            style={{ ...inputStyle, width: 200 }}
          />
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} style={btnStyle('#007bff')}>
            {showForm ? 'Cancel' : '+ Add Vehicle'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <h3>{editingId ? '✏️ Edit Vehicle' : '➕ New Vehicle'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <input placeholder="Plate Number (e.g. 1709)" value={formData.plate_number} onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })} required style={inputStyle} />
            <input placeholder="Plate Code (e.g. BUA)" value={formData.plate_code} onChange={(e) => setFormData({ ...formData, plate_code: e.target.value })} style={inputStyle} />
            <input placeholder="Make (e.g. Toyota)" value={formData.make} onChange={(e) => setFormData({ ...formData, make: e.target.value })} style={inputStyle} />
            <input placeholder="Model (e.g. Land Cruiser)" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Year" value={formData.year} onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })} style={inputStyle} />
            <input placeholder="Location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={inputStyle} />
            <input placeholder="Driver Name" value={formData.driver_name} onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })} style={inputStyle} />
            <input placeholder="Driver Phone" value={formData.driver_phone} onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Current KM" value={formData.current_km} onChange={(e) => setFormData({ ...formData, current_km: parseInt(e.target.value) || 0 })} style={inputStyle} />
            <input type="number" placeholder="Last Oil KM" value={formData.last_oil_km} onChange={(e) => setFormData({ ...formData, last_oil_km: parseInt(e.target.value) || 0 })} style={inputStyle} />
            <input type="number" placeholder="Oil Change Interval" value={formData.oil_change_interval} onChange={(e) => setFormData({ ...formData, oil_change_interval: parseInt(e.target.value) || 5000 })} style={inputStyle} />
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
              <option value="Active">Active</option>
              <option value="Safe">Safe</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <button type="submit" style={{ ...btnStyle('#28a745'), marginTop: 15 }}>
            {editingId ? '💾 Save Changes' : '💾 Save'}
          </button>
        </form>
      )}

      <div style={{ overflowX: 'auto', marginTop: 20 }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#1e293b', color: 'white' }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Plate</th>
              <th style={thStyle}>Make / Model</th>
              <th style={thStyle}>Year</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Driver</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>Current KM</th>
              <th style={thStyle}>Last Oil KM</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 ? (
              <tr><td colSpan="11" style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>No vehicles found</td></tr>
            ) : (
              vehicles.map((v) => (
                <tr key={v.id}>
                  <td style={tdStyle}>{v.id}</td>
                  <td style={tdStyle}><strong>{v.plate_number} {v.plate_code}</strong></td>
                  <td style={tdStyle}>{v.make} {v.model}</td>
                  <td style={tdStyle}>{v.year}</td>
                  <td style={tdStyle}>{v.location || '-'}</td>
                  <td style={tdStyle}>{v.driver_name || v.driver || '-'}</td>
                  <td style={tdStyle}>{v.driver_phone || v.phone || '-'}</td>
                  <td style={tdStyle}>{Number(v.current_km).toLocaleString()}</td>
                  <td style={tdStyle}>{Number(v.last_oil_km).toLocaleString()}</td>
                  <td style={tdStyle}>
                    <span style={badgeStyle(
                      v.status === 'Active' ? '#28a745' :
                      v.status === 'Safe' ? '#007bff' :
                      v.status === 'Maintenance' ? '#ffc107' : '#6c757d'
                    )}>{v.status}</span>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEdit(v)} style={{ ...btnStyle('#ffc107'), marginRight: 5, padding: '5px 10px', fontSize: 12 }}>✏️</button>
                    <button onClick={() => handleDelete(v.id, `${v.plate_number} ${v.plate_code}`)} style={{ ...btnStyle('#dc3545'), padding: '5px 10px', fontSize: 12 }}>🗑️</button>
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
  color: bg === '#ffc107' ? '#000' : 'white',
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
  minWidth: 1200,
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

export default Vehicles;
