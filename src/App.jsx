import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { 
  ShoppingCart, BookOpen, IndianRupee, Home as HomeIcon, Zap, ChevronRight, Package, ShoppingBasket, Lock, User, ShieldCheck
} from 'lucide-react';

import Khata from './pages/Khata'; 
import Inventory from './pages/Inventory';

// --- 🔐 LOGIN PAGE COMPONENT ---
const Login = ({ onLogin }) => {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Credentials Logic
    const users = {
      'owner': '6111',
      'developer': '3853'
    };

    setTimeout(() => {
      if (users[id.toLowerCase()] === pw) {
        localStorage.setItem('shop_session', id.toLowerCase());
        onLogin(id.toLowerCase());
      } else {
        setError('Invalid ID or Password, Bro! 🚩');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div style={loginOverlay}>
      <div style={loginGlow} />
      <div style={loginCard}>
        <div style={iconHeader}>
          <ShieldCheck size={40} color="#4caf50" />
        </div>
        <h2 style={loginTitle}>Shop Access</h2>
        <p style={loginSub}>Secure Terminal v2.0</p>

        <form onSubmit={handleLogin} style={loginForm}>
          <div style={loginInputWrapper}>
            <User size={18} color="#666" style={loginIcon} />
            <input 
              placeholder="User ID" 
              value={id} 
              onChange={e => setId(e.target.value)} 
              style={loginInput} 
            />
          </div>
          <div style={loginInputWrapper}>
            <Lock size={18} color="#666" style={loginIcon} />
            <input 
              type="password"
              placeholder="Security PIN" 
              value={pw} 
              onChange={e => setPw(e.target.value)} 
              style={loginInput} 
            />
          </div>
          
          {error && <p style={errorText}>{error}</p>}

          <button type="submit" disabled={loading} style={loginBtn}>
            {loading ? 'Authenticating...' : 'Unlock System'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- 🏠 HOME / DASHBOARD COMPONENT ---
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
      const cachedStock = localStorage.getItem('cache_stock');
      const cachedStats = localStorage.getItem('cache_stats');
      if (cachedStock) {
        const s = JSON.parse(cachedStock);
        setEmptyCount(s.count);
        setAlerts(s.alerts);
      }
      if (cachedStats) setStats(JSON.parse(cachedStats));

      const { data: stockData } = await supabase.from('inventory').select('*');
      if (stockData) {
        const now = new Date();
        const emptyItems = stockData.filter(item => {
          if (!item.last_bought_at) return true;
          const lastBought = new Date(item.last_bought_at);
          return (now - lastBought) / (1000 * 60 * 60) > 24;
        });
        const stockUpdate = { count: emptyItems.length, alerts: emptyItems.slice(0, 3).map(i => i.name) };
        setEmptyCount(stockUpdate.count);
        setAlerts(stockUpdate.alerts);
        localStorage.setItem('cache_stock', JSON.stringify(stockUpdate));
      }

      const { data: customerData } = await supabase.from('customers').select('*').order('balance', { ascending: false });
      if (customerData) {
        const total = customerData.reduce((sum, c) => sum + (c.balance || 0), 0);
        const statsUpdate = { totalUdhaar: total, topDebtors: customerData.filter(c => c.balance > 0) };
        setStats(statsUpdate);
        localStorage.setItem('cache_stats', JSON.stringify(statsUpdate));
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
        <Link to="/inventory" style={{...actionCard, textDecoration: 'none'}}>
          <div style={{...iconBox, background: 'rgba(255, 77, 77, 0.1)'}}><Package color="#ff4d4d" /></div>
          <span style={{...actionLabel, color: '#ff4d4d'}}>{emptyCount} Items Empty</span>
        </Link>

        <Link to="/inventory" style={{...actionCard, textDecoration: 'none'}}>
          <div style={{...iconBox, background: 'rgba(76, 175, 80, 0.1)'}}><ShoppingBasket color="#4caf50" /></div>
          <div style={refillListWrapper}>
            {alerts.length > 0 ? alerts.map((name, i) => (<p key={i} style={refillItemText}>• {name}</p>)) : <span style={{...actionLabel, color: '#4caf50'}}>Stock Full ✅</span>}
          </div>
        </Link>
      </div>

      <Link to="/inventory" style={alignedAlert(emptyCount > 0)}>
        <div style={alertIconBox(emptyCount > 0)}><Zap size={20} fill={emptyCount > 0 ? "#ff4d4d" : "#4caf50"} color={emptyCount > 0 ? "#ff4d4d" : "#4caf50"} /></div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, color: '#fff' }}>{emptyCount > 0 ? "Restock Alert!" : "Stock is Full"}</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: emptyCount > 0 ? '#ff9999' : '#99ff99' }}>{emptyCount > 0 ? `${emptyCount} items need attention` : "Everything looks good!"}</p>
        </div>
        <ChevronRight size={18} color={emptyCount > 0 ? "#ff4d4d" : "#4caf50"} />
      </Link>
    </div>
  );
};

// --- 🧭 NAVIGATION & MAIN WRAPPER ---
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
  const [user, setUser] = useState(localStorage.getItem('shop_session'));

  if (!user) {
    return <Login onLogin={(u) => setUser(u)} />;
  }

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

// --- ✨ STYLES ---

// LOGIN STYLES
const loginOverlay = { height: '100vh', width: '100%', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' };
const loginGlow = { position: 'absolute', width: '250px', height: '250px', background: 'rgba(76, 175, 80, 0.15)', filter: 'blur(100px)', borderRadius: '50%' };
const loginCard = { width: '85%', maxWidth: '350px', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(20px)', padding: '40px 30px', borderRadius: '32px', border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center', zIndex: 10 };
const iconHeader = { marginBottom: '20px', display: 'flex', justifyContent: 'center' };
const loginTitle = { margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#fff' };
const loginSub = { margin: '5px 0 30px', fontSize: '0.8rem', color: '#666', letterSpacing: '2px', textTransform: 'uppercase' };
const loginForm = { display: 'flex', flexDirection: 'column', gap: '15px' };
const loginInputWrapper = { position: 'relative', display: 'flex', alignItems: 'center' };
const loginIcon = { position: 'absolute', left: '15px' };
const loginInput = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid #222', padding: '15px 15px 15px 45px', borderRadius: '16px', color: '#fff', fontSize: '1rem', outline: 'none' };
const loginBtn = { background: '#4caf50', color: '#000', border: 'none', padding: '16px', borderRadius: '16px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', boxShadow: '0 10px 20px rgba(76, 175, 80, 0.2)' };
const errorText = { color: '#ff4d4d', fontSize: '0.85rem', margin: '5px 0' };

// (Keep all Home/Nav styles exactly as they were before)
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
const refillListWrapper = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', gap: '2px', overflow: 'hidden' };
const refillItemText = { fontSize: '0.65rem', color: '#aaa', margin: 0, textTransform: 'capitalize', textAlign: 'left', width: '100%' };
const alignedAlert = (hasItems) => ({ display: 'flex', alignItems: 'center', gap: '15px', textDecoration: 'none', background: hasItems ? 'rgba(255, 77, 77, 0.1)' : 'rgba(76, 175, 80, 0.1)', border: `1px solid ${hasItems ? 'rgba(255, 77, 77, 0.2)' : 'rgba(76, 175, 80, 0.2)'}`, padding: '16px', borderRadius: '24px' });
const alertIconBox = (hasItems) => ({ background: '#000', padding: '10px', borderRadius: '16px', border: `1px solid ${hasItems ? 'rgba(255, 77, 77, 0.2)' : 'rgba(76, 175, 80, 0.2)'}` });
const navBar = { position: 'fixed', bottom: '15px', left: '15px', right: '15px', background: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(20px)', display: 'flex', justifyContent: 'space-around', padding: '12px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', zIndex: 1000 };
const navItem = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '0.65rem', fontWeight: 'bold' };

export default App;