import React, { useState, useEffect } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, CreditCard, Calendar } from 'lucide-react';
import { supabase } from '../supabaseClient';

const CustomerHistory = ({ customer, history, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('ALL'); 
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const filteredHistory = history.filter(h => {
    const matchesTab = activeTab === 'ALL' || h.type === activeTab;
    const hDate = h.created_at.split('T')[0];
    const matchesDate = (!dateRange.from || hDate >= dateRange.from) && (!dateRange.to || hDate <= dateRange.to);
    return matchesTab && matchesDate;
  });

  const groups = filteredHistory.reduce((acc, h) => {
    const date = new Date(h.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(h);
    return acc;
  }, {});

  const handlePayment = async () => {
    if (!payAmount || isNaN(payAmount) || Number(payAmount) <= 0 || loading) return;
    setLoading(true);
    try {
      const amt = Number(payAmount);
      await supabase.from('customers').update({ balance: customer.balance - amt }).eq('id', customer.id);
      await supabase.from('transactions').insert([{ 
        customer_id: customer.id, 
        type: 'CREDIT', 
        amount: amt, 
        description: payNote || "Settlement" 
      }]);
      setPayAmount(''); setPayNote('');
      onRefresh(customer.id);
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  return (
    <div style={modalOverlay}>
      <div style={modalContent}>
        
        {/* --- HEADER (Fixed visibility) --- */}
        <div style={headerArea}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={avatar}>{customer.name[0].toUpperCase()}</div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff', textTransform: 'capitalize' }}>{customer.name}</h3>
              <p style={{ margin: 0, color: '#ff4d4d', fontWeight: 'bold', fontSize: '0.9rem' }}>₹{customer.balance} Pending</p>
            </div>
          </div>
          <button onClick={onClose} style={closeBtn}><X size={20} /></button>
        </div>

        {/* Payment Input Card */}
        <div style={payCard}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={inputWrap}>
              <span style={{ color: '#4caf50' }}>₹</span>
              <input placeholder="0" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={pInput}/>
            </div>
            <button onClick={handlePayment} disabled={loading} style={pBtn}>
              {loading ? '...' : 'Pay'}
            </button>
          </div>
          <input 
            placeholder="Add note (Cash, PhonePe...)" 
            value={payNote} onChange={e => setPayNote(e.target.value)} 
            style={noteIn}
          />
        </div>

        {/* Tab & Filter Controls */}
        <div style={controlsRow}>
          <div style={tabGroup}>
            {['ALL', 'DEBIT', 'CREDIT'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} 
                style={{ ...tBtn, color: activeTab === tab ? '#4caf50' : '#555' }}>
                {tab === 'ALL' ? 'History' : tab === 'DEBIT' ? 'Udhaar' : 'Paid'}
              </button>
            ))}
          </div>
          <Calendar size={18} onClick={() => setShowFilters(!showFilters)} style={{ cursor: 'pointer', color: showFilters ? '#4caf50' : '#444' }} />
        </div>

        {showFilters && (
          <div style={dateBox}>
            <input type="date" style={dIn} onChange={e => setDateRange({...dateRange, from: e.target.value})} />
            <input type="date" style={dIn} onChange={e => setDateRange({...dateRange, to: e.target.value})} />
          </div>
        )}

        {/* --- SCROLLABLE LIST (Fixed scrollbar overlap) --- */}
        <div style={scrollArea}>
          {Object.entries(groups).map(([date, logs]) => (
            <div key={date} style={{ marginBottom: '25px' }}>
              <div style={dateHighlightContainer}>
                <span style={datePill}>{date}</span>
                <div style={dateLine} />
              </div>

              {logs.map(log => (
                <div key={log.id} style={logRow}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                    {log.type === 'DEBIT' ? <ArrowUpCircle color="#ff4d4d" size={18}/> : <ArrowDownCircle color="#4caf50" size={18}/>}
                    <div style={{ flex: 1 }}>
                      <div style={logDesc}>{log.description}</div>
                      <div style={logTime}>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: log.type === 'DEBIT' ? '#ff4d4d' : '#4caf50', marginLeft: '10px' }}>
                    {log.type === 'DEBIT' ? '+' : '-'} ₹{log.amount}
                  </div>
                </div>
              ))}
            </div>
          ))}
          {/* Bottom space to ensure nothing is cut off */}
          <div style={{ height: '100px' }} />
        </div>
      </div>
    </div>
  );
};

// --- STYLES ---
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 5000, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' };

const modalContent = { 
  width: '100%', 
  maxWidth: '500px', 
  background: '#050505', 
  height: '92vh', 
  borderRadius: '30px 30px 0 0', 
  display: 'flex', 
  flexDirection: 'column', 
  padding: '0 20px 20px 20px', // Removed top padding here to handle it in headerArea
  borderTop: '1px solid #1a1a1a',
  overflow: 'hidden' 
};

// Added dedicated Header area with top margin for mobile notches
const headerArea = { 
  display: 'flex', 
  justifyContent: 'space-between', 
  alignItems: 'center', 
  paddingTop: '30px', // Extra space at the very top
  paddingBottom: '20px',
  background: '#050505',
  zIndex: 10
};

const avatar = { width: '40px', height: '40px', borderRadius: '10px', background: '#111', color: '#4caf50', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', border: '1px solid #222' };
const closeBtn = { background: '#111', border: 'none', color: '#fff', borderRadius: '50%', padding: '8px' };

const payCard = { background: '#0a0a0a', padding: '15px', borderRadius: '20px', border: '1px solid #1a1a1a', marginBottom: '20px' };
const inputWrap = { flex: 1, background: '#000', borderRadius: '12px', padding: '0 12px', display: 'flex', alignItems: 'center', border: '1px solid #222' };
const pInput = { background: 'none', border: 'none', color: '#fff', padding: '10px 0', width: '100%', outline: 'none', fontSize: '1rem' };
const pBtn = { background: '#4caf50', border: 'none', borderRadius: '10px', padding: '0 15px', fontWeight: 'bold' };
const noteIn = { background: 'none', border: 'none', borderTop: '1px solid #1a1a1a', width: '100%', marginTop: '10px', paddingTop: '10px', color: '#555', fontSize: '0.8rem', outline: 'none' };

const controlsRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' };
const tabGroup = { display: 'flex', gap: '15px' };
const tBtn = { background: 'none', border: 'none', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' };

const dateBox = { display: 'flex', gap: '10px', background: '#111', padding: '10px', borderRadius: '12px', marginBottom: '15px' };
const dIn = { background: 'none', border: 'none', color: '#888', fontSize: '0.75rem', outline: 'none', width: '100%' };

// --- FIXED SCROLL AREA ---
const scrollArea = { 
  flex: 1, 
  overflowY: 'auto', 
  paddingRight: '15px', // Extra space so scrollbar doesn't touch text
  marginRight: '-10px', // Pulls scrollbar closer to the edge
  scrollbarWidth: 'thin', // For Firefox
  WebkitOverflowScrolling: 'touch' 
};

const dateHighlightContainer = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' };
const datePill = { fontSize: '0.65rem', color: '#4caf50', background: 'rgba(76, 175, 80, 0.1)', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' };
const dateLine = { flex: 1, height: '1px', background: '#111' };

const logRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' };
const logDesc = { fontSize: '0.85rem', color: '#eee', lineHeight: '1.4' };
const logTime = { fontSize: '0.7rem', color: '#444', marginTop: '2px' };

export default CustomerHistory;