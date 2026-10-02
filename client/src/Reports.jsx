import { useEffect, useState } from 'react';
import { getMonthlyClosures, reopenMonth } from './api';
import axios from 'axios';

const API = '/api/buildings';

function Reports() {
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fromMonth, setFromMonth] = useState('2026-07');
  const [toMonth, setToMonth] = useState('2026-08');
  const [rangeData, setRangeData] = useState(null);
  const [rangeLoading, setRangeLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    getMonthlyClosures()
      .then((res) => {
        setClosures(res.data);
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

  const handleGenerateReport = async () => {
    setRangeLoading(true);
    try {
      const res = await axios.get(`${API}/report-range?from=${fromMonth}&to=${toMonth}`);
      setRangeData(res.data);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
    setRangeLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReopen = async (id, month, year) => {
    if (!window.confirm(`Reopen ${month}/${year}?`)) return;
    try {
      await reopenMonth(id, 'owner');
      alert('Month reopened');
      loadData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const monthName = (m) => {
    const names = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return names[m] || m;
  };

  const monthShort = (m) => {
    const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[m] || m;
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <div className="no-print">
        <h1>📈 Reports</h1>

        {/* Period Selector */}
        <div style={{ background: 'white', padding: 20, borderRadius: 8, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>Generate Report</h3>
          <div style={{ display: 'flex', gap: 15, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 'bold' }}>From:</span>
              <input
                type="month"
                value={fromMonth}
                onChange={(e) => setFromMonth(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 'bold' }}>To:</span>
              <input
                type="month"
                value={toMonth}
                onChange={(e) => setToMonth(e.target.value)}
                style={inputStyle}
              />
            </label>
            <button onClick={handleGenerateReport} style={btnStyle('#007bff')}>
              🔍 Generate
            </button>
            {rangeData && (
              <button onClick={handlePrint} style={btnStyle('#28a745')}>
                🖨️ Print
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Range Report */}
      {rangeData && (
        <div style={{ background: 'white', padding: 30, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 20 }}>
          <div style={{ textAlign: 'center', marginBottom: 30, borderBottom: '2px solid #1e293b', paddingBottom: 15 }}>
            <h1 style={{ margin: 0, color: '#1e293b' }}>🏢 Fleet ERP</h1>
            <h2 style={{ margin: '5px 0', color: '#666' }}>Monthly Financial Report</h2>
            <p style={{ margin: 0, color: '#999' }}>
              Period: {monthName(parseInt(fromMonth.split('-')[1]))} {fromMonth.split('-')[0]} → {monthName(parseInt(toMonth.split('-')[1]))} {toMonth.split('-')[0]}
            </p>
          </div>

          {/* Summary Table */}
          <h3 style={{ color: '#1e293b', marginBottom: 10 }}>📊 Monthly Summary</h3>
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: '#1e293b', color: 'white' }}>
                <th style={thStyle}>Month</th>
                <th style={thStyle}>WO (Co/Ct)</th>
                <th style={thStyle}>Dev (Co/Ct)</th>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Contractor</th>
                <th style={thStyle}>Grand Total</th>
                <th style={thStyle}>Budget</th>
                <th style={thStyle}>Savings</th>
                <th style={thStyle}>Savings %</th>
              </tr>
            </thead>
            <tbody>
              {rangeData.months.map((c) => (
                <tr key={c.id}>
                  <td style={tdStyle}><strong>{monthName(c.month)} {c.year}</strong></td>
                  <td style={tdStyle}>{c.wo_count_company} / {c.wo_count_contractor}</td>
                  <td style={tdStyle}>{c.dev_count_company} / {c.dev_count_contractor}</td>
                  <td style={tdStyle}>{Number(c.total_company).toLocaleString()} SAR</td>
                  <td style={tdStyle}>{Number(c.total_contractor).toLocaleString()} SAR</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold', color: '#6f42c1' }}>
                    {Number(c.grand_total).toLocaleString()} SAR
                  </td>
                  <td style={tdStyle}>{Number(c.total_budget).toLocaleString()} SAR</td>
                  <td style={{ ...tdStyle, color: '#28a745', fontWeight: 'bold' }}>
                    {Number(c.total_savings).toLocaleString()} SAR
                  </td>
                  <td style={{ ...tdStyle, color: '#28a745', fontWeight: 'bold', fontSize: 16 }}>
                    {Number(c.total_savings_pct).toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#e7f3ff', fontWeight: 'bold', fontSize: 15 }}>
                <td style={tdStyle}>TOTAL</td>
                <td style={tdStyle}>
                  {rangeData.totals.wo_count_company} / {rangeData.totals.wo_count_contractor}
                </td>
                <td style={tdStyle}>
                  {rangeData.totals.dev_count_company} / {rangeData.totals.dev_count_contractor}
                </td>
                <td style={tdStyle}>{Number(rangeData.totals.total_company).toLocaleString()} SAR</td>
                <td style={tdStyle}>{Number(rangeData.totals.total_contractor).toLocaleString()} SAR</td>
                <td style={tdStyle}>{Number(rangeData.totals.grand_total).toLocaleString()} SAR</td>
                <td style={tdStyle}>{Number(rangeData.totals.total_budget).toLocaleString()} SAR</td>
                <td style={tdStyle}>{Number(rangeData.totals.total_savings).toLocaleString()} SAR</td>
                <td style={tdStyle}>{Number(rangeData.totals.total_savings_pct).toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>

          {/* Breakdown Table */}
          <h3 style={{ color: '#1e293b', marginTop: 30, marginBottom: 10 }}>📋 Cost Breakdown</h3>
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Company Labor</th>
                <th style={thStyle}>Company Parts</th>
                <th style={thStyle}>Contractor Labor</th>
                <th style={thStyle}>Contractor Parts</th>
                <th style={thStyle}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}><strong>Work Orders</strong></td>
                <td style={tdStyle}>{Number(rangeData.totals.total_company_labor).toLocaleString()} SAR</td>
                <td style={tdStyle}>{Number(rangeData.totals.total_company_parts).toLocaleString()} SAR</td>
                <td style={tdStyle}>{Number(rangeData.totals.total_contractor_labor).toLocaleString()} SAR</td>
                <td style={tdStyle}>{Number(rangeData.totals.total_contractor_parts).toLocaleString()} SAR</td>
                <td style={tdStyle}>-</td>
              </tr>
              <tr>
                <td style={tdStyle}><strong>Development Projects</strong></td>
                <td style={tdStyle}>-</td>
                <td style={tdStyle}>-</td>
                <td style={tdStyle}>-</td>
                <td style={tdStyle}>-</td>
                <td style={tdStyle}>-</td>
              </tr>
              <tr style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
                <td style={tdStyle}>Total</td>
                <td style={tdStyle}>{Number(rangeData.totals.total_company_labor).toLocaleString()} SAR</td>
                <td style={tdStyle}>{Number(rangeData.totals.total_company_parts).toLocaleString()} SAR</td>
                <td style={tdStyle}>{Number(rangeData.totals.total_contractor_labor).toLocaleString()} SAR</td>
                <td style={tdStyle}>{Number(rangeData.totals.total_contractor_parts).toLocaleString()} SAR</td>
                <td style={tdStyle}>{Number(rangeData.totals.grand_total).toLocaleString()} SAR</td>
              </tr>
            </tbody>
          </table>

          {/* Savings Summary */}
          <h3 style={{ color: '#1e293b', marginTop: 30, marginBottom: 10 }}>💰 Savings Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr)), 1fr)', gap: 15 }}>
            <div style={savingsCard}>
              <div style={savingsLabel}>Maintenance</div>
              <div style={savingsValue}>{Number(rangeData.totals.maintenance_savings).toLocaleString()} SAR</div>
              <div style={savingsPct}>{Number(rangeData.totals.maintenance_savings_pct).toFixed(1)}%</div>
            </div>
            <div style={savingsCard}>
              <div style={savingsLabel}>Development</div>
              <div style={savingsValue}>{Number(rangeData.totals.development_savings).toLocaleString()} SAR</div>
              <div style={savingsPct}>{Number(rangeData.totals.development_savings_pct).toFixed(1)}%</div>
            </div>
            <div style={{ ...savingsCard, background: '#d4edda', border: '2px solid #28a745' }}>
              <div style={savingsLabel}><strong>TOTAL</strong></div>
              <div style={{ ...savingsValue, fontSize: 24 }}>
                {Number(rangeData.totals.total_savings).toLocaleString()} SAR
              </div>
              <div style={{ ...savingsPct, fontSize: 28 }}>
                {Number(rangeData.totals.total_savings_pct).toFixed(1)}%
              </div>
            </div>
          </div>

          <div style={{ marginTop: 30, textAlign: 'center', color: '#999', fontSize: 11, borderTop: '1px solid #eee', paddingTop: 15 }}>
            Generated: {new Date().toLocaleString('en-US')} | Fleet ERP System
          </div>
        </div>
      )}

      {/* Closed Months List */}
      <div className="no-print">
        <h2>📅 Closed Months</h2>
        {closures.length === 0 ? (
          <p style={{ color: '#999' }}>No closed months yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={thStyle}>Month</th>
                <th style={thStyle}>Grand Total</th>
                <th style={thStyle}>Savings</th>
                <th style={thStyle}>Savings %</th>
                <th style={thStyle}>Closed At</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {closures.map((c) => (
                <tr key={c.id}>
                  <td style={tdStyle}>{monthName(c.month)} {c.year} {c.is_locked ? '🔒' : '🔓'}</td>
                  <td style={tdStyle}>{Number(c.grand_total).toLocaleString()} SAR</td>
                  <td style={{ ...tdStyle, color: '#28a745' }}>{Number(c.total_savings).toLocaleString()} SAR</td>
                  <td style={{ ...tdStyle, color: '#28a745', fontWeight: 'bold' }}>{Number(c.total_savings_pct).toFixed(1)}%</td>
                  <td style={tdStyle}>{new Date(c.closed_at).toLocaleDateString('en-US')}</td>
                  <td style={tdStyle}>
                    <button onClick={() => handleReopen(c.id, c.month, c.year)} style={btnStyle('#ffc107')}>
                      🔓 Reopen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

     <style>{`
  @media print {
    .no-print { display: none !important; }
    body { 
      background: white !important; 
      padding: 0 !important; 
      margin: 0 !important;
    }
    nav { display: none !important; }
    h1 { font-size: 22px !important; margin: 0 !important; }
    h2 { font-size: 18px !important; }
    h3 { font-size: 16px !important; page-break-after: avoid; }
    table { font-size: 11px !important; page-break-inside: avoid; }
    th, td { padding: 6px !important; }
    .page-break { page-break-before: always; }
    @page { 
      margin: 15mm; 
      size: A4 landscape;
    }
  }
`}</style>
    </div>
  );
}

const btnStyle = (bg) => ({
  background: bg,
  color: bg === '#ffc107' ? '#000' : 'white',
  border: 'none',
  padding: '10px 20px',
  borderRadius: 5,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 'bold',
});

const inputStyle = {
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: 5,
  fontSize: 14,
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: 15,
  fontSize: 14,
};

const thStyle = {
  padding: 12,
  textAlign: 'left',
  borderBottom: '2px solid #ddd',
  fontSize: 13,
  fontWeight: 'bold',
};

const tdStyle = {
  padding: 12,
  textAlign: 'left',
  borderBottom: '1px solid #eee',
  fontSize: 13,
};

const savingsCard = {
  background: 'white',
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: 20,
  textAlign: 'center',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
};

const savingsLabel = {
  fontSize: 14,
  color: '#666',
  marginBottom: 10,
};

const savingsValue = {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#1e293b',
  marginBottom: 5,
};

const savingsPct = {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#28a745',
};

export default Reports;
