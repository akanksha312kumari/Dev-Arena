import React, { useState, useEffect } from 'react';
import { X, Trophy, Swords, UserPlus, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const UserProfileModal = ({ userId, onClose }) => {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/users/profile/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch profile');
        const data = await res.json();
        setProfile(data);
        
        // Check friend request status locally based on currentUser state if available
        if (currentUser?.friends?.some(f => (typeof f === 'string' ? f : f._id) === userId)) {
          setRequestStatus('friends');
        } else if (currentUser?.friendRequests?.some(r => (typeof r === 'string' ? r : r._id) === userId)) {
          setRequestStatus('received');
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) fetchProfile();
  }, [userId, currentUser]);

  const handleAddFriend = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/friends/request/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRequestStatus('sent');
      } else {
        const data = await res.json();
        if (data.message === 'Request already sent or already friends') {
          setRequestStatus('sent');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!userId) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }} onClick={onClose}>
      <div className="clay-card" style={{ width: '100%', maxWidth: '600px', padding: 0, overflow: 'hidden', position: 'relative' }} onClick={e => e.stopPropagation()}>
        
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', zIndex: 10 }}>
          <X size={24} />
        </button>

        {loading ? (
           <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Profile...</div>
        ) : error ? (
           <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--accent-danger)' }}>{error}</div>
        ) : (
          <>
            {/* Header / Banner */}
            <div style={{ background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)', padding: '2.5rem 2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', borderBottom: '1px solid var(--card-border)' }}>
              <img src={profile.profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`} alt={profile.username} style={{ width: 100, height: 100, borderRadius: '50%', border: '4px solid var(--accent-primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{profile.username}</h2>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{profile.profile?.bio || 'Competitive programmer.'}</div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="badge" style={{ background: 'rgba(217, 119, 6, 0.1)', color: 'var(--accent-primary)' }}>Level {profile.level}</span>
                  <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent-streak)' }}>{profile.stats?.arenaRank || 'Unranked'}</span>
                </div>
              </div>
              
              {/* Friend Action Button */}
              {currentUser && currentUser._id !== profile._id && (
                <div>
                  {requestStatus === 'friends' ? (
                    <button className="clay-btn btn-outline flex items-center gap-2" disabled><Check size={16} /> Friends</button>
                  ) : requestStatus === 'sent' ? (
                    <button className="clay-btn btn-outline flex items-center gap-2" disabled>Request Sent</button>
                  ) : requestStatus === 'received' ? (
                    <button className="clay-btn btn-outline flex items-center gap-2" disabled>Check Requests</button>
                  ) : (
                    <button className="clay-btn btn-primary flex items-center gap-2" onClick={handleAddFriend}><UserPlus size={16} /> Add Friend</button>
                  )}
                </div>
              )}
            </div>
            
            {/* Body */}
            <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              
              {/* Stats */}
              <div className="clay-recessed" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Trophy size={18} color="var(--accent-success)"/> Global Stats</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Global Rating</span>
                  <span style={{ fontWeight: 600 }}>{profile.stats?.globalRating || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Problems Solved</span>
                  <span style={{ fontWeight: 600 }}>{profile.stats?.problemsSolved?.total || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Current Streak</span>
                  <span style={{ fontWeight: 600 }}>{profile.stats?.dailyStreak || 0} 🔥</span>
                </div>
              </div>
              
              {/* Duels */}
              <div className="clay-recessed" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Swords size={18} color="var(--accent-primary)"/> Duel Arena</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Matches Played</span>
                  <span style={{ fontWeight: 600 }}>{profile.stats?.duels?.total || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Wins</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-success)' }}>{profile.stats?.duels?.wins || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Win Rate</span>
                  <span style={{ fontWeight: 600 }}>
                    {profile.stats?.duels?.total > 0 ? Math.round((profile.stats.duels.wins / profile.stats.duels.total) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserProfileModal;
