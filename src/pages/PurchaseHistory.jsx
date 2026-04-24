import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Store, Package, Send, Plus, Trash2, ChevronRight, ChevronDown,
  Calendar, Clock, X, Edit3, MessageSquare, CheckCircle, IndianRupee, ReceiptText, Wallet
} from 'lucide-react';

const PurchaseHistory = () => {
  const [bills, setBills] = useState([]);
  const [allStores, setAllStores] = useState([]);
  const [expandedStore, setExpandedStore] = useState(null);
  const [expandedDate, setExpandedDate] = useState(null);
  const [billDetails, setBillDetails] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: '' });
  
  const [storeName, setStoreName] = useState('');
  const [items, setItems] = useState([{ name: '', price: '', is_paid: true }]); 
  const [totalPaid, setTotalPaid] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const suggestionRef = useRef(null);

  useEffect(() => {
    fetchBills();
    const handleClickOutside = (e) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showConfirm = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3500);
  };

  const fetchBills = async () => {
    const { data } = await supabase.from('purchase_bills').select('*').order('created_at', { ascending: false });
    if (data) {
      setBills([...data]);
      const uniqueStores = [...new Set(data.map(b => b.store_name))].sort((a, b) => a.localeCompare(b));
      setAllStores(uniqueStores);
    }
  };

  const handleEdit = async (bill) => {
    setEditingId(bill.id);
    setStoreName(bill.store_name);
    setTotalPaid(bill.amount_paid);
    setDescription(bill.description || '');
    const { data: pItems } = await supabase.from('purchase_items').select('*').eq('bill_id', bill.id);
    setItems(pItems?.length > 0 
      ? pItems.map(i => ({ name: i.item_name, price: i.price, is_paid: i.is_paid })) 
      : [{ name: '', price: '', is_paid: true }]
    );
    setIsEntryOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!storeName.trim() || isSaving) return;
    setIsSaving(true);
    const activeItems = items.filter(i => i.name && i.name.trim() !== '');
    const totalBill = activeItems.reduce((sum, i) => sum + Number(i.price || 0), 0);
    const paidAmt = Number(totalPaid || 0);
    const finalStore = storeName.trim().toLowerCase();

    try {
      let activeBillId = editingId;
      const billData = {
        store_name: finalStore,
        total_amount: totalBill,
        amount_paid: paidAmt,
        description: (totalBill === 0 && paidAmt > 0) ? (description || 'Cash Settlement') : description
      };

      if (editingId) {
        await supabase.from('purchase_bills').update(billData).eq('id', editingId);
        await supabase.from('purchase_items').delete().eq('bill_id', editingId);
      } else {
        const { data: newBill, error: bErr } = await supabase.from('purchase_bills').insert([billData]).select().single();
        if (bErr) throw bErr;
        activeBillId = newBill.id;
      }

      if (activeBillId && activeItems.length > 0) {
        const itemsToInsert = activeItems.map(i => ({
          bill_id: activeBillId,
          item_name: i.name.trim(),
          price: Number(i.price || 0),
          is_paid: i.is_paid
        }));
        await supabase.from('purchase_items').insert(itemsToInsert);
      }

      showConfirm(`Saved: ${finalStore.toUpperCase()}`);
      setEditingId(null); setStoreName(''); setItems([{ name: '', price: '', is_paid: true }]); 
      setTotalPaid(''); setDescription(''); setIsEntryOpen(false); await fetchBills(); setExpandedDate(null); 
    } catch (err) { alert("Error: " + err.message); }
    setIsSaving(false);
  };

  const fetchBillDetailsForDate = async (store, dateStr) => {
    const key = `${store}-${dateStr}`;
    if (expandedDate === key) return setExpandedDate(null);
    const billsOnDate = bills.filter(b => b.store_name === store && new Date(b.created_at).toLocaleDateString() === dateStr);
    const { data } = await supabase.from('purchase_items').select('*').in('bill_id', billsOnDate.map(b => b.id));
    setBillDetails(billsOnDate.map(b => ({ ...b, items: data?.filter(item => item.bill_id === b.id) || [] })));
    setExpandedDate(key);
  };

  const groupedData = bills.reduce((acc, bill) => {
    const date = new Date(bill.created_at).toLocaleDateString();
    if (!acc[bill.store_name]) acc[bill.store_name] = { dates: {}, allTotal: 0, allPaid: 0 };
    if (!acc[bill.store_name].dates[date]) acc[bill.store_name].dates[date] = { total: 0, paid: 0 };
    acc[bill.store_name].dates[date].total += bill.total_amount;
    acc[bill.store_name].allTotal += bill.total_amount;
    acc[bill.store_name].allPaid += bill.amount_paid;
    return acc;
  }, {});

  // 🚀 FIXED: Guaranteed alphabetical sort for the main ledger list
  const sortedStoreKeys = Object.keys(groupedData).sort((a, b) => a.localeCompare(b));

  return (
    <div style={container}>
      <style>{`
        @keyframes tracer { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translate(-50%, -100%); } to { transform: translate(-50%, 20px); } }
        .tracer-box { position: relative; border-radius: 28px; padding: 2px; background: #222; overflow: hidden; margin-bottom: 25px; }
        .tracer-box::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: conic-gradient(transparent, transparent, transparent, #ff9800); animation: tracer 5s linear infinite; display: ${isEntryOpen ? 'none' : 'block'}; }
        
        .inner-wrap { position: relative; background: #1a1a1a; border-radius: 26px; z-index: 10; }
        .black-field { background: #000 !important; border: 1.5px solid #2a2a2a !important; color: #fff !important; padding: 12px; border-radius: 12px; outline: none; width: 100%; box-sizing: border-box; font-size: 0.9rem; }
        .black-field:focus { border-color: #ff9800 !important; }
        .entry-grid { display: grid; grid-template-columns: 1fr 120px 45px; gap: 6px; margin-bottom: 8px; align-items: center; }
        .status-box { background: #000; border: 1.5px solid #2a2a2a; border-radius: 10px; height: 45px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .dot { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid #000; }
        .bottom-flex { display: flex; gap: 10px; align-items: center; margin-top: 20px; border-top: 1px solid #2a2a2a; padding-top: 20px; }
        .submit-btn { background: #ff9800; border: none; height: 48px; width: 55px; border-radius: 10px; cursor: pointer; color: #000; display: flex; align-items: center; justify-content: center; transition: 0.1s; flex-shrink: 0; }
        .submit-btn:active { transform: scale(0.92); }
        .toast-box { position: fixed; top: 0; left: 50%; transform: translateX(-50%); background: #222; border: 1px solid #ff9800; color: #fff; padding: 12px 24px; border-radius: 12px; font-weight: bold; z-index: 9999; box-shadow: 0 10px 40px rgba(0,0,0,0.8); animation: slideIn 0.3s forwards; font-size: 0.85rem; }
        .store-list-container { background: #1a1a1a; border-radius: 28px; border: 1px solid #333; overflow: hidden; padding: 5px 0; }
      `}</style>

      {toast.show && <div className="toast-box">{toast.msg}</div>}

      <h2 style={titleStyle}>📦 PURCHASE LOGS</h2>

      <div className="tracer-box">
        <div className="inner-wrap">
          <div style={dropboxHeader} onClick={() => {setIsEntryOpen(!isEntryOpen); if(isEntryOpen) setEditingId(null);}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={plusCircle(isEntryOpen)}>{isEntryOpen ? <X size={18} color="#ff9800" /> : <Plus size={18} color="#fff" />}</div>
              <span style={{ fontWeight: '950', color: isEntryOpen ? '#ff9800' : '#fff', letterSpacing: '0.5px', fontSize: '0.9rem' }}>{editingId ? 'FIXING BILL' : 'ADD NEW PURCHASE'}</span>
            </div>
            <ChevronDown style={{ transform: isEntryOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.4s', color: isEntryOpen ? '#ff9800' : '#555' }} size={20} />
          </div>

          <div style={{ display: 'grid', gridTemplateRows: isEntryOpen ? '1fr' : '0fr', transition: '0.4s ease', overflow: 'hidden' }}>
            <div style={{ minHeight: 0 }}>
              <div style={quickBox}>
                <div style={{ position: 'relative' }} ref={suggestionRef}>
                  <label style={labelStyle}>Vendor / Store</label>
                  <div style={{position: 'relative'}}><Store size={14} color="#ff9800" style={iconLeft}/><input placeholder="Search or type store..." value={storeName} onFocus={() => setShowSuggestions(true)} onChange={e => setStoreName(e.target.value)} className="black-field" style={{paddingLeft: '35px'}}/></div>
                  {showSuggestions && storeName && (
                    <div style={suggestionBox}>{allStores.filter(s => s.toLowerCase().includes(storeName.toLowerCase())).map(s => (<div key={s} onClick={() => {setStoreName(s); setShowSuggestions(false);}} style={suggestionItem}>{s}</div>))}</div>
                  )}
                </div>

                <div style={{ marginTop: '15px' }}>
                  <label style={labelStyle}>List Items</label>
                  {items.map((item, idx) => (
                    <div key={idx} className="entry-grid">
                      <input placeholder="Item name" value={item.name} onChange={e => {const n=[...items]; n[idx].name=e.target.value; setItems(n)}} className="black-field" />
                      <input placeholder="₹ Price" value={item.price} onChange={e => {const n=[...items]; n[idx].price=e.target.value; setItems(n)}} className="black-field" style={{color: '#ff9800', fontWeight: '900', textAlign: 'right'}} />
                      <div className="status-box" onClick={() => {const n=[...items]; n[idx].is_paid=!n[idx].is_paid; setItems(n)}}>
                        <div className="dot" style={{ background: item.is_paid ? '#4caf50' : '#ffeb3b' }} />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setItems([...items, { name: '', price: '', is_paid: true }])} style={addBtn}>+ NEXT ROW</button>
                </div>

                <div className="bottom-flex">
                  <div style={{flex: 1}}><p style={labelStyle}>Total</p><h3 style={{margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: '950'}}>₹{items.reduce((s, i) => s + Number(i.price || 0), 0)}</h3></div>
                  <div style={{flex: 1}}><p style={labelStyle}>Paid</p><input placeholder="₹ 0" value={totalPaid} onChange={e => setTotalPaid(e.target.value)} className="black-field" style={{color: '#4caf50', fontWeight: '950', fontSize: '1rem', height: '45px'}} /></div>
                  <button onClick={handleSave} className="submit-btn" disabled={isSaving}>
                    {isSaving ? "..." : (editingId ? <CheckCircle size={22}/> : <Send size={22} />)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h3 style={labelStyle}>Store Ledger</h3>
      <div className="store-list-container">
        {sortedStoreKeys.map((store, index) => (
          <div key={store} style={{...storeAccordion, marginBottom: 0, border: 'none', borderRadius: 0, borderBottom: index !== sortedStoreKeys.length - 1 ? '1px solid #222' : 'none'}}>
            <div style={storeHeader} onClick={() => {setExpandedStore(expandedStore === store ? null : store); setExpandedDate(null);}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', flex: 1}}><div style={avatar}>{store[0].toUpperCase()}</div><span style={storeNameTitle}>{store}</span></div>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                 {expandedStore === store && (
                   <div style={statsBadge}>
                     <div style={{borderRight: '1px solid #333', paddingRight: '10px'}}><p style={statsLabel}>TOTAL</p><span style={{color: '#4caf50', fontWeight: '950', fontSize: '0.75rem'}}>₹{groupedData[store].allTotal}</span></div>
                     <div style={{paddingLeft: '5px'}}><p style={statsLabel}>DUE</p><span style={{color: '#ff4d4d', fontWeight: '950', fontSize: '0.75rem'}}>₹{groupedData[store].allTotal - groupedData[store].allPaid}</span></div>
                   </div>
                 )}
                 <ChevronRight style={{transform: expandedStore === store ? 'rotate(90deg)' : 'none', transition: '0.2s'}} size={18} color="#444" />
              </div>
            </div>

            {expandedStore === store && (
              <div style={dateListContainer}>
                {Object.keys(groupedData[store].dates).map(date => {
                  const isSelected = expandedDate === `${store}-${date}`;
                  return (
                    <div key={date} style={dateWrapper}>
                      <div style={dateHeader} onClick={() => fetchBillDetailsForDate(store, date)}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><Calendar size={12} color="#ff9800" /><span style={dateText}>{date}</span></div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}><span style={{color: '#fff', fontWeight: '950', fontSize: '1.1rem'}}>₹{groupedData[store].dates[date].total}</span>{isSelected ? <X size={14} color="#ff4d4d" /> : <ChevronRight size={14} color="#444" />}</div>
                      </div>
                      {isSelected && (
                        <div style={{padding: '10px 0 20px'}}>{billDetails.map((bill) => (
                          <div key={bill.id} style={{...billCard, borderLeft: bill.total_amount === 0 ? '4px solid #4caf50' : '1px solid #222'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}><div style={billTimeHeader}><Clock size={10} /> {new Date(bill.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><Edit3 size={14} color="#444" onClick={() => handleEdit(bill)} style={{cursor:'pointer'}} /></div>
                            {bill.total_amount === 0 ? (
                                 <div style={settlementBox}><div style={{display:'flex', alignItems:'center', gap:'8px'}}><Wallet size={14} color="#4caf50"/><span style={{color: '#4caf50', fontWeight: 'bold', fontSize: '1.1rem'}}>{bill.description || 'Settlement'}</span></div><span style={{color: '#fff', fontWeight: '950', fontSize: '1.2rem'}}>₹{bill.amount_paid}</span></div>
                              ) : (
                                <>
                                  <div style={{marginBottom: '15px'}}>{bill.items.map((item, i) => (
                                    <div key={i} style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                                      <div className="dot" style={{ background: item.is_paid ? '#4caf50' : '#ffeb3b', width: '8px', height: '8px' }} />
                                      {/* 🚀 FIXED: Larger Item & Price fonts */}
                                      <span style={{flex: 1, color: '#eee', fontSize: '1.1rem', fontWeight: '600'}}>{item.item_name}</span>
                                      <span style={{color: '#fff', fontWeight: '900', fontSize: '1.1rem'}}>₹{item.price}</span>
                                    </div>
                                  ))}</div>
                                  <div style={finalSummaryBox}>
                                    <div style={summaryRow}><span style={summaryLabel}>Bill Total</span><span style={{...summaryValue, fontSize: '1.1rem'}}>₹{bill.total_amount}</span></div>
                                    <div style={summaryRow}><span style={summaryLabel}>Paid</span><span style={{...summaryValue, color: '#4caf50', fontSize: '1.1rem'}}>₹{bill.amount_paid}</span></div>
                                    <div style={summaryRow}>
                                      <span style={{...summaryLabel, color: (bill.total_amount - bill.amount_paid) === 0 ? '#4caf50' : '#ff4d4d'}}>
                                        {(bill.total_amount - bill.amount_paid) === 0 ? 'STATUS' : 'DUE'}
                                      </span>
                                      <span style={{...summaryValue, color: (bill.total_amount - bill.amount_paid) === 0 ? '#4caf50' : '#ff4d4d', fontSize: '1.1rem'}}>
                                        {(bill.total_amount - bill.amount_paid) === 0 ? 'CLEARED' : `₹${bill.total_amount - bill.amount_paid}`}
                                      </span>
                                    </div>
                                  </div>
                                </>
                              )}
                          </div>
                        ))}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- STYLES ---
const container = { maxWidth: '550px', margin: '0 auto', padding: '15px', paddingBottom: '120px' };
const titleStyle = { color: '#ff9800', textAlign: 'center', fontSize: '1.4rem', marginBottom: '25px', fontWeight: '950', letterSpacing: '1px' };
const dropboxHeader = { padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' };
const plusCircle = (open) => ({ background: open ? 'rgba(255, 152, 0, 0.15)' : '#000', border: `1.5px solid ${open ? '#ff9800' : '#444'}`, borderRadius: '50%', padding: '6px', display: 'flex' });
const quickBox = { padding: '0 22px 25px' };
const labelStyle = { fontSize: '0.65rem', color: '#555', fontWeight: '900', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' };
const iconLeft = { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 };
const addBtn = { background: '#222', border: '1.5px dashed #444', color: '#888', width: '100%', padding: '12px', borderRadius: '12px', marginTop: '8px', cursor: 'pointer', fontWeight: '900', fontSize: '0.75rem' };
const suggestionBox = { position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px', zIndex: 100, marginTop: '5px' };
const suggestionItem = { padding: '12px', color: '#ff9800', borderBottom: '1px solid #222', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' };
const storeAccordion = { background: 'transparent' };
const storeHeader = { padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' };
const avatar = { width: '40px', height: '40px', background: '#000', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#ff9800', fontWeight: '950', border: '1.5px solid #333' };
// 🚀 FIXED: Larger Store Name Title (1.2rem)
const storeNameTitle = { color: '#fff', fontSize: '1.2rem', textTransform: 'capitalize', fontWeight: '950' };
const statsBadge = { display: 'flex', gap: '10px', background: '#000', padding: '6px 12px', borderRadius: '10px', border: '1px solid #222' };
const statsLabel = { margin: 0, fontSize: '0.5rem', color: '#666', fontWeight: '950' };
const dateListContainer = { background: '#0a0a0a', padding: '0 20px 15px' };
const dateWrapper = { borderTop: '1px solid #1a1a1a' };
const dateHeader = { display: 'flex', justifyContent: 'space-between', padding: '15px 0', cursor: 'pointer' };
const dateText = { color: '#888', fontSize: '0.85rem', fontWeight: '900' };
const billCard = { background: '#000', padding: '15px', borderRadius: '18px', border: '1px solid #1a1a1a', marginBottom: '15px' };
const billTimeHeader = { fontSize: '0.6rem', color: '#444', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' };
const settlementBox = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'rgba(76, 175, 80, 0.05)', borderRadius: '12px', border: '1px solid rgba(76, 175, 80, 0.1)' };
const finalSummaryBox = { background: '#080808', padding: '12px', borderRadius: '12px', border: '1.5px solid #1a1a1a', marginTop: '5px' };
const summaryRow = { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' };
const summaryLabel = { fontSize: '0.75rem', color: '#555', fontWeight: '900' };
const summaryValue = { fontSize: '1rem', fontWeight: '950', color: '#fff' };

export default PurchaseHistory;