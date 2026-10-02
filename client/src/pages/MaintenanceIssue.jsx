import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = '/api';
const VEHICLES_API = '/api/vehicles/list';

export default function MaintenanceIssue({ canWork = true }) {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState('');
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  const ISSUE_TYPES = [
    { value: 'engine', label: 'Engine' },
    { value: 'transmission', label: 'Transmission / Gear' },
    { value: 'brakes', label: 'Brakes' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'ac', label: 'A/C / Cooling' },
    { value: 'suspension', label: 'Suspension' },
    { value: 'tires', label: 'Tires / Wheels' },
    { value: 'steering', label: 'Steering' },
    { value: 'body', label: 'Body / Doors' },
    { value: 'fuel', label: 'Fuel System' },
    { value: 'exhaust', label: 'Exhaust' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => { loadVehicles(); }, []);

  const loadVehicles = async () => {
    try {
      const res = await axios.get(VEHICLES_API);
      setVehicles(res.data.vehicles || []);
    } catch (e) {
      setError('Failed to load vehicles');
    }
  };

  const startVoice = () => {
    setMessage('');
    setError('');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError('Voice not supported. Use Chrome or Edge.');
      return;
    }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setDescription(prev => (prev ? prev + ' ' : '') + text);
    };
    rec.onerror = (e) => {
      setError('Voice error: ' + e.error);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
  };

  const stopVoice = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setListening(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!vehicleId) { setError('Please select a vehicle'); return; }
    if (!issueType) { setError('Please select an issue type'); return; }
    if (!description.trim()) { setError('Please describe the issue'); return; }

    try {
      const res = await axios.post(`${API}/tickets`, {
        vehicleId: Number(vehicleId),
        category: issueType,
        description: description.trim(),
        priority,
        reportedBy: 'Driver'
      });
      const ticketId = res.data?.ticket?.id || 'N/A';
      setMessage('Issue reported. Ticket #' + ticketId + ' created.');
      setVehicleId('');
      setIssueType('');
      setDescription('');
      setPriority('Medium');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  return (
    <div style={{
      padding: 20,
      fontFamily: 'Arial',
      background: '#f5f7fa',
      minHeight: '100vh'
    }}>
      <div style={{
        background: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        maxWidth: 900,
        margin: '0 auto'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #be123c, #fb7185)',
          padding: '16px 24px',
          color: 'white'
        }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            Maintenance Issue Report
          </h2>
        </div>

        <div style={{ padding: 24 }}>
          <p style={{ color: '#64748b', marginTop: 0, marginBottom: 16, fontSize: 14 }}>
            Select your vehicle, choose the issue type, and describe the problem. Use the voice button to speak.
          </p>

          {message && (
            <div style={{
              background: '#dcfce7',
              color: '#166534',
              padding: 12,
              borderRadius: 6,
              marginBottom: 16
            }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: 12,
              borderRadius: 6,
              marginBottom: 16
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Vehicle *</label>
              <select
                value={vehicleId}
                onChange={e => setVehicleId(e.target.value)}
                required
                style={inputStyle}
              >
                <option value="">-- Select vehicle --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.plate_number} {v.plate_code} - {v.driver || v.driver_name || 'No driver'}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Issue Type *</label>
              <select
                value={issueType}
                onChange={e => setIssueType(e.target.value)}
                required
                style={inputStyle}
              >
                <option value="">-- Select issue type --</option>
                {ISSUE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                style={inputStyle}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Description *</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the issue, or click the mic button below to speak."
                rows={4}
                required
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={listening ? stopVoice : startVoice}
                style={{
                  background: listening ? '#dc2626' : '#1e3a8a',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: 15
                }}
              >
                {listening ? 'Stop Recording' : 'Speak Description'}
              </button>
              <button
                type="submit"
                style={{
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: 15
                }}
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 'bold',
  marginBottom: 6,
  color: '#475569'
};

const inputStyle = {
  width: '100%',
  padding: 12,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  fontSize: 14,
  background: 'white',
  color: 'black',
  boxSizing: 'border-box'
};
