import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const PM_API = '/api/fleet/periodic-maintenance';
const VEHICLES_API = '/api/fleet/vehicles';

const isRealInspection = (r) =>
  String(r?.type || '').toLowerCase().trim() === 'inspection' &&
  String(r?.status || '').toLowerCase().trim() === 'completed' &&
  Boolean(r?.completed_date);

function InspectedVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([axios.get(VEHICLES_API), axios.get(PM_API)])
      .then(([v, p]) => {
        setVehicles((v.data || []).filter(x => !/test\s*123/i.test(String(x.plate_number || '') + ' ' + String(x.plate_code || ''))));
        setRecords(p.data || []);
      })
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  const inspected = useMemo(() => {
    const latest = new Map();
    records.filter(isRealInspection).forEach(r => {
      const id = Number(r.vehicle_id);
      if (!id) return;
      const old = latest.get(id);
      if (!old || new Date(r.completed_date) > new Date(old.completed_date)) latest.set(id, r);
    });
    return vehicles.filter(v => latest.has(Number(v.id))).map(v => ({ vehicle: v, inspection: latest.get(Number(v.id)) }));
  }, [vehicles, records]);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: '#dc2626' }}>Error: {error}</div>;

  return <InspectionList title="Inspected Vehicles" subtitle="Vehicles with an actual completed annual inspection record." rows={inspected} empty="No vehicles have an actual completed inspection recorded." />;
}

function InspectionList({ title, subtitle, rows, empty }) {
  return <div style={{ padding: 20, fontFamily: 'Arial' }}>
    <div style={{ background: 'white', borderRadius: 10, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
      <h1 style={{ margin: 0 }}>{title} ({rows.length})</h1>
      <div style={{ marginTop: 8, color: '#64748b', fontSize: 13 }}>{subtitle}</div>
      <div style={{ marginTop: 18, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead><tr style={{ background: '#1e293b', color: 'white' }}>
            {['Vehicle','Driver','Location','Inspection Completed','Status'].map(h => <th key={h} style={th}>{h}</th>)}
          </tr></thead>
          <tbody>{rows.length ? rows.map(({vehicle, inspection}) => <tr key={vehicle.id}>
            <td style={td}><strong>{vehicle.plate_number} {vehicle.plate_code || ''}</strong></td>
            <td style={td}>{vehicle.driver || '-'}</td>
            <td style={td}>{vehicle.location || '-'}</td>
            <td style={td}>{new Date(inspection.completed_date).toLocaleDateString('en-US')}</td>
            <td style={td}><span style={{ background:'#16a34a', color:'white', padding:'4px 10px', borderRadius:12, fontSize:11, fontWeight:'bold' }}>INSPECTED</span></td>
          </tr>) : <tr><td colSpan="5" style={{...td,textAlign:'center',color:'#999'}}>{empty}</td></tr>}</tbody>
        </table>
      </div>
    </div>
  </div>;
}

const th={padding:12,textAlign:'left',fontSize:13};
const td={padding:12,textAlign:'left',borderBottom:'1px solid #eee',fontSize:13};
export default InspectedVehicles;