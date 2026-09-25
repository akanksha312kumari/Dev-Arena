import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import LiveDuels from './views/LiveDuels';
import Friends from './views/Friends';
import PrivateRooms from './views/PrivateRooms';
import AICoach from './views/AICoach';
import Leaderboards from './views/Leaderboards';
import Problems from './views/Problems';
import Settings from './views/Settings';
import Auth from './views/Auth';
import PotdSolver from './views/PotdSolver';
import PersonalizedLearning from './views/PersonalizedLearning';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [activeDuelData, setActiveDuelData] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedPotd, setSelectedPotd] = useState(null);
  const completedDuelIds = useRef(new Set());
  const { user, loading } = useAuth();
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const onChallengeAccepted = (data) => {
      if (data && data.id && completedDuelIds.current.has(data.id)) return;
      setActiveDuelData(data);
      setActiveTab('duels');
    };

    const onDuelTerminal = (data) => {
      if (data && data.duelId) {
        completedDuelIds.current.add(data.duelId);
        if (completedDuelIds.current.size > 50) {
          const iter = completedDuelIds.current.values();
          completedDuelIds.current.delete(iter.next().value);
        }
      }
      setActiveDuelData(prev => {
        if (!prev) return null;
        if (data && data.duelId && prev.id !== data.duelId) {
          return prev; // Different active duel, don't clear
        }
        return null;
      });
    };

    const onOnlineUsersUpdate = (users) => {
      let merged = [...users.filter(u => u._id !== user?._id)];
      const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';
      if (isDemo && merged.length < 5) {
        merged.push(
          { _id: 'dummy1', username: 'AlexChen_Dev', stats: { rating: 1250 }, profile: { avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlexChen' } },
          { _id: 'dummy2', username: 'SarahCod3s', stats: { rating: 1420 }, profile: { avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' } },
          { _id: 'dummy3', username: 'tech_guru99', stats: { rating: 1100 }, profile: { avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TechGuru' } },
          { _id: 'dummy4', username: 'byte_ninja', stats: { rating: 1380 }, profile: { avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ninja' } }
        );
      }
      setOnlineUsers(merged);
    };

    const onChallengeReceived = (data) => {
      setIncomingChallenge(data);
    };

    const onChallengeRejected = (data) => {
      setMessage(data.message);
      setTimeout(() => setMessage(''), 3000);
    };

    socket.on('challenge_accepted', onChallengeAccepted);
    socket.on('group_challenge_started', onChallengeAccepted);
    socket.on('duel_finished', onDuelTerminal);
    socket.on('duel_forfeited', onDuelTerminal);
    socket.on('online_users_update', onOnlineUsersUpdate);
    socket.on('challenge_received', onChallengeReceived);
    socket.on('challenge_rejected', onChallengeRejected);
    
    return () => {
      socket.off('challenge_accepted', onChallengeAccepted);
      socket.off('group_challenge_started', onChallengeAccepted);
      socket.off('duel_finished', onDuelTerminal);
      socket.off('duel_forfeited', onDuelTerminal);
      socket.off('online_users_update', onOnlineUsersUpdate);
      socket.off('challenge_received', onChallengeReceived);
      socket.off('challenge_rejected', onChallengeRejected);
    };
  }, [socket, user]);

  const acceptIncomingChallenge = () => {
    if (!incomingChallenge) return;
    socket.emit('accept_challenge', {
      senderId: incomingChallenge.senderId,
      challengeId: incomingChallenge.challengeId,
      problem: incomingChallenge.problem,
      timeLimit: incomingChallenge.timeLimit
    });
    setIncomingChallenge(null);
  };

  const rejectIncomingChallenge = () => {
    if (!incomingChallenge) return;
    socket.emit('reject_challenge', { senderId: incomingChallenge.senderId });
    setIncomingChallenge(null);
  };

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDark]);



  if (loading) return <div>Loading...</div>;

  if (!user) return <Auth />;

  return (
    <div className={`app-container ${isDark ? 'dark' : ''}`}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="main-content">

        <div className="content-area">
          {message && (
            <div style={{ position: 'fixed', top: '1rem', right: '1rem', padding: '1rem', background: 'var(--accent-primary)', color: 'white', borderRadius: '8px', zIndex: 9999 }}>
              {message}
            </div>
          )}
          
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} setSelectedPotd={setSelectedPotd} />}
          {activeTab === 'duels' && <LiveDuels initialDuelData={activeDuelData} onlineUsers={onlineUsers} completedDuelIds={completedDuelIds.current} />}
          {activeTab === 'friends' && <Friends onlineUsers={onlineUsers} />}
          {activeTab === 'rooms' && <PrivateRooms />}
          {activeTab === 'coach' && <AICoach />}
          {activeTab === 'learning' && <PersonalizedLearning />}
          {activeTab === 'problems' && <Problems />}
          {activeTab === 'leaderboard' && <Leaderboards />}
          {activeTab === 'settings' && <Settings isDark={isDark} setIsDark={setIsDark} setActiveTab={setActiveTab} />}
          {activeTab === 'potd-solver' && <PotdSolver potd={selectedPotd} setActiveTab={setActiveTab} />}
        </div>
      </main>

      {/* Global Incoming Challenge Modal */}
      {incomingChallenge && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div className="clay-card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>Duel Challenge!</h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>You've been challenged to a Live Duel. Do you accept?</p>
            <div className="flex gap-3 justify-center">
              <button className="clay-btn btn-outline" onClick={rejectIncomingChallenge}>Decline</button>
              <button className="clay-btn btn-primary" onClick={acceptIncomingChallenge}>Accept Challenge</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
