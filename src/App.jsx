import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { 
  ShoppingCart, BookOpen, IndianRupee, Home as HomeIcon, Zap, ChevronRight, Package, AlertTriangle
} from 'lucide-react';

import Khata from './pages/Khata'; 
import Inventory from './pages/Inventory';

const Home = () => {
  const [emptyCount, setEmptyCount] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ totalUdhaar: 0, topDebtors: [] });
  const [showDebtors, setShowDebtors] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { 
    fetchDashboardData(); 
    window.addEventListener('focus', fetchDashboardData);
    return () => window.removeEventListener('focus', fetchDashboardData);
  }, []);

  async function fetchDashboardData() {
    try {
      // 1. Logic for Items Empty & Alert Stock
      const { data: stockData } = await supabase.from('inventory').select('*');
      if (stockData) {
        const now = new Date();
        // Item is empty if last_bought_at is null OR older than 24 hours
        const emptyItems = stockData.filter(item => {
          if (!item.last_bought_at) return true;
          const lastBought = new Date(item.last_bought_at);
          const hoursPassed = (now - lastBought) / (1000 * 60 * 60);
          return hoursPassed > 24;
        });

        setEmptyCount(emptyItems.length);
        // Take first 2 empty items for the alert text
        setAlerts(emptyItems.slice(0, 2).map(i => i.name));
      }

      // 2. Logic for Total Udhaar
      const { data: customerData } = await supabase.from('customers').select('*').order('balance', { ascending: false });
      if (customerData) {
        const total = customerData.reduce((sum, c) => sum + (c.balance || 0), 0);
        setStats({ totalUdhaar: total, topDebtors: customerData.filter(c => c.balance > 0) });
      }
    } catch (err) { console.error(err); }
  }

  return (
    <div style={homeContainer}>
      <header style={headerStyle}>
        <div>
          <h1 style={welcomeText}>Namaste, Surendra! 👋</h1>
          <p style={subText}>Your shop's pulse for today</p>
        </div>
        <div style={statusDot} />
      </header>

      {/* 🔴 Total Udhaar Section */}
      <div 
        onClick={() => setShowDebtors(!showDebtors)} 
        style={{...glassCard, border: '1px solid rgba(255, 77, 77, 0.3)', cursor: 'pointer', marginBottom: '20px'}}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{...cardLabel, color: '#ff4d4d'}}><IndianRupee size={12} /> Total Udhaar</p>
            <h2 style={{...cardValue, color: '#ff4d4d', fontSize: '2.2rem'}}>₹{stats.totalUdhaar}</h2>
          </div>
          <ChevronRight color="#ff4d4d" style={{ transform: showDebtors ? 'rotate(90deg)' : 'none', transition: '0.3s' }} />
        </div>
        {showDebtors && (
          <div style={debtorList}>
            {stats.topDebtors.slice(0, 5).map(c => (
              <div key={c.id} style={debtorRow}>
                <span style={{textTransform: 'capitalize'}}>{c.name}</span>
                <span style={{color: '#ff4d4d', fontWeight: 'bold'}}>₹{c.balance}</span>
              </div>
            ))}
            <button onClick={(e) => { e.stopPropagation(); navigate('/khata'); }} style={viewAllBtn}>View Full Ledger</button>
          </div>
        )}
      </div>

      <h3 style={sectionTitle}>Main Terminal</h3>
      
      <Link to="/khata" style={bigActionCard}>
        <div style={{...iconBox, background: 'rgba(76, 175, 80, 0.1)'}}><BookOpen color="#4caf50" size={28} /></div>
        <div style={{flex: 1}}><h4 style={actionTitle}>Ledger</h4><p style={actionSub}>Instant Entry & Records</p></div>
        <ChevronRight color="#333" />
      </Link>

      <div style={actionGrid}>
        {/* --- ITEMS EMPTY BOX --- */}
        <div style={actionCard}>
          <div style={{...iconBox, background: 'rgba(255, 77, 77, 0.1)'}}>
            <Package color="#ff4d4d" />
          </div>
          <span style={{...actionLabel, color: '#ff4d4d'}}>{emptyCount} Items Empty</span>
        </div>

        {/* --- ALERT STOCK BOX --- */}
        <div style={actionCard}>
          <div style={{...iconBox, background: 'rgba(255, 152, 0, 0.1)'}}>
            <AlertTriangle color="#ff9800" />
          </div>
          <div style={{textAlign: 'center'}}>
            {alerts.length > 0 ? (
               alerts.map((name, i) => (
                <p key={i} style={{fontSize: '0.65rem', color: '#aaa', margin: 0, textTransform: 'capitalize'}}>• {name}</p>
               ))
            ) : (
              <span style={{...actionLabel, color: '#4caf50'}}>Full ✅</span>
            )}
          </div>
        </div>
      </div>

      {/* --- RESTOCK ALERT STRIP --- */}
      <Link to="/inventory" style={alignedAlert(emptyCount > 0)}>
        <div style={alertIconBox(emptyCount > 0)}><Zap size={20} fill={emptyCount > 0 ? "#ff4d4d" : "#4caf50"} color={emptyCount > 0 ? "#ff4d4d" : "#4caf50"} /></div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, color: '#fff' }}>{emptyCount > 0 ? "Restock Alert!" : "Stock is Full"}</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: emptyCount > 0 ? '#ff9999' : '#99ff99' }}>
            {emptyCount > 0 ? `${emptyCount} items need attention` : "Everything looks good!"}
          </p>
        </div>
        <ChevronRight size={18} color={emptyCount > 0 ? "#ff4d4d" : "#4caf50"} />
      </Link>
    </div>
  );
};

const BottomNav = () => {
  const location = useLocation();
  const isActive = (p) => location.pathname === p;

  return (
    <nav style={navBar}>
      <Link to="/" style={{ ...navItem, color: isActive('/') ? '#4caf50' : '#444' }}>
        <HomeIcon size={22} strokeWidth={isActive('/') ? 2.5 : 2} />
        <span>Home</span>
      </Link>
      <Link to="/khata" style={{ ...navItem, color: isActive('/khata') ? '#4caf50' : '#444' }}>
        <BookOpen size={22} strokeWidth={isActive('/khata') ? 2.5 : 2} />
        <span>Khata</span>
      </Link>
      <Link to="/inventory" style={{ ...navItem, color: isActive('/inventory') ? '#4caf50' : '#444' }}>
        <ShoppingCart size={22} strokeWidth={isActive('/inventory') ? 2.5 : 2} />
        <span>Stock</span>
      </Link>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <div style={{ background: '#050505', minHeight: '100vh', color: '#fff', position: 'relative' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/khata" element={<Khata />} />
          <Route path="/inventory" element={<Inventory />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  );
}

// --- STYLES (Kept exactly as requested) ---
const homeContainer = { maxWidth: '500px', margin: '0 auto', padding: '24px', paddingBottom: '120px' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' };
const welcomeText = { fontSize: '1.6rem', margin: 0, fontWeight: '800' };
const subText = { color: '#666', fontSize: '0.85rem', margin: '4px 0 0 0' };
const statusDot = { width: '10px', height: '10px', background: '#4caf50', borderRadius: '50%', boxShadow: '0 0 10px #4caf50' };
const glassCard = { background: 'rgba(255, 255, 255, 0.03)', padding: '20px', borderRadius: '24px' };
const cardLabel = { margin: 0, fontSize: '0.7rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' };
const cardValue = { margin: '8px 0', fontWeight: '900' };
const debtorList = { marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)' };
const debtorRow = { display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px', color: '#ccc' };
const viewAllBtn = { width: '100%', background: 'transparent', border: '1px solid #333', color: '#888', padding: '10px', borderRadius: '12px', marginTop: '10px', fontSize: '0.8rem', cursor: 'pointer' };
const sectionTitle = { fontSize: '0.85rem', color: '#444', marginBottom: '15px', fontWeight: 'bold', textTransform: 'uppercase' };
const bigActionCard = { display: 'flex', alignItems: 'center', gap: '15px', background: '#111', padding: '20px', borderRadius: '24px', textDecoration: 'none', border: '1px solid #1a1a1a', marginBottom: '16px' };
const actionTitle = { color: '#fff', margin: 0, fontSize: '1.1rem' };
const actionSub = { color: '#555', margin: 0, fontSize: '0.75rem' };
const actionGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' };
const actionCard = { background: '#111', padding: '15px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', border: '1px solid #1a1a1a' };
const iconBox = { padding: '12px', borderRadius: '16px' };
const actionLabel = { color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' };
const alignedAlert = (hasItems) => ({ display: 'flex', alignItems: 'center', gap: '15px', textDecoration: 'none', background: hasItems ? 'rgba(255, 77, 77, 0.1)' : 'rgba(76, 175, 80, 0.1)', border: `1px solid ${hasItems ? 'rgba(255, 77, 77, 0.2)' : 'rgba(76, 175, 80, 0.2)'}`, padding: '16px', borderRadius: '24px' });
const alertIconBox = (hasItems) => ({ background: '#000', padding: '10px', borderRadius: '16px', border: `1px solid ${hasItems ? 'rgba(255, 77, 77, 0.2)' : 'rgba(76, 175, 80, 0.2)'}` });
const navBar = { position: 'fixed', bottom: '15px', left: '15px', right: '15px', background: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(20px)', display: 'flex', justifyContent: 'space-around', padding: '12px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', zIndex: 1000 };
const navItem = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '0.65rem', fontWeight: 'bold' };

export default App;