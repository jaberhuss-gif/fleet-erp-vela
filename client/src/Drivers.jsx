import { useEffect, useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:4000/api/fleet/drivers';
const VEHICLES_API = 'http://localhost:4000/api/fleet/vehicles';

function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    license_no: '',
    license_expiry: '',
    nationality: '',
    vehicle_id: '',
    status: 'Active',
    notes: '',
  });

  const loadData = () => {
    setLoading(true);
    let url = API;
    if (search) url += `?search=${search}`;

    axios.get(url)
      .then((res) => {
        setDrivers(res.data);
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

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (value.trim() === '') {
      loadData();
    } else {
      axios.get(`${API}?search=${value}`)
        .then((res) => setDrivers(res.data))
        .catch((err) => console.error(err));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const url = editingId ? `${API}/${editingId}` : API;
    const method = editingId ? 'put' : 'post';

    axios[method](url, formData)
      .then(() => {
        alert(editingId ? '✅ Driver updated!' : '✅ Driver added!');
        resetForm();
        loadData();
      })
      .catch((err) => alert('Error: ' + (err.response?.data?.error || err.message)));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      license_no: '',
      license_expiry: '',
      nationality: '',
      vehicle_id: '',
      status: 'Active',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (d) => {
    setFormData({
      name: d.name || '',
      phone: d.phone || '',
      license_no: d.license_no || '',
      license_expiry: d.license_expiry ? d.license_expiry.split('T')[0] : '',
      nationality: d.nationality || '',
      vehicle_id: d.vehicle_id || '',
      status: d.status || 'Active',
      notes: d.notes || '',
    });
    setEditingId(d.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete driver "${name}"?`)) return;
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
        <h1 style={{ margin: 0 }}>👤 Drivers ({drivers.length})</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="🔍 Search..."
            value={search}
            onChange={handleSearch}
            style={{ ...inputStyle, width: 200 }}
          />
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} style={btnStyle('#007bff')}>
            {showForm ? 'Cancel' : '+ Add Driver'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <h3>{editingId ? '✏️ Edit Driver' : '➕ New Driver'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <input placeholder="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={inputStyle} />
            <input placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} />
            <input placeholder="License No" value={formData.license_no} onChange={(e) => setFormData({ ...formData, license_no: e.target.value })} style={inputStyle} />
            <input type="date" placeholder="License Expiry" value={formData.license_expiry} onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })} style={inputStyle} />
            <input placeholder="Nationality" value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} style={inputStyle} />
            <select value={formData.vehicle_id} onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })} style={inputStyle}>
              <option value="">-- No Vehicle --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate_number} {v.plate_code} - {v.make} {v.model}
                </option>
              ))}
            </select>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
            </select>
            <input placeholder="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={inputStyle} />
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
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>License No</th>
              <th style={thStyle}>License Expiry</th>
              <th style={thStyle}>Nationality</th>
              <th style={thStyle}>Vehicle</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.length === 0 ? (
              <tr><td colSpan="9" style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>No drivers found</td></tr>
            ) : (
              drivers.map((d) => (
                <tr key={d.id}>
                  <td style={tdStyle}>{d.id}</td>
                  <td style={tdStyle}><strong>{d.name}</strong></td>
                  <td style={tdStyle}>{d.phone || '-'}</td>
                  <td style={tdStyle}>{d.license_no || '-'}</td>
                  <td style={tdStyle}>{d.license_expiry ? new Date(d.license_expiry).toLocaleDateString('en-US') : '-'}</td>
                  <td style={tdStyle}>{d.nationality || '-'}</td>
                  <td style={tdStyle}>{d.plate_number ? `${d.plate_number} ${d.plate_code}` : '-'}</td>
                  <td style={tdStyle}>
                    <span style={badgeStyle(
                      d.status === 'Active' ? '#28a745' :
                      d.status === 'On Leave' ? '#ffc107' : '#6c757d'
                    )}>{d.status}</span>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEdit(d)} style={{ ...btnStyle('#ffc107'), marginRight: 5, padding: '5px 10px', fontSize: 12 }}>✏️</button>
                    <button onClick={() => handleDelete(d.id, d.name)} style={{ ...btnStyle('#dc3545'), padding: '5px 10px', fontSize: 12 }}>🗑️</button>
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
  minWidth: 900,
};

const thStyle = { padding: 12, textAlign: 'left', fontSize: 13 };
const tdStyle = { padding: 12, textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 13 };
const badgeStyle = (bg) => ({ background: bg, color: 'white', padding: '4px 10px', borderRadius: 12, fontSize: 12 });

export default Drivers;