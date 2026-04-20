import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { IndianRupee, Users, AlertCircle, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({ totalUdhaar: 0, customerCount: 0 });

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    const { data, error } = await supabase.from('customers').select('balance');
    if (data) {
      const total = data.reduce((sum, item) => sum + (Number(item.balance) || 0), 0);
      setStats({
        totalUdhaar: total,
        customerCount: data.length
      });
    }
  }

  return (
    <div style={{ padding: '10px' }}>
      <h2 style={{ marginBottom: '20px', color: '#4caf50' }}>🏪 Shop Summary</h2>
      
      <div style={gridStyle}>
        {/* Total Udhaar Card */}
        <div style={{ ...cardStyle, borderLeft: '5px solid #ff4d4d' }}>
          <div style={iconHeader}>
            <IndianRupee size={20} color="#ff4d4d" />
            <span>Total Udhaar</span>
          </div>
          <h1 style={{ margin: '10px 0' }}>₹{stats.totalUdhaar}</h1>
          <p style={{ color: '#888', fontSize: '0.8rem' }}>Money to be collected</p>
        </div>

        {/* Total Customers Card */}
        <div style={{ ...cardStyle, borderLeft: '5px solid #2196f3' }}>
          <div style={iconHeader}>
            <Users size={20} color="#2196f3" />
            <span>Customers</span>
          </div>
          <h1 style={{ margin: '10px 0' }}>{stats.customerCount}</h1>
          <p style={{ color: '#888', fontSize: '0.8rem' }}>Active in Khata</p>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: '20px', background: '#2a1a1a', border: '1px solid #5c2b2b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ff9800' }}>
          <AlertCircle size={20} />
          <strong>Quick Reminder</strong>
        </div>
        <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>
          Check the "Stock" tab to see which items are running low today.
        </p>
      </div>
    </div>
  );
};

// --- Mobile-Responsive Styles ---
const gridStyle = {
  display: 'grid',
  gridTemplateColumns: window.innerWidth < 600 ? '1fr' : '1fr 1fr',
  gap: '15px'
};

const cardStyle = {
  background: '#1e1e1e',
  padding: '20px',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
};

const iconHeader = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  color: '#aaa',
  fontSize: '0.9rem',
  fontWeight: 'bold'
};

export default Dashboard;