import { useEffect, useState } from 'react';
import axios from 'axios';

const API = '/api/fleet/inventory';

function Inventory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const emptyForm = {
    code: '',
    name: '',
    category: '',
    unit: 'PCS',
    quantity: 0,
    min_stock: 0,
    unit_cost: 0,
    location: '',
    supplier: '',
    status: 'ACTIVE',
    notes: '',
  };

  const [formData, setFormData] = useState(emptyForm);

  const loadData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (filterCategory) params.append('category', filterCategory);
    const url = params.toString() ? `${API}?${params}` : API;

    axios.get(url)
      .then((res) => { setRecords(res.data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { loadData(); }, [search, filterCategory]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      quantity: parseFloat(formData.quantity) || 0,
      min_stock: parseFloat(formData.min_stock) || 0,
      unit_cost: parseFloat(formData.unit_cost) || 0,
    };

    const req = editingId
      ? axios.put(`${API}/${editingId}`, payload)
      : axios.post(API, payload);

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
      category: r.category || '',
      unit: r.unit || 'PCS',
      quantity: r.quantity || 0,
      min_stock: r.min_stock || 0,
      unit_cost: r.unit_cost || 0,
      location: r.location || '',
      supplier: r.supplier || '',
      status: r.status || 'ACTIVE',
      notes: r.notes || '',
    });
    setEditingId(r.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this inventory item?')) return;
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

  const totalValue = records.reduce((sum, r) => sum + (Number(r.quantity) * Number(r.unit_cost)), 0);
  const lowStockCount = records.filter(r => Number(r.quantity) <= Number(r.min_stock)).length;

  const stockColor = (r) => {
    const q = Number(r.quantity);
    const m = Number(r.min_stock);
    if (q === 0) return '#dc3545';
    if (q <= m) return '#ffc107';
    return '#28a745';
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ margin: 0 }}>Inventory ({records.length})</h1>
        <button onClick={() => (showForm ? cancelForm() : setShowForm(true))} style={btnStyle('#007bff')}>
          {showForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 15, marginTop: 15, flexWrap: 'wrap' }}>
        <div style={statCardStyle('#007bff')}>
          <div style={{ fontSize: 12, color: '#666' }}>Total Items</div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{records.length}</div>
        </div>
        <div style={statCardStyle('#ffc107')}>
          <div style={{ fontSize: 12, color: '#666' }}>Low Stock</div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{lowStockCount}</div>
        </div>
        <div style={statCardStyle('#28a745')}>
          <div style={{ fontSize: 12, color: '#666' }}>Total Value</div>
          <div style={{ fontSize: 22, fontWeight: 'bold' }}>{totalValue.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 15, flexWrap: 'wrap' }}>
        <input
          placeholder="Search by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, maxWidth: 300 }}
        />
        <input
          placeholder="Filter by category..."
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ ...inputStyle, maxWidth: 200 }}
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Item #' + editingId : 'New Inventory Item'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <input placeholder="Code (e.g. 225/95/17)" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} style={inputStyle} />
            <input placeholder="Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={inputStyle} />
            <input placeholder="Category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} style={inputStyle} />
            <input placeholder="Unit (PCS, L, KG)" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Quantity" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Min Stock" value={formData.min_stock} onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Unit Cost" value={formData.unit_cost} onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })} style={inputStyle} />
            <input placeholder="Location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={inputStyle} />
            <input placeholder="Supplier" value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} style={inputStyle} />
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="DISCONTINUED">DISCONTINUED</option>
            </select>
            <input placeholder="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={inputStyle} />
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
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Unit</th>
              <th style={thStyle}>Qty</th>
              <th style={thStyle}>Min</th>
              <th style={thStyle}>Unit Cost</th>
              <th style={thStyle}>Value</th>
              <th style={thStyle}>Location</th>
              <th style={thStyle}>Supplier</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan="13" style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>No inventory items found</td></tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>{r.id}</td>
                  <td style={tdStyle}><strong>{r.code || '-'}</strong></td>
                  <td style={tdStyle}>{r.name}</td>
                  <td style={tdStyle}>{r.category || '-'}</td>
                  <td style={tdStyle}>{r.unit || '-'}</td>
                  <td style={{ ...tdStyle, color: stockColor(r), fontWeight: 'bold' }}>{r.quantity}</td>
                  <td style={tdStyle}>{r.min_stock}</td>
                  <td style={tdStyle}>{Number(r.unit_cost || 0).toLocaleString()}</td>
                  <td style={tdStyle}>{Number((r.quantity || 0) * (r.unit_cost || 0)).toLocaleString()}</td>
                  <td style={tdStyle}>{r.location || '-'}</td>
                  <td style={tdStyle}>{r.supplier || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{ background: r.status === 'ACTIVE' ? '#28a745' : '#6c757d', color: 'white', padding: '3px 8px', borderRadius: 10, fontSize: 11 }}>
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
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)', minWidth: 1200,
};

const thStyle = { padding: 10, textAlign: 'left', fontSize: 12 };
const tdStyle = { padding: 10, textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 13 };

export default Inventory;

