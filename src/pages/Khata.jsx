import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Send, Plus, Calculator, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import CustomerHistory from './CustomerHistory'; 

const Khata = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  
  const [quickName, setQuickName] = useState('');
  const [items, setItems] = useState([{ name: '', priceExpr: '' }]);
  const [paid, setPaid] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  const suggestionRef = useRef(null);

  useEffect(() => {
    fetchCustomers();
    const handleClickOutside = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000);
  };

  const fetchCustomers = async () => {
    // 📂 Cache Load
    const cached = localStorage.getItem('cache_customers');
    if (cached) setCustomers(JSON.parse(cached));

    const { data } = await supabase.from('customers').select('*').order('name');
    if (data) {
      setCustomers(data);
      // 📂 Cache Save
      localStorage.setItem('cache_customers', JSON.stringify(data));
    }
  };

  const handleRefresh = async (customerId) => {
    await fetchCustomers();
    const { data } = await supabase.from('transactions').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });
    setHistory(data || []);
    const { data: updatedCust } = await supabase.from('customers').select('*').eq('id', customerId).single();
    if (updatedCust) setSelectedCustomer(updatedCust);
  };

  const openHistory = async (customer) => {
    // 📂 Cache Load (Specific Customer Logs)
    const cachedLogs = localStorage.getItem(`logs_${customer.id}`);
    if (cachedLogs) setHistory(JSON.parse(cachedLogs));

    const { data } = await supabase.from('transactions').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false });
    if (data) {
      setHistory(data);
      // 📂 Cache Save
      localStorage.setItem(`logs_${customer.id}`, JSON.stringify(data));
    } else {
      setHistory([]);
    }
    setSelectedCustomer(customer);
  };

  const evaluateMath = (expr) => {
    try {
      const sanitized = expr.replace(/[^-()\d/*+.]/g, '');
      return Function(`'use strict'; return (${sanitized})`)() || 0;
    } catch { return 0; }
  };

  const handleQuickSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    const totalAmt = items.reduce((sum, i) => sum + evaluateMath(i.priceExpr), 0);
    const paidAmt = Number(paid || 0);
    const balanceEffect = totalAmt - paidAmt;
    
    const cleanName = quickName.toLowerCase().trim();
    if (!cleanName || totalAmt <= 0) {
      showToast("Enter Name & Amount!", "error");
      return;
    }

    setIsSaving(true);
    try {
      let { data: customer } = await supabase.from('customers').select('*').eq('name', cleanName).maybeSingle();
      if (!customer) {
        const { data } = await supabase.from('customers').insert([{ name: cleanName, balance: 0 }]).select().single();
        customer = data;
      }

      await supabase.from('customers').update({ balance: (customer.balance || 0) + balanceEffect }).eq('id', customer.id);

      const itemsList = items.map(i => `${i.name || 'Item'}: ₹${evaluateMath(i.priceExpr)}`).join(', ');
      const finalNote = paidAmt > 0 
        ? `${itemsList} | ✅ Paid: ₹${paidAmt} | 🚩 Left: ₹${balanceEffect}`
        : itemsList;

      await supabase.from('transactions').insert([{ 
        customer_id: customer.id, 
        type: 'DEBIT', 
        amount: balanceEffect, 
        description: finalNote 
      }]);
      
      setQuickName(''); setItems([{ name: '', priceExpr: '' }]); setPaid('');
      fetchCustomers();
      showToast("Khata Updated! 🔥");
    } catch (err) { 
      showToast(err.message, "error");
    }
    setIsSaving(false);
  };

  return (
    <div style={containerStyle}>
      {toast.show && (
        <div style={{...toastStyle, backgroundColor: toast.type === 'success' ? '#4caf50' : '#ff4d4d'}}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      <h2 style={{ color: '#4caf50', textAlign: 'center', marginBottom: '20px' }}>📒 Shop Khata</h2>

      <div style={quickBox}>
        <div style={inputGroup} ref={suggestionRef}>
          <label style={labelStyle}>Customer Name</label>
          <div style={{ position: 'relative' }}>
            <input 
              placeholder="Type Name..." 
              value={quickName} 
              onFocus={() => setShowSuggestions(true)}
              onChange={e => { setQuickName(e.target.value); setShowSuggestions(true); }} 
              style={{ ...inputStyle, width: '100%' }} 
            />
            {showSuggestions && quickName && (
              <div style={suggestionList}>
                {customers
                  .filter(c => c.name.toLowerCase().includes(quickName.toLowerCase()))
                  .slice(0, 4)
                  .map(c => (
                    <div key={c.id} onClick={() => { setQuickName(c.name); setShowSuggestions(false); }} style={suggestionItem}>
                      {c.name}
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '15px' }}>
          <label style={labelStyle}>Items & Prices</label>
          {items.map((item, index) => (
            <div key={index} style={itemRowGrid}>
              <input placeholder="Item" value={item.name} onChange={e => {const n=[...items]; n[index].name=e.target.value; setItems(n)}} style={{ ...inputStyle, flex: 2, minWidth: '0' }} />
              <div style={{ flex: 1, position: 'relative', minWidth: '110px' }}>
                <input inputMode="decimal" placeholder="Price" value={item.priceExpr} onChange={e => {const n=[...items]; n[index].priceExpr=e.target.value; setItems(n)}} style={{ ...inputStyle, width: '100%', color: '#ff4d4d', paddingLeft: '28px' }} />
                <Calculator size={13} style={calcIcon} />
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => setItems([...items, { name: '', priceExpr: '' }])} style={addBtn}>
          <Plus size={16} /> Add More Item
        </button>

        <div style={bottomRow}>
          <div style={{ flex: 1 }}>
            <p style={labelStyle}>Paid Today</p>
            <input inputMode="numeric" placeholder="0" value={paid} onChange={e => setPaid(e.target.value)} style={{ ...inputStyle, width: '100%', color: '#4caf50', fontWeight: 'bold' }} />
          </div>
          <div style={{ flex: 1, textAlign: 'right', paddingRight: '10px' }}>
            <p style={labelStyle}>Total Bill</p>
            <h2 style={{ margin: 0, color: '#ff4d4d' }}>₹{items.reduce((s, i) => s + evaluateMath(i.priceExpr), 0)}</h2>
          </div>
          <button 
            onClick={handleQuickSave} 
            disabled={isSaving} 
            style={{...saveBtn, background: isSaving ? '#222' : '#4caf50', transform: isSaving ? 'scale(0.95)' : 'scale(1)'}}
          >
            {isSaving ? "..." : <Send size={20} />}
          </button>
        </div>
      </div>

      <div style={searchWrapper}>
        <Search size={18} color="#666" /><input placeholder="Search records..." style={searchInput} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div style={{ marginTop: '15px' }}>
        {customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
          <div key={c.id} style={customerRow} onClick={() => openHistory(c)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={avatarCircle}>{c.name[0].toUpperCase()}</div>
              <strong style={{ fontSize: '1rem', textTransform: 'capitalize' }}>{c.name}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: c.balance > 0 ? '#ff4d4d' : '#4caf50', fontWeight: 'bold' }}>₹{c.balance}</span>
              <ChevronRight size={16} color="#333" />
            </div>
          </div>
        ))}
      </div>

      {selectedCustomer && (
        <CustomerHistory customer={selectedCustomer} history={history} onClose={() => setSelectedCustomer(null)} onRefresh={handleRefresh} />
      )}
    </div>
  );
};

const containerStyle = { maxWidth: '550px', margin: '0 auto', padding: '15px', paddingBottom: '100px' };
const quickBox = { background: '#1a1a1a', padding: '18px', borderRadius: '20px', border: '1px solid #4caf50', marginBottom: '20px' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '5px' };
const itemRowGrid = { display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' };
const inputStyle = { padding: '12px', borderRadius: '10px', border: '1px solid #333', background: '#000', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
const calcIcon = { position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#666' };
const addBtn = { background: 'rgba(255,255,255,0.05)', border: '1px dashed #444', color: '#aaa', width: '100%', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' };
const bottomRow = { display: 'flex', gap: '12px', alignItems: 'flex-end', marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' };
const saveBtn = { border: 'none', color: '#fff', padding: '12px 18px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s ease' };
const labelStyle = { fontSize: '0.75rem', color: '#888', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' };
const searchWrapper = { display: 'flex', alignItems: 'center', gap: '10px', background: '#1e1e1e', padding: '12px', borderRadius: '12px', border: '1px solid #333' };
const searchInput = { background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%' };
const customerRow = { display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#1e1e1e', borderRadius: '15px', marginBottom: '8px', alignItems: 'center', cursor: 'pointer', border: '1px solid #222' };
const avatarCircle = { minWidth: '35px', height: '35px', borderRadius: '50%', background: '#333', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: '#4caf50' };
const suggestionList = { position: 'absolute', top: '100%', left: 0, right: 0, background: '#111', borderRadius: '0 0 10px 10px', border: '1px solid #333', zIndex: 10, marginTop: '-2px' };
const suggestionItem = { padding: '12px', color: '#4caf50', fontSize: '0.85rem', borderBottom: '1px solid #222', cursor: 'pointer', textTransform: 'capitalize' };
const toastStyle = { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', padding: '12px 20px', borderRadius: '50px', color: '#fff', fontWeight: 'bold', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', transition: 'all 0.3s ease' };

export default Khata;