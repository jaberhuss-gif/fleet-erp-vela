import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const PM_API = '/api/fleet/periodic-maintenance';
const VEHICLES_API = '/api/fleet/vehicles';

const isRealInspection = (r) =>
  String(r?.type || '').toLowerCase().trim() === 'inspection' &&
  String(r?.status || '').toLowerCase().trim() === 'completed' &&
  Boolean(r?.completed_date);

function NotInspectedVehicles() {
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

  const notInspected = useMemo(() => {
    const inspectedIds = new Set(records.filter(isRealInspection).map(r => Number(r.vehicle_id)).filter(Boolean));
    return vehicles.filter(v => !inspectedIds.has(Number(v.id))).map(vehicle => ({ vehicle, inspection: null }));
  }, [vehicles, records]);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: '#dc2626' }}>Error: {error}</div>;

  return <InspectionList title="Not Inspected Vehicles" subtitle="Vehicles with no actual completed annual inspection recorded." rows={notInspected} empty="All vehicles have an actual completed inspection recorded." />;
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
            <td style={td}>-</td>
            <td style={td}><span style={{ background:'#dc2626', color:'white', padding:'4px 10px', borderRadius:12, fontSize:11, fontWeight:'bold' }}>NOT INSPECTED</span></td>
          </tr>) : <tr><td colSpan="5" style={{...td,textAlign:'center',color:'#999'}}>{empty}</td></tr>}</tbody>
        </table>
      </div>
    </div>
  </div>;
}

const th={padding:12,textAlign:'left',fontSize:13};
const td={padding:12,textAlign:'left',borderBottom:'1px solid #eee',fontSize:13};
export default NotInspectedVehicles;