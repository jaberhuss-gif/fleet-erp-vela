import { useEffect, useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:4000/api/fleet/stock-transactions';
const LOCATIONS_API = 'http://localhost:4000/api/fleet/warehouse-locations';

function StockTransactions() {
  const [records, setRecords] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterType, setFilterType] = useState('');

  const emptyForm = {
    type: 'IN',
    item_code: '',
    item_name: '',
    quantity: 0,
    from_location: '',
    to_location: '',
    reference_no: '',
    notes: '',
    trans_date: new Date().toISOString().split('T')[0],
  };

  const [formData, setFormData] = useState(emptyForm);

  const loadData = () => {
    setLoading(true);
    const url = filterType ? `${API}?type=${filterType}` : API;
    axios.get(url)
      .then((res) => { setRecords(res.data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  const loadLocations = () => {
    axios.get(LOCATIONS_API)
      .then((res) => setLocations(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => { loadData(); loadLocations(); }, [filterType]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      quantity: parseFloat(formData.quantity) || 0,
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
      type: r.type || 'IN',
      item_code: r.item_code || '',
      item_name: r.item_name || '',
      quantity: r.quantity || 0,
      from_location: r.from_location || '',
      to_location: r.to_location || '',
      reference_no: r.reference_no || '',
      notes: r.notes || '',
      trans_date: r.trans_date ? r.trans_date.split('T')[0] : '',
    });
    setEditingId(r.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
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

  const typeColor = (t) => ({
    IN: '#28a745',
    OUT: '#dc3545',
    TRANSFER: '#007bff',
  }[t] || '#6c757d');

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ margin: 0 }}>Stock Transactions ({records.length})</h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
            <option value="">All Types</option>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
            <option value="TRANSFER">TRANSFER</option>
          </select>
          <button onClick={() => (showForm ? cancelForm() : setShowForm(true))} style={btnStyle('#007bff')}>
            {showForm ? 'Cancel' : '+ Add Transaction'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Transaction #' + editingId : 'New Stock Transaction'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} required style={inputStyle}>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="TRANSFER">TRANSFER</option>
            </select>
            <input placeholder="Item Code" value={formData.item_code} onChange={(e) => setFormData({ ...formData, item_code: e.target.value })} style={inputStyle} />
            <input placeholder="Item Name *" value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} required style={inputStyle} />
            <input type="number" placeholder="Quantity *" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required style={inputStyle} />
            <select value={formData.from_location} onChange={(e) => setFormData({ ...formData, from_location: e.target.value })} style={inputStyle}>
              <option value="">-- From Location --</option>
              {locations.map((l) => (
                <option key={l.id} value={l.name}>{l.name}</option>
              ))}
            </select>
            <select value={formData.to_location} onChange={(e) => setFormData({ ...formData, to_location: e.target.value })} style={inputStyle}>
              <option value="">-- To Location --</option>
              {locations.map((l) => (
                <option key={l.id} value={l.name}>{l.name}</option>
              ))}
            </select>
            <input placeholder="Reference No" value={formData.reference_no} onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })} style={inputStyle} />
            <input type="date" value={formData.trans_date} onChange={(e) => setFormData({ ...formData, trans_date: e.target.value })} style={inputStyle} />
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
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Item Code</th>
              <th style={thStyle}>Item Name</th>
              <th style={thStyle}>Qty</th>
              <th style={thStyle}>From</th>
              <th style={thStyle}>To</th>
              <th style={thStyle}>Ref No</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Notes</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan="11" style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>No transactions found</td></tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>{r.id}</td>
                  <td style={tdStyle}>
                    <span style={{ background: typeColor(r.type), color: 'white', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 'bold' }}>
                      {r.type}
                    </span>
                  </td>
                  <td style={tdStyle}>{r.item_code || '-'}</td>
                  <td style={tdStyle}>{r.item_name}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>{r.quantity}</td>
                  <td style={tdStyle}>{r.from_location || '-'}</td>
                  <td style={tdStyle}>{r.to_location || '-'}</td>
                  <td style={tdStyle}>{r.reference_no || '-'}</td>
                  <td style={tdStyle}>{r.trans_date ? new Date(r.trans_date).toLocaleDateString('en-US') : '-'}</td>
                  <td style={{ ...tdStyle, maxWidth: 200, whiteSpace: 'pre-wrap', fontSize: 11 }}>{r.notes || '-'}</td>
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
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)', minWidth: 1100,
};

const thStyle = { padding: 10, textAlign: 'left', fontSize: 12 };
const tdStyle = { padding: 10, textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 13 };

export default StockTransactions;
