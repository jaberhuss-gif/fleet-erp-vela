import { useEffect, useState } from 'react';
import axios from 'axios';

const API = '/api/buildings';

function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = () => {
    setLoading(true);
    axios.get(`${API}/purchases`)
      .then((res) => {
        setPurchases(res.data);
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

  const parseLine = (line) => {
    // إذا كان السطر يحتوي على Tab، استخدمه كفاصل، وإلا استخدم الفاصلة
    const separator = line.includes('\t') ? '\t' : ',';
    const result = [];
    let current = '';
    let insideQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') insideQuotes = !insideQuotes;
      else if (char === separator && !insideQuotes) { result.push(current.trim()); current = ''; }
      else current += char;
    }
    result.push(current.trim());
    return result;
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter((l) => l.trim() !== '');

        const headers = parseLine(lines[0]);
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const values = parseLine(lines[i]);
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

        const firstRow = rows[0] || {};
        const headersList = Object.keys(firstRow).join(' | ');
        alert(`Headers found:\n${headersList}\n\nTotal rows: ${rows.length}`);

        const purchasesData = rows.map(r => ({
          purchase_id: r['ID'] || r['id'] || '',
          type: r['Type'] || r['type'] || '',
          reference_id: r['Reference ID'] || r['Reference'] || r['Reference No'] || '',
          item_name: r['Item Name'] || r['Item'] || '',
          quantity: r['Quantity'] || r['Qty'] || '0',
          unit_cost: r['Unit Cost'] || '0',
          total_cost: r['Total Cost'] || '0',
          supplier: r['Supplier'] || '',
          source: r['Source'] || '',
          purchase_date: r['Purchase Date'] || r['Date'] || '',
          notes: r['Notes'] || '',
        })).filter(p => p.purchase_id && p.purchase_id.toUpperCase().startsWith('PUR'));

        if (purchasesData.length === 0) {
          alert(`No valid purchases found.\n\nFirst ID value: "${rows[0]['ID'] || rows[0]['id'] || 'EMPTY'}"`);
          return;
        }

        if (!window.confirm(`Import ${purchasesData.length} purchases?`)) return;

        const result = await axios.post(`${API}/import-all`, { purchases: purchasesData });
        alert(`Imported: ${result.data.results.purchases}\nErrors: ${result.data.results.errors.length}`);
        if (result.data.results.errors.length > 0) {
          console.log('Errors:', result.data.results.errors);
          alert('First error: ' + JSON.stringify(result.data.results.errors[0]));
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
        <h1>🛒 Purchases</h1>
        <label style={{ ...btnStyle('#28a745'), display: 'inline-block' }}>
          📥 Import CSV
          <input
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Reference</th>
            <th style={thStyle}>Item</th>
            <th style={thStyle}>Qty</th>
            <th style={thStyle}>Unit Cost</th>
            <th style={thStyle}>Total</th>
            <th style={thStyle}>Supplier</th>
            <th style={thStyle}>Date</th>
          </tr>
        </thead>
        <tbody>
          {purchases.length === 0 ? (
            <tr>
              <td colSpan="9" style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>
                No purchases yet. Click "Import CSV" to add data.
              </td>
            </tr>
          ) : (
            purchases.map((p) => (
              <tr key={p.id}>
                <td style={tdStyle}>{p.purchase_id}</td>
                <td style={tdStyle}>{p.type || '-'}</td>
                <td style={tdStyle}>{p.reference_id || '-'}</td>
                <td style={tdStyle}>{p.item_name || '-'}</td>
                <td style={tdStyle}>{p.quantity}</td>
                <td style={tdStyle}>{Number(p.unit_cost).toLocaleString()}</td>
                <td style={tdStyle}><strong>{Number(p.total_cost).toLocaleString()} SAR</strong></td>
                <td style={tdStyle}>{p.supplier || '-'}</td>
                <td style={tdStyle}>{p.purchase_date ? new Date(p.purchase_date).toLocaleDateString('en-US') : '-'}</td>
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

export default Purchases;
