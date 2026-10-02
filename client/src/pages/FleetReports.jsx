import { useState, useEffect } from 'react';
import axios from 'axios';

const API = '/api';

export default function FleetReports() {
  const [report, setReport] = useState(null);
const [pmReport, setPmReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [fromDate, setFromDate] = useState(thirtyDaysAgo);
  const [toDate, setToDate] = useState(today);
  const [includeSystem, setIncludeSystem] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API}/tickets/report`, {
        params: { from: fromDate, to: toDate, includeSystem }
      });
      setReport(res.data);
    } catch (e) {
      setError('Failed to load report: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

 useEffect(() => {
  if (fromDate && toDate) {
    loadReport();
    loadPmReport();
  }
}, [fromDate, toDate, includeSystem]);

  const applyMonthRange = (months) => {
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    setFromDate(from);
    setToDate(to);
  };
const loadPmReport = async () => {
  try {
    // ✅ PM بدون فلتر — يعرض كل المواعيد القادمة
    const res = await axios.get(`${API}/periodic-maintenance/report`);
    setPmReport(res.data);
  } catch (e) {
    console.error('PM report error:', e);
  }
};

  const handlePrint = () => {
    window.print();
  };

  if (loading && !report) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading report...</div>;
  }

  const stats = report?.stats || {};
  const totalCost = Number(stats.total_cost || 0);
  const avgCost = Number(stats.avg_cost || 0);

  return (
    <div style={{ padding: 20, fontFamily: 'Arial', background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Controls */}
      <div className="no-print" style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 10 }}>
              📊 Fleet Maintenance Report
            </h1>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
              Analysis of vehicle maintenance tickets and cost breakdown
            </p>
          </div>
          <button onClick={handlePrint} style={{
            background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
            color: 'white',
            border: 'none',
            padding: '12px 28px',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 14,
            boxShadow: '0 4px 12px rgba(30,58,138,0.3)'
          }}>
            🖨️ Print PDF
          </button>
        </div>

        {/* Quick ranges */}
        <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 'bold', color: '#475569', marginRight: 8 }}>
            Quick Range:
          </span>
          <button onClick={() => applyMonthRange(1)} style={quickBtn}>Last 30 Days</button>
          <button onClick={() => applyMonthRange(3)} style={quickBtn}>3 Months</button>
          <button onClick={() => applyMonthRange(6)} style={quickBtn}>6 Months</button>
          <button onClick={() => applyMonthRange(12)} style={quickBtn}>1 Year</button>
        </div>

        {/* Filters */}
        <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={labelStyle}>From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
          </div>
          <button onClick={loadReport} style={applyBtn}>Apply Filter</button>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: '#f1f5f9',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            color: '#334155',
            border: includeSystem ? '2px solid #1e3a8a' : '2px solid transparent'
          }}>
            <input
              type="checkbox"
              checked={includeSystem}
              onChange={e => setIncludeSystem(e.target.checked)}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <strong>Include System Tickets</strong>
          </label>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: 14, borderRadius: 8, marginBottom: 20, borderLeft: '4px solid #dc2626' }}>
          {error}
        </div>
      )}

      {/* Print Header */}
      <div className="print-header" style={{ display: 'none' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '3px solid #1e3a8a',
          paddingBottom: 16,
          marginBottom: 20
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: '#1e3a8a' }}>Fleet ERP</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Fleet Maintenance Report</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: 13 }}>
            <div><strong>Period:</strong> {fromDate} to {toDate}</div>
            <div><strong>Generated:</strong> {new Date().toLocaleString('en-US')}</div>
          </div>
        </div>
      </div>

      {/* On-screen Report Title */}
      <div className="no-print report-banner" style={{
        background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
        color: 'white',
        padding: 24,
        borderRadius: 12,
        marginBottom: 20,
        boxShadow: '0 4px 12px rgba(30,58,138,0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Fleet Maintenance Report</h2>
            <p style={{ margin: '6px 0 0', fontSize: 14, opacity: 0.9 }}>
              {includeSystem ? '📋 Including System Tickets' : '🚗 Driver-Reported Tickets Only'}
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: 14 }}>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Period</div>
            <div style={{ fontWeight: 'bold' }}>{fromDate} → {toDate}</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <StatCard icon="📋" label="Total Tickets" value={stats.total || 0} color="#1e3a8a" />
        <StatCard icon="✅" label="Closed" value={stats.closed_count || 0} color="#16a34a" />
        <StatCard icon="⚠️" label="Open" value={stats.open_count || 0} color="#dc2626" />
        <StatCard icon="💰" label="Total Cost" value={`${totalCost.toLocaleString()} SAR`} color="#ea580c" />
        <StatCard icon="📊" label="Avg per Ticket" value={`${avgCost.toFixed(0)} SAR`} color="#7c3aed" />
      </div>

      {/* Sections */}
      <ReportSection icon="👨‍🔧" title="Cost by Technician" subtitle="Distribution of costs across technicians">
        <DataTable
          headers={['Technician', 'Tickets', 'Total Cost (SAR)']}
          rows={(report?.byTechnician || []).map(r => [
            r.technician,
            r.tickets_count,
            Number(r.total_cost).toLocaleString()
          ])}
          highlightCol={2}
          columnWidths={['50%', '20%', '30%']}
        />
      </ReportSection>

      <ReportSection icon="🔧" title="Cost by Category" subtitle="Breakdown of issues by category">
        <DataTable
          headers={['Category', 'Tickets', 'Total Cost (SAR)']}
          rows={(report?.byCategory || []).map(r => [
            r.category,
            r.tickets_count,
            Number(r.total_cost).toLocaleString()
          ])}
          highlightCol={2}
          columnWidths={['50%', '20%', '30%']}
        />
      </ReportSection>

      <ReportSection icon="🚙" title="Cost by Vehicle (Top 30)" subtitle="Most expensive vehicles in the period">
        <DataTable
          headers={['Vehicle', 'Tickets', 'Total Cost (SAR)']}
          rows={(report?.byVehicle || []).map(r => [
            `${r.plate_number || ''} ${r.plate_code || ''}`.trim() + (r.vehicle_id ? ` (ID: ${r.vehicle_id})` : ''),
            r.tickets_count,
            Number(r.total_cost).toLocaleString()
          ])}
          highlightCol={2}
          columnWidths={['50%', '20%', '30%']}
        />
      </ReportSection>

      <ReportSection
        icon="📝"
        title={`Closed Tickets Detail (${report?.closedTickets?.length || 0})`}
        subtitle="Complete list of resolved tickets"
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ ...tableStyle, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'center' }}>ID</th>
                <th style={thStyle}>Vehicle</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Technician</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Cost</th>
                <th style={thStyle}>Closed At</th>
                <th style={thStyle}>Closed By</th>
              </tr>
            </thead>
            <tbody>
              {(report?.closedTickets || []).length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: 20 }}>
                    No closed tickets in this period
                  </td>
                </tr>
              ) : (
                (report?.closedTickets || []).map((t, i) => (
                  <tr key={t.id} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', color: '#1e3a8a' }}>#{t.id}</td>
                    <td style={tdStyle}>
                      <strong>{t.plate_number} {t.plate_code}</strong>
                    </td>
                    <td style={tdStyle}>
                      <span style={categoryBadge}>{t.category || 'Other'}</span>
                    </td>
                    <td style={tdStyle}>{t.technician || <em style={{ color: '#94a3b8' }}>—</em>}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', color: Number(t.cost) > 0 ? '#16a34a' : '#94a3b8' }}>
                      {Number(t.cost || 0).toLocaleString()} SAR
                    </td>
                    <td style={tdStyle}>
                      {t.closed_at ? new Date(t.closed_at).toLocaleDateString('en-US') : '—'}
                    </td>
                    <td style={tdStyle}>{t.closed_by || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ReportSection>

      {/* ============================================================ */}
      {/* PERIODIC MAINTENANCE SECTION */}
      {/* ============================================================ */}

      {pmReport && (
        <>
          {/* PM Summary */}
          <ReportSection
            icon="🔧"
            title="Periodic Maintenance Summary"
            subtitle={`Total scheduled maintenance: ${pmReport.stats.total} | Completed: ${pmReport.stats.completed} | Pending: ${pmReport.stats.pending}`}
          >
            <div className="pm-summary" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12
            }}>
              <PmStatCard
                label="Total Scheduled"
                value={pmReport.stats.total}
                color="#1e3a8a"
                icon="📅"
              />
              <PmStatCard
                label="Completed"
                value={pmReport.stats.completed}
                color="#16a34a"
                icon="✅"
              />
              <PmStatCard
                label="Pending"
                value={pmReport.stats.pending}
                color="#dc2626"
                icon="⏳"
              />
              <PmStatCard
                label="Total Vehicles"
                value={pmReport.totalVehicles}
                color="#7c3aed"
                icon="🚙"
              />
            </div>
          </ReportSection>

        {/* PM By Type */}
<ReportSection
  icon="📋"
  title="Maintenance by Type"
  subtitle="All scheduled maintenance (regardless of date)"
          >
            <DataTable
              headers={['Type', 'Total', 'Completed', 'Pending', 'Total Cost (SAR)']}
              rows={(pmReport.byType || []).map(r => [
                pmTypeLabel(r.type),
                r.total,
                r.completed,
                r.pending,
                Number(r.total_cost).toLocaleString()
              ])}
              highlightCol={4}
              columnWidths={['30%', '15%', '15%', '15%', '25%']}
            />
          </ReportSection>

        {/* Remaining by Type */}
<ReportSection
  icon="⏳"
  title="Remaining Maintenance (Not Completed)"
  subtitle="All vehicles still waiting for scheduled maintenance (all time)"
          >
            <DataTable
              headers={['Type', 'Remaining Vehicles']}
              rows={(pmReport.remaining || []).map(r => [
                pmTypeLabel(r.type),
                r.remaining_count
              ])}
              highlightCol={1}
              columnWidths={['70%', '30%']}
            />
          </ReportSection>

          {/* Progress */}
          <ReportSection
            icon="📊"
            title="Maintenance Progress"
            subtitle={`Progress by type — completed vs total`}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(pmReport.byType || []).map(r => {
                const pct = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
                return (
                  <div key={r.type}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <strong>{pmTypeLabel(r.type)}</strong>
                      <span>{r.completed} / {r.total} ({pct}%)</span>
                    </div>
                    <div style={{
                      background: '#e2e8f0',
                      height: 10,
                      borderRadius: 5,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: pct === 100 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#dc2626',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </ReportSection>
        </>
      )}
      {/* Print Footer */}
      <div className="print-footer" style={{ display: 'none' }}>
        <div style={{
          borderTop: '2px solid #1e3a8a',
          paddingTop: 12,
          marginTop: 20,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#64748b'
        }}>
          <div>Fleet ERP — Maintenance Report</div>
          <div>Generated {new Date().toLocaleDateString('en-US')}</div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm 10mm;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 11px !important;
          }

          /* ====== HIDE EVERYTHING ====== */
          .no-print,
          .no-print * {
            display: none !important;
            visibility: hidden !important;
          }

          /* ====== HIDE ASIDE / HEADER / NAV ====== */
          aside,
          header,
          nav {
            display: none !important;
            visibility: hidden !important;
          }

          /* ====== RESET MAIN ====== */
          main {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
          }

          /* ====== SHOW PRINT HEADER ====== */
          .print-header {
            display: block !important;
            margin-bottom: 15px !important;
          }

          /* ====== SHOW PRINT FOOTER ====== */
          .print-footer {
            display: block !important;
            page-break-inside: avoid !important;
            margin-top: 15px !important;
            padding-top: 8px !important;
            border-top: 2px solid #1e3a8a !important;
            font-size: 9px !important;
          }

          /* ====== STATS CARDS - 5 IN A ROW ====== */

          .stats-grid {
            display: grid !important;
            grid-template-columns: repeat(5, 1fr) !important;
            gap: 6px !important;
            margin-bottom: 15px !important;
          }

          .stat-card {
            padding: 8px !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            border-left-width: 4px !important;
            page-break-inside: avoid !important;
          }

          .stat-card .stat-icon {
            font-size: 14px !important;
            margin-bottom: 2px !important;
          }

          .stat-card .stat-label {
            font-size: 8px !important;
            letter-spacing: 0 !important;
          }

          .stat-card .stat-value {
            font-size: 14px !important;
            margin-top: 4px !important;
          }
/* ====== PM SUMMARY ====== */
.pm-summary {
  display: grid !important;
  grid-template-columns: repeat(4, 1fr) !important;
  gap: 8px !important;
}

.pm-summary .stat-card {
  padding: 8px !important;
}

.pm-summary .stat-card div {
  font-size: 10px !important;
}

          /* ====== REPORT SECTIONS ====== */
          .report-section {
            page-break-inside: avoid !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            padding: 10px !important;
            margin-bottom: 10px !important;
            border-radius: 4px !important;
          }

          .report-section h3 {
            font-size: 12px !important;
            padding-bottom: 5px !important;
            margin-bottom: 6px !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }

          .report-section p {
            font-size: 9px !important;
            margin: 0 !important;
          }

          /* ====== TABLES ====== */
          table {
            width: 100% !important;
            font-size: 9px !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }

          thead {
            display: table-header-group !important;
          }

          tr {
            page-break-inside: avoid !important;
          }

          th {
            padding: 5px 6px !important;
            font-size: 8px !important;
            background: #1e293b !important;
            color: white !important;
            white-space: nowrap !important;
          }

          td {
            padding: 4px 6px !important;
            font-size: 9px !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }

          /* ====== PRINT HEADER ====== */
          .print-header h1 {
            font-size: 16px !important;
            margin: 0 !important;
          }

          .print-header p {
            font-size: 9px !important;
            margin: 2px 0 0 !important;
          }
        }
      `}</style>
    </div>
  );
}


/* ===== Components ===== */

const StatCard = ({ icon, label, value, color }) => (
  <div className="stat-card" style={{
    background: 'white',
    padding: 20,
    borderRadius: 12,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    borderLeft: `5px solid ${color}`,
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div className="stat-icon" style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
    <div className="stat-label" style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 'bold' }}>
      {label}
    </div>
    <div className="stat-value" style={{ fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginTop: 6 }}>
      {value}
    </div>
  </div>
);

const ReportSection = ({ icon, title, subtitle, children }) => (
  <div className="report-section" style={{
    background: 'white',
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
  }}>
    <div style={{ marginBottom: 16, borderBottom: '2px solid #f1f5f9', paddingBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: 17, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        {title}
      </h3>
      {subtitle && (
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>{subtitle}</p>
      )}
    </div>
    {children}
  </div>
);

const DataTable = ({ headers, rows, highlightCol, columnWidths }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ ...tableStyle, tableLayout: 'fixed' }}>
      <colgroup>
        {headers.map((_, i) => (
          <col key={i} style={{ width: columnWidths ? columnWidths[i] : 'auto' }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th
              key={i}
              style={{
                ...thStyle,
                textAlign: i === 0 ? 'left' : 'center'
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={headers.length} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: 20 }}>
              No data available
            </td>
          </tr>
        ) : (
          rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    ...tdStyle,
                    textAlign: j === 0 ? 'left' : 'center',
                    fontWeight: j === highlightCol ? 'bold' : 'normal',
                    color: j === highlightCol && Number(String(cell).replace(/,/g, '')) > 0 ? '#16a34a' : '#334155'
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

/* ===== Styles ===== */
const pmTypeLabel = (type) => {
  const labels = {
    'inspection': 'Inspection (Periodic)',
    'oil_change': 'Oil Change',
    '6_months_general': '6 Months General',
    'general': 'General Maintenance'
  };
  return labels[type] || type;
};

const PmStatCard = ({ icon, label, value, color }) => (
  <div className="stat-card" style={{
    background: 'white',
    padding: 16,
    borderRadius: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    borderLeft: `4px solid ${color}`,
    textAlign: 'center'
  }}>
    <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
    <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 'bold' }}>
      {label}
    </div>
    <div style={{ fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginTop: 4 }}>
      {value}
    </div>
  </div>
);

const quickBtn = {
  background: '#e0e7ff',
  color: '#1e3a8a',
  border: '1px solid #c7d2fe',
  padding: '8px 16px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 'bold'
};

const applyBtn = {
  background: 'linear-gradient(135deg, #16a34a, #22c55e)',
  color: 'white',
  border: 'none',
  padding: '10px 24px',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: 14,
  boxShadow: '0 2px 8px rgba(22,163,74,0.3)'
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 'bold',
  marginBottom: 4,
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: 0.5
};

const inputStyle = {
  padding: 10,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  fontSize: 14,
  background: 'white',
  color: 'black'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  background: 'white',
  fontSize: 13,
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  overflow: 'hidden'
};

const thStyle = {
  padding: 14,
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 'bold',
  color: 'white',
  background: '#1e293b',
  textTransform: 'uppercase',
  letterSpacing: 0.3,
  whiteSpace: 'nowrap'
};

const tdStyle = {
  padding: 12,
  textAlign: 'left',
  borderBottom: '1px solid #f1f5f9',
  fontSize: 13
};

const categoryBadge = {
  background: '#e0e7ff',
  color: '#3730a3',
  padding: '3px 10px',
  borderRadius: 12,
  fontSize: 11,
  fontWeight: 'bold'
};
