import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { 
  ShoppingCart, AlertCircle, ChevronRight, BookOpen, 
  Users, IndianRupee, Home as HomeIcon, Zap, TrendingUp
} from 'lucide-react';

// Import your pages
import Khata from './pages/Khata'; 
import Inventory from './pages/Inventory';

const Home = () => {
  const [stockInfo, setStockInfo] = useState({ count: 0, items: [] });
  const [stats, setStats] = useState({ totalUdhaar: 0, totalCustomers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: stockData } = await supabase.from('inventory').select('name').is('last_bought_at', null);
      const { data: customerData } = await supabase.from('customers').select('balance');
      if (stockData) setStockInfo({ count: stockData.length, items: stockData });
      if (customerData) {
        const total = customerData.reduce((sum, c) => sum + (c.balance || 0), 0);
        setStats({ totalUdhaar: total, totalCustomers: customerData.length });
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <div style={homeContainer}>
      {/* Header with Glassmorphism */}
      <header style={headerStyle}>
        <div>
          <h1 style={welcomeText}>Namaste, Bro! <span style={wave}>👋</span></h1>
          <p style={subText}>Your shop's pulse for today</p>
        </div>
        <div style={statusDot} />
      </header>

      {/* 🚨 Glow Alert Card */}
      {!loading && stockInfo.count > 0 && (
        <Link to="/inventory" style={glowAlert}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={alertIconBox}><Zap size={20} fill="#ff4d4d" /></div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, color: '#fff' }}>Restock Alert!</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#ff9999' }}>
                {stockInfo.count} items need attention
              </p>
            </div>
            <ChevronRight size={18} color="#ff4d4d" />
          </div>
        </Link>
      )}

      {/* 📊 Modern Stats Grid */}
      <div style={statsGrid}>
        <div style={glassCard}>
          <p style={cardLabel}><IndianRupee size={12} /> Total Udhaar</p>
          <h2 style={cardValue}>₹{stats.totalUdhaar}</h2>
          <div style={progressLine}><div style={{...progressBar, width: '70%', background: '#ff4d4d'}} /></div>
        </div>
        <div style={glassCard}>
          <p style={cardLabel}><Users size={12} /> Customers</p>
          <h2 style={cardValue}>{stats.totalCustomers}</h2>
          <div style={progressLine}><div style={{...progressBar, width: '40%', background: '#4caf50'}} /></div>
        </div>
      </div>

      {/* Quick Actions */}
      <h3 style={sectionTitle}>Main Terminal</h3>
      <div style={actionGrid}>
        <Link to="/khata" style={actionCard}>
          <div style={{...iconBox, background: 'rgba(76, 175, 80, 0.1)'}}><BookOpen color="#4caf50" /></div>
          <span style={actionLabel}>Ledger</span>
        </Link>
        <Link to="/inventory" style={actionCard}>
          <div style={{...iconBox, background: 'rgba(33, 150, 243, 0.1)'}}><ShoppingCart color="#2196f3" /></div>
          <span style={actionLabel}>Inventory</span>
        </Link>
      </div>
    </div>
  );
};

const BottomNav = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

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
      <div style={appBg}>
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

// --- ✨ COOLER STYLES ---
const appBg = { background: '#050505', minHeight: '100vh', color: '#fff', paddingBottom: '90px', fontFamily: 'sans-serif' };
const homeContainer = { maxWidth: '500px', margin: '0 auto', padding: '24px' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' };
const welcomeText = { fontSize: '1.6rem', margin: 0, fontWeight: '800' };
const wave = { display: 'inline-block' };
const subText = { color: '#666', fontSize: '0.85rem', margin: '4px 0 0 0' };
const statusDot = { width: '12px', height: '12px', background: '#4caf50', borderRadius: '50%', boxShadow: '0 0 10px #4caf50' };

const glowAlert = { 
  display: 'block', textDecoration: 'none', background: 'rgba(255, 77, 77, 0.1)', 
  border: '1px solid rgba(255, 77, 77, 0.2)', padding: '16px', borderRadius: '20px', 
  marginBottom: '25px', boxShadow: '0 8px 32px rgba(255, 77, 77, 0.1)' 
};
const alertIconBox = { background: '#1a0a0a', padding: '8px', borderRadius: '12px' };

const statsGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '30px' };
const glassCard = { 
  background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', 
  padding: '20px', borderRadius: '24px', backdropFilter: 'blur(10px)' 
};
const cardLabel = { margin: 0, fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '4px' };
const cardValue = { margin: '8px 0', fontSize: '1.4rem', fontWeight: 'bold' };
const progressLine = { width: '100%', height: '4px', background: '#111', borderRadius: '10px', marginTop: '10px' };
const progressBar = { height: '100%', borderRadius: '10px' };

const sectionTitle = { fontSize: '1rem', color: '#fff', marginBottom: '15px', fontWeight: '600' };
const actionGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' };
const actionCard = { 
  background: '#111', padding: '20px', borderRadius: '24px', textDecoration: 'none', 
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', border: '1px solid #1a1a1a' 
};
const iconBox = { padding: '12px', borderRadius: '16px' };
const actionLabel = { color: '#fff', fontSize: '0.9rem', fontWeight: '500' };

const navBar = { 
  position: 'fixed', bottom: '15px', left: '15px', right: '15px', 
  background: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(20px)', 
  display: 'flex', justifyContent: 'space-around', padding: '12px', 
  borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', zIndex: 1000 
};
const navItem = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '0.65rem', fontWeight: 'bold' };

export default App;