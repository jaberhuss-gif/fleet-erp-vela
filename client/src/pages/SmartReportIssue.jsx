import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { classifyIssue, getLocalized } from '../data/knowledge';

const API = 'http://localhost:4000/api';
const LANGUAGES = [
  { code: 'en-US', label: 'English', flag: 'EN' },
  { code: 'ur-PK', label: 'اردو', flag: 'UR' },
  { code: 'ar-SA', label: 'العربية', flag: 'AR' }
];

export default function SmartReportIssue() {
  const [lang, setLang] = useState(localStorage.getItem('voiceLang') || 'en-US');
  const [vehicleId, setVehicleId] = useState('');
  const [description, setDescription] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [listening, setListening] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [ticketCreated, setTicketCreated] = useState(null);
  const [repairMode, setRepairMode] = useState(false);
  const [repairDetails, setRepairDetails] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [repairKm, setRepairKm] = useState('');
  const [repairDate, setRepairDate] = useState(new Date().toISOString().slice(0, 10));
  const [repairCost, setRepairCost] = useState('0');
  const recognitionRef = useRef(null);

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    localStorage.setItem('voiceLang', lang);
  }, [lang]);

  useEffect(() => {
    if (description.length < 3) {
      setDiagnosis(null);
      return;
    }
    const timer = setTimeout(() => {
      const result = classifyIssue(description);
      setDiagnosis(result);
      if (result && result.urgency === 'Critical') setPriority('Critical');
      else if (result && result.urgency === 'High') setPriority('High');
    }, 500);
    return () => clearTimeout(timer);
  }, [description]);

  const loadVehicles = async () => {
    try {
      const res = await axios.get(`${API}/fleet/vehicles`);
      setVehicles(res.data || []);
    } catch (e) { /* ignore */ }
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
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setDescription(transcript);
    };
    rec.onerror = (e) => {
      if (e.error !== 'aborted') setError('Voice error: ' + e.error);
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

  const handleFixed = () => {
    setRepairMode(true);
    setRepairDetails('');
    setPartsUsed('');
    setRepairKm('');
    setRepairCost('0');
    setError('');
    setMessage('Enter what you repaired, parts used and the KM, then submit for verification.');
  };

  const submitRepair = async () => {
    setError('');
    if (!vehicleId) { setError('Please select a vehicle'); return; }
    if (!description.trim()) { setError('The original problem is required'); return; }
    if (!repairDetails.trim()) { setError('Please describe what was repaired'); return; }

    try {
      const order = await axios.post(`${API}/vehicle-repairs`, {
        vehicleId: Number(vehicleId),
        issueDescription: description.trim()
      });
      await axios.put(`${API}/vehicle-repairs/${order.data.repair.id}/complete`, {
        repairDetails: repairDetails.trim(),
        partsUsed: partsUsed.trim(),
        repairKm: repairKm === '' ? null : Number(repairKm),
        repairDate,
        repairCost: repairCost === '' ? 0 : Number(repairCost)
      });
      setMessage('Repair submitted. Status: Pending Verification.');
      setRepairMode(false);
      setDescription('');
      setDiagnosis(null);
      setVehicleId('');
      setRepairDetails('');
      setPartsUsed('');
      setRepairKm('');
      setRepairCost('0');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!vehicleId) { setError('Please select a vehicle'); return; }
    if (!description.trim()) { setError('Please describe the issue'); return; }

    try {
      const category = diagnosis ? diagnosis.subCategory : 'Other';
      const fullDescription = diagnosis
        ? description + "\n\n--- Auto-Detected Issue ---\nType: " + diagnosis.title + "\nUrgency: " + diagnosis.urgency + "\nLikely Causes: " + diagnosis.causes.slice(0, 3).join('; ')
        : description;
      const res = await axios.post(`${API}/tickets`, {
        vehicleId: Number(vehicleId),
        category,
        description: fullDescription,
        reportedBy: 'Driver',
        priority: priority
      });

      setTicketCreated({
        id: res.data.ticket?.id || res.data.id,
        category,
        issue: diagnosis?.title,
        urgency: diagnosis?.urgency
      });
      setMessage('Ticket created successfully!');
      setDescription('');
      setDiagnosis(null);
      setVehicleId('');
      setPriority('Medium');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  };

  const localized = diagnosis ? getLocalized(diagnosis, lang.split('-')[0]) : null;

  const getUrgencyStyle = (u) => {
    if (u === 'Critical') return { bg: '#fee2e2', color: '#dc2626', border: '#dc2626' };
    if (u === 'High') return { bg: '#fef3c7', color: '#b45309', border: '#f59e0b' };
    if (u === 'Medium') return { bg: '#fef9c3', color: '#854d0e', border: '#eab308' };
    return { bg: '#dcfce7', color: '#16a34a', border: '#16a34a' };
  };

  return (
    <div style={{ padding: 20, fontFamily: 'Arial', background: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
        color: 'white', padding: 24, borderRadius: 12, marginBottom: 20
      }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Smart Report Issue</h1>
        <p style={{ marginTop: 8, opacity: 0.9, fontSize: 14 }}>
          Describe or speak the problem — the system will diagnose it and suggest solutions instantly.
        </p>
      </div>

      {message && <div style={successStyle}>{message}</div>}
      {error && <div style={errorStyle}>{error}</div>}

      <div style={cardStyle}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>
            Voice Language:
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 25,
                  border: lang === l.code ? '2px solid #1e3a8a' : '1px solid #cbd5e1',
                  background: lang === l.code ? '#eff6ff' : 'white',
                  color: lang === l.code ? '#1e3a8a' : '#64748b',
                  cursor: 'pointer',
                  fontWeight: lang === l.code ? 'bold' : 'normal',
                  fontSize: 14
                }}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 15 }}>
            <label style={labelStyle}>Vehicle *</label>
            <select
              value={vehicleId}
              onChange={e => setVehicleId(e.target.value)}
              style={inputStyle}
              required
            >
              <option value="">-- Select vehicle --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.plate_number} {v.plate_code} - {v.driver_name || v.driver || 'No driver'}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 15 }}>
            <label style={labelStyle}>Describe the Issue *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Example: There is a brake noise when I press the pedal..."
              rows={4}
              required
              style={{ ...inputStyle, fontSize: 15 }}
            />
          </div>

          <div style={{ marginBottom: 20, textAlign: 'center' }}>
            <button
              type="button"
              onClick={listening ? stopVoice : startVoice}
              style={{
                padding: '16px 40px',
                fontSize: 18,
                fontWeight: 'bold',
                border: 'none',
                borderRadius: 50,
                cursor: 'pointer',
                color: 'white',
                background: listening ? '#dc2626' : '#1e3a8a',
                boxShadow: listening ? '0 0 0 0 rgba(220,38,38,0.7)' : '0 4px 12px rgba(30,58,138,0.3)',
                transition: 'all 0.3s'
              }}
            >
              {listening ? 'Stop Recording' : 'Speak Now'}
            </button>
            {listening && (
              <div style={{ marginTop: 8, color: '#dc2626', fontSize: 13 }}>
                Listening...
              </div>
            )}
          </div>

          {diagnosis && localized && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                background: getUrgencyStyle(diagnosis.urgency).bg,
                border: '2px solid ' + getUrgencyStyle(diagnosis.urgency).border,
                borderRadius: 12,
                padding: 20
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      Auto-Detected Issue
                    </div>
                    <h2 style={{ margin: '6px 0 0 0', color: getUrgencyStyle(diagnosis.urgency).color }}>
                      {localized.title}
                    </h2>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                      {diagnosis.category} - {diagnosis.subCategory} - Confidence: {diagnosis.confidence}%
                    </div>
                  </div>
                  <span style={{
                    background: getUrgencyStyle(diagnosis.urgency).color,
                    color: 'white',
                    fontSize: 13,
                    padding: '6px 14px',
                    borderRadius: 12,
                    fontWeight: 'bold'
                  }}>
                    {diagnosis.urgency}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  <div style={{ background: 'white', borderRadius: 8, padding: 16, borderLeft: '4px solid #dc2626' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#dc2626', fontSize: 14 }}>
                      Possible Causes ({localized.causes.length})
                    </h4>
                    <ol style={{ paddingLeft: 20, margin: 0, lineHeight: 1.7, fontSize: 13 }}>
                      {localized.causes.slice(0, 6).map((c, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>{c}</li>
                      ))}
                    </ol>
                  </div>

                  <div style={{ background: 'white', borderRadius: 8, padding: 16, borderLeft: '4px solid #16a34a' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#16a34a', fontSize: 14 }}>
                      Recommended Solutions ({localized.solutions.length})
                    </h4>
                    <ol style={{ paddingLeft: 20, margin: 0, lineHeight: 1.7, fontSize: 13 }}>
                      {localized.solutions.slice(0, 6).map((s, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>{s}</li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleFixed}
                    style={{ ...btnSuccess, flex: 1, padding: 12, fontSize: 15, minWidth: 200 }}
                  >
                    I Fixed It - Submit Repair
                  </button>
                </div>
              </div>
            </div>
          )}

          {repairMode && (
            <div style={{ background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ marginTop: 0, color: '#16a34a' }}>Repair Details</h3>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>What was repaired? *</label>
                <textarea
                  value={repairDetails}
                  onChange={e => setRepairDetails(e.target.value)}
                  rows={3}
                  style={inputStyle}
                  placeholder="Describe the repair..."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Parts Used</label>
                  <input
                    value={partsUsed}
                    onChange={e => setPartsUsed(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. Brake pads"
                  />
                </div>
                <div>
                  <label style={labelStyle}>KM at repair</label>
                  <input
                    type="number"
                    value={repairKm}
                    onChange={e => setRepairKm(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. 150000"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input
                    type="date"
                    value={repairDate}
                    onChange={e => setRepairDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Cost</label>
                  <input
                    type="number"
                    value={repairCost}
                    onChange={e => setRepairCost(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={submitRepair}
                style={{ ...btnSuccess, marginTop: 15, padding: '12px 30px' }}
              >
                Submit Repair
              </button>
            </div>
          )}

          {!diagnosis && (
            <div style={{ marginBottom: 15 }}>
              <label style={labelStyle}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          )}

          {ticketCreated && (
            <div style={successStyle}>
              <strong>Ticket #{ticketCreated.id} Created</strong>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                Category: {ticketCreated.category}
                {ticketCreated.issue && <><br />Issue: {ticketCreated.issue}</>}
                {ticketCreated.urgency && <><br />Urgency: {ticketCreated.urgency}</>}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
            <button type="submit" style={{ ...btnPrimary, padding: '12px 30px', fontSize: 15 }}>
              Submit Report {diagnosis ? '(with Diagnosis)' : ''}
            </button>
            <button
              type="button"
              onClick={() => {
                setDescription('');
                setDiagnosis(null);
                setVehicleId('');
                setTicketCreated(null);
              }}
              style={btnWarning}
            >
              Clear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const cardStyle = {
  background: 'white', padding: 20, borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 'bold',
  marginBottom: 6, color: '#475569',
};

const inputStyle = {
  padding: 12, border: '1px solid #ddd', borderRadius: 5,
  fontSize: 14, width: '100%', boxSizing: 'border-box',
  background: 'white', color: 'black',
};

const btnPrimary = {
  background: '#1e3a8a', color: 'white', border: 'none',
  padding: '10px 20px', borderRadius: 5, cursor: 'pointer',
  fontWeight: 'bold', fontSize: 14,
};

const btnSuccess = {
  background: '#16a34a', color: 'white', border: 'none',
  padding: '10px 20px', borderRadius: 5, cursor: 'pointer',
  fontWeight: 'bold', fontSize: 14,
};

const btnWarning = {
  background: '#f59e0b', color: 'white', border: 'none',
  padding: '12px 20px', borderRadius: 5, cursor: 'pointer',
  fontWeight: 'bold', fontSize: 14,
};

const errorStyle = {
  background: '#fee2e2', color: '#991b1b',
  padding: 12, borderRadius: 5, marginBottom: 15, fontSize: 14,
};

const successStyle = {
  background: '#dcfce7', color: '#166534',
  padding: 12, borderRadius: 5, marginBottom: 15, fontSize: 14,
};