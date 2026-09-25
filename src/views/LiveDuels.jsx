import React, { useState, useEffect, useCallback } from 'react';
import { Swords, Clock, AlertTriangle, CheckCircle, Code2, Trophy, XCircle, Minus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import LiveDuelArena from './LiveDuelArena';
import UserProfileModal from '../components/UserProfileModal';

const TERMINAL_DUEL_STATUSES = new Set(['finished', 'ended', 'forfeited', 'time_up']);

const isTerminalDuel = (duel, completedDuelIds) => {
  if (!duel) return false;
  if (completedDuelIds && duel.id && completedDuelIds.has(duel.id)) return true;
  if (TERMINAL_DUEL_STATUSES.has(duel.status)) return true;
  if (duel.endTime && Number(duel.endTime) <= Date.now()) return true;
  return false;
};

const LiveDuels = ({ initialDuelData, onlineUsers = [], completedDuelIds }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [activeDuel, setActiveDuel] = useState(() => isTerminalDuel(initialDuelData, completedDuelIds) ? null : (initialDuelData || null));
  const [lastDuelResult, setLastDuelResult] = useState(null);
  const [matchStatus, setMatchStatus] = useState(() => (initialDuelData && !isTerminalDuel(initialDuelData, completedDuelIds)) ? 'starting' : 'lobby');
  const [countdown, setCountdown] = useState(5);
  const [remainingTime, setRemainingTime] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasInitializedDuel, setHasInitializedDuel] = useState(false);
  const [claimantId, setClaimantId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [duelHistory, setDuelHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Fetch duel history from backend
  const fetchDuelHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/duels/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDuelHistory(data.duels || []);
      }
    } catch (e) {
      console.error('Failed to fetch duel history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchDuelHistory();
  }, []);
  
  const clearActiveDuel = useCallback(() => {
    setActiveDuel(null);
    setMatchStatus('lobby');
    setCountdown(5);
    setRemainingTime(0);
    setHasInitializedDuel(false);
    setClaimantId(null);
    setShowConfirmModal(false);
  }, []);

  const handleDuelTerminal = useCallback((data) => {
    const duelId = data?.duelId;
    if (!duelId) return;

    setLastDuelResult(prev => ({ ...activeDuel, ...data, status: 'finished' }));
    clearActiveDuel();
    setMatchStatus('finished');
    fetchDuelHistory();
  }, [activeDuel, clearActiveDuel]);

  useEffect(() => {
    if (initialDuelData && initialDuelData.id) {
      if (isTerminalDuel(initialDuelData, completedDuelIds)) {
        return;
      }
      
      if (activeDuel && activeDuel.id !== initialDuelData.id && !isTerminalDuel(activeDuel, completedDuelIds)) {
        return; // Don't interrupt a genuinely different active duel
      }

      if (!hasInitializedDuel || (activeDuel && activeDuel.id !== initialDuelData.id)) {
        if (socket) socket.emit('join_duel', initialDuelData.id);
        setActiveDuel(initialDuelData);
        setMatchStatus('starting');
        setHasInitializedDuel(true);
      }
    } else if (!initialDuelData) {
      if (!activeDuel || isTerminalDuel(activeDuel, completedDuelIds)) {
        if (matchStatus !== 'finished') {
          // Stay in lobby unless user is on the finished screen
          setMatchStatus('lobby');
        }
      }
    }
  }, [initialDuelData, socket, hasInitializedDuel, activeDuel, completedDuelIds, matchStatus]);

  useEffect(() => {
    if (!socket) return;

    const onDuelStateUpdate = (data) => {
      if (isTerminalDuel(data, completedDuelIds)) return;
      setActiveDuel(data);
      setMatchStatus(data.status);
      if (data.status === 'active') {
        setRemainingTime(Math.max(0, Math.floor((data.endTime - Date.now()) / 1000)));
      }
    };

    const onMatchFound = (data) => {
      if (isTerminalDuel(data, completedDuelIds)) return;
      setIsSearching(false);
      socket.emit('join_duel', data.id);
      setActiveDuel(data);
      setMatchStatus('starting');
    };

    const onDuelCountdown = (data) => {
      setCountdown(data.count);
    };

    const onDuelStarted = (data) => {
      setMatchStatus('active');
      setActiveDuel(prev => {
        if (!prev) return prev;
        const clientEndTime = Date.now() + (prev.timeLimit * 60 * 1000);
        return { ...prev, status: 'active', endTime: clientEndTime };
      });
    };

    const onOpponentClaimedVictory = (data) => {
      setClaimantId(data.userId);
      setShowConfirmModal(true);
    };

    const onVictoryDisputed = () => {
      alert("Your opponent disputed your victory claim! Keep coding or sort it out in chat.");
    };

    socket.on('duel_state_update', onDuelStateUpdate);
    socket.on('match_found', onMatchFound);
    socket.on('duel_countdown', onDuelCountdown);
    socket.on('duel_started', onDuelStarted);
    socket.on('opponent_claimed_victory', onOpponentClaimedVictory);
    socket.on('victory_disputed', onVictoryDisputed);
    socket.on('duel_finished', handleDuelTerminal);
    socket.on('duel_forfeited', handleDuelTerminal);

    return () => {
      socket.off('duel_state_update', onDuelStateUpdate);
      socket.off('match_found', onMatchFound);
      socket.off('duel_countdown', onDuelCountdown);
      socket.off('duel_started', onDuelStarted);
      socket.off('opponent_claimed_victory', onOpponentClaimedVictory);
      socket.off('victory_disputed', onVictoryDisputed);
      socket.off('duel_finished', handleDuelTerminal);
      socket.off('duel_forfeited', handleDuelTerminal);
    };
  }, [socket, activeDuel, user, completedDuelIds, handleDuelTerminal]);

  const handleVerify = () => {
    // Only used for honor system logic if fallback needed
  };

  const confirmOpponentVictory = () => {
    socket.emit('confirm_opponent_victory', { duelId: activeDuel.id, winnerId: claimantId });
    setShowConfirmModal(false);
  };

  const disputeVictory = () => {
    socket.emit('dispute_victory', { duelId: activeDuel.id, claimantId });
    setShowConfirmModal(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleLeaveDuel = () => {
    clearActiveDuel();
  };

  const handleFindRandomMatch = () => {
    setIsSearching(true);
    socket.emit('find_random_match');
  };

  const handleCancelSearch = () => {
    setIsSearching(false);
    socket.emit('cancel_match_search');
  };

  if (matchStatus === 'starting') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ fontSize: '4rem', color: 'var(--accent-primary)', fontWeight: 800 }}>{countdown}</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Get ready! Duel starting soon...</p>
      </div>
    );
  }

  if (matchStatus === 'active') {
    return <LiveDuelArena duel={activeDuel} socket={socket} user={user} onLeave={handleLeaveDuel} />;
  }

  if (matchStatus === 'finished' && lastDuelResult) {
    return <LiveDuelArena duel={lastDuelResult} socket={socket} user={user} onLeave={handleLeaveDuel} />;
  }

  // Lobby View
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem' }}>
      {/* Left Column: Duels */}
      <div>
        <header style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Live Duels</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Challenge your friends to real-time coding matches.</p>
        </header>

        <div className="clay-card" style={{ textAlign: 'center', padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', background: 'rgba(217, 119, 6, 0.1)', borderRadius: '50%', marginBottom: '1rem', color: 'var(--accent-primary)' }}>
            <Swords size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Ready for a Duel?</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '500px', margin: '0 auto 1.25rem' }}>
            Head over to the <strong>Friends</strong> tab to challenge someone directly, or wait in the lobby to accept incoming challenges! You can also find a random opponent to play against.
          </p>
          
          {isSearching ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>
                <span className="spinner" style={{ width: 16, height: 16, border: '2px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
                Searching for opponent...
              </div>
              <button className="clay-btn-secondary" onClick={handleCancelSearch}>Cancel Search</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <button className="clay-btn-primary" onClick={handleFindRandomMatch} style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
                Find Random Match
              </button>
              <div className="clay-recessed" style={{ padding: '0.75rem 1.25rem', display: 'inline-block' }}>
                <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-success)', display: 'inline-block', boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.2)' }}></span>
                  Waiting for direct challenges...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Duel History */}
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={18} style={{ color: 'var(--accent-primary)' }} />
            Match History
          </h3>

        {historyLoading ? (
          <div className="clay-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontWeight: 600 }}>Loading history...</div>
        ) : duelHistory.length === 0 ? (
          <div className="clay-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            No duels played yet. Challenge a friend to get started!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(showAllHistory ? duelHistory : duelHistory.slice(0, 5)).map((duel, i) => {
              const isWin = duel.winner && duel.winner._id === user._id;
              const isDraw = !duel.winner;
              const opponents = duel.players?.filter(p => p._id !== user._id) || [];
              const opponent = opponents[0];
              const durationMins = duel.timeLimit;
              const date = new Date(duel.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

              return (
                <div key={duel._id || i} className="clay-card" style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem'
                }}>
                  {/* Result badge */}
                  <div className="clay-recessed" style={{
                    width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    color: isWin ? 'var(--accent-success)' : isDraw ? 'var(--accent-warning)' : 'var(--accent-danger)'
                  }}>
                    {isWin ? <Trophy size={18} /> : isDraw ? <Minus size={18} /> : <XCircle size={18} />}
                  </div>

                  {/* Problem info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {duel.problem?.title || 'Unknown Problem'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ textTransform: 'capitalize' }}>{duel.problem?.platform}</span>
                      {duel.problem?.difficulty && <span style={{
                        color: duel.problem.difficulty === 'Easy' ? 'var(--accent-success)' : duel.problem.difficulty === 'Hard' ? 'var(--accent-danger)' : 'var(--accent-warning)'
                      }}>{duel.problem.difficulty}</span>}
                      <span><Clock size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {durationMins} min</span>
                    </div>
                  </div>
                  {/* Opponent */}
                  <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {opponents.length > 1 ? (
                        <span>{opponents.length} Others</span>
                      ) : (
                        <>
                          <img src={opponent?.profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${opponent?.username}`}
                            alt={opponent?.username} style={{ width: 24, height: 24, borderRadius: '50%', cursor: 'pointer' }} onClick={() => setSelectedUserId(opponent?._id)} />
                          <span style={{ cursor: 'pointer' }} onClick={() => setSelectedUserId(opponent?._id)}>{opponent?.username || 'Unknown'}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Result label + date */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontWeight: 700, fontSize: '0.85rem',
                      color: isWin ? 'var(--accent-success)' : isDraw ? 'var(--accent-warning)' : 'var(--accent-danger)'
                    }}>
                      {isWin ? 'WIN' : isDraw ? 'DRAW' : 'LOSS'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{date}</div>
                  </div>
                </div>
              );
            })}
            
            {duelHistory.length > 5 && (
              <button 
                className="clay-btn w-full" 
                style={{ marginTop: '1rem', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                onClick={() => setShowAllHistory(!showAllHistory)}
              >
                {showAllHistory ? 'Show Less' : 'Show More'}
              </button>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Right Column: Global Active Members */}
      <div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-success)', display: 'inline-block', boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.2)' }}></span>
          Online
        </h3>
        
        <div className="clay-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
          {onlineUsers.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '1rem 0', width: '100%' }}>
              No other members online.
            </div>
          ) : (
            onlineUsers.map(u => (
              <div 
                key={u._id} 
                title={`${u.username} (Rating: ${u.stats?.globalRating || 0})`}
                style={{ position: 'relative', cursor: 'pointer', transition: 'transform 0.2s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onClick={() => setSelectedUserId(u._id)}
              >
                <img 
                  src={u.profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} 
                  alt={u.username} 
                  style={{ width: 40, height: 40, borderRadius: '50%', boxShadow: '4px 4px 8px rgba(0,0,0,0.1), -4px -4px 8px rgba(255,255,255,0.7)' }} 
                />
                <span style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-success)', border: '2px solid var(--bg-primary)' }}></span>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedUserId && <UserProfileModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </div>
  );
};

export default LiveDuels;
