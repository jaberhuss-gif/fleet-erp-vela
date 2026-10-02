import { useEffect, useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:4000/api/buildings';

function DevProjects() {
  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [newProject, setNewProject] = useState({
    name: '',
    site_id: '',
    description: '',
    contractor: '',
    budget: '',
    status: 'Planned',
    start_date: '',
    end_date: '',
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      axios.get(`${API}/dev-projects`),
      axios.get(`${API}/sites`),
    ])
      .then(([projRes, siteRes]) => {
        setProjects(projRes.data);
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
    axios.post(`${API}/dev-projects`, newProject)
      .then(() => {
        setNewProject({
          name: '',
          site_id: '',
          description: '',
          contractor: '',
          budget: '',
          status: 'Planned',
          start_date: '',
          end_date: '',
        });
        setShowForm(false);
        loadData();
      })
      .catch((err) => alert('Error: ' + err.message));
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let insideQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') insideQuotes = !insideQuotes;
      else if (char === ',' && !insideQuotes) { result.push(current.trim()); current = ''; }
      else current += char;
    }
    result.push(current.trim());
    return result;
  };

  const handleImportAll = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter((l) => l.trim() !== '');

        const headers = parseCSVLine(lines[0]);
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const row = {};
          headers.forEach((h, idx) => {
            row[h.trim()] = values[idx] || '';
          });
          rows.push(row);
        }

        if (rows.length === 0) {
          alert('No data found');
          return;
        }

        const devProjects = rows.map(r => ({
          id: r['ID'] || '',
          location: r['Location'] || '',
          description: r['Description'] || '',
          start_date: r['Start Date'] || '',
          end_date: r['End Date'] || '',
          status: r['Status'] || 'Planned',
          total_cost: r['Total Cost'] || '0',
          contractor_cost: r['Contractor Cost'] || '0',
          contractor: r['Contractor'] || '',
        })).filter(p => p.id && p.id.toUpperCase().startsWith('PRJ'));

        if (devProjects.length === 0) {
          alert('No valid projects found. Expected column "ID" with values starting with PRJ');
          return;
        }

        if (!window.confirm(`Import ${devProjects.length} projects?`)) return;

        const result = await axios.post(`${API}/import-all`, { devProjects });
        alert(`Imported: ${result.data.results.devProjects}\nErrors: ${result.data.results.errors.length}`);
        if (result.data.results.errors.length > 0) {
          console.log('Errors:', result.data.results.errors);
        }
        loadData();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🏗️ Development Projects</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowForm(!showForm)} style={btnStyle('#007bff')}>
            {showForm ? 'Cancel' : '+ New Project'}
          </button>
          <label style={{ ...btnStyle('#28a745'), display: 'inline-block' }}>
            📥 Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleImportAll}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <input
              placeholder="Project Name"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              required
              style={inputStyle}
            />
            <select
              value={newProject.site_id}
              onChange={(e) => setNewProject({ ...newProject, site_id: e.target.value })}
              style={inputStyle}
            >
              <option value="">-- Select Site --</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input
              placeholder="Contractor"
              value={newProject.contractor}
              onChange={(e) => setNewProject({ ...newProject, contractor: e.target.value })}
              style={inputStyle}
            />
            <input
              type="number"
              placeholder="Budget (SAR)"
              value={newProject.budget}
              onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
              style={inputStyle}
            />
            <select
              value={newProject.status}
              onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
              style={inputStyle}
            >
              <option value="Planned">Planned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
            <input
              type="date"
              value={newProject.start_date}
              onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
              style={inputStyle}
            />
          </div>
          <textarea
            placeholder="Description"
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
            style={{ ...inputStyle, marginTop: 10, minHeight: 60 }}
          />
          <button type="submit" style={{ ...btnStyle('#28a745'), marginTop: 10 }}>
            Save
          </button>
        </form>
      )}

      <table style={tableStyle}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Project Name</th>
            <th style={thStyle}>Site</th>
            <th style={thStyle}>Contractor</th>
            <th style={thStyle}>Budget</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Start Date</th>
          </tr>
        </thead>
        <tbody>
          {projects.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>
                No projects yet. Click "+ New Project" or "Import CSV" to add one.
              </td>
            </tr>
          ) : (
            projects.map((p) => (
              <tr key={p.id}>
                <td style={tdStyle}>{p.id}</td>
                <td style={tdStyle}>{p.name}</td>
                <td style={tdStyle}>{p.site_name || '-'}</td>
                <td style={tdStyle}>{p.contractor || '-'}</td>
                <td style={tdStyle}>{Number(p.budget).toLocaleString()} SAR</td>
                <td style={tdStyle}>
                  <span style={badgeStyle(
                    p.status === 'Completed' ? '#28a745' :
                    p.status === 'In Progress' ? '#ffc107' : '#6c757d'
                  )}>
                    {p.status}
                  </span>
                </td>
                <td style={tdStyle}>{p.start_date ? new Date(p.start_date).toLocaleDateString('en-US') : '-'}</td>
              </tr>
            ))
          )}
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

export default DevProjects;