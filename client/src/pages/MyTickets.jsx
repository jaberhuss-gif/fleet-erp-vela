import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:4000/api';

export default function MyTickets({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [closingId, setClosingId] = useState(null);
  const [closeForm, setCloseForm] = useState({
    resolution_notes: '',
    cost: '0',
    technician: ''
  });

  const isOwner = user?.role === 'Owner' || user?.role === 'Admin';

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API}/my-tickets`);
      setTickets(res.data.tickets || []);
    } catch (e) {
      setError('Failed to load tickets: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  const openCloseForm = (ticketId) => {
    setClosingId(ticketId);
    setCloseForm({ resolution_notes: '', cost: '0', technician: '' });
  };

  const cancelClose = () => {
    setClosingId(null);
    setCloseForm({ resolution_notes: '', cost: '0', technician: '' });
  };

  const submitClose = async () => {
    if (!closingId) return;
    try {
      await axios.patch(`${API}/tickets/${closingId}/close`, {
        resolution_notes: closeForm.resolution_notes,
        cost: parseFloat(closeForm.cost) || 0,
        technician: closeForm.technician,
        closedBy: user?.fullName || user?.username || 'Owner'
      });
      cancelClose();
      loadTickets();
    } catch (e) {
      setError('Failed to close ticket: ' + (e.response?.data?.error || e.message));
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Closed' || status === 'Resolved') return '#16a34a';
    if (status === 'In Progress') return '#f59e0b';
    return '#dc2626';
  };

  const getPriorityColor = (priority) => {
    if (priority === 'Critical') return '#dc2626';
    if (priority === 'High') return '#ea580c';
    if (priority === 'Medium') return '#f59e0b';
    return '#16a34a';
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading tickets...</div>;
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Arial', background: '#f5f7fa', minHeight: '100vh' }}>
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
          padding: '16px 24px',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
              {isOwner ? 'All Tickets' : 'My Tickets'} ({tickets.length})
            </h2>
            <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: 13 }}>
              {isOwner ? 'Manage all vehicle issues' : 'Your reported vehicle issues'}
            </p>
          </div>
          <button
            onClick={loadTickets}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.4)',
              padding: '8px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 'bold'
            }}
          >
            Refresh
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 6, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {tickets.length === 0 ? (
            <div style={{ background: '#dbeafe', color: '#1e40af', padding: 20, borderRadius: 8, textAlign: 'center', fontSize: 14 }}>
              No tickets yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tickets.map(t => (
                <div key={t.id} style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 16
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                    marginBottom: 10,
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>
                        Ticket #{t.id} · {new Date(t.opened_at).toLocaleString('en-US')}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>
                        {t.title || t.category || 'Issue'}
                      </div>
                      {t.vehicle_id && (
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                          Vehicle ID: {t.vehicle_id}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{
                        background: getPriorityColor(t.priority),
                        color: 'white',
                        padding: '3px 10px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 'bold'
                      }}>
                        {t.priority || 'Medium'}
                      </span>
                      <span style={{
                        background: getStatusColor(t.status),
                        color: 'white',
                        padding: '3px 10px',
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 'bold'
                      }}>
                        {t.status || 'Open'}
                      </span>
                      {isOwner && t.status !== 'Closed' && closingId !== t.id && (
                        <button
                          onClick={() => openCloseForm(t.id)}
                          style={{
                            background: '#16a34a',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 'bold'
                          }}
                        >
                          Close Ticket
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{
                    background: 'white',
                    padding: 12,
                    borderRadius: 6,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: '#334155',
                    whiteSpace: 'pre-wrap',
                    maxHeight: 200,
                    overflow: 'auto'
                  }}>
                    {t.description || '(no description)'}
                  </div>

                  {t.resolution_notes && (
                    <div style={{
                      background: '#dcfce7',
                      color: '#166534',
                      padding: 12,
                      borderRadius: 6,
                      fontSize: 13,
                      marginTop: 10
                    }}>
                      <strong>Resolution:</strong> {t.resolution_notes}
                      {t.cost > 0 && <div style={{ marginTop: 6 }}><strong>Cost:</strong> {Number(t.cost).toLocaleString()} SAR</div>}
                    </div>
                  )}

                  {closingId === t.id && (
                    <div style={{
                      background: '#f0fdf4',
                      border: '2px solid #16a34a',
                      borderRadius: 8,
                      padding: 16,
                      marginTop: 12
                    }}>
                      <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#166534' }}>
                        Close Ticket #{t.id}
                      </h3>

                      <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>Resolution Notes (optional)</label>
                        <textarea
                          value={closeForm.resolution_notes}
                          onChange={e => setCloseForm({ ...closeForm, resolution_notes: e.target.value })}
                          placeholder="What was done to fix the issue?"
                          rows={3}
                          style={{ ...inputStyle, resize: 'vertical' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={labelStyle}>Cost (SAR)</label>
                          <input
                            type="number"
                            value={closeForm.cost}
                            onChange={e => setCloseForm({ ...closeForm, cost: e.target.value })}
                            placeholder="0"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Technician (optional)</label>
                          <input
                            value={closeForm.technician}
                            onChange={e => setCloseForm({ ...closeForm, technician: e.target.value })}
                            placeholder="e.g. Al Odhaib"
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          onClick={submitClose}
                          style={{
                            background: '#16a34a',
                            color: 'white',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: 14
                          }}
                        >
                          Confirm Close
                        </button>
                        <button
                          onClick={cancelClose}
                          style={{
                            background: '#94a3b8',
                            color: 'white',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: 14
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {t.closed_at && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#16a34a', fontWeight: 'bold' }}>
                      ✅ Closed at {new Date(t.closed_at).toLocaleString('en-US')}
                      {t.closed_by && ` by ${t.closed_by}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 'bold',
  marginBottom: 4,
  color: '#475569'
};

const inputStyle = {
  width: '100%',
  padding: 10,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  fontSize: 14,
  background: 'white',
  color: 'black',
  boxSizing: 'border-box'
};