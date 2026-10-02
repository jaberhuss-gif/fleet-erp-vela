import { useEffect, useState } from 'react';
import { closeMonth, checkMonthLock } from './api';
import axios from 'axios';

const API = '/api/buildings';

function Dashboard() {
  const [gmData, setGmData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeMonth_, setCloseMonth_] = useState(new Date().getMonth() + 1);
  const [closeYear, setCloseYear] = useState(new Date().getFullYear());
  const [closeNotes, setCloseNotes] = useState('');
  const [closing, setClosing] = useState(false);

  const loadData = () => {
    setLoading(true);
    axios.get(`${API}/gm-dashboard`)
      .then((res) => {
        setGmData(res.data);
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

  const handleCloseMonth = async () => {
    if (!window.confirm(`Close month ${closeMonth_}/${closeYear}? This will lock all records.`)) return;
    
    setClosing(true);
    try {
      const check = await checkMonthLock(closeMonth_, closeYear);
      if (check.data.isLocked) {
        alert('This month is already closed!');
        setClosing(false);
        return;
      }

      await closeMonth({
        month: closeMonth_,
        year: closeYear,
        notes: closeNotes,
      });

      alert('✅ Month closed successfully!');
      setShowCloseModal(false);
      setCloseNotes('');
      loadData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
    setClosing(false);
  };

  const monthName = (m) => {
    const names = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return names[m] || m;
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', fontSize: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 40, color: 'red' }}>Error: {error}</div>;

  const { months, totals } = gmData;

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        flexWrap: 'wrap',
        gap: 15,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 36, color: '#1e293b' }}>
            📊 Executive Dashboard
          </h1>
          <p style={{ color: '#64748b', marginTop: 5, fontSize: 16 }}>
            General Manager Overview — Last 3 Months
          </p>
        </div>
        <button onClick={() => setShowCloseModal(true)} style={btnStyle('#dc3545')}>
          🔒 Close Month
        </button>
      </div>

      {/* Top KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 25 }}>
        <KpiCard
          icon="🛠"
          value={totals.wo_count_contractor + totals.wo_count_company}
          label="Work Orders"
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
        <KpiCard
          icon="🏗"
          value={totals.dev_count_contractor + totals.dev_count_company}
          label="Development Projects"
          gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
        />
        <KpiCard
          icon="💰"
          value={Number(totals.grand_total).toLocaleString()}
          label="Total Cost (SAR)"
          gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
        />
        <KpiCard
          icon="📈"
          value={`${Number(totals.total_savings_pct).toFixed(1)}%`}
          label="Savings Rate"
          gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        />
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 25 }}>
        <SummaryCard
          title="Total Company Cost"
          value={totals.total_company}
          color="#007bff"
          bg="linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)"
          icon="🏢"
        />
        <SummaryCard
          title="Total Contractor Cost"
          value={totals.total_contractor}
          color="#dc3545"
          bg="linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)"
          icon="👷"
        />
        <SummaryCard
          title="Total Savings"
          value={totals.total_savings}
          color="#28a745"
          bg="linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)"
          icon="💵"
        />
      </div>

      {/* Monthly Breakdown Table */}
      <div style={{ background: 'white', borderRadius: 12, padding: 25, boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginBottom: 25, overflowX: 'auto' }}>
        <h2 style={{ marginTop: 0, color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: 15 }}>
          📅 Monthly Breakdown
        </h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: '#1e293b', color: 'white' }}>
              <th style={thStyle}>Month</th>
              <th style={thStyle}>WO (Co / Ct)</th>
              <th style={thStyle}>Dev (Co / Ct)</th>
              <th style={thStyle}>Company</th>
              <th style={thStyle}>Contractor</th>
              <th style={thStyle}>Grand Total</th>
              <th style={thStyle}>Budget</th>
              <th style={thStyle}>Savings</th>
              <th style={thStyle}>Savings %</th>
            </tr>
          </thead>
          <tbody>
            {months.map((c) => (
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
                <td style={{
                  ...tdStyle,
                  color: '#fff',
                  background: '#28a745',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  borderRadius: 4,
                }}>
                  {Number(c.total_savings_pct).toFixed(1)}%
                </td>
              </tr>
            ))}
            <tr style={{ background: '#e7f3ff', fontWeight: 'bold', fontSize: 15 }}>
              <td style={tdStyle}>TOTAL</td>
              <td style={tdStyle}>{totals.wo_count_company} / {totals.wo_count_contractor}</td>
              <td style={tdStyle}>{totals.dev_count_company} / {totals.dev_count_contractor}</td>
              <td style={tdStyle}>{Number(totals.total_company).toLocaleString()} SAR</td>
              <td style={tdStyle}>{Number(totals.total_contractor).toLocaleString()} SAR</td>
              <td style={tdStyle}>{Number(totals.grand_total).toLocaleString()} SAR</td>
              <td style={tdStyle}>{Number(totals.total_budget).toLocaleString()} SAR</td>
              <td style={tdStyle}>{Number(totals.total_savings).toLocaleString()} SAR</td>
              <td style={tdStyle}>{Number(totals.total_savings_pct).toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Savings Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
        <div style={savingsCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 15 }}>
            <div style={{ fontSize: 40 }}>🔧</div>
            <div>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Maintenance Savings</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Budget: 20,577 SAR/month</p>
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#28a745', marginBottom: 10 }}>
            {Number(totals.maintenance_savings).toLocaleString()} SAR
          </div>
          <div style={{ fontSize: 14, color: '#64748b' }}>
            Saved across {months.length} months
          </div>
        </div>

        <div style={savingsCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 15 }}>
            <div style={{ fontSize: 40 }}>🏗</div>
            <div>
              <h3 style={{ margin: 0, color: '#1e293b' }}>Development Savings</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Budget: 132,551 SAR/month</p>
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#28a745', marginBottom: 10 }}>
            {Number(totals.development_savings).toLocaleString()} SAR
          </div>
          <div style={{ fontSize: 14, color: '#64748b' }}>
            Saved across {months.length} months
          </div>
        </div>
      </div>

      {/* Close Month Modal */}
      {showCloseModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h2 style={{ marginTop: 0, color: '#dc3545' }}>🔒 Close Month</h2>
            <p style={{ color: '#64748b' }}>
              This will lock all records for the selected month. You can reopen it later if needed.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15, marginTop: 20 }}>
              <label>
                <span style={labelStyle}>Month</span>
                <select
                  value={closeMonth_}
                  onChange={(e) => setCloseMonth_(parseInt(e.target.value))}
                  style={inputStyle}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>{monthName(m)}</option>
                  ))}
                </select>
              </label>
              <label>
                <span style={labelStyle}>Year</span>
                <input
                  type="number"
                  value={closeYear}
                  onChange={(e) => setCloseYear(parseInt(e.target.value))}
                  style={inputStyle}
                />
              </label>
            </div>

            <label style={{ display: 'block', marginTop: 15 }}>
              <span style={labelStyle}>Notes (optional)</span>
              <textarea
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Any notes about this month..."
                style={{ ...inputStyle, minHeight: 80 }}
              />
            </label>

            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCloseModal(false)}
                style={btnStyle('#6c757d')}
                disabled={closing}
              >
                Cancel
              </button>
              <button
                onClick={handleCloseMonth}
                style={btnStyle('#dc3545')}
                disabled={closing}
              >
                {closing ? '⏳ Closing...' : '🔒 Close Month'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const KpiCard = ({ icon, value, label, gradient }) => (
  <div style={{
    background: gradient,
    borderRadius: 12,
    padding: 20,
    textAlign: 'center',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
    color: 'white',
  }}>
    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 30, fontWeight: 'bold', marginBottom: 5 }}>{value}</div>
    <div style={{ fontSize: 13, opacity: 0.95 }}>{label}</div>
  </div>
);

const SummaryCard = ({ title, value, color, bg, icon }) => (
  <div style={{
    background: bg,
    borderLeft: `6px solid ${color}`,
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
      <div style={{ fontSize: 32 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: '500' }}>{title}</div>
        <div style={{ fontSize: 24, fontWeight: 'bold', color, marginTop: 5 }}>
          {Number(value).toLocaleString()} <span style={{ fontSize: 14 }}>SAR</span>
        </div>
      </div>
    </div>
  </div>
);

const pageStyle = {
  padding: 30,
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
};

const btnStyle = (bg) => ({
  background: bg,
  color: 'white',
  border: 'none',
  padding: '12px 24px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 'bold',
  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
});

const modalOverlay = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 9999,
};

const modalContent = {
  background: 'white',
  borderRadius: 12,
  padding: 30,
  maxWidth: 500,
  width: '90%',
  maxHeight: '90vh',
  overflow: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
};

const inputStyle = {
  width: '100%',
  padding: 10,
  border: '1px solid #ddd',
  borderRadius: 5,
  fontSize: 14,
  boxSizing: 'border-box',
  background: 'white',
  color: 'black',
};

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 5,
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: 15,
  fontSize: 14,
  minWidth: 700,
};

const thStyle = {
  padding: 12,
  textAlign: 'left',
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
  borderRadius: 12,
  padding: 25,
  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
};

export default Dashboard;
