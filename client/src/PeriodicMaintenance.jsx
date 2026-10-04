import { useEffect, useState } from 'react';
import axios from 'axios';

const API = '/api/fleet/periodic-maintenance';
const VEHICLES_API = '/api/fleet/vehicles';

function PeriodicMaintenance() {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    vehicle_id: '',
    type: 'inspection',
    scheduled_date: new Date().toISOString().split('T')[0],
    completed_date: '',
    status: 'Pending',
    technician: '',
    cost: 0,
    notes: '',
  };

  const [formData, setFormData] = useState(emptyForm);

  const loadData = () => {
    setLoading(true);
    const url = filterStatus ? `${API}?status=${filterStatus}` : API;
    axios.get(url)
      .then((res) => { setRecords(res.data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  const loadVehicles = () => {
    axios.get(VEHICLES_API)
      .then((res) => setVehicles(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => { loadData(); loadVehicles(); }, [filterStatus]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      vehicle_id: parseInt(formData.vehicle_id),
      cost: parseFloat(formData.cost) || 0,
      scheduled_date: formData.scheduled_date || null,
      completed_date: formData.completed_date || null,
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
      vehicle_id: r.vehicle_id || '',
      type: r.type || 'inspection',
      scheduled_date: r.scheduled_date ? r.scheduled_date.split('T')[0] : '',
      completed_date: r.completed_date ? r.completed_date.split('T')[0] : '',
      status: r.status || 'Pending',
      technician: r.technician || '',
      cost: r.cost || 0,
      notes: r.notes || '',
    });
    setEditingId(r.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this maintenance record?')) return;
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

  const typeLabel = (t) => ({
    inspection: 'Inspection',
    oil_change: 'Oil Change',
    '6_months_general': '6 Months General',
  }[t] || t);

  // A 6-month record with notes (or Completed) is proof that the inspection was performed.
  // Notes can contain findings; they still count as inspected.
  const isSixMonthInspected = (r) => r.type === '6_months_general' && (
    r.status === 'Completed' || Boolean(String(r.notes || '').trim())
  );

  const statusInfo = (r) => {
    if (isSixMonthInspected(r)) return { label: 'GREEN — Inspected', color: '#16a34a' };
    if (r.type === '6_months_general') return { label: 'RED — Not Inspected', color: '#dc2626' };
    return r.status === 'Completed'
      ? { label: 'Completed', color: '#28a745' }
      : { label: r.status || 'Pending', color: '#ffc107' };
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>Periodic Maintenance ({records.length})</h1>
          <div style={{ marginTop: 8, fontSize: 13 }}><strong>6-Month Control:</strong> <span style={{color:'#15803d'}}>GREEN = inspected (notes or completed)</span> · <span style={{color:'#b91c1c'}}>RED = not inspected (no notes)</span></div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>
          <button onClick={() => (showForm ? cancelForm() : setShowForm(true))} style={btnStyle('#007bff')}>
            {showForm ? 'Cancel' : '+ Add Record'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Record #' + editingId : 'New Maintenance Record'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <select value={formData.vehicle_id} onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })} required style={inputStyle}>
              <option value="">-- Select Vehicle --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.plate_number} {v.plate_code} - {v.make} {v.model}</option>
              ))}
            </select>
            <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} required style={inputStyle}>
              <option value="inspection">Inspection</option>
              <option value="oil_change">Oil Change</option>
              <option value="6_months_general">6 Months General</option>
            </select>
            <input type="date" value={formData.scheduled_date} onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })} style={inputStyle} />
            <input type="date" placeholder="Completed Date" value={formData.completed_date} onChange={(e) => setFormData({ ...formData, completed_date: e.target.value })} style={inputStyle} />
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>
            <input placeholder="Technician" value={formData.technician} onChange={(e) => setFormData({ ...formData, technician: e.target.value })} style={inputStyle} />
            <input type="number" placeholder="Cost" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} style={inputStyle} />
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
              <th style={thStyle}>Vehicle</th>
              <th style={thStyle}>Driver</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Scheduled</th>
              <th style={thStyle}>Completed</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Technician</th>
              <th style={thStyle}>Cost</th>
              <th style={thStyle}>Notes</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan="11" style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>No maintenance records found</td></tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td style={tdStyle}>{r.id}</td>
                  <td style={tdStyle}><strong>{r.plate_number} {r.plate_code}</strong></td>
                  <td style={tdStyle}>{r.driver_name || r.driver || '-'}</td>
                  <td style={tdStyle}>{typeLabel(r.type)}</td>
                  <td style={tdStyle}>{r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString('en-US') : '-'}</td>
                  <td style={tdStyle}>{r.completed_date ? new Date(r.completed_date).toLocaleDateString('en-US') : '-'}</td>
                  <td style={tdStyle}>
                    <span style={{ background: statusInfo(r).color, color: 'white', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 'bold' }}>
                      {statusInfo(r).label}
                    </span>
                  </td>
                  <td style={tdStyle}>{r.technician || '-'}</td>
                  <td style={tdStyle}>{Number(r.cost || 0).toLocaleString()}</td>
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

const thStyle = { padding: 12, textAlign: 'left', fontSize: 13 };
const tdStyle = { padding: 12, textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 13 };

export default PeriodicMaintenance;

