import { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import Sites from './Sites';
import WorkOrders from './WorkOrders';
import DevProjects from './DevProjects';
import Purchases from './Purchases';
import Reports from './Reports';
import Vehicles from './Vehicles';
import KMRecords from './KMRecords';
import Drivers from './Drivers';
import OilChanges from './OilChanges';
import OilStatus from './OilStatus';
import DailyCompliance from './DailyCompliance';
import PeriodicMaintenance from './PeriodicMaintenance';
import Inventory from './Inventory';
import StockTransactions from './StockTransactions';
import WarehouseLocations from './WarehouseLocations';
import DriverPortal from './pages/DriverPortal';
import SmartReportIssue from './pages/SmartReportIssue';
import MyTickets from './pages/MyTickets';
import FleetReports from './pages/FleetReports';
import Login from './Login';
import FleetHub from './pages/FleetHub';
import TireManagement from './pages/TireManagement';


function App() {
  const [page, setPage] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setReady(true);
  }, []);

  const handleLogin = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    setPage('dashboard');
  };

  const handleMenuClick = (id) => {
    setPage(id);
    if (isMobile) setMobileMenuOpen(false);
  };

  if (!ready) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const isDriver = user.role === 'Driver';

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', background: '#f5f7fa' }}>
      {isMobile && (
  <div className="no-print" style={mobileTopBarStyle}>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={mobileMenuBtnStyle}>
            ☰
          </button>
          <div style={{ fontWeight: 'bold', fontSize: 16, color: 'white' }}>
            🏢 Fleet ERP
          </div>
          <div style={{ width: 40 }}></div>
        </div>
      )}

      {isMobile && mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} style={overlayStyle} />
      )}

      <aside className="no-print" style={{
        ...sidebarStyle,
        width: isMobile ? 260 : (sidebarOpen ? 260 : 70),
        transform: isMobile && !mobileMenuOpen ? 'translateX(-100%)' : 'translateX(0)',
        position: isMobile ? 'fixed' : 'sticky',
        zIndex: isMobile ? 1000 : 1,
      }}>
        <div style={logoStyle}>
          <div style={{ fontSize: 28 }}>🏢</div>
          {(isMobile || sidebarOpen) && (
            <div style={{ marginLeft: 10 }}>
              <div style={{ fontWeight: 'bold', fontSize: 16, color: 'white' }}>
                Fleet ERP
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Maintenance
              </div>
            </div>
          )}
        </div>

{user && (
  <div className="no-print" style={{
    padding: '12px 16px',
    background: '#0f172a',
    borderBottom: '1px solid #334155'
  }}>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>Signed in as</div>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>
              {user.fullName || user.username}
            </div>
            <div style={{ color: '#00d4ff', fontSize: 11 }}>{user.role}</div>
            <button
              onClick={handleLogout}
              style={{
                marginTop: 8,
                width: '100%',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '6px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 'bold'
              }}
            >
              Logout
            </button>
          </div>
        )}

        <nav style={{ flex: 1, paddingTop: 10, overflowY: 'auto' }}>
          {isDriver ? (
            <MenuItem
              label="Fleet"
              icon="🚗"
              active={true}
              onClick={() => {}}
              show={isMobile || sidebarOpen}
            />
          ) : (
            <>
              <MenuItem label="Dashboard" icon="📊" active={page === 'dashboard'} onClick={() => handleMenuClick('dashboard')} show={isMobile || sidebarOpen} />

              {(isMobile || sidebarOpen) && <div style={sectionTitleStyle}>DAILY OPERATIONS</div>}

              <MenuItem label="Daily Compliance" icon="📋" active={page === 'dailycompliance'} onClick={() => handleMenuClick('dailycompliance')} show={isMobile || sidebarOpen} />
              <MenuItem label="Driver Portal" icon="🚗" active={page === 'driverportal'} onClick={() => handleMenuClick('driverportal')} show={isMobile || sidebarOpen} />
              <MenuItem label="Smart Report" icon="🧠" active={page === 'smartissue'} onClick={() => handleMenuClick('smartissue')} show={isMobile || sidebarOpen} />
<MenuItem label="My Tickets" icon="📋" active={page === 'mytickets'} onClick={() => handleMenuClick('mytickets')} show={isMobile || sidebarOpen} />
<MenuItem label="Fleet Reports" icon="📊" active={page === 'fleetreports'} onClick={() => handleMenuClick('fleetreports')} show={isMobile || sidebarOpen} />
              <MenuItem label="Oil Status" icon="🛢️" active={page === 'oilstatus'} onClick={() => handleMenuClick('oilstatus')} show={isMobile || sidebarOpen} />
              <MenuItem label="Oil Changes" icon="🔧" active={page === 'oilchanges'} onClick={() => handleMenuClick('oilchanges')} show={isMobile || sidebarOpen} />
              <MenuItem label="Drivers" icon="👤" active={page === 'drivers'} onClick={() => handleMenuClick('drivers')} show={isMobile || sidebarOpen} />
              <MenuItem label="Sites" icon="📍" active={page === 'sites'} onClick={() => handleMenuClick('sites')} show={isMobile || sidebarOpen} />

              {(isMobile || sidebarOpen) && <div style={sectionTitleStyle}>BUILDING & PROJECTS</div>}

              <MenuItem label="Work Orders" icon="🛠" active={page === 'workorders'} onClick={() => handleMenuClick('workorders')} show={isMobile || sidebarOpen} />
              <MenuItem label="Development" icon="🏗️" active={page === 'devprojects'} onClick={() => handleMenuClick('devprojects')} show={isMobile || sidebarOpen} />
              <MenuItem label="Purchases" icon="🛒" active={page === 'purchases'} onClick={() => handleMenuClick('purchases')} show={isMobile || sidebarOpen} />

              {(isMobile || sidebarOpen) && <div style={sectionTitleStyle}>FLEET MANAGEMENT</div>}

              <MenuItem label="Vehicles" icon="🚙" active={page === 'vehicles'} onClick={() => handleMenuClick('vehicles')} show={isMobile || sidebarOpen} />
              <MenuItem label="Tire Control" icon="🛞" active={page === 'tiremanagement'} onClick={() => handleMenuClick('tiremanagement')} show={isMobile || sidebarOpen} />
              <MenuItem label="KM Records" icon="📊" active={page === 'kmrecords'} onClick={() => handleMenuClick('kmrecords')} show={isMobile || sidebarOpen} />
              <MenuItem label="Periodic Maintenance" icon="🔧" active={page === 'periodicmaintenance'} onClick={() => handleMenuClick('periodicmaintenance')} show={isMobile || sidebarOpen} />
              <MenuItem label="Inventory" icon="📦" active={page === 'inventory'} onClick={() => handleMenuClick('inventory')} show={isMobile || sidebarOpen} />
              <MenuItem label="Stock Transactions" icon="📊" active={page === 'stocktransactions'} onClick={() => handleMenuClick('stocktransactions')} show={isMobile || sidebarOpen} />
              <MenuItem label="Warehouse Locations" icon="🏢" active={page === 'warehouselocations'} onClick={() => handleMenuClick('warehouselocations')} show={isMobile || sidebarOpen} />

              {(isMobile || sidebarOpen) && <div style={sectionTitleStyle}>REPORTS</div>}

              <MenuItem label="Reports" icon="📈" active={page === 'reports'} onClick={() => handleMenuClick('reports')} show={isMobile || sidebarOpen} />
            </>
          )}
        </nav>

        {!isMobile && (
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={toggleBtnStyle}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        )}
      </aside>

      <main style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        width: '100%',
        maxWidth: '100%',
        marginTop: isMobile ? 60 : 0,
      }}>
        {isDriver ? (
          <FleetHub user={user} canWork={true} />
        ) : (
          <>
            {page === 'dashboard' && <Dashboard />}
            {page === 'sites' && <Sites />}
            {page === 'workorders' && <WorkOrders />}
            {page === 'devprojects' && <DevProjects />}
            {page === 'purchases' && <Purchases />}
            {page === 'vehicles' && <Vehicles />}
            {page === 'tiremanagement' && <TireManagement user={user} />}
            {page === 'kmrecords' && <KMRecords />}
            {page === 'drivers' && <Drivers />}
            {page === 'oilchanges' && <OilChanges />}
            {page === 'oilstatus' && <OilStatus />}
            {page === 'dailycompliance' && <DailyCompliance />}
            {page === 'periodicmaintenance' && <PeriodicMaintenance />}
            {page === 'inventory' && <Inventory />}
            {page === 'stocktransactions' && <StockTransactions />}
            {page === 'warehouselocations' && <WarehouseLocations />}
            {page === 'driverportal' && <DriverPortal />}
            {page === 'smartissue' && <SmartReportIssue />}
            {page === 'mytickets' && <MyTickets user={user} />}
                    {page === 'fleetreports' && <FleetReports />}
            {page === 'reports' && <Reports />}
          </>
        )}
      </main>
    </div>
  );
}

const MenuItem = ({ label, icon, active, onClick, show }) => (
  <button onClick={onClick} style={menuBtnStyle(active)} title={label}>
    <span style={{ fontSize: 20, minWidth: 24, textAlign: 'center' }}>
      {icon}
    </span>
    {show && (
      <span style={{ marginLeft: 15, fontSize: 14 }}>
        {label}
      </span>
    )}
  </button>
);

const sidebarStyle = {
  background: '#1e293b',
  color: 'white',
  display: 'flex',
  flexDirection: 'column',
  transition: 'width 0.3s, transform 0.3s',
  boxShadow: '2px 0 10px rgba(0,0,0,0.2)',
  top: 0,
  height: '100vh',
  flexShrink: 0,
};

const logoStyle = {
  padding: 20,
  display: 'flex',
  alignItems: 'center',
  borderBottom: '1px solid #334155',
};

const sectionTitleStyle = {
  padding: '18px 20px 8px',
  fontSize: 11,
  fontWeight: 'bold',
  color: '#00d4ff',
  textTransform: 'uppercase',
  letterSpacing: 1.5,
  marginTop: 5,
};

const menuBtnStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: '12px 20px',
  background: active ? '#007bff' : 'transparent',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  textAlign: 'left',
  transition: 'background 0.2s',
  borderLeft: active ? '4px solid #00d4ff' : '4px solid transparent',
});

const toggleBtnStyle = {
  background: '#334155',
  color: 'white',
  border: 'none',
  padding: 12,
  cursor: 'pointer',
  fontSize: 12,
  borderTop: '1px solid #475569',
};

const mobileTopBarStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: 60,
  background: '#1e293b',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 15px',
  zIndex: 999,
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
};

const mobileMenuBtnStyle = {
  background: 'transparent',
  color: 'white',
  border: 'none',
  fontSize: 28,
  cursor: 'pointer',
  padding: 0,
  width: 40,
};

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  zIndex: 999,
};

export default App;
