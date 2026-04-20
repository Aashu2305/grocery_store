import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { PlusCircle, Trash2, CheckCircle, Circle, ShoppingBasket, Archive, Info } from 'lucide-react';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    const { data, error } = await supabase.from('inventory').select('*');
    if (error) console.error(error);
    else setItems(data || []);
  }

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    // Sending both name and description to Supabase
    await supabase.from('inventory').insert([{ 
      name: newItem.name.trim(), 
      description: newItem.description.trim() 
    }]);
    setNewItem({ name: '', description: '' });
    fetchInventory();
  };

  const toggleBought = async (itemName, currentStatus) => {
    const timestamp = currentStatus ? null : new Date().toISOString();
    const { error } = await supabase
      .from('inventory')
      .update({ last_bought_at: timestamp })
      .eq('name', itemName);
    
    if (error) alert("Error: " + error.message);
    else fetchInventory();
  };

  const deleteItem = async (itemName) => {
    if (!window.confirm("Delete this item?")) return;
    const { error } = await supabase.from('inventory').delete().eq('name', itemName);
    if (error) alert("Delete failed");
    else fetchInventory();
  };

  const toBuy = items.filter(item => !item.last_bought_at);
  const alreadyBought = items.filter(item => item.last_bought_at);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>
      <h2 style={{ color: '#2196f3', textAlign: 'center', marginBottom: '20px' }}>🛒 Stock Manager</h2>

      {/* Add Item Form with Description */}
      <form onSubmit={addItem} style={cardStyle}>
        <input 
          placeholder="Item name (e.g. Sugar)" 
          value={newItem.name} 
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} 
          style={inputStyle} 
        />
        <input 
          placeholder="Description (e.g. 5kg, Loose, Brand X)" 
          value={newItem.description} 
          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} 
          style={{ ...inputStyle, fontSize: '0.9rem', color: '#aaa' }} 
        />
        <button type="submit" style={addBtn}>
          <PlusCircle size={20} /> Add Item
        </button>
      </form>

      {/* SECTION 1: TO BUY */}
      <h3 style={sectionHeader}><ShoppingBasket size={18}/> Needs Refill ({toBuy.length})</h3>
      {toBuy.map(item => (
        <div key={item.name} style={itemRow}>
          {/* Click is now only on the Icon div */}
          <div style={iconWrapper} onClick={() => toggleBought(item.name, false)}>
            <Circle color="#888" size={24} />
          </div>
          
          <div style={itemContent}>
            <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'bold' }}>{item.name}</span>
            {item.description && <span style={descStyle}>{item.description}</span>}
          </div>
          
          <button onClick={() => deleteItem(item.name)} style={deleteBtn}><Trash2 size={18}/></button>
        </div>
      ))}

      {/* SECTION 2: BOUGHT */}
      {alreadyBought.length > 0 && (
        <>
          <h3 style={{ ...sectionHeader, color: '#4caf50', marginTop: '30px' }}>
            <Archive size={18}/> Already Brought ({alreadyBought.length})
          </h3>
          {alreadyBought.map(item => (
            <div key={item.name} style={{ ...itemRow, background: '#142514', borderColor: '#2e7d32' }}>
              <div style={iconWrapper} onClick={() => toggleBought(item.name, true)}>
                <CheckCircle color="#4caf50" size={24} />
              </div>
              
              <div style={itemContent}>
                <span style={{ fontSize: '1.1rem', color: '#fff' }}>{item.name}</span>
                {item.description && <span style={{ ...descStyle, color: '#5a8a5a' }}>{item.description}</span>}
              </div>
              
              <button onClick={() => deleteItem(item.name)} style={deleteBtn}><Trash2 size={18}/></button>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

// --- Styles ---
const cardStyle = { display: 'flex', flexDirection: 'column', gap: '10px', background: '#1e1e1e', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #333' };
const inputStyle = { padding: '12px', background: '#121212', border: '1px solid #333', color: '#fff', borderRadius: '8px', fontSize: '16px' };
const addBtn = { background: '#2196f3', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 'bold' };
const sectionHeader = { fontSize: '0.85rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' };
const itemRow = { display: 'flex', alignItems: 'center', padding: '12px', borderRadius: '12px', marginBottom: '8px', background: '#1e1e1e', border: '1px solid #333' };

const iconWrapper = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px', cursor: 'pointer' };
const itemContent = { flex: 1, display: 'flex', flexDirection: 'column', paddingLeft: '10px' };
const descStyle = { fontSize: '0.85rem', color: '#777', marginTop: '2px' };
const deleteBtn = { background: 'none', border: 'none', color: '#555', padding: '10px', cursor: 'pointer' };

export default Inventory;