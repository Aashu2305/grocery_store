import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Search, Send, Plus, Calculator, ChevronRight, CheckCircle, 
  AlertCircle, ChevronDown, X, Edit3, Trash2, ShieldCheck, AlertTriangle, Save
} from 'lucide-react';
import CustomerHistory from './CustomerHistory'; 

const Khata = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  
  const [dialog, setDialog] = useState({ show: false, type: '', data: null, value: '', pin: '', step: 0, error: '' });
  const [editingId, setEditingId] = useState(null);
  const [originalCustId, setOriginalCustId] = useState(null);
  const [oldAmount, setOldAmount] = useState(0);

  const [quickName, setQuickName] = useState('');
  const [items, setItems] = useState([{ name: '', priceExpr: '' }]);
  const [paid, setPaid] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  const suggestionRef = useRef(null);

  // 🚀 1. LOAD FROM MASTER JSON ON BOOT
  useEffect(() => {
    const cachedRaw = localStorage.getItem('master_khata_db');
    if (cachedRaw) {
      try {
        const parsed = JSON.parse(cachedRaw);
        const customerList = Array.isArray(parsed) ? parsed : (parsed.customers || []);
        // FIXED: Sort cached data immediately
        setCustomers(customerList.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) { console.error("Cache corrupted"); }
    }
    fetchCustomers(); 
    
    const handleClickOutside = (e) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const updateMasterCache = (customersData, historyUpdate = null) => {
    const cachedRaw = localStorage.getItem('master_khata_db');
    let currentDb = { customers: [], history: {} };
    if (cachedRaw) {
      try {
        const parsed = JSON.parse(cachedRaw);
        currentDb = Array.isArray(parsed) ? { customers: parsed, history: {} } : parsed;
      } catch (e) { currentDb = { customers: [], history: {} }; }
    }
    if (customersData) currentDb.customers = customersData;
    if (historyUpdate) currentDb.history = { ...currentDb.history, ...historyUpdate };
    localStorage.setItem('master_khata_db', JSON.stringify(currentDb));
  };

  // 🚀 2. BULK SYNC & AUTO-SORT
  const fetchCustomers = async () => {
    try {
      const { data } = await supabase.from('customers').select('*').order('name');
      if (data) {
        // FIXED: Ensure state is sorted
        const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
        setCustomers(sortedData);
        updateMasterCache(sortedData);
      }
    } catch (err) {
      console.log("Offline: Using local Master JSON");
    }
  };

  const handleRefresh = async (customerId) => {
    const { data: updatedCust } = await supabase.from('customers').select('*').eq('id', customerId).single();
    if (updatedCust) {
        setCustomers(prev => {
            const newList = prev.map(c => c.id === customerId ? updatedCust : c).sort((a, b) => a.name.localeCompare(b.name));
            updateMasterCache(newList);
            return newList;
        });
        setSelectedCustomer(updatedCust);
    }
    const { data: txnData } = await supabase.from('transactions').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
    if (txnData) {
        setHistory(txnData);
        updateMasterCache(null, { [customerId]: txnData });
    }
  };

  const openHistory = async (customer) => {
    setSelectedCustomer(customer);
    const cachedRaw = localStorage.getItem('master_khata_db');
    if (cachedRaw) {
      try {
        const parsed = JSON.parse(cachedRaw);
        if (parsed.history && parsed.history[customer.id]) {
          setHistory(parsed.history[customer.id]);
        } else {
          setHistory([]); 
        }
      } catch (e) { setHistory([]); }
    }
    
    try {
      const { data } = await supabase.from('transactions')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      if (data) {
        setHistory(data);
        updateMasterCache(null, { [customer.id]: data });
      }
    } catch (err) { console.log("Showing cached history"); }
  };

  const handleEditInitiate = (txn, customer) => {
    setEditingId(txn.id);
    setOldAmount(txn.amount);
    setOriginalCustId(customer.id);
    setQuickName(customer.name);
    if (txn.type === 'CREDIT' || txn.amount < 0) {
      setItems([{ name: '', priceExpr: '' }]); 
      setPaid(Math.abs(txn.amount).toString()); 
    } else if (txn.description.includes(': ₹')) {
      try {
        const parts = txn.description.split(' | ');
        const itemsPart = parts[0];
        const parsedItems = itemsPart.split(', ').map(str => {
          const itemParts = str.split(': ₹');
          return { name: itemParts[0].trim(), priceExpr: itemParts[1] || '0' };
        });
        setItems(parsedItems);
        const paidPart = parts.find(p => p.includes('Paid: ₹'));
        setPaid(paidPart ? paidPart.replace('✅ Paid: ₹', '').trim() : '');
      } catch (e) {
        setItems([{ name: 'Correction', priceExpr: Math.abs(txn.amount).toString() }]);
      }
    } else {
      setItems([{ name: 'Correction', priceExpr: Math.abs(txn.amount).toString() }]);
    }
    setIsEntryOpen(true);
    setSelectedCustomer(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openRename = (c) => setDialog({ show: true, type: 'rename', data: c, value: c.name, pin: '', step: 0, error: '' });
  const openDelete = (c) => setDialog({ show: true, type: 'delete', data: c, value: '', pin: '', step: 0, error: '' });

  const handleDialogSubmit = async () => {
    const { type, data, value, pin, step } = dialog;
    if (isSaving) return;
    if (type === 'delete' && step === 0) return setDialog({ ...dialog, step: 1, error: '' });

    try {
      setIsSaving(true);
      if (type === 'rename') {
        const newNameClean = value.toLowerCase().trim();
        if (!newNameClean) return setDialog({...dialog, error: 'Name cannot be empty'});
        await supabase.from('customers').update({ name: newNameClean }).eq('id', data.id);
        showToast("Name Updated!");
      } else if (type === 'delete') {
        if (pin === '6111' || pin === '3853') {
          await supabase.from('transactions').delete().eq('customer_id', data.id);
          await supabase.from('customers').delete().eq('id', data.id);
          showToast("Account Deleted!");
        } else {
          setDialog({ ...dialog, error: 'Wrong PIN!', pin: '' });
          setIsSaving(false); return;
        }
      }
      fetchCustomers();
      setDialog({ show: false, type: '', data: null, value: '', pin: '', step: 0, error: '' });
    } catch (err) { showToast(err.message, "error"); }
    finally { setIsSaving(false); }
  };

  const evaluateMath = (expr) => {
    try {
      const sanitized = expr.toString().replace(/[^-()\d/*+.]/g, '');
      return Function(`'use strict'; return (${sanitized})`)() || 0;
    } catch { return 0; }
  };

  const handleQuickSave = async (e) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    const totalAmt = items.reduce((sum, i) => sum + evaluateMath(i.priceExpr), 0);
    const paidAmt = Number(paid || 0);
    const balanceEffect = totalAmt - paidAmt;
    const cleanName = quickName.toLowerCase().trim();
    if (!cleanName || (totalAmt <= 0 && paidAmt === 0)) return showToast("Enter Details!", "error");

    setIsSaving(true);
    try {
      let { data: customer } = await supabase.from('customers').select('*').eq('name', cleanName).maybeSingle();
      if (!customer) {
        const { data } = await supabase.from('customers').insert([{ name: cleanName, balance: 0 }]).select().single();
        customer = data;
      }
      const newBalance = (customer.balance || 0) + balanceEffect;
      const updatedList = customers.map(c => c.id === customer.id ? {...c, balance: newBalance} : c).sort((a, b) => a.name.localeCompare(b.name));
      setCustomers(updatedList);
      updateMasterCache(updatedList);
      if (editingId) {
        const { data: oldC } = await supabase.from('customers').select('balance').eq('id', originalCustId).single();
        await supabase.from('customers').update({ balance: (oldC.balance || 0) - oldAmount }).eq('id', originalCustId);
      }
      await supabase.from('customers').update({ balance: newBalance }).eq('id', customer.id);
      const itemsList = items.filter(i => i.name || i.priceExpr).map(i => `${i.name || 'Item'}: ₹${evaluateMath(i.priceExpr)}`).join(', ');
      const finalNote = itemsList 
        ? (paidAmt > 0 ? `${itemsList} | ✅ Paid: ₹${paidAmt} | 🚩 Left: ₹${balanceEffect}` : itemsList)
        : (paidAmt > 0 ? `Settlement: ₹${paidAmt}` : "Correction");
      if (editingId) {
        await supabase.from('transactions').update({ customer_id: customer.id, amount: balanceEffect, description: finalNote, type: balanceEffect < 0 ? 'CREDIT' : 'DEBIT' }).eq('id', editingId);
      } else {
        await supabase.from('transactions').insert([{ customer_id: customer.id, type: balanceEffect < 0 ? 'CREDIT' : 'DEBIT', amount: balanceEffect, description: finalNote }]);
      }
      setQuickName(''); setItems([{ name: '', priceExpr: '' }]); setPaid(''); setEditingId(null);
      setIsEntryOpen(false); fetchCustomers(); showToast("Success! ✅");
    } catch (err) { showToast(err.message, "error"); fetchCustomers(); }
    setIsSaving(false);
  };

  return (
    <div style={containerStyle} className="khata-container">
      <style>{`
        @keyframes tracer { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .tracer-box { position: relative; border-radius: 24px; padding: 2.5px; background: #222; overflow: hidden; z-index: 100; transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); width: 100%; }
        .tracer-box.is-open { transform: translateY(-78px); border-radius: 24px 24px 24px 24px; }
        .tracer-box::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: conic-gradient(transparent, transparent, transparent, #4caf50); animation: tracer 4s linear infinite; display: ${isEntryOpen ? 'none' : 'block'}; }
        .box-interior { position: relative; background: #1a1a1a; border-radius: 22px; z-index: 10; width: 100%; }
        .is-open .box-interior { border-radius: 0 0 22px 22px; padding-top: 5px; }
        .dropdown-shell { display: grid; grid-template-rows: ${isEntryOpen ? '1fr' : '0fr'}; transition: 0.35s ease; width: 100%; }
        input { -webkit-appearance: none !important; background-color: #000 !important; color: #fff !important; border: 1px solid #333 !important; outline: none !important; border-radius: 10px; padding: 12px; font-size: 15px; width: 100%; box-sizing: border-box; }
        input:focus { border-color: #4caf50 !important; }
      `}</style>

      {toast.show && <div style={toastStyle}>{toast.msg}</div>}

      <h2 style={{ color: '#4caf50', textAlign: 'center', marginBottom: '20px', fontWeight: '900', fontSize: '1.7rem', opacity: isEntryOpen ? 0 : 1 }}>📒 Shop Khata</h2>

      <div className={`tracer-box ${isEntryOpen ? 'is-open' : ''}`}>
        <div className="box-interior">
          <div style={isEntryOpen ? headerOpen : headerClosed} className={!isEntryOpen ? 'header-closed' : ''} onClick={() => { setIsEntryOpen(!isEntryOpen); if(isEntryOpen) setEditingId(null); }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={plusCircle(isEntryOpen)}>{isEntryOpen ? <X size={12} color="#4caf50" /> : <Plus size={22} color="#fff" />}</div>
                <span style={{fontWeight:'900', color: isEntryOpen ? '#4caf50' : '#fff', fontSize: isEntryOpen ? '0.75rem' : '1.1rem'}}>
                    {editingId ? 'CORRECTION' : (isEntryOpen ? 'DISCARD' : 'ADD NEW ENTRY')}
                </span>
             </div>
             <ChevronDown size={isEntryOpen ? 16 : 24} style={{transform: isEntryOpen ? 'rotate(180deg)' : 'none', color: isEntryOpen ? '#4caf50' : '#444'}} />
          </div>
          <div className="dropdown-shell">
            <div style={{overflow:'hidden'}}>
                <div style={quickBox}>
                    <label style={labelStyle}>Customer</label>
                    <div style={{ position: 'relative', marginBottom: '15px', width: '100%' }} ref={suggestionRef}>
                        <input placeholder="Name..." value={quickName} onFocus={() => setShowSuggestions(true)} onChange={e => setQuickName(e.target.value)} />
                        {showSuggestions && quickName && (
                        <div style={suggestionList}>
                            {customers.filter(c => c.name.toLowerCase().includes(quickName.toLowerCase())).slice(0, 4).map(c => (
                            <div key={c.id} onClick={() => { setQuickName(c.name); setShowSuggestions(false); }} style={suggestionItem}>{c.name}</div>
                            ))}
                        </div>
                        )}
                    </div>
                    <label style={labelStyle}>Details</label>
                    <div style={{width: '100%'}}>
                        {items.map((item, index) => (
                            <div key={index} style={itemRowGrid}>
                                <input placeholder="Item" value={item.name} onChange={e => {const n=[...items]; n[index].name=e.target.value; setItems(n)}} style={{ flex: 1.5 }} />
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <input inputMode="decimal" placeholder="Price" value={item.priceExpr} onChange={e => {const n=[...items]; n[index].priceExpr=e.target.value; setItems(n)}} style={{ color: '#ff4d4d', paddingLeft: '28px', fontWeight: '800' }} />
                                    <Calculator size={13} style={calcIcon} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setItems([...items, { name: '', priceExpr: '' }])} style={addBtn}>+ Add Row</button>
                    <div style={bottomRow}>
                        <div style={{ flex: 1 }}><p style={labelStyle}>Paid</p><input inputMode="numeric" placeholder="0" value={paid} onChange={e => setPaid(e.target.value)} style={{ color: '#4caf50', fontWeight: '900' }} /></div>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                            <p style={labelStyle}>Total</p>
                            <h2 style={{ margin: 0, color: '#ff4d4d', fontWeight: '900', fontSize: '1.4rem' }}>₹{items.reduce((s, i) => s + evaluateMath(i.priceExpr), 0)}</h2>
                        </div>
                        <button onClick={handleQuickSave} disabled={isSaving} style={{...saveBtn, background: isSaving ? '#222' : '#4caf50'}}><Send size={20} /></button>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '25px', padding: '0 8px 10px', fontSize: '0.7rem', color: '#666', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Customer Ledger Records
      </div>

      <div style={searchWrapper}>
        <Search size={14} color="#888" />
        <input placeholder="Search Ledger..." style={searchInput} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div style={unifiedListBox}>
        {customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
          <div key={c.id} style={customerRow} className="customer-row" onClick={() => openHistory(c)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <div style={avatarCircle}>{c.name[0].toUpperCase()}</div>
              {/* 🚀 FIXED: LARGER FONT SIZE FOR NAME */}
              <strong style={{ fontSize: '1.10rem', textTransform: 'capitalize', color: '#eee', fontWeight: '700' }}>{c.name}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {/* 🚀 FIXED: LARGER FONT SIZE FOR BALANCE */}
              <span style={{ color: c.balance > 0 ? '#ff4d4d' : '#4caf50', fontWeight: '950', fontSize: '1.15rem' }}>₹{c.balance}</span>
              <div style={{ display: 'flex', gap: '12px', borderLeft: '1px solid #333', paddingLeft: '12px' }}>
                <Edit3 size={17} color="#444" onClick={(e) => { e.stopPropagation(); openRename(c); }} style={{ cursor: 'pointer' }} />
                <Trash2 size={17} color="#555" onClick={(e) => { e.stopPropagation(); openDelete(c); }} style={{ cursor: 'pointer' }} />
              </div>
            </div>
          </div>
        ))}
        <div style={{ height: '50px', borderTop: '1px solid #222', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#333', fontSize: '0.6rem', fontWeight: '800' }}>END OF LEDGER</div>
      </div>

      {dialog.show && (
        <div style={dialogOverlay}>
          <div style={dialogCard} className="dialog-card">
            <div style={dialogIconBox(dialog.type === 'delete' ? '#ff4d4d' : '#4caf50')}>
                {dialog.type === 'delete' ? <AlertTriangle color="#fff" size={28} /> : <Edit3 color="#fff" size={28}/>}
            </div>
            <h2 style={dialogMainTitle}>{dialog.type === 'rename' ? 'Rename' : (dialog.step === 0 ? 'DANGER ZONE' : 'PIN Required')}</h2>
            {(dialog.type === 'rename' || dialog.step === 1) && (
                <input placeholder={dialog.type === 'rename' ? "New Name..." : "Enter PIN"} value={dialog.type === 'rename' ? dialog.value : dialog.pin} onChange={e => dialog.type === 'rename' ? setDialog({...dialog, value: e.target.value}) : setDialog({...dialog, pin: e.target.value})} style={dialogInput} autoFocus type={dialog.type === 'rename' ? "text" : "password"} />
            )}
            <div style={dialogActions}>
              <button onClick={() => setDialog({show:false, type:'', data:null, value:'', pin:'', step:0, error:''})} style={dialogBtn('#222', '#888')}>CANCEL</button>
              <button onClick={handleDialogSubmit} style={dialogBtn(dialog.type === 'delete' ? '#ff4d4d' : '#4caf50', '#000')}>CONFIRM</button>
            </div>
          </div>
        </div>
      )}

      {selectedCustomer && <CustomerHistory customer={selectedCustomer} history={history} onClose={() => setSelectedCustomer(null)} onRefresh={handleRefresh} onEdit={(txn) => handleEditInitiate(txn, selectedCustomer)} />}
      <div style={{ height: '80px' }} />
    </div>
  );
};

// --- STYLES ---
const containerStyle = { maxWidth: '520px', margin: '0 auto', padding: '10px 12px 20px', boxSizing: 'border-box', minHeight: '100vh' };
const headerClosed = { padding: '22px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' };
const headerOpen = { padding: '8px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' };
const plusCircle = (open) => ({ background: open ? 'rgba(76, 175, 80, 0.1)' : '#000', border: `1.5px solid ${open ? '#4caf50' : '#444'}`, borderRadius: '50%', padding: open ? '3px' : '8px', display: 'flex' });
const quickBox = { padding: '8px 15px 25px', width: '100%', boxSizing: 'border-box' };
const itemRowGrid = { display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', width: '100%' };
const calcIcon = { position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#333' };
const addBtn = { background: '#000', border: '1px dashed #333', color: '#666', width: '100%', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' };
const bottomRow = { display: 'flex', gap: '10px', alignItems: 'flex-end', marginTop: '15px', borderTop: '1px solid #222', paddingTop: '15px', width: '100%' };
const saveBtn = { border: 'none', color: '#000', padding: '12px 18px', borderRadius: '12px', cursor: 'pointer' };
const labelStyle = { fontSize: '0.6rem', color: '#444', fontWeight: '900', marginBottom: '4px', textTransform: 'uppercase' };
const searchWrapper = { display: 'flex', alignItems: 'center', gap: '8px', background: '#1a1a1a', padding: '8px 12px', borderRadius: '10px', border: '1px solid #222', marginBottom: '15px', width: '100%', boxSizing: 'border-box' };
const searchInput = { background: 'none', border: 'none !important', color: '#fff', outline: 'none', width: '100%', fontSize: '0.8rem', fontWeight: '600' };
const unifiedListBox = { background: '#1a1a1a', borderRadius: '22px', border: '1px solid #222', overflow: 'hidden', width: '100%', marginBottom: '30px' };
const customerRow = { display: 'flex', justifyContent: 'space-between', padding: '14px 18px', alignItems: 'center', borderBottom: '1px solid #222', cursor: 'pointer' };
const avatarCircle = { minWidth: '40px', height: '40px', borderRadius: '50%', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: '#4caf50', fontSize: '1rem' };
const suggestionList = { position: 'absolute', top: '100%', left: 0, right: 0, background: '#000', borderRadius: '12px', border: '1px solid #333', zIndex: 1000, marginTop: '8px' };
const suggestionItem = { padding: '14px', color: '#4caf50', fontWeight: '800', borderBottom: '1px solid #111' };
const toastStyle = { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', padding: '12px 25px', borderRadius: '50px', background: '#4caf50', color: '#000', fontWeight: 'bold', zIndex: 9999 };
const dialogOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' };
const dialogCard = { width: '100%', maxWidth: '340px', background: '#1a1a1a', border: '1.5px solid #333', borderRadius: '35px', padding: '35px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' };
const dialogIconBox = (c) => ({ width: '70px', height: '70px', borderRadius: '50%', background: c, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' });
const dialogMainTitle = { color: '#fff', fontSize: '1.3rem', fontWeight: '950', margin: '0', textTransform: 'uppercase', letterSpacing: '1px' };
const dialogSubTitle = { color: '#888', fontSize: '0.9rem', margin: '15px 0', textAlign: 'center', fontWeight: '600', lineHeight: '1.6' };
const dialogInput = { width: '100%', background: '#000', border: '1px solid #333', padding: '18px', borderRadius: '18px', color: '#fff', textAlign: 'center', fontSize: '1.2rem', fontWeight: '900', marginTop: '10px' };
const dialogActions = { display: 'flex', width: '100%', gap: '12px', marginTop: '30px' };
const dialogBtn = (bg, col) => ({ flex: 1, background: bg, color: col, border: 'none', padding: '18px', borderRadius: '18px', fontWeight: '950', cursor: 'pointer', transition: '0.2s' });

export default Khata;