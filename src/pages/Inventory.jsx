import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Package, Plus, Search, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [newItem, setNewItem] = useState('');

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async () => {
    const { data } = await supabase.from('inventory').select('*').order('name');
    if (data) setItems(data);
  };

  const addItem = async () => {
    if (!newItem) return;
    const { error } = await supabase.from('inventory').insert([{ name: newItem, last_bought_at: new Date() }]);
    if (!error) { setNewItem(''); fetchInventory(); }
  };

  const markAsBought = async (id) => {
    await supabase.from('inventory').update({ last_bought_at: new Date() }).eq('id', id);
    fetchInventory();
  };

  const markAsOut = async (id) => {
    await supabase.from('inventory').update({ last_bought_at: null }).eq('id', id);
    fetchInventory();
  };

  const deleteItem = async (id) => {
    if(window.confirm("Delete this item?")) {
      await supabase.from('inventory').delete().eq('id', id);
      fetchInventory();
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ color: '#2196f3', textAlign: 'center', marginBottom: '20px' }}>📦 Stock Room</h2>

      {/* Add New Item */}
      <div style={addBox}>
        <input 
          placeholder="New Item Name (e.g. Milk)" 
          value={newItem} 
          onChange={e => setNewItem(e.target.value)}
          style={inputStyle}
        />
        <button onClick={addItem} style={addBtn}><Plus size={20} /></button>
      </div>

      {/* Search */}
      <div style={searchWrapper}>
        <Search size={18} color="#666" />
        <input 
          placeholder="Search inventory..." 
          style={searchInput} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      {/* List */}
      <div style={{ marginTop: '20px' }}>
        {items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).map(item => (
          <div key={item.id} style={{...itemRow, borderLeft: item.last_bought_at ? '4px solid #4caf50' : '4px solid #ff4d4d'}}>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '1rem', color: item.last_bought_at ? '#fff' : '#ff4d4d' }}>
                {item.name}
              </strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: '#555' }}>
                {item.last_bought_at ? `Last refill: ${new Date(item.last_bought_at).toLocaleDateString()}` : '🚨 OUT OF STOCK'}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              {item.last_bought_at ? (
                <button onClick={() => markAsOut(item.id)} style={outBtn} title="Mark as Empty">
                  <AlertTriangle size={18} />
                </button>
              ) : (
                <button onClick={() => markAsBought(item.id)} style={refillBtn}>
                  <CheckCircle size={18} /> Refill
                </button>
              )}
              <button onClick={() => deleteItem(item.id)} style={delBtn}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const containerStyle = { maxWidth: '550px', margin: '0 auto', padding: '15px', paddingBottom: '100px' };
const addBox = { display: 'flex', gap: '10px', marginBottom: '20px' };
const inputStyle = { flex: 1, background: '#111', border: '1px solid #333', color: '#fff', padding: '12px', borderRadius: '12px', outline: 'none' };
const addBtn = { background: '#2196f3', border: 'none', color: '#fff', padding: '0 15px', borderRadius: '12px', cursor: 'pointer' };
const searchWrapper = { display: 'flex', alignItems: 'center', gap: '10px', background: '#111', padding: '12px', borderRadius: '12px', border: '1px solid #222' };
const searchInput = { background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%' };
const itemRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', padding: '15px', borderRadius: '15px', marginBottom: '10px', border: '1px solid #222' };
const refillBtn = { background: '#4caf50', border: 'none', color: '#000', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' };
const outBtn = { background: '#ff4d4d22', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '8px', borderRadius: '8px' };
const delBtn = { background: 'transparent', border: 'none', color: '#333', cursor: 'pointer' };

export default Inventory;