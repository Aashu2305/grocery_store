import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Send, Plus, Calculator, ChevronRight } from 'lucide-react';
import CustomerHistory from './CustomerHistory'; 

const Khata = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  
  const [quickName, setQuickName] = useState('');
  const [items, setItems] = useState([{ name: '', priceExpr: '' }]);
  const [paid, setPaid] = useState('');

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('name');
    if (data) setCustomers(data);
  };

  // Fixed: Added handleRefresh to sync data after "Pay Now" is used in CustomerHistory
  const handleRefresh = async (customerId) => {
    await fetchCustomers(); // Update main list balances
    const { data } = await supabase.from('transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    
    setHistory(data || []);
    
    // Update the selected customer state with new balance
    const { data: updatedCust } = await supabase.from('customers').select('*').eq('id', customerId).single();
    if (updatedCust) setSelectedCustomer(updatedCust);
  };

  const openHistory = async (customer) => {
    const { data } = await supabase.from('transactions')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });
    setHistory(data || []);
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
    const totalAmt = items.reduce((sum, i) => sum + evaluateMath(i.priceExpr), 0);
    const paidAmt = Number(paid || 0);
    if (!quickName || totalAmt <= 0) return alert("Enter valid info!");

    try {
      let { data: customer } = await supabase.from('customers').select('*').eq('name', quickName).maybeSingle();
      if (!customer) {
        const { data } = await supabase.from('customers').insert([{ name: quickName, balance: 0 }]).select().single();
        customer = data;
      }
      const newBalance = (customer.balance || 0) + (totalAmt - paidAmt);
      await supabase.from('customers').update({ balance: newBalance }).eq('id', customer.id);
      const note = items.map(i => `${i.name || 'Item'}: ₹${evaluateMath(i.priceExpr)}`).join(', ');
      await supabase.from('transactions').insert([{ customer_id: customer.id, type: 'DEBIT', amount: totalAmt, description: note }]);
      if (paidAmt > 0) await supabase.from('transactions').insert([{ customer_id: customer.id, type: 'CREDIT', amount: paidAmt, description: "Payment" }]);
      
      setQuickName(''); setItems([{ name: '', priceExpr: '' }]); setPaid('');
      fetchCustomers();
      alert("Udhaar Saved!");
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ color: '#4caf50', textAlign: 'center', marginBottom: '20px' }}>📒 Shop Khata</h2>

      {/* QUICK ENTRY */}
      <div style={quickBox}>
        <div style={inputGroup}>
          <label style={labelStyle}>Customer Name</label>
          <input 
            placeholder="Type Name..." 
            value={quickName} 
            onChange={e => setQuickName(e.target.value)} 
            style={{ ...inputStyle, width: '100%' }} 
          />
        </div>

        <div style={{ marginTop: '15px' }}>
          <label style={labelStyle}>Items & Prices</label>
          {items.map((item, index) => (
            <div key={index} style={itemRowGrid}>
              <input 
                placeholder="Item" 
                value={item.name} 
                onChange={e => {const n=[...items]; n[index].name=e.target.value; setItems(n)}} 
                style={{ ...inputStyle, flex: 2, minWidth: '0' }} 
              />
              <div style={{ flex: 1, position: 'relative', minWidth: '110px' }}>
                <input 
                  inputMode="decimal" 
                  placeholder="Price" 
                  value={item.priceExpr} 
                  onChange={e => {const n=[...items]; n[index].priceExpr=e.target.value; setItems(n)}} 
                  style={{ ...inputStyle, width: '100%', color: '#ff4d4d', paddingLeft: '28px' }} 
                />
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
            <input 
              inputMode="numeric" 
              placeholder="0"
              value={paid} 
              onChange={e => setPaid(e.target.value)} 
              style={{ ...inputStyle, width: '100%', color: '#4caf50', fontWeight: 'bold' }} 
            />
          </div>
          <div style={{ flex: 1, textAlign: 'right', paddingRight: '10px' }}>
            <p style={labelStyle}>Total Bill</p>
            <h2 style={{ margin: 0, color: '#ff4d4d' }}>₹{items.reduce((s, i) => s + evaluateMath(i.priceExpr), 0)}</h2>
          </div>
          <button onClick={handleQuickSave} style={saveBtn}><Send size={20} /></button>
        </div>
      </div>

      <div style={searchWrapper}>
        <Search size={18} color="#666" />
        <input placeholder="Search records..." style={searchInput} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div style={{ marginTop: '15px' }}>
        {customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
          <div key={c.id} style={customerRow} onClick={() => openHistory(c)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={avatarCircle}>{c.name[0].toUpperCase()}</div>
              <strong style={{ fontSize: '1rem' }}>{c.name}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: c.balance > 0 ? '#ff4d4d' : '#4caf50', fontWeight: 'bold' }}>₹{c.balance}</span>
              <ChevronRight size={16} color="#333" />
            </div>
          </div>
        ))}
      </div>

      {selectedCustomer && (
        <CustomerHistory 
          customer={selectedCustomer} 
          history={history} 
          onClose={() => setSelectedCustomer(null)} 
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
};

// --- Professional Responsive Styles ---
const containerStyle = { maxWidth: '550px', margin: '0 auto', padding: '15px', boxSizing: 'border-box', paddingBottom: '100px' };
const quickBox = { background: '#1a1a1a', padding: '18px', borderRadius: '20px', border: '1px solid #4caf50', marginBottom: '20px' };
const inputGroup = { display: 'flex', flexDirection: 'column', gap: '5px' };
const itemRowGrid = { display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' };
const inputStyle = { padding: '12px', borderRadius: '10px', border: '1px solid #333', background: '#000', color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
const calcIcon = { position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#666' };
const addBtn = { background: 'rgba(255,255,255,0.05)', border: '1px dashed #444', color: '#aaa', width: '100%', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' };
const bottomRow = { display: 'flex', gap: '12px', alignItems: 'flex-end', marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' };
const saveBtn = { background: '#4caf50', border: 'none', color: '#fff', padding: '12px 18px', borderRadius: '12px', cursor: 'pointer' };
const labelStyle = { fontSize: '0.75rem', color: '#888', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' };
const searchWrapper = { display: 'flex', alignItems: 'center', gap: '10px', background: '#1e1e1e', padding: '12px', borderRadius: '12px', border: '1px solid #333' };
const searchInput = { background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%' };
const customerRow = { display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#1e1e1e', borderRadius: '15px', marginBottom: '8px', alignItems: 'center', cursor: 'pointer', border: '1px solid #222' };
const avatarCircle = { minWidth: '35px', height: '35px', borderRadius: '50%', background: '#333', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: '#4caf50' };

export default Khata;