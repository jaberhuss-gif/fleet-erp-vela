import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const api = {
  get: (url, config = {}) => axios.get('/api' + url, config)
};

function statusFor(status) {
  const s = String(status || '').toLowerCase();
  return ['red','yellow','green'].includes(s) ? s : 'green';
}

function Badge({ status }) {
  const s = statusFor(status);
  return (
    <span style={{
      display:'inline-block',
      padding:'4px 9px',
      borderRadius:999,
      fontWeight:700,
      fontSize:12,
      background:s==='red'?'#fee2e2':s==='yellow'?'#fef3c7':'#dcfce7',
      color:s==='red'?'#b91c1c':s==='yellow'?'#a16207':'#166534'
    }}>
      {s.toUpperCase()}
    </span>
  );
}

function Compliance({ label, status, reason }) {
  const s = statusFor(status);
  return (
    <div style={{
      padding:10,
      borderRadius:9,
      background:s==='red'?'#fee2e2':s==='yellow'?'#fef3c7':'#dcfce7'
    }}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
        <span style={{fontWeight:700}}>{label}</span>
        <Badge status={s} />
      </div>
      <div style={{fontSize:12,marginTop:5,color:'#475569'}}>{reason || 'No details'}</div>
    </div>
  );
}

export default function TireControl() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setError('');
      const r = await api.get('/tire/control');
      setRows((r.data.vehicles || []).filter(v => !/^test\b/i.test(String(v.plate || v.plate_number || '').trim())));
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to load Tire Control.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sortedRows = useMemo(() => [...rows].sort((a,b) => {
    const rank = { red:0, yellow:1, green:2 };
    return (rank[a.overallStatus || 'green'] ?? 2) - (rank[b.overallStatus || 'green'] ?? 2)
      || String(a.plate || '').localeCompare(String(b.plate || ''));
  }), [rows]);

  const totals = useMemo(() => sortedRows.reduce((a,r) => {
    const s = statusFor(r.overallStatus);
    return {...a, [s]: a[s] + 1};
  }, {red:0,yellow:0,green:0}), [rows]);

  return (
    <div style={{padding:24}}>
      <div style={{background:'white',borderRadius:12,padding:18,boxShadow:'0 1px 4px rgba(0,0,0,.08)',marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <div>
            <h1 style={{margin:0}}>🎛️ Tire Control</h1>
            <p style={{color:'#64748b',margin:'6px 0 0'}}>
              Vehicle Compliance Control Center — Tires, Oil, 6-Month Maintenance and Annual Inspection.
            </p>
          </div>
          <button onClick={load} disabled={loading} style={{
            border:'none',borderRadius:8,padding:'9px 14px',cursor:loading?'default':'pointer',
            background:'#2563eb',color:'white',fontWeight:700
          }}>
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {error && <div style={{marginTop:14,padding:12,borderRadius:8,background:'#fee2e2',color:'#b91c1c'}}>{error}</div>}

        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:14,fontWeight:700}}>
          <span><Badge status="red"/> {totals.red}</span>
          <span><Badge status="yellow"/> {totals.yellow}</span>
          <span><Badge status="green"/> {totals.green}</span>
          <span style={{padding:'4px 9px',borderRadius:999,background:'#f1f5f9'}}>TOTAL {rows.length}</span>
        </div>
      </div>

      {sortedRows.map(r => {
        const overall = statusFor(r.overallStatus);
        const border = overall==='red' ? '#dc2626' : overall==='yellow' ? '#eab308' : '#16a34a';
        return (
          <div key={r.id} style={{
            background:'white',borderRadius:12,padding:16,marginBottom:12,
            boxShadow:'0 1px 4px rgba(0,0,0,.08)',borderLeft:'7px solid '+border
          }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
              <div>
                <h2 style={{margin:0,fontSize:24}}>{r.plate || r.plate_number || 'Unknown Vehicle'}</h2>
                <div style={{color:'#64748b',fontSize:12}}>
                  Vehicle ID: {r.id}{r.location ? ' • '+r.location : ''}
                </div>
              </div>
              <Badge status={overall}/>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:9,marginTop:14}}>
              <Compliance label="🛞 Tires" status={r.tireStatus} reason={r.tireReason}/>
              <Compliance label="🛢️ Oil" status={r.oilStatus} reason={r.oilReason}/>
              <Compliance label="🔧 6-Month Maintenance" status={r.maintenanceStatus} reason={r.maintenanceReason}/>
              <Compliance label="📋 Annual Inspection" status={r.inspectionStatus} reason={r.inspectionReason}/>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:8,marginTop:12}}>
              {(r.tires || []).map(t => (
                <div key={t.id} style={{border:'1px solid #e2e8f0',padding:9,borderRadius:8}}>
                  <strong>{t.position}</strong>
                  <div style={{fontSize:12}}>{t.tireId}</div>
                  <div style={{fontSize:12}}>{t.serial || 'No serial'}</div>
                  <div style={{marginTop:4}}><Badge status={t.status}/></div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {!loading && !error && !sortedRows.length && (
        <div style={{background:'white',borderRadius:12,padding:24,textAlign:'center',color:'#64748b'}}>
          No vehicles found.
        </div>
      )}
    </div>
  );
}
