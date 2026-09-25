import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Swords } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import UserProfileModal from '../components/UserProfileModal';

const Friends = ({ onlineUsers = [] }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Challenge Modal State
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeTarget, setChallengeTarget] = useState(null);
  const [challengeData, setChallengeData] = useState({
    platform: 'LeetCode',
    problemId: '',
    timeLimit: 30
  });

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
  }, [socket]);

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/friends/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFriendRequests(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/search?q=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const sendRequest = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/friends/request/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMessage(data.message);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error sending request');
    }
  };

  const handleAcceptRequest = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/friends/accept/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchFriends();
        fetchFriendRequests();
        setMessage('Friend request accepted!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/friends/reject/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchFriendRequests();
        setMessage('Friend request rejected');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openChallengeModal = (targetUser) => {
    setChallengeTarget(targetUser);
    setShowChallengeModal(true);
  };

  const handleChallengeSubmit = (e) => {
    e.preventDefault();
    if (!socket || !challengeTarget) return;
    
    if (!challengeData.problemId) {
      setMessage('Please enter a problem name or URL');
      return;
    }

    const problem = {
      platform: challengeData.platform,
      problemId: challengeData.problemId,
      title: challengeData.problemId, // Using ID/URL as title for simplicity
      difficulty: 'Custom'
    };
    
    socket.emit('send_challenge', {
      targetUserId: challengeTarget._id,
      problem,
      timeLimit: parseInt(challengeData.timeLimit)
    });
    
    setShowChallengeModal(false);
    setChallengeTarget(null);
    setMessage('Challenge sent!');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Friends</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Find and connect with other developers.</p>
      </header>

      {message && <div style={{ padding: '1rem', background: 'var(--accent-primary)', color: 'white', borderRadius: '8px', marginBottom: '1rem' }}>{message}</div>}

      <div className="clay-card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input 
            type="text" 
            className="clay-input"
            placeholder="Search users..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="clay-btn btn-primary"><Search size={20} /> Search</button>
        </form>

        {searchResults.length > 0 && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
            <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>Search Results</h4>
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
              {searchResults.map(u => (
                <div key={u._id} className="clay-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1rem' }}>
                  <img src={u.profile?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"} alt="Avatar" style={{ width: 48, height: 48, borderRadius: '50%', marginBottom: '0.75rem', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setSelectedUserId(u._id)} />
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }} onClick={() => setSelectedUserId(u._id)}>{u.username}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Rating: {u.stats?.globalRating || 0}</p>
                  <button className="clay-btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => sendRequest(u._id)}><UserPlus size={14} /> Add Friend</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {friendRequests.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--accent-primary)' }}>Incoming Friend Requests</h3>
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {friendRequests.map(r => (
              <div key={r._id} className="card flex items-center justify-between gap-3" style={{ borderColor: 'var(--accent-primary)', padding: '0.75rem 1rem' }}>
                <div className="flex items-center gap-3">
                  <img src={r.profile?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"} alt="Avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{r.username}</h4>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="clay-btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => handleRejectRequest(r._id)}>Reject</button>
                  <button className="clay-btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => handleAcceptRequest(r._id)}>Accept</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Your Friends List</h3>
      {friends.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>You haven't added any friends yet.</p>
      ) : (
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {friends.map(f => (
            <div key={f._id} className="card flex flex-col gap-3" style={{ padding: '0.75rem 1rem' }}>
              <div className="flex items-center gap-3">
                <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setSelectedUserId(f._id)}>
                  <img src={f.profile?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"} alt="Avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  {onlineUsers.some(u => u._id === f._id) && (
                    <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-success)', border: '2px solid var(--bg-primary)' }}></span>
                  )}
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }} onClick={() => setSelectedUserId(f._id)}>{f.username}</h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Rating: <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{f.stats?.globalRating || 0}</span>
                  </div>
                </div>
              </div>
              <button className="clay-btn btn-outline flex items-center justify-center gap-2" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => openChallengeModal(f)}>
                <Swords size={14} /> Challenge to Duel
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Challenge Modal */}
      {showChallengeModal && challengeTarget && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="clay-card" style={{ width: '100%', maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Challenge {challengeTarget.username}</h3>
            <form onSubmit={handleChallengeSubmit} className="flex flex-col gap-4">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Platform</label>
                <select 
                  value={challengeData.platform}
                  onChange={e => setChallengeData({...challengeData, platform: e.target.value})}
                  className="clay-input"
                >
                  <option value="LeetCode">LeetCode</option>
                  <option value="Codeforces">Codeforces</option>
                  <option value="CodeChef">CodeChef</option>
                  <option value="AtCoder">AtCoder</option>
                  <option value="HackerRank">HackerRank</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Problem URL or Name</label>
                <input 
                  type="text" 
                  required
                  className="clay-input"
                  placeholder="e.g. https://leetcode.com/problems/two-sum/"
                  value={challengeData.problemId}
                  onChange={e => setChallengeData({...challengeData, problemId: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Time Limit (Minutes)</label>
                <input 
                  type="number" 
                  min="1"
                  max="180"
                  required
                  value={challengeData.timeLimit}
                  onChange={e => setChallengeData({...challengeData, timeLimit: e.target.value})}
                  className="clay-input"
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" className="clay-btn btn-outline" onClick={() => setShowChallengeModal(false)}>Cancel</button>
                <button type="submit" className="clay-btn btn-primary flex items-center gap-2"><Swords size={16} /> Send Challenge</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedUserId && <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </div>
  );
};

export default Friends;
