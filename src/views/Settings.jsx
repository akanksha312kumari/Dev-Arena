import React, { useState } from 'react';
import { Moon, Sun, Link as LinkIcon, LogOut, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Settings = ({ isDark, setIsDark, setActiveTab }) => {
  const { user, logout, setUser } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    bio: user?.profile?.bio || '',
    avatar: user?.profile?.avatar || '',
    codeforces: user?.platforms?.codeforces || '',
    leetcode: user?.platforms?.leetcode || '',
    codechef: user?.platforms?.codechef || '',
    hackerrank: user?.platforms?.hackerrank || '',
    atcoder: user?.platforms?.atcoder || '',
    gfg: user?.platforms?.gfg || ''
  });
  const [message, setMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setMessage('Please select an image file.');
        setTimeout(() => setMessage(''), 3000);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200;
          const MAX_HEIGHT = 200;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setFormData(prev => ({ ...prev, avatar: dataUrl }));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username: formData.username,
          bio: formData.bio,
          avatar: formData.avatar,
          platforms: {
            codeforces: formData.codeforces,
            leetcode: formData.leetcode,
            codechef: formData.codechef,
            hackerrank: formData.hackerrank,
            atcoder: formData.atcoder,
            gfg: formData.gfg
          }
        })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        setMessage('Profile updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to update profile.');
      }
    } catch (err) {
      setMessage('Error updating profile.');
    }
  };

  const handleSync = async (platform) => {
    setMessage(`Saving profile and syncing ${platform}...`);
    setIsSyncing(true);
    try {
      // Auto-save the profile first so the backend has the latest handle
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL}/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: formData.username,
          bio: formData.bio,
          avatar: formData.avatar,
          platforms: {
            codeforces: formData.codeforces,
            leetcode: formData.leetcode,
            codechef: formData.codechef,
            hackerrank: formData.hackerrank,
            atcoder: formData.atcoder,
            gfg: formData.gfg
          }
        })
      });

      const res = await fetch(`${import.meta.env.VITE_API_URL}/platforms/${platform}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUser(prev => ({ 
          ...prev, 
          stats: data.stats,
          platformStats: data.platformStats,
          lastSynced: data.lastSynced
        }));
        setMessage(`${platform} synced successfully!`);
      } else {
        setMessage(data.message || `Failed to sync ${platform}`);
      }
    } catch (err) {
      setMessage(`Error syncing ${platform}`);
    }
    setIsSyncing(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSyncAll = async () => {
    setMessage('Saving profile and syncing all connected accounts...');
    setIsSyncing(true);
    try {
      // Auto-save the profile first so the backend has the latest handles
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL}/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: formData.username,
          bio: formData.bio,
          platforms: {
            codeforces: formData.codeforces,
            leetcode: formData.leetcode,
            codechef: formData.codechef,
            hackerrank: formData.hackerrank,
            atcoder: formData.atcoder,
            gfg: formData.gfg
          }
        })
      });

      const res = await fetch(`${import.meta.env.VITE_API_URL}/platforms/sync-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUser(prev => ({ 
          ...prev, 
          stats: data.stats,
          platformStats: data.platformStats,
          lastSynced: data.lastSynced
        }));
        setMessage('All accounts synced!');
      } else {
        setMessage(data.message || 'Failed to sync all accounts');
      }
    } catch (err) {
      setMessage('Error syncing accounts');
    }
    setIsSyncing(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const platforms = [
    { id: 'leetcode', label: 'LeetCode' },
    { id: 'codeforces', label: 'Codeforces' },
    { id: 'codechef', label: 'CodeChef' },
    { id: 'hackerrank', label: 'HackerRank' },
    { id: 'atcoder', label: 'AtCoder' },
    { id: 'gfg', label: 'GeeksforGeeks' },
  ];

  const formatLastSynced = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Settings</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your profile, preferences, and connected accounts.</p>
      </header>

      {message && <div style={{ padding: '1rem', background: 'var(--accent-success)', color: 'white', borderRadius: '8px', marginBottom: '1rem' }}>{message}</div>}

      <div className="flex flex-col gap-6">
        {/* Profile Info Card */}
        <section className="card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Profile Information</h3>
          
          <div className="flex items-center gap-4" style={{ marginBottom: '1.5rem' }}>
            <img src={formData.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"} alt="User Avatar" style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid var(--accent-primary)', objectFit: 'cover' }} />
            <div>
              <label htmlFor="avatar-upload" className="clay-btn btn-outline" style={{ cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                Upload Image
              </label>
              <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Profile Picture URL</label>
              <input type="text" name="avatar" value={formData.avatar} onChange={handleChange} placeholder="https://example.com/avatar.png" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Username</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Bio</label>
              <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
          </div>

          <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontWeight: 600 }}>Connected Accounts</h4>
            <button className="btn btn-primary" onClick={handleSyncAll} disabled={isSyncing} style={{ padding: '0.5rem 1rem' }}>
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> Sync All
            </button>
          </div>
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
            {platforms.map(p => (
              <div key={p.id} className="flex flex-col gap-2" style={{ padding: '1rem', border: '1px solid var(--card-border)', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <LinkIcon size={20} color="var(--text-muted)" />
                    <span style={{ fontWeight: 500 }}>{p.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="text" name={p.id} value={formData[p.id]} onChange={handleChange} placeholder="Handle" style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--card-border)' }} />
                    <button className="btn btn-outline" onClick={() => handleSync(p.id)} disabled={isSyncing || !formData[p.id]}>Sync</button>
                  </div>
                </div>
                {user?.lastSynced && user.lastSynced[p.id] && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    Last Synced: {formatLastSynced(user.lastSynced[p.id])}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleSaveProfile}><Save size={20} /> Save Profile Changes</button>
        </section>

        {/* Display Preferences */}
        <section className="card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Display Preferences</h3>
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontWeight: 500 }}>Theme Mode</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Toggle between Warm Light and Warm Dark mode</div>
            </div>
            <button 
              onClick={() => setIsDark(!isDark)}
              style={{
                width: '60px', height: '32px', borderRadius: '16px', border: 'none',
                background: isDark ? 'var(--accent-primary)' : '#E5E7EB',
                position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
              }}
            >
              <div style={{
                position: 'absolute', top: '4px', left: isDark ? '32px' : '4px',
                width: '24px', height: '24px', borderRadius: '50%', background: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}>
                {isDark ? <Moon size={14} color="var(--accent-primary)" /> : <Sun size={14} color="#F59E0B" />}
              </div>
            </button>
          </div>
        </section>

        {/* Account Actions */}
        <section className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--accent-danger)' }}>Danger Zone</h3>
          
          <button 
            className="btn"
            style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', width: '100%', justifyContent: 'center' }}
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut size={20} /> Log Out
          </button>

          {showLogoutConfirm && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
            }}>
              <div className="card" style={{ maxWidth: '400px', width: '90%', background: 'var(--bg-primary)' }}>
                <div className="flex items-center gap-3" style={{ marginBottom: '1rem', color: 'var(--accent-danger)' }}>
                  <AlertTriangle size={24} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Confirm Log Out</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Are you sure you want to log out of DevArena?</p>
                <div className="flex justify-end gap-3">
                  <button className="btn btn-outline" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
                  <button className="btn" style={{ background: 'var(--accent-danger)', color: 'white' }} onClick={handleLogout}>Log Out</button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Settings;
