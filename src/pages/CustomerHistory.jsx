import React, { useState, useEffect } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, Edit3, Trash2, ChevronDown, PlusCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

const CustomerHistory = ({ customer, history, onClose, onRefresh, onEdit }) => {
  const [activeTab, setActiveTab] = useState('ALL'); 
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);

  const [localHistory, setLocalHistory] = useState(history);

  useEffect(() => {
    setLocalHistory(history);
  }, [history]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const handleDelete = async (txn) => {
    if (!window.confirm("Delete this record permanently?")) return;
    try {
      setLocalHistory(prev => prev.filter(t => t.id !== txn.id));
      const newBalance = customer.balance - txn.amount;
      await supabase.from('customers').update({ balance: newBalance }).eq('id', customer.id);
      await supabase.from('transactions').delete().eq('id', txn.id);
      onRefresh(customer.id);
    } catch (err) { alert(err.message); }
  };

  const handlePayment = async () => {
    if (!payAmount || loading) return;
    const amt = Number(payAmount);
    if (amt <= 0) return alert("Enter valid amount");

    setLoading(true);

    const optimisticTxn = {
        id: Date.now(),
        customer_id: customer.id,
        type: 'CREDIT',
        amount: -amt,
        description: payNote.trim() || "Cash Settlement",
        created_at: new Date().toISOString()
    };
    
    setLocalHistory(prev => [optimisticTxn, ...prev]);
    setPayAmount(''); setPayNote('');
    setIsPayOpen(false);

    try {
      await supabase.from('customers').update({ balance: customer.balance - amt }).eq('id', customer.id);
      await supabase.from('transactions').insert([{ 
        customer_id: customer.id, 
        type: 'CREDIT', 
        amount: -amt, 
        description: optimisticTxn.description 
      }]);
      onRefresh(customer.id);
    } catch (err) { 
        alert("Sync Error: " + err.message); 
        onRefresh(customer.id);
    }
    setLoading(false);
  };

  const filtered = localHistory.filter(h => activeTab === 'ALL' || h.type === activeTab);
  const groups = filtered.reduce((acc, h) => {
    const d = new Date(h.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!acc[d]) acc[d] = [];
    acc[d].push(h);
    return acc;
  }, {});

  return (
    <div style={modalOverlay}>
      <div style={modalContent}>
        
        <div style={headerArea}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={avatar}>{customer.name[0].toUpperCase()}</div>
            <div>
              {/* 🚀 FIXED: INCREASED FONT SIZE & WEIGHT */}
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', textTransform: 'capitalize', fontWeight: '950' }}>{customer.name}</h3>
              <p style={{ margin: 0, color: customer.balance > 0 ? '#ff4d4d' : '#4caf50', fontWeight: '900', fontSize: '0.95rem' }}>₹{customer.balance} Balance</p>
            </div>
          </div>
          <button onClick={onClose} style={closeBtn}><X size={18} /></button>
        </div>

        <div style={payDropboxContainer}>
          <div style={dropboxHeader} onClick={() => setIsPayOpen(!isPayOpen)}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PlusCircle size={18} color={isPayOpen ? '#4caf50' : '#888'} />
                <span style={{ color: isPayOpen ? '#4caf50' : '#eee', fontWeight: '800', fontSize: '0.85rem' }}>RECORD PAYMENT</span>
             </div>
             <ChevronDown size={18} color="#555" style={{ transform: isPayOpen ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateRows: isPayOpen ? '1fr' : '0fr', transition: '0.3s ease', overflow: 'hidden' }}>
            <div style={{ minHeight: 0 }}>
              <div style={payCardInner}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <input 
                    placeholder="Amount" 
                    type="number" 
                    inputMode="decimal"
                    value={payAmount} 
                    onChange={e=>setPayAmount(e.target.value)} 
                    style={amountInputStyle}
                  />
                  <button onClick={handlePayment} disabled={loading} style={pBtn}>
                    {loading ? '...' : 'SAVE PAY'}
                  </button>
                </div>
                <input 
                  placeholder="Note (PhonePe, Cash...)" 
                  value={payNote} 
                  onChange={e=>setPayNote(e.target.value)} 
                  style={noteIn}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={tabGroup}>
          {['ALL', 'DEBIT', 'CREDIT'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} 
              style={{ ...tBtn, color: activeTab === tab ? '#4caf50' : '#555', borderBottom: activeTab === tab ? '2px solid #4caf50' : 'none' }}>
              {tab === 'ALL' ? 'History' : tab === 'DEBIT' ? 'Udhaar' : 'Paid'}
            </button>
          ))}
        </div>

        <div style={scrollArea}>
          {Object.entries(groups).map(([date, logs]) => (
            <div key={date} style={{ marginBottom: '20px' }}>
              <div style={dateHighlightContainer}><span style={datePill}>{date}</span><div style={dateLine} /></div>
              
              <div style={daySectionBox}>
                {logs.map((log, index) => (
                  <div key={log.id} style={{
                    ...logRow, 
                    borderBottom: index !== logs.length - 1 ? '1px solid #1a1a1a' : 'none',
                    paddingBottom: index !== logs.length - 1 ? '12px' : '0',
                    marginBottom: index !== logs.length - 1 ? '12px' : '0'
                  }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
                      {log.type === 'DEBIT' ? <ArrowUpCircle color="#ff4d4d" size={20}/> : <ArrowDownCircle color="#4caf50" size={20}/>}
                      <div style={{ flex: 1 }}>
                        {/* 🚀 FIXED: INCREASED LOG DESCRIPTION SIZE */}
                        <div style={logDesc}>{log.description}</div>
                        <div style={logTime}>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {/* 🚀 FIXED: INCREASED AMOUNT SIZE */}
                      <div style={{ fontWeight: '950', color: log.type === 'DEBIT' ? '#ff4d4d' : '#4caf50', marginBottom: '5px', fontSize: '1rem' }}>
                        {log.type === 'DEBIT' ? '+' : '-'}₹{Math.abs(log.amount)}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <Edit3 size={15} color="#444" onClick={() => onEdit(log)} style={{ cursor: 'pointer' }} />
                        <Trash2 size={15} color="#333" onClick={() => handleDelete(log)} style={{ cursor: 'pointer' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ height: '40px' }} />
        </div>
      </div>
    </div>
  );
};

const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 5000, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' };
const modalContent = { width: '100%', maxWidth: '500px', background: '#050505', height: '92vh', borderRadius: '30px 30px 0 0', display: 'flex', flexDirection: 'column', padding: '0 16px', borderTop: '1px solid #1a1a1a', overflow: 'hidden' };
const headerArea = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0' };
const avatar = { width: '42px', height: '42px', borderRadius: '10px', background: '#121212', color: '#4caf50', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: '900', border: '1px solid #222' };
const closeBtn = { background: '#121212', border: 'none', color: '#fff', borderRadius: '50%', padding: '6px', cursor: 'pointer' };
const payDropboxContainer = { background: '#121212', borderRadius: '20px', border: '1px solid #222', marginBottom: '15px', overflow: 'hidden' };
const dropboxHeader = { padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' };
const payCardInner = { padding: '0 15px 15px' };
const amountInputStyle = { flex: 2.2, background: '#000', border: '1.5px solid #2a2a2a', borderRadius: '12px', padding: '10px 15px 10px 35px', color: '#fff', fontSize: '1rem', fontWeight: '900', outline: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'14\' height=\'14\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%234caf50\' stroke-width=\'3\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M6 3h12\'/%3E%3Cpath d=\'M6 8h12\'/%3E%3Cpath d=\'m6 13 8.5 8\'/%3E%3Cpath d=\'M6 13h3\'/%3E%3Cpath d=\'M9 13c6.667 0 6.667-10 0-10\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: '12px center' };
const pBtn = { flex: 1, background: '#4caf50', color: '#000', border: 'none', borderRadius: '12px', padding: '0 10px', fontWeight: '900', fontSize: '0.8rem', cursor: 'pointer' };
const noteIn = { background: '#000', border: '1.5px solid #2a2a2a', outline: 'none', borderRadius: '10px', width: '100%', padding: '10px', color: '#eee', fontSize: '0.85rem' };
const tabGroup = { display: 'flex', gap: '18px', marginBottom: '15px', borderBottom: '1px solid #111' };
const tBtn = { background: 'none', border: 'none', padding: '8px 0', fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer' };
const scrollArea = { flex: 1, overflowY: 'auto', paddingRight: '4px', WebkitOverflowScrolling: 'touch' };
const dateHighlightContainer = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' };
const datePill = { fontSize: '0.65rem', color: '#4caf50', background: 'rgba(76, 175, 80, 0.1)', padding: '3px 8px', borderRadius: '20px', fontWeight: '900' };
const dateLine = { flex: 1, height: '1px', background: '#1a1a1a' };
const daySectionBox = { background: '#121212', padding: '12px', borderRadius: '20px', border: '1px solid #222' };
const logRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
// 🚀 UPDATED LOG DESCRIPTION SIZE
const logDesc = { fontSize: '1.1rem', color: '#fff', fontWeight: '600', lineHeight: '1.4' };
const logTime = { fontSize: '0.68rem', color: '#555', fontWeight: 'bold', marginTop: '2px' };

export default CustomerHistory;