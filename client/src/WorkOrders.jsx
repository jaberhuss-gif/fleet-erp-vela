import { useEffect, useState } from 'react';
import { getWorkOrders, getSites, createWorkOrder, closeWorkOrder, importWorkOrders } from './api';

function WorkOrders() {
  const [workOrders, setWorkOrders] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [selectedWO, setSelectedWO] = useState(null);
  const [importErrors, setImportErrors] = useState([]);

  const [newWO, setNewWO] = useState({
    wo_no: '',
    site_id: '',
    area: '',
    category: '',
    priority: 'Normal',
    description: '',
    assigned_to: '',
    contractor: '',
  });

  const [closeData, setCloseData] = useState({
    work_by: 'Company',
    labor_cost: '',
    parts_cost: '',
    parts_source: 'Company',
    closing_notes: '',
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([getWorkOrders(), getSites()])
      .then(([woRes, siteRes]) => {
        setWorkOrders(woRes.data);
        setSites(siteRes.data);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    createWorkOrder(newWO)
      .then(() => {
        setNewWO({
          wo_no: '',
          site_id: '',
          area: '',
          category: '',
          priority: 'Normal',
          description: '',
          assigned_to: '',
          contractor: '',
        });
        setShowForm(false);
        loadData();
      })
      .catch((err) => alert('Error: ' + err.message));
  };

  const handleClose = (e) => {
    e.preventDefault();
    closeWorkOrder(selectedWO.id, closeData)
      .then(() => {
        setCloseData({
          work_by: 'Company',
          labor_cost: '',
          parts_cost: '',
          parts_source: 'Company',
          closing_notes: '',
        });
        setShowCloseForm(false);
        setSelectedWO(null);
        loadData();
      })
      .catch((err) => alert('Error: ' + err.message));
  };

  const openCloseForm = (wo) => {
    setSelectedWO(wo);
    setShowCloseForm(true);
  };

  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter((line) => line.trim() !== '');

        const headers = parseCSVLine(lines[0]);

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const row = {};
          headers.forEach((header, index) => {
            row[normalizeHeader(header)] = values[index] || '';
          });
          rows.push(row);
        }

        if (rows.length === 0) {
          alert('No data found in CSV');
          return;
        }

        if (!window.confirm(`Import ${rows.length} work orders?`)) return;

        const result = await importWorkOrders(rows);
        setImportErrors(result.data.errors || []);
        alert(`Imported: ${result.data.inserted}\nSkipped: ${result.data.skipped}\nErrors: ${result.data.errors.length}`);

        loadData();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const normalizeHeader = (header) => {
    const map = {
      'WO No': 'wo_no',
      'Site': 'site',
      'Area': 'area',
      'Category': 'category',
      'Priority': 'priority',
      'Description': 'description',
      'Assigned To': 'assigned_to',
      'Status': 'status',
      'Reported Date': 'reported_date',
      'Completion Date': 'completion_date',
      'Final Cost': 'final_cost',
      'Parts Used': 'parts_used',
      'Closing Notes': 'closing_notes',
    };
    return map[header.trim()] || header.trim().toLowerCase().replace(/\s+/g, '_');
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;

  const companyTotal =
    (closeData.work_by === 'Company' ? Number(closeData.labor_cost) || 0 : 0) +
    (closeData.parts_source === 'Company' ? Number(closeData.parts_cost) || 0 : 0);

  const contractorTotal =
    (closeData.work_by === 'Contractor' ? Number(closeData.labor_cost) || 0 : 0) +
    (closeData.parts_source === 'Contractor' ? Number(closeData.parts_cost) || 0 : 0);

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🛠 Work Orders</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowForm(!showForm)} style={btnStyle('#007bff')}>
            {showForm ? 'Cancel' : '+ New Work Order'}
          </button>
          <label style={{ ...btnStyle('#28a745'), display: 'inline-block' }}>
            📥 Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {importErrors.length > 0 && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: 15, marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>⚠️ Import Errors ({importErrors.length})</h3>
            <button onClick={() => setImportErrors([])} style={btnStyle('#6c757d')}>
              Hide
            </button>
          </div>
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: '#ffc107' }}>
                <th style={thStyle}>WO No</th>
                <th style={thStyle}>Error</th>
              </tr>
            </thead>
            <tbody>
              {importErrors.slice(0, 10).map((e, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{e.wo_no}</td>
                  <td style={tdStyle}>{e.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: 10, color: '#856404' }}>Showing first 10 errors only</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <input
              placeholder="WO Number"
              value={newWO.wo_no}
              onChange={(e) => setNewWO({ ...newWO, wo_no: e.target.value })}
              required
              style={inputStyle}
            />
            <select
              value={newWO.site_id}
              onChange={(e) => setNewWO({ ...newWO, site_id: e.target.value })}
              required
              style={inputStyle}
            >
              <option value="">-- Select Site --</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input
              placeholder="Area"
              value={newWO.area}
              onChange={(e) => setNewWO({ ...newWO, area: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="Category"
              value={newWO.category}
              onChange={(e) => setNewWO({ ...newWO, category: e.target.value })}
              style={inputStyle}
            />
            <select
              value={newWO.priority}
              onChange={(e) => setNewWO({ ...newWO, priority: e.target.value })}
              style={inputStyle}
            >
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <input
              placeholder="Assigned To"
              value={newWO.assigned_to}
              onChange={(e) => setNewWO({ ...newWO, assigned_to: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="Contractor"
              value={newWO.contractor}
              onChange={(e) => setNewWO({ ...newWO, contractor: e.target.value })}
              style={inputStyle}
            />
          </div>
          <textarea
            placeholder="Description"
            value={newWO.description}
            onChange={(e) => setNewWO({ ...newWO, description: e.target.value })}
            style={{ ...inputStyle, marginTop: 10, minHeight: 60 }}
          />
          <button type="submit" style={{ ...btnStyle('#28a745'), marginTop: 10 }}>
            Save
          </button>
        </form>
      )}

      {showCloseForm && selectedWO && (
        <form onSubmit={handleClose} style={formStyle}>
          <h3>Close Work Order: {selectedWO.wo_no}</h3>

          <div style={{ marginTop: 15 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 5 }}>
              Who did the work?
            </label>
            <div style={{ display: 'flex', gap: 20 }}>
              <label>
                <input
                  type="radio"
                  name="work_by"
                  value="Company"
                  checked={closeData.work_by === 'Company'}
                  onChange={(e) => setCloseData({ ...closeData, work_by: e.target.value })}
                />
                {' '}Our Employee (Company)
              </label>
              <label>
                <input
                  type="radio"
                  name="work_by"
                  value="Contractor"
                  checked={closeData.work_by === 'Contractor'}
                  onChange={(e) => setCloseData({ ...closeData, work_by: e.target.value })}
                />
                {' '}Contractor
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 15 }}>
            <input
              type="number"
              placeholder="Labor Cost (SAR)"
              value={closeData.labor_cost}
              onChange={(e) => setCloseData({ ...closeData, labor_cost: e.target.value })}
              style={inputStyle}
            />
            <input
              type="number"
              placeholder="Parts Cost (SAR)"
              value={closeData.parts_cost}
              onChange={(e) => setCloseData({ ...closeData, parts_cost: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginTop: 15 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 5 }}>
              Who paid for the parts?
            </label>
            <div style={{ display: 'flex', gap: 20 }}>
              <label>
                <input
                  type="radio"
                  name="parts_source"
                  value="Company"
                  checked={closeData.parts_source === 'Company'}
                  onChange={(e) => setCloseData({ ...closeData, parts_source: e.target.value })}
                />
                {' '}Company
              </label>
              <label>
                <input
                  type="radio"
                  name="parts_source"
                  value="Contractor"
                  checked={closeData.parts_source === 'Contractor'}
                  onChange={(e) => setCloseData({ ...closeData, parts_source: e.target.value })}
                />
                {' '}Contractor
              </label>
            </div>
          </div>

          <textarea
            placeholder="Closing Notes"
            value={closeData.closing_notes}
            onChange={(e) => setCloseData({ ...closeData, closing_notes: e.target.value })}
            style={{ ...inputStyle, marginTop: 15, minHeight: 60 }}
          />

          <div style={{ marginTop: 15, padding: 10, background: '#f0f0f0', borderRadius: 5 }}>
            <strong>Summary:</strong>
            <div>Company Total: {companyTotal} SAR</div>
            <div>Contractor Total: {contractorTotal} SAR</div>
            <div style={{ marginTop: 5, fontSize: 16 }}>
              <strong>Grand Total: {companyTotal + contractorTotal} SAR</strong>
            </div>
          </div>

          <button type="submit" style={{ ...btnStyle('#dc3545'), marginTop: 15 }}>
            Close Work Order
          </button>
          <button
            type="button"
            onClick={() => { setShowCloseForm(false); setSelectedWO(null); }}
            style={{ ...btnStyle('#6c757d'), marginTop: 15, marginLeft: 10 }}
          >
            Cancel
          </button>
        </form>
      )}

      <table style={tableStyle}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={thStyle}>WO No</th>
            <th style={thStyle}>Site</th>
            <th style={thStyle}>Area</th>
            <th style={thStyle}>Category</th>
            <th style={thStyle}>Priority</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Final Cost</th>
            <th style={thStyle}>Action</th>
          </tr>
        </thead>
        <tbody>
          {workOrders.map((wo) => (
            <tr key={wo.id}>
              <td style={tdStyle}>{wo.wo_no}</td>
              <td style={tdStyle}>{wo.site_name || '-'}</td>
              <td style={tdStyle}>{wo.area || '-'}</td>
              <td style={tdStyle}>{wo.category || '-'}</td>
              <td style={tdStyle}>
                <span style={badgeStyle(
                  wo.priority === 'High' ? '#dc3545' :
                  wo.priority === 'Medium' ? '#ffc107' : '#17a2b8'
                )}>
                  {wo.priority}
                </span>
              </td>
              <td style={tdStyle}>
                <span style={badgeStyle(wo.status === 'Closed' ? '#28a745' : '#ffc107')}>
                  {wo.status}
                </span>
              </td>
              <td style={tdStyle}>{Number(wo.final_cost).toLocaleString()} SAR</td>
              <td style={tdStyle}>
                {wo.status !== 'Closed' && (
                  <button onClick={() => openCloseForm(wo)} style={btnStyle('#dc3545')}>
                    Close
                  </button>
                )}
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
  padding: '8px 16px',
  borderRadius: 5,
  cursor: 'pointer',
  fontSize: 13,
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
  fontSize: 13,
};

const badgeStyle = (bg) => ({
  background: bg,
  color: 'white',
  padding: '4px 10px',
  borderRadius: 12,
  fontSize: 12,
});

export default WorkOrders;