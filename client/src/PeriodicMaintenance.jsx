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
  const [viewMode, setViewMode] = useState('all');

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

  const isInspected = (r) => (
    (r.type === '6_months_general' || r.type === 'inspection') &&
    (r.status === 'Completed' || Boolean(r.completed_date))
  );

  const controlLabel = (type) => (
    type === '6_months_general' ? '6-Month Maintenance' :
    type === 'inspection' ? 'Annual Inspection' : typeLabel(type)
  );

  const statusInfo = (r) => {
    if (isInspected(r)) return { label: 'GREEN — Inspected', color: '#16a34a' };
    if (r.type === '6_months_general' || r.type === 'inspection') return { label: 'RED — Not Inspected', color: '#dc2626' };
    return r.status === 'Completed'
      ? { label: 'Completed', color: '#28a745' }
      : { label: r.status || 'Pending', color: '#ffc107' };
  };

  // Both control lists come only from Periodic Maintenance records.
  // A vehicle can appear in both lists when one control is complete and another is pending.
  const vehicleControls = Object.values(records
    .filter(r => r.type === '6_months_general' || r.type === 'inspection')
    .reduce((map, r) => {
      const key = String(r.vehicle_id);
      if (!map[key]) map[key] = {
        vehicle_id: r.vehicle_id, plate_number: r.plate_number, plate_code: r.plate_code,
        driver_name: r.driver_name || r.driver || '-', controls: {}
      };
      const current = map[key].controls[r.type];
      const currentTime = current ? new Date(current.completed_date || current.scheduled_date || 0).getTime() : -1;
      const recordTime = new Date(r.completed_date || r.scheduled_date || 0).getTime();
      if (!current || recordTime >= currentTime) map[key].controls[r.type] = r;
      return map;
    }, {}));

  const inspectedVehicles = vehicleControls.flatMap(v =>
    Object.values(v.controls).filter(isInspected).map(r => ({ ...v, record: r, control: controlLabel(r.type) }))
  );

  const notInspectedVehicles = vehicleControls.flatMap(v =>
    ['6_months_general', 'inspection']
      .filter(type => !v.controls[type] || !isInspected(v.controls[type]))
      .map(type => ({
        ...v,
        record: v.controls[type] || { vehicle_id: v.vehicle_id, plate_number: v.plate_number, plate_code: v.plate_code, driver_name: v.driver_name, type, status: 'Pending' },
        control: controlLabel(type)
      }))
  );

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0 }}>Periodic Maintenance ({records.length})</h1>
          <div style={{ marginTop: 8, fontSize: 13 }}><strong>Inspection Control:</strong> GREEN = completed inspection · RED = not inspected. One vehicle may have one completed control and another pending.</div>
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

      <div style={{ display: 'flex', gap: 10, marginTop: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setViewMode('all')} style={btnStyle(viewMode === 'all' ? '#1e3a8a' : '#64748b')}>📋 Periodic Maintenance ({records.length})</button>
        <button onClick={() => setViewMode('inspected')} style={btnStyle(viewMode === 'inspected' ? '#16a34a' : '#64748b')}>✅ Inspected Vehicles ({inspectedVehicles.length})</button>
        <button onClick={() => setViewMode('not-inspected')} style={btnStyle(viewMode === 'not-inspected' ? '#dc2626' : '#64748b')}>⚠️ Not Inspected Vehicles ({notInspectedVehicles.length})</button>
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
        {viewMode === 'all' ? (
          <table style={tableStyle}>
            <thead><tr style={{ background: '#1e293b', color: 'white' }}>
              <th style={thStyle}>#</th><th style={thStyle}>Vehicle</th><th style={thStyle}>Driver</th><th style={thStyle}>Type</th><th style={thStyle}>Scheduled</th><th style={thStyle}>Completed</th><th style={thStyle}>Status</th><th style={thStyle}>Technician</th><th style={thStyle}>Cost</th><th style={thStyle}>Notes</th><th style={thStyle}>Actions</th>
            </tr></thead>
            <tbody>{records.length === 0 ? <tr><td colSpan="11" style={{...tdStyle,textAlign:'center',color:'#999'}}>No maintenance records found</td></tr> : records.map(r => (
              <tr key={r.id}><td style={tdStyle}>{r.id}</td><td style={tdStyle}><strong>{r.plate_number} {r.plate_code}</strong></td><td style={tdStyle}>{r.driver_name || r.driver || '-'}</td><td style={tdStyle}>{typeLabel(r.type)}</td><td style={tdStyle}>{r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString('en-US') : '-'}</td><td style={tdStyle}>{r.completed_date ? new Date(r.completed_date).toLocaleDateString('en-US') : '-'}</td><td style={tdStyle}><span style={{background:statusInfo(r).color,color:'white',padding:'3px 10px',borderRadius:12,fontSize:11,fontWeight:'bold'}}>{statusInfo(r).label}</span></td><td style={tdStyle}>{r.technician || '-'}</td><td style={tdStyle}>{Number(r.cost || 0).toLocaleString()}</td><td style={{...tdStyle,maxWidth:200,whiteSpace:'pre-wrap',fontSize:11}}>{r.notes || '-'}</td><td style={tdStyle}><button onClick={() => handleEdit(r)} style={{...btnStyle('#007bff'),padding:'5px 10px',fontSize:12,marginRight:5}}>Edit</button><button onClick={() => handleDelete(r.id)} style={{...btnStyle('#dc3545'),padding:'5px 10px',fontSize:12}}>Delete</button></td></tr>
            ))}</tbody>
          </table>
        ) : (
          <table style={tableStyle}>
            <thead><tr style={{background:viewMode === 'inspected' ? '#166534' : '#991b1b',color:'white'}}><th style={thStyle}>Vehicle</th><th style={thStyle}>Driver</th><th style={thStyle}>Control</th><th style={thStyle}>Scheduled</th><th style={thStyle}>Completed</th><th style={thStyle}>Status</th><th style={thStyle}>Technician</th><th style={thStyle}>Notes</th></tr></thead>
            <tbody>{(viewMode === 'inspected' ? inspectedVehicles : notInspectedVehicles).length === 0 ? <tr><td colSpan="8" style={{...tdStyle,textAlign:'center',color:'#999'}}>No {viewMode === 'inspected' ? 'inspected' : 'not-inspected'} controls found</td></tr> : (viewMode === 'inspected' ? inspectedVehicles : notInspectedVehicles).map((item,i) => (
              <tr key={item.vehicle_id + '-' + item.record.type + '-' + (item.record.id || i)}><td style={tdStyle}><strong>{item.plate_number} {item.plate_code}</strong></td><td style={tdStyle}>{item.driver_name || '-'}</td><td style={tdStyle}>{item.control}</td><td style={tdStyle}>{item.record.scheduled_date ? new Date(item.record.scheduled_date).toLocaleDateString('en-US') : '-'}</td><td style={tdStyle}>{item.record.completed_date ? new Date(item.record.completed_date).toLocaleDateString('en-US') : '-'}</td><td style={tdStyle}><span style={{background:isInspected(item.record)?'#16a34a':'#dc2626',color:'white',padding:'3px 10px',borderRadius:12,fontSize:11,fontWeight:'bold'}}>{isInspected(item.record)?'GREEN — Inspected':'RED — Not Inspected'}</span></td><td style={tdStyle}>{item.record.technician || '-'}</td><td style={tdStyle}>{item.record.notes || '-'}</td></tr>
            ))}</tbody>
          </table>
        )}
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

