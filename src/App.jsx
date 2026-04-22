import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { 
  ShoppingCart, BookOpen, User, ShieldCheck, ShoppingBag, 
  Package, CheckCircle2, Wallet, Eye, EyeOff, ChevronRight, Lock,
  Home as HomeIcon 
} from 'lucide-react';

import Khata from './pages/Khata'; 
import Inventory from './pages/Inventory';
import PurchaseHistory from './pages/PurchaseHistory';

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
    const users = { 'owner': '6111', 'developer': '3853' };
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
        <div style={iconHeader}><ShieldCheck size={44} color="#4caf50" /></div>
        <h2 style={loginTitle}>Shop Access</h2>
        <p style={loginSub}>Secure Terminal v2.0</p>
        <form onSubmit={handleLogin} style={loginForm}>
          <div style={loginInputWrapper}>
            <User size={20} color="#666" style={loginIcon} />
            <input placeholder="User ID" value={id} onChange={e => setId(e.target.value)} style={loginInput} />
          </div>
          <div style={loginInputWrapper}>
            <Lock size={20} color="#666" style={loginIcon} />
            <input type="password" placeholder="Security PIN" value={pw} onChange={e => setPw(e.target.value)} style={loginInput} />
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
  const [isAmountHidden, setIsAmountHidden] = useState(false); 
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  useEffect(() => { 
    // 🚀 1. LOAD INSTANTLY FROM MASTER JSON
    const cachedRaw = localStorage.getItem('master_khata_db');
    if (cachedRaw) {
      try {
        const parsed = JSON.parse(cachedRaw);
        
        // 🛡️ Bulletproof extraction: handles both array and object formats
        let customerList = [];
        if (Array.isArray(parsed)) {
          customerList = parsed;
        } else if (parsed && Array.isArray(parsed.customers)) {
          customerList = parsed.customers;
        }
        
        if (customerList.length > 0) {
          const total = customerList.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
          setStats({ 
            totalUdhaar: total, 
            topDebtors: customerList.filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance) 
          });
        }
      } catch (e) {
        console.error("Cache corrupted, clearing...");
        localStorage.removeItem('master_khata_db');
      }
    }

    fetchDashboardData(); 
    window.addEventListener('focus', fetchDashboardData);
    return () => window.removeEventListener('focus', fetchDashboardData);
  }, []);

  async function fetchDashboardData() {
    try {
      const { data: stockData } = await supabase.from('inventory').select('*');
      if (stockData) {
        const needsPurchase = stockData.filter(item => item.is_bought === false); 
        setEmptyCount(needsPurchase.length);
        setAlerts(needsPurchase.slice(0, 3).map(i => i.name));
      }

      const { data: customerData } = await supabase.from('customers').select('*').order('balance', { ascending: false });
      if (customerData) {
        const total = customerData.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);
        setStats({ 
          totalUdhaar: total, 
          topDebtors: customerData.filter(c => c.balance > 0) 
        });
        
        // 🚀 2. SYNC BACK TO MASTER JSON
        const cachedRaw = localStorage.getItem('master_khata_db');
        let currentDb = { customers: [], history: {} };
        if (cachedRaw) {
            try {
                const parsed = JSON.parse(cachedRaw);
                currentDb = Array.isArray(parsed) ? { customers: parsed, history: {} } : parsed;
            } catch(e) {}
        }
        currentDb.customers = customerData;
        localStorage.setItem('master_khata_db', JSON.stringify(currentDb));
      }
    } catch (err) { 
      console.error("Sync Error", err); 
    }
  }

  return (
    <div style={homeContainer}>
      <style>{`
        @keyframes auraPulse {
          0% { box-shadow: 0 0 10px rgba(255, 193, 7, 0.1); }
          50% { box-shadow: 0 0 25px rgba(255, 193, 7, 0.3); }
          100% { box-shadow: 0 0 10px rgba(255, 193, 7, 0.1); }
        }
        .aura-card { animation: auraPulse 4s infinite ease-in-out; }
        * { -webkit-tap-highlight-color: transparent; outline: none; }
      `}</style>

      <header style={headerStyle}>
        <div>
          <p style={greetingText}>{getGreeting()},</p>
          <h1 style={welcomeText}>Surendra 👋</h1>
        </div>
        <div style={profileCircle}><User color="#4caf50" size={28} /></div>
      </header>

      {/* --- UDHAAR PULSE CARD --- */}
      <section 
        onClick={() => setShowDebtors(!showDebtors)} 
        className="aura-card"
        style={{
          ...pulseCard, 
          borderColor: showDebtors ? '#ffc107' : 'rgba(255, 193, 7, 0.2)',
          transform: showDebtors ? 'scale(1.02)' : 'scale(1)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={cardHeader}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <p style={{...cardLabel, color: '#ffc107', fontSize: '0.8rem'}}> TOTAL UDHAAR</p>
              <button onClick={(e) => { e.stopPropagation(); setIsAmountHidden(!isAmountHidden); }} style={privacyBtn}>
                {isAmountHidden ? <EyeOff size={18} color="#7c2a2a" /> : <Eye size={18} color="#e5f553" />}
              </button>
            </div>
            <h2 style={pulseValue}>{isAmountHidden ? '₹ XXX,XXX' : `₹${stats.totalUdhaar}`}</h2>
          </div>
          <div style={pulseIconBox}><Wallet size={28} color="#ffc107" fill="rgba(255, 193, 7, 0.2)" /></div>
        </div>

        <div style={{...expandableDebtors, maxHeight: showDebtors ? '400px' : '0px', transition: '0.5s ease'}}>
          <div style={debtorDivider} />
          {stats.topDebtors.length > 0 ? stats.topDebtors.slice(0, 5).map(c => (
            <div key={c.id} style={debtorRow}>
              <span style={{...debtorName, fontSize: '1rem', fontWeight: '700'}}>{c.name}</span>
              <span style={{...debtorAmt, fontSize: '1.1rem'}}>₹{c.balance}</span>
            </div>
          )) : <p style={noDataText}>No pending udhaar. Clean slate! 🔥</p>}
          <button onClick={(e) => { e.stopPropagation(); navigate('/khata'); }} style={fullLedgerBtn}>
            MANAGE LEDGER <ChevronRight size={18} />
          </button>
        </div>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: showDebtors ? '15px' : '10px', paddingBottom: '10px' }}>
          <div style={{ width: '30px', height: '4px', background: showDebtors ? '#ffc107' : '#222', borderRadius: '10px' }} />
        </div>
      </section>

      <h3 style={sectionLabel}>Quick Tools</h3>
      <div style={bentoGrid}>
        <Link to="/khata" style={{...bentoTile, gridColumn: 'span 2', background: '#111', padding: '22px 24px', flexDirection: 'row', alignItems: 'center'}}>
          <div style={{...tileIcon, background: 'rgba(76, 175, 80, 0.15)', width: '46px', height: '46px'}}><BookOpen color="#4caf50" size={24} /></div>
          <div style={{flex: 1, marginLeft: '16px'}}>
            <h4 style={{...tileTitle, fontSize: '1.2rem'}}>Daily Khata</h4>
            <p style={{...tileSub, color: '#888', fontSize: '0.9rem', fontWeight: '700'}}>Ledger & Customer Udhari</p>
          </div>
          <ChevronRight size={22} color="#4caf50" />
        </Link>
        <Link to="/purchases" style={bentoTile}>
          <div style={{...tileIcon, background: 'rgba(255, 152, 0, 0.15)'}}><ShoppingBag color="#ff9800" size={24} /></div>
          <div>
            <h4 style={tileTitle}>BILLS</h4>
            <p style={{...tileSub, color: '#666', fontSize: '0.75rem'}}>History</p>
          </div>
        </Link>
        <Link to="/inventory" style={bentoTile}>
          <div style={{...tileIcon, background: emptyCount > 0 ? 'rgba(255, 77, 77, 0.15)' : 'rgba(76, 175, 80, 0.15)'}}>
            {emptyCount > 0 ? <Package color="#ff4d4d" size={24} /> : <CheckCircle2 color="#4caf50" size={24} />}
          </div>
          <div>
            <h4 style={tileTitle}>Stock</h4>
            {emptyCount > 0 ? alerts.map((name, i) => (<p key={i} style={{...miniAlertText, color: '#ff9999', fontSize: '0.8rem', fontWeight: '800'}}>• {name}</p>)) : (<p style={{...tileSub, color: '#4caf50', fontSize: '0.85rem', fontWeight: '700'}}>Stock Full ✅</p>)}
          </div>
        </Link>
      </div>
    </div>
  );
};

// --- 🧭 NAVIGATION ---
const BottomNav = () => {
  const location = useLocation();
  const isActive = (p) => location.pathname === p;
  return (
    <nav style={navBar}>
      <Link to="/" style={{ ...navItem, color: isActive('/') ? '#4caf50' : '#888' }}>
        <HomeIcon size={26} strokeWidth={isActive('/') ? 3 : 2} />
        <span style={{fontSize: '0.75rem'}}>Home</span>
      </Link>
      <Link to="/khata" style={{ ...navItem, color: isActive('/khata') ? '#4caf50' : '#888' }}>
        <BookOpen size={26} strokeWidth={isActive('/khata') ? 3 : 2} />
        <span style={{fontSize: '0.75rem'}}>Ledger</span>
      </Link>
      <Link to="/purchases" style={{ ...navItem, color: isActive('/purchases') ? '#ff9800' : '#888' }}>
        <ShoppingBag size={26} strokeWidth={isActive('/purchases') ? 3 : 2} />
        <span style={{fontSize: '0.75rem'}}>Bills</span>
      </Link>
      <Link to="/inventory" style={{ ...navItem, color: isActive('/inventory') ? '#4caf50' : '#888' }}>
        <ShoppingCart size={26} strokeWidth={isActive('/inventory') ? 3 : 2} />
        <span style={{fontSize: '0.75rem'}}>Stock</span>
      </Link>
    </nav>
  );
};

function App() {
  const [user, setUser] = useState(localStorage.getItem('shop_session'));
  if (!user) return <Login onLogin={(u) => setUser(u)} />;
  return (
    <Router>
      <div style={{ background: '#050505', minHeight: '100vh', color: '#fff', position: 'relative' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/khata" element={<Khata />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/purchases" element={<PurchaseHistory />} />
        </Routes>
        <BottomNav />
      </div>
    </Router>
  );
}

// --- ✨ STYLES ---
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
const homeContainer = { maxWidth: '500px', margin: '0 auto', padding: '24px', paddingBottom: '130px', fontFamily: 'system-ui, sans-serif' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' };
const greetingText = { margin: 0, color: '#666', fontSize: '0.9rem', fontWeight: '500' };
const welcomeText = { margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px' };
const profileCircle = { width: '48px', height: '48px', background: '#111', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', border: '1px solid #222' };
const pulseCard = { position: 'relative', background: '#0a0a0a', padding: '24px 24px 10px 24px', borderRadius: '32px', border: '1px solid', overflow: 'hidden' };
const cardHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2, cursor: 'pointer' };
const cardLabel = { margin: 0, fontSize: '0.7rem', fontWeight: '800', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' };
const pulseValue = { margin: '10px 0 0 0', fontSize: '1.6rem', fontWeight: '800', color: '#fff' };
const pulseIconBox = { background: 'rgba(255, 193, 7, 0.1)', padding: '12px', borderRadius: '18px', border: '1px solid rgba(255, 193, 7, 0.2)' };
const privacyBtn = { background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const expandableDebtors = { overflow: 'hidden' };
const debtorDivider = { height: '1px', background: 'rgba(255,255,255,0.05)', margin: '20px 0' };
const debtorRow = { display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem' };
const debtorName = { color: '#aaa', textTransform: 'capitalize' };
const debtorAmt = { color: '#fff', fontWeight: 'bold' };
const noDataText = { color: '#555', fontSize: '0.85rem', fontStyle: 'italic' };
const fullLedgerBtn = { width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid #222', color: '#fff', padding: '12px', borderRadius: '14px', marginTop: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };
const sectionLabel = { fontSize: '0.9rem', color: '#666', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px', marginTop: '30px' };
const bentoGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' };
const bentoTile = { background: '#111', padding: '20px', borderRadius: '28px', border: '1px solid #1a1a1a', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '12px' };
const tileIcon = { width: '42px', height: '42px', borderRadius: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const tileTitle = { margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: '800' };
const tileSub = { margin: '4px 0 0 0', lineHeight: '1.2' };
const miniAlertText = { margin: 0, fontSize: '0.8rem', color: '#888', display: 'flex', alignItems: 'center', gap: '5px', textTransform: 'capitalize' };
const navBar = { position: 'fixed', bottom: '15px', left: '10px', right: '10px', background: '#0a0a0a', border: '2px solid #1a1a1a', display: 'flex', justifyContent: 'space-around', padding: '12px 5px', borderRadius: '20px', zIndex: 1000, boxShadow: '0 -5px 20px rgba(0,0,0,0.5)' };
const navItem = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', textDecoration: 'none', fontWeight: '800' };

export default App;