import React, { useState, useEffect } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, CreditCard, Calendar } from 'lucide-react';
import { supabase } from '../supabaseClient';

const CustomerHistory = ({ customer, history, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('ALL'); 
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [payAmount, setPayAmount] = useState('');

  // --- 🛑 SCROLL LOCK: Stops the background page from moving ---
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // --- 🔍 FILTER LOGIC ---
  const filteredHistory = history.filter(h => {
    const matchesTab = activeTab === 'ALL' || h.type === activeTab;
    const hDate = h.created_at.split('T')[0];
    const matchesDate = (!dateRange.from || hDate >= dateRange.from) && 
                        (!dateRange.to || hDate <= dateRange.to);
    return matchesTab && matchesDate;
  });

  // --- 📅 GROUPING LOGIC ---
  const groups = filteredHistory.reduce((acc, h) => {
    const date = new Date(h.created_at).toLocaleDateString('en-IN', { 
      day: 'numeric', month: 'short', year: 'numeric' 
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(h);
    return acc;
  }, {});

  // --- 💰 SETTLE PAYMENT LOGIC ---
  const handlePayment = async () => {
    if (!payAmount || isNaN(payAmount) || Number(payAmount) <= 0) {
      return alert("Enter a valid amount, bro!");
    }
    const amt = Number(payAmount);
    try {
      const { error: balanceError } = await supabase
        .from('customers')
        .update({ balance: customer.balance - amt })
        .eq('id', customer.id);
      
      if (balanceError) throw balanceError;

      const { error: transError } = await supabase
        .from('transactions')
        .insert([{
          customer_id: customer.id,
          type: 'CREDIT',
          amount: amt,
          description: "Manual Settlement Payment"
        }]);

      if (transError) throw transError;

      setPayAmount('');
      onRefresh(customer.id); 
      alert(`₹${amt} payment saved!`);
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={modalOverlay}>
      <div style={modalContent}>
        
        {/* --- HEADER --- */}
        <div style={modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={avatar}>{customer.name[0].toUpperCase()}</div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{customer.name}</h3>
          </div>
          <X onClick={onClose} style={{ cursor: 'pointer', color: '#666' }} />
        </div>

        {/* --- 💸 SETTLEMENT BAR (Aligned) --- */}
        <div style={paymentSection}>
          <div style={payInputWrapper}>
             <span style={rupeeIcon}>₹</span>
             <input 
              type="number" 
              inputMode="decimal"
              placeholder="0.00" 
              value={payAmount} onChange={e => setPayAmount(e.target.value)}
              style={payInput}
            />
          </div>
          <button onClick={handlePayment} style={payBtn}>
            <CreditCard size={18} /> Pay
          </button>
        </div>

        {/* --- 🗓️ DATE RANGE FILTERS (Clean) --- */}
        <div style={filterRow}>
          <div style={dateBox}>
            <span style={dateLabel}>From Date</span>
            <div style={dateFlex}>
              <Calendar size={14} color="#4caf50" />
              <input type="date" style={dateInput} onChange={e => setDateRange({...dateRange, from: e.target.value})} />
            </div>
          </div>
          <div style={dateBox}>
            <span style={dateLabel}>To Date</span>
            <div style={dateFlex}>
              <Calendar size={14} color="#4caf50" />
              <input type="date" style={dateInput} onChange={e => setDateRange({...dateRange, to: e.target.value})} />
            </div>
          </div>
        </div>

        {/* --- 📑 TABS --- */}
        <div style={tabContainer}>
          {['ALL', 'DEBIT', 'CREDIT'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} 
              style={{ ...tabItem, color: activeTab === tab ? '#fff' : '#666', background: activeTab === tab ? '#333' : 'transparent' }}>
              {tab === 'ALL' ? 'History' : tab === 'DEBIT' ? 'Udhaar' : 'Paid'}
            </button>
          ))}
        </div>

        {/* --- 📜 SCROLLABLE TIMELINE --- */}
        <div style={ledgerScroll}>
          {Object.entries(groups).length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '40px', color: '#444' }}>No transactions found</div>
          ) : (
            Object.entries(groups).map(([date, logs]) => (
              <div key={date} style={{ marginBottom: '25px' }}>
                <div style={dateHeader}>{date}</div>
                <div style={timelineContainer}>
                  {logs.map(log => (
                    <div key={log.id} style={logCard}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {log.type === 'DEBIT' ? <ArrowUpCircle color="#ff4d4d" size={20}/> : <ArrowDownCircle color="#4caf50" size={20}/>}
                        <div>
                          <div style={{ fontSize: '0.9rem', color: '#eee', fontWeight: '500' }}>{log.description}</div>
                          <div style={{ fontSize: '0.7rem', color: '#555' }}>{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 'bold', color: log.type === 'DEBIT' ? '#ff4d4d' : '#4caf50' }}>
                        {log.type === 'DEBIT' ? '+' : '-'} ₹{log.amount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// --- STYLES (Professional & Mobile Optimized) ---
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.95)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 3000 };
const modalContent = { width: '100%', maxWidth: '500px', background: '#0a0a0a', padding: '24px', borderRadius: '30px 30px 0 0', height: '90vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' };
const modalHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' };
const avatar = { width: '40px', height: '40px', borderRadius: '50%', background: '#4caf50', color: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' };

const paymentSection = { display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', background: '#111', padding: '12px', borderRadius: '16px', border: '1px solid #222' };
const payInputWrapper = { flex: 1, position: 'relative', display: 'flex', alignItems: 'center' };
const payInput = { background: 'transparent', border: 'none', color: '#fff', padding: '8px 8px 8px 24px', fontSize: '1.1rem', width: '100%', outline: 'none' };
const rupeeIcon = { position: 'absolute', left: '4px', color: '#4caf50', fontSize: '1.1rem', fontWeight: 'bold' };
const payBtn = { background: '#4caf50', border: 'none', color: '#000', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' };

const filterRow = { display: 'flex', gap: '10px', marginBottom: '20px' };
const dateBox = { flex: 1, background: '#111', padding: '8px 12px', borderRadius: '12px', border: '1px solid #222', display: 'flex', flexDirection: 'column', gap: '4px' };
const dateLabel = { fontSize: '0.6rem', color: '#555', textTransform: 'uppercase', fontWeight: 'bold' };
const dateFlex = { display: 'flex', alignItems: 'center', gap: '6px' };
const dateInput = { background: 'none', border: 'none', color: '#fff', fontSize: '0.8rem', outline: 'none', width: '100%' };

const tabContainer = { display: 'flex', background: '#111', padding: '4px', borderRadius: '14px', marginBottom: '20px', border: '1px solid #222' };
const tabItem = { flex: 1, border: 'none', padding: '10px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' };

const ledgerScroll = { flex: 1, overflowY: 'auto', paddingRight: '4px' };
const dateHeader = { fontSize: '0.75rem', color: '#4caf50', background: '#142514', padding: '4px 12px', borderRadius: '20px', display: 'inline-block', marginBottom: '16px' };
const timelineContainer = { borderLeft: '1px solid #222', marginLeft: '8px', paddingLeft: '16px' };
const logCard = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' };

export default CustomerHistory;