import { useState, useEffect } from 'react';
import axios from 'axios';

const VEHICLES_API = '/api/vehicles/list';
const DETAILS_API = '/api/vehicles';
const READING_API = '/api/vehicles';
const OIL_API = '/api/vehicles';

export default function DriverPortal({ canWork = true }) {
  const [vehicles, setVehicles] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [details, setDetails] = useState(null);
  const [reading, setReading] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadVehicles();
    const refresh = () => {
      loadVehicles();
      if (selectedId) loadDetails(selectedId);
    };
    window.addEventListener('fleet-vehicles-updated', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('fleet-vehicles-updated', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [selectedId]);

  useEffect(() => {
    if (selectedId) loadDetails(selectedId);
    else setDetails(null);
  }, [selectedId]);

  const loadVehicles = async () => {
    try {
      const res = await axios.get(VEHICLES_API);
      setVehicles(res.data.vehicles || []);
    } catch (e) {
      setError('Failed to load vehicles: ' + (e.response?.data?.error || e.message));
    }
  };

  const loadDetails = async (id) => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${DETAILS_API}/${id}/details`);
      setDetails(res.data);
    } catch (e) {
      console.error('Details error:', e);
      setError('Failed to load vehicle details: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReading = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await axios.post(`${READING_API}/${selectedId}/reading`, {
        readingKm: Number(reading)
      });
      setMessage(
        'Reading saved: ' +
          res.data.vehicle.current_km.toLocaleString() +
          ' km. You can now click "Oil Changed" if you changed the oil today.'
      );
      setReading('');
      loadDetails(selectedId);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const handleOilChange = async () => {
    setMessage('');
    setError('');

    // لو المستخدم أدخل قراءة، نمنعه من Oil Changed قبل الحفظ
    if (reading) {
      setError('Please save the KM reading first (click "Save Reading"), then click "Oil Changed".');
      return;
    }

    if (!v) {
      setError('Please select a vehicle first.');
      return;
    }

    if (!window.confirm(
      `Confirm oil change for ${v.plate}?\n\n` +
      `The oil change will be recorded at the current odometer: ${v.currentKm.toLocaleString()} km.`
    )) return;

    try {
      const res = await axios.post(`${OIL_API}/${selectedId}/oil-change`, {
        changedBy: 'Driver'
      });
      setMessage(
        'Oil change recorded at ' +
          res.data.vehicle.last_oil_km.toLocaleString() +
          ' km.'
      );
      loadDetails(selectedId);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const v = details?.vehicle;
  const statusColor = v
    ? v.status === 'Urgent Overdue'
      ? '#dc2626'
      : v.status === 'Warning'
      ? '#f59e0b'
      : '#16a34a'
    : '#64748b';

  const hasUnsavedReading = !!reading;

  return (
    <div style={{ padding: 20, fontFamily: 'Arial', background: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
          padding: '16px 24px',
          color: 'white'
        }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Driver Portal</h2>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6, color: '#475569' }}>
              Select Vehicle
            </label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 15,
                background: 'white',
                color: 'black'
              }}
            >
              <option value="">-- Choose your vehicle --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.plate_number} {v.plate_code} - {v.driver || v.driver_name || 'No driver'}
                </option>
              ))}
            </select>
          </div>

          {message && (
            <div style={{ background: '#dcfce7', color: '#166534', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
              {message}
            </div>
          )}
          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}

          {v && (
            <>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <div style={infoRowStyle}><span style={infoLabelStyle}>Plate</span><span style={infoValueStyle}>{v.plate}</span></div>
                <div style={infoRowStyle}><span style={infoLabelStyle}>Driver</span><span style={infoValueStyle}>{v.driver}</span></div>
                <div style={infoRowStyle}><span style={infoLabelStyle}>Location</span><span style={infoValueStyle}>{v.location || '-'}</span></div>
                <div style={infoRowStyle}><span style={infoLabelStyle}>Current Odometer</span><span style={infoValueStyle}>{v.currentKm?.toLocaleString() || 0} km</span></div>
                <div style={infoRowStyle}><span style={infoLabelStyle}>Last Oil Change</span><span style={infoValueStyle}>{v.lastOilKm?.toLocaleString() || 0} km</span></div>
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>KM Since Oil Change</span>
                  <span style={{ ...infoValueStyle, color: v.sinceOil >= 5000 ? '#dc2626' : v.sinceOil >= 4500 ? '#f59e0b' : '#16a34a' }}>
                    {v.sinceOil?.toLocaleString() || 0} km
                  </span>
                </div>
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>Remaining to Next Oil</span>
                  <span style={{ ...infoValueStyle, color: v.remaining <= 0 ? '#dc2626' : '#1e293b' }}>
                    {v.remaining?.toLocaleString() || 0} km
                  </span>
                </div>
                <div style={infoRowStyle}>
                  <span style={infoLabelStyle}>Status</span>
                  <span style={{ background: statusColor, color: 'white', padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 'bold' }}>
                    {v.status}
                  </span>
                </div>
              </div>

              {v.status === 'Urgent Overdue' && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 6, marginBottom: 16 }}>
                  This vehicle needs an oil change immediately!
                </div>
              )}
              {v.status === 'Warning' && (
                <div style={{ background: '#fef3c7', color: '#92400e', padding: 12, borderRadius: 6, marginBottom: 16 }}>
                  Oil change approaching. {v.remaining?.toLocaleString()} km remaining.
                </div>
              )}

              {canWork && (
                <form onSubmit={handleSubmitReading}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 6, color: '#475569' }}>
                      Today's Odometer Reading (km)
                    </label>
                    <input
                      type="number"
                      value={reading}
                      onChange={e => setReading(e.target.value)}
                      placeholder={'Must be >= ' + v.currentKm}
                      min={v.currentKm}
                      required
                      style={{
                        width: '100%',
                        padding: 14,
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: 16,
                        background: 'white',
                        color: 'black',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                      Step 1: Enter the new odometer reading → Save Reading.
                      Step 2: If you changed the oil today, click "Oil Changed".
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        background: '#16a34a',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: 6,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: 15,
                        opacity: loading ? 0.6 : 1
                      }}
                    >
                      {loading ? 'Saving...' : 'Save Reading'}
                    </button>

                    <button
                      type="button"
                      onClick={handleOilChange}
                      disabled={hasUnsavedReading}
                      title={
                        hasUnsavedReading
                          ? 'Please save the KM reading first'
                          : 'Record an oil change at the current odometer'
                      }
                      style={{
                        background: hasUnsavedReading ? '#94a3b8' : '#f59e0b',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: 6,
                        cursor: hasUnsavedReading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        fontSize: 15,
                        opacity: hasUnsavedReading ? 0.7 : 1
                      }}
                    >
                      {hasUnsavedReading ? 'Save Reading First' : 'Oil Changed'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {!v && selectedId === '' && (
            <div style={{ background: '#dbeafe', color: '#1e40af', padding: 12, borderRadius: 6, fontSize: 14 }}>
              Please select your vehicle from the list above.
            </div>
          )}

          {details && details.readings && details.readings.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ marginBottom: 12 }}>Recent Readings</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 8, overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', color: 'white' }}>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Reading (km)</th>
                      <th style={thStyle}>Oil</th>
                      <th style={thStyle}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.readings.map(r => (
                      <tr key={r.id}>
                        <td style={tdStyle}>{new Date(r.reading_date).toLocaleDateString('en-US')}</td>
                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>{Number(r.reading_km).toLocaleString()}</td>
                        <td style={tdStyle}>{r.is_oil_change ? 'OK' : '-'}</td>
                        <td style={tdStyle}>{r.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const infoRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid #e2e8f0'
};

const infoLabelStyle = { fontSize: 13, color: '#64748b', fontWeight: 'bold' };
const infoValueStyle = { fontSize: 14, color: '#0f172a' };
const thStyle = { padding: 12, textAlign: 'left', fontSize: 13 };
const tdStyle = { padding: 12, textAlign: 'left', borderBottom: '1px solid #f1f5f9', fontSize: 13 };
