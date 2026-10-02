import { useState } from 'react';
import DriverPortal from './DriverPortal';
import MaintenanceIssue from './MaintenanceIssue';
import SmartReportIssue from './SmartReportIssue';
import MyTickets from './MyTickets';

const FLEET_SECTIONS = [
  {
    id: 'tickets',
    label: 'My Tickets',
    icon: '📋',
    title: 'My Tickets',
    description: 'View all vehicle issues you have reported.'
  },
  {
    id: 'km',
    label: 'Add Daily KM',
    icon: '📏',
    title: 'Daily KM / Odometer Reading',
    description: "Enter today's vehicle odometer reading and review recent readings."
  },
  {
    id: 'maintenance',
    label: 'Maintenance Issue Report',
    icon: '🛠️',
    title: 'Maintenance Issue Report',
    description: 'Report a vehicle maintenance problem and create a maintenance ticket.'
  },
  {
    id: 'smart',
    label: 'Smart Report Issue',
    icon: '🧠',
    title: 'Smart Report Issue',
    description: 'Describe or speak the problem — the system will diagnose it and suggest solutions instantly.'
  }
];

export default function FleetHub({ user, canWork = true }) {
  const [section, setSection] = useState('km');

  const current = FLEET_SECTIONS.find(s => s.id === section) || FLEET_SECTIONS[0];

  const changeSection = (next) => {
    setSection(next);
  };

  return (
    <div style={{ padding: 20, fontFamily: 'Arial', background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        marginBottom: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 32 }}>🚗</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: '#1e3a8a' }}>Fleet</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
              Driver tools: Daily KM, vehicle problem reporting and Smart reporting.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 10,
        marginBottom: 16,
        flexWrap: 'wrap'
      }}>
        {FLEET_SECTIONS.map(item => (
          <button
            key={item.id}
            onClick={() => changeSection(item.id)}
            style={{
              flex: 1,
              minWidth: 180,
              padding: '14px 20px',
              background: section === item.id ? '#1e3a8a' : 'white',
              color: section === item.id ? 'white' : '#1e293b',
              border: section === item.id ? '2px solid #1e3a8a' : '2px solid #e2e8f0',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 14,
              textAlign: 'left',
              transition: 'all 0.2s',
              boxShadow: section === item.id ? '0 4px 12px rgba(30,58,138,0.3)' : '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
            <div>{item.label}</div>
          </button>
        ))}
      </div>

      {/* Section Info */}
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ margin: 0, fontSize: 20, color: '#1e3a8a' }}>{current.title}</h2>
        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>{current.description}</p>
      </div>

      {/* Content */}
      <div>
        {section === 'km' && <DriverPortal canWork={canWork} />}
        {section === 'maintenance' && <MaintenanceIssue canWork={canWork} />}
        {section === 'smart' && <SmartReportIssue canWork={canWork} />}
             {section === 'tickets' && <MyTickets user={user} />}
      </div>
    </div>
  );
}