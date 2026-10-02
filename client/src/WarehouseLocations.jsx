import { useEffect, useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:4000/api/fleet/warehouse-locations';

function WarehouseLocations() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    code: '',
    name: '',
    site: '',
    status: 'ACTIVE',
  };

  const [formData, setFormData] = useState(emptyForm);

  const loadData = () => {
    setLoading(true);
    axios.get(API)
      .then((res) => { setRecords(res.data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const req = editingId
      ? axios.put(`${API}/${editingId}`, formData)
      : axios.post(API, formData);

    req
      .then(() => {
        alert(editingId ? 'Updated!' : 'Added!');
        setFormData(emptyForm);
        setShowForm(false);
        setEditingId(null);
        loadData();
      })
      .catch((err) => alert('Error: ' + (err.response?.data?.error || err.message)));
  };

  const handleEdit = (r) => {
    setFormData({
      code: r.code || '',
      name: r.name || '',
      site: r.site || '',
      status: r.status || 'ACTIVE',
    });
    setEditingId(r.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this warehouse location?')) return;
    try {
      await axios.delete(`${API}/${id}`);
      loadData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;

  const activeCount = records.filter(r => r.status === 'ACTIVE').length;

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ margin: 0 }}>Warehouse Locations ({records.length})</h1>
        <button onClick={() => (showForm ? cancelForm() : setShowForm(true))} style={btnStyle('#007bff')}>
          {showForm ? 'Cancel' : '+ Add Location'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 15, marginTop: 15, flexWrap: 'wrap' }}>
        <div style={statCardStyle('#007bff')}>
          <div style={{ fontSize: 12, color: '#666' }}>Total Locations</div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{records.length}</div>
        </div>
        <div style={statCardStyle('#28a745')}>
          <div style={{ fontSize: 12, color: '#666' }}>Active</div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{activeCount}</div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Location #' + editingId : 'New Warehouse Location'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <input placeholder="Code (e.g. MAIN)" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} style={inputStyle} />
            <input placeholder="Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={inputStyle} />
            <input placeholder="Site" value={formData.site} onChange={(e) => setFormData({ ...formData, site: e.target.value })} style={inputStyle} />
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
          <button type="submit" style={{ ...btnStyle('#28a745'), marginTop: 15 }}>
            {editingId ? 'Update' : 'Save'}
          </button>
        </form>
      )}

      <div style={{ overflowX: 'auto', marginTop: 20 }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#1e293b', color: 'white' }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Site</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan="6" style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>No locations found</td></tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>{r.id}</td>
                  <td style={tdStyle}><strong>{r.code || '-'}</strong></td>
                  <td style={tdStyle}>{r.name}</td>
                  <td style={tdStyle}>{r.site || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{ background: r.status === 'ACTIVE' ? '#28a745' : '#6c757d', color: 'white', padding: '3px 10px', borderRadius: 12, fontSize: 11 }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEdit(r)} style={{ ...btnStyle('#007bff'), padding: '5px 10px', fontSize: 12, marginRight: 5 }}>Edit</button>
                    <button onClick={() => handleDelete(r.id)} style={{ ...btnStyle('#dc3545'), padding: '5px 10px', fontSize: 12 }}>Delete</button>
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
  background: bg, color: 'white', border: 'none',
  padding: '8px 16px', borderRadius: 5, cursor: 'pointer',
  fontSize: 13, fontWeight: 'bold',
});

const statCardStyle = (color) => ({
  background: 'white', padding: 15, borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  borderLeft: `4px solid ${color}`, minWidth: 140,
});

const formStyle = {
  background: 'white', padding: 20, borderRadius: 8,
  marginTop: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

const inputStyle = {
  padding: 10, border: '1px solid #ddd', borderRadius: 5,
  fontSize: 14, width: '100%', boxSizing: 'border-box',
  background: 'white', color: 'black',
};

const tableStyle = {
  width: '100%', borderCollapse: 'collapse', background: 'white',
  borderRadius: 8, overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)', minWidth: 700,
};

const thStyle = { padding: 12, textAlign: 'left', fontSize: 13 };
const tdStyle = { padding: 12, textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 13 };

export default WarehouseLocations;
