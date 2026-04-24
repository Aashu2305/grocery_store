import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, X, CheckCircle, ShoppingBag, Archive, PackagePlus } from 'lucide-react';

const Inventory = () => {
  const [inputRows, setInputRows] = useState(['']); 
  const [items, setItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '' });

  // 🚀 1. LOAD FROM CACHE ON BOOT
  useEffect(() => {
    const cachedData = localStorage.getItem('master_inventory_db');
    if (cachedData) {
      try {
        setItems(JSON.parse(cachedData));
      } catch (e) {
        console.error("Inventory cache corrupted");
      }
    }
    fetchInventory(); // Refresh in background
  }, []);

  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  // 🚀 2. SYNC & CACHE LOGIC
  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
      if (data) {
        setItems(data);
        localStorage.setItem('master_inventory_db', JSON.stringify(data));
      }
    } catch (err) {
      console.log("Offline: Using cached inventory");
    }
  };

  const addInputRow = () => setInputRows([...inputRows, '']);
  const updateRowValue = (index, value) => {
    const newRows = [...inputRows];
    newRows[index] = value;
    setInputRows(newRows);
  };
  const removeInputRow = (index) => {
    if (inputRows.length === 1) return setInputRows(['']);
    setInputRows(inputRows.filter((_, i) => i !== index));
  };

  const saveToInventory = async () => {
    const validNames = inputRows.filter(name => name.trim() !== '');
    if (validNames.length === 0 || isSaving) return;
    setIsSaving(true);
    
    const newItems = validNames.map(name => ({ 
      id: Date.now() + Math.random(), 
      name: name.toLowerCase().trim(), 
      is_bought: false,
      created_at: new Date().toISOString()
    }));

    // 🚀 OPTIMISTIC UPDATE
    const updatedItems = [...newItems, ...items];
    setItems(updatedItems);
    localStorage.setItem('master_inventory_db', JSON.stringify(updatedItems));
    setInputRows(['']);

    try {
      const payload = validNames.map(name => ({ name: name.toLowerCase().trim(), is_bought: false }));
      await supabase.from('inventory').insert(payload);
      showToast("Inventory Updated!");
      fetchInventory(); 
    } catch (err) { 
      console.log("Sync error, kept local copy");
      fetchInventory(); 
    } finally { setIsSaving(false); }
  };

  const toggleBought = async (item) => {
    // 🚀 OPTIMISTIC UPDATE
    const updatedItems = items.map(i => i.id === item.id ? { ...i, is_bought: !i.is_bought } : i);
    setItems(updatedItems);
    localStorage.setItem('master_inventory_db', JSON.stringify(updatedItems));

    try {
      const { error } = await supabase.from('inventory').update({ is_bought: !item.is_bought }).eq('id', item.id);
      if (error) throw error;
    } catch (err) {
      fetchInventory(); 
    }
  };

  const deleteItem = async (id) => {
    // 🚀 OPTIMISTIC UPDATE
    const updatedItems = items.filter(i => i.id !== id);
    setItems(updatedItems);
    localStorage.setItem('master_inventory_db', JSON.stringify(updatedItems));

    try {
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      fetchInventory(); 
    }
  };

  const leftToBuy = items.filter(i => !i.is_bought);
  const boughtItems = items.filter(i => i.is_bought);

  return (
    <div style={container}>
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .compact-row:last-child { border-bottom: none !important; }
        .radio-btn {
          width: 22px; height: 22px; border-radius: 50%;
          border: 2px solid #333; display: flex;
          align-items: center; justify-content: center;
          cursor: pointer; flex-shrink: 0;
          transition: 0.1s;
        }
        .radio-active { border-color: #4caf50; background: #4caf50; }
        .radio-inner { width: 10px; height: 10px; border-radius: 50%; background: #000; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .black-input:focus { border-color: #4caf50 !important; }
      `}</style>

      {toast.show && <div style={toastStyle}><CheckCircle size={16}/> {toast.msg}</div>}

      <h2 style={title}>📦 Stock Manager</h2>

      <div style={inputBox}>
        <p style={labelStyle}>Add New Stock</p>
        {inputRows.map((val, idx) => (
          <div key={idx} style={fieldRow}>
            <input 
              placeholder="Item name..." 
              value={val} 
              onChange={(e) => updateRowValue(idx, e.target.value)} 
              style={textInput}
              className="black-input"
            />
            <button onClick={() => removeInputRow(idx)} style={smallDel}><X size={18} color="#444"/></button>
          </div>
        ))}
        <div style={actionRow}>
          <button onClick={addInputRow} style={addMoreBtn}><Plus size={16}/> Next Item</button>
          <button onClick={saveToInventory} style={iconAddBtn} disabled={isSaving}>
            {isSaving ? '...' : <PackagePlus size={22} color="#000" />}
          </button>
        </div>
      </div>

      <div style={listWrapper}>
        <div style={sectionHeader}><ShoppingBag size={12} /> LEFT TO BUY ({leftToBuy.length})</div>
        <div style={listContent}>
          {leftToBuy.length > 0 ? leftToBuy.map((item) => (
            <div key={item.id} className="compact-row" style={compactRow}>
              <div style={leftPart}>
                <div className="radio-btn" onClick={() => toggleBought(item)}></div>
                <span style={itemTextStyle}>{item.name}</span>
              </div>
              <button onClick={() => deleteItem(item.id)} style={delAction}><Trash2 size={16} color="#444" /></button>
            </div>
          )) : <p style={emptyText}>Nothing to buy!</p>}
        </div>

        {boughtItems.length > 0 && (
          <>
            <div style={{...sectionHeader, marginTop: '10px', color: '#555'}}><Archive size={12} /> BOUGHT ({boughtItems.length})</div>
            <div style={listContent}>
              {boughtItems.map((item) => (
                <div key={item.id} className="compact-row" style={compactRow}>
                  <div style={leftPart}>
                    <div className="radio-btn radio-active" onClick={() => toggleBought(item)}>
                        <div className="radio-inner" />
                    </div>
                    <span style={{...itemTextStyle, opacity: 0.6}}>{item.name}</span>
                  </div>
                  <button onClick={() => deleteItem(item.id)} style={delAction}><Trash2 size={16} color="#444" /></button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// --- STYLES ---
const container = { maxWidth: '500px', margin: '0 auto', padding: '15px' };
const title = { color: '#4caf50', textAlign: 'center', fontWeight: '900', marginBottom: '20px', fontSize: '1.4rem' };
const labelStyle = { fontSize: '0.65rem', color: '#555', fontWeight: '900', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' };
const inputBox = { background: '#121212', padding: '20px', borderRadius: '25px', border: '1px solid #222', marginBottom: '20px' };
const fieldRow = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' };
const textInput = { flex: 1, background: '#000', border: '1.5px solid #2a2a2a', borderRadius: '12px', padding: '12px 15px', color: '#fff', outline: 'none', fontSize: '0.95rem', fontWeight: '600' };
const smallDel = { background: 'none', border: 'none', cursor: 'pointer', padding: '5px' };
const actionRow = { display: 'flex', gap: '10px', marginTop: '15px', alignItems: 'center' };
const addMoreBtn = { flex: 1, background: '#000', color: '#888', border: '1.5px dashed #2a2a2a', padding: '14px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: '900', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' };
const iconAddBtn = { width: '52px', height: '52px', background: '#4caf50', border: 'none', borderRadius: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', flexShrink: 0 };
const listWrapper = { background: '#121212', borderRadius: '25px', border: '1px solid #222', paddingBottom: '10px', overflow: 'hidden' };
const sectionHeader = { padding: '15px 20px 10px', fontSize: '0.65rem', fontWeight: '900', color: '#4caf50', letterSpacing: '1.2px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' };
const listContent = { maxHeight: '45vh', overflowY: 'auto' };
const compactRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #1a1a1a' };
const leftPart = { display: 'flex', alignItems: 'center', gap: '15px', flex: 1 };
const itemTextStyle = { color: '#ffffff', fontSize: '1rem', fontWeight: '700', textTransform: 'capitalize' };
const delAction = { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' };
const emptyText = { textAlign: 'center', color: '#333', fontSize: '0.8rem', fontWeight: '800', padding: '20px' };
const toastStyle = { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#4caf50', color: '#000', padding: '12px 25px', borderRadius: '50px', fontWeight: 'bold', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' };

export default Inventory;