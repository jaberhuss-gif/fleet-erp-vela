import { useEffect, useState } from 'react';
import { getSites, createSite, deleteSite } from './api';

function Sites() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newSite, setNewSite] = useState({ name: '', region: '' });

  const loadSites = () => {
    setLoading(true);
    getSites()
      .then((res) => {
        setSites(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSites();
  }, []);
const handleDelete = async (id, name) => {
  if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
  try {
    await deleteSite(id);
    loadSites();
  } catch (err) {
    alert('Error: ' + (err.response?.data?.error || err.message));
  }
};

  const handleSubmit = (e) => {
    e.preventDefault();
    createSite(newSite)
      .then(() => {
        setNewSite({ name: '', region: '' });
        setShowForm(false);
        loadSites();
      })
      .catch((err) => alert('Error: ' + err.message));
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>📍 Sites</h1>
        <button onClick={() => setShowForm(!showForm)} style={btnStyle('#007bff')}>
          {showForm ? 'Cancel' : '+ Add Site'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
            <input
              type="text"
              placeholder="Site Name"
              value={newSite.name}
              onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Region"
              value={newSite.region}
              onChange={(e) => setNewSite({ ...newSite, region: e.target.value })}
              style={inputStyle}
            />
          </div>
          <button type="submit" style={{ ...btnStyle('#28a745'), marginTop: 10 }}>
            Save
          </button>
        </form>
      )}

      <table style={tableStyle}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={thStyle}>#</th>
            <th style={thStyle}>Site Name</th>
            <th style={thStyle}>Region</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Created At</th>
<th style={thStyle}>Action</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site) => (
            <tr key={site.id}>
              <td style={tdStyle}>{site.id}</td>
              <td style={tdStyle}>{site.name}</td>
              <td style={tdStyle}>{site.region || '-'}</td>
              <td style={tdStyle}>
                <span style={badgeStyle(site.status === 'Active' ? '#28a745' : '#6c757d')}>
                  {site.status}
                </span>
              </td>
              <td style={tdStyle}>{new Date(site.created_at).toLocaleDateString('en-US')}</td>
<td style={tdStyle}>
  <button
    onClick={() => handleDelete(site.id, site.name)}
    style={{
      background: '#dc3545',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: 4,
      cursor: 'pointer',
      fontSize: 12,
    }}
  >
    🗑️ Delete
  </button>
</td>
            </tr>
          ))}
        </tbody>
      </table>
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
});

const formStyle = {
  background: 'white',
  padding: 20,
  borderRadius: 8,
  marginTop: 20,
  marginBottom: 20,
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
  marginTop: 20,
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

const thStyle = {
  padding: 12,
  textAlign: 'left',
  borderBottom: '2px solid #ddd',
  fontSize: 14,
};

const tdStyle = {
  padding: 12,
  textAlign: 'left',
  borderBottom: '1px solid #eee',
  fontSize: 14,
};

const badgeStyle = (bg) => ({
  background: bg,
  color: 'white',
  padding: '4px 10px',
  borderRadius: 12,
  fontSize: 12,
});

export default Sites;