import React, { useState, useEffect, useRef } from 'react';
import { Users, Hash, ChevronRight, Send, Plus, X, UserPlus, UserMinus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const PrivateRooms = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [newRoomData, setNewRoomData] = useState({ name: '', description: '' });
  
  // Group Challenge State
  const [onlineMembers, setOnlineMembers] = useState(new Set());
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeData, setChallengeData] = useState({ platform: 'LeetCode', problemId: '', timeLimit: 30 });
  const [incomingGroupChallenge, setIncomingGroupChallenge] = useState(null);
  
  // Room Management State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setFriends(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Fallback to our prototype room if none are returned (for testing)
        if (data.length === 0) {
          setRooms([{ _id: 'room1', name: 'Global Dev Lounge', members: [1] }]);
        } else {
          setRooms(data);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/rooms`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(newRoomData)
      });
      
      if (res.ok) {
        const newRoom = await res.json();
        setRooms(prev => [...prev, newRoom]);
        setIsCreating(false);
        setNewRoomData({ name: '', description: '' });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/rooms/join`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ inviteCode })
      });
      
      if (res.ok) {
        const joinedRoom = await res.json();
        // Check if already in rooms list
        if (!rooms.find(r => r._id === joinedRoom._id)) {
          setRooms(prev => [...prev, joinedRoom]);
        }
        setIsJoining(false);
        setInviteCode('');
        setSelectedRoom(joinedRoom);
      } else {
        const err = await res.json();
        alert(err.message || 'Invalid invite code');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleKickMember = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/rooms/${selectedRoom._id || selectedRoom.id}/kick`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        const updatedRoom = await res.json();
        setRooms(prev => prev.map(r => r._id === updatedRoom._id ? updatedRoom : r));
        setSelectedRoom(updatedRoom);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleInviteFriend = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/rooms/${selectedRoom._id || selectedRoom.id}/invite`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        const updatedRoom = await res.json();
        setRooms(prev => prev.map(r => r._id === updatedRoom._id ? updatedRoom : r));
        setSelectedRoom(updatedRoom);
        setShowInviteModal(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!socket || !selectedRoom) return;

    setMessages([]); // clear previous room's messages
    socket.emit('join_room', selectedRoom._id || selectedRoom.id);

    const handleReceiveMessage = (data) => {
      setMessages((prev) => [...prev, data]);
    };

    const handleRoomHistory = (history) => {
      setMessages(history);
    };

    const handleUserTyping = ({ username }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(username);
        return newSet;
      });
    };

    const handleUserStopTyping = ({ username }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(username);
        return newSet;
      });
    };

    const handleOnlineMembers = (userIds) => {
      setOnlineMembers(new Set(userIds));
    };
    
    const handleGroupChallengeReceived = (data) => {
      // Don't show to the sender
      if (data.senderId !== user._id) {
        setIncomingGroupChallenge(data);
      }
    };
    
    const handleGroupChallengeStarted = (data) => {
      setIncomingGroupChallenge(null);
    };
    
    const handleGroupChallengeCancelled = (data) => {
      setIncomingGroupChallenge(null);
      // Could show toast notification here
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('room_history', handleRoomHistory);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('online_members_update', handleOnlineMembers);
    socket.on('group_challenge_received', handleGroupChallengeReceived);
    socket.on('group_challenge_started', handleGroupChallengeStarted);
    socket.on('group_challenge_cancelled', handleGroupChallengeCancelled);

    return () => {
      socket.emit('leave_room', selectedRoom._id || selectedRoom.id);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('room_history', handleRoomHistory);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('online_members_update', handleOnlineMembers);
      socket.off('group_challenge_received', handleGroupChallengeReceived);
      socket.off('group_challenge_started', handleGroupChallengeStarted);
      socket.off('group_challenge_cancelled', handleGroupChallengeCancelled);
    };
  }, [socket, selectedRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !selectedRoom) return;

    const msgData = {
      roomId: selectedRoom._id || selectedRoom.id,
      message: newMessage,
      senderId: user._id,
      senderName: user.username,
      timestamp: new Date()
    };

    // Optimistic update
    setMessages((prev) => [...prev, msgData]);
    
    socket.emit('send_message', msgData);
    socket.emit('stop_typing', { roomId: selectedRoom._id || selectedRoom.id, username: user.username });
    
    setNewMessage('');
    setIsTyping(false);
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!socket || !selectedRoom) return;

    if (!isTyping && e.target.value) {
      setIsTyping(true);
      socket.emit('typing', { roomId: selectedRoom._id || selectedRoom.id, username: user.username });
    } else if (isTyping && !e.target.value) {
      setIsTyping(false);
      socket.emit('stop_typing', { roomId: selectedRoom._id || selectedRoom.id, username: user.username });
    }
  };

  const handleSendGroupChallenge = (e) => {
    e.preventDefault();
    if (!socket || !selectedRoom) return;

    if (!challengeData.problemId) return;

    const problem = {
      platform: challengeData.platform,
      problemId: challengeData.problemId,
      title: challengeData.problemId, 
      difficulty: 'Custom'
    };
    
    socket.emit('send_group_challenge', {
      roomId: selectedRoom._id || selectedRoom.id,
      problem,
      timeLimit: parseInt(challengeData.timeLimit)
    });
    
    setShowChallengeModal(false);
  };

  const handleAcceptGroupChallenge = () => {
    if (!incomingGroupChallenge) return;
    socket.emit('accept_group_challenge', { duelId: incomingGroupChallenge.duelId });
    // After accepting, wait for the lobby timer to end, which triggers group_challenge_started
    // Hide the prompt for now, or change it to "Waiting for others..."
    setIncomingGroupChallenge(null);
  };

  if (selectedRoom) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <header className="flex items-center justify-between gap-4" style={{ marginBottom: '1.5rem' }}>
          <div className="flex items-center gap-4">
            <button className="clay-btn btn-outline" onClick={() => setSelectedRoom(null)}>Back</button>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selectedRoom.name}</h2>
              <div style={{ color: 'var(--text-muted)' }}>
                {selectedRoom.members?.length || selectedRoom.members} total members • <span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>{onlineMembers.size} online</span>
                {selectedRoom.inviteCode && ` • Invite Code: ${selectedRoom.inviteCode}`}
              </div>
            </div>
          </div>
          {onlineMembers.size > 1 && (
            <button className="clay-btn btn-primary" onClick={() => setShowChallengeModal(true)}>
              Challenge Group
            </button>
          )}
        </header>

        <div className="clay-card" style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: '1.5rem', maxHeight: '70vh' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' }}>
              {messages.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>No messages yet. Say hi!</div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.senderId === user._id;
                  return (
                    <div key={idx} className="flex gap-3" style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                      {!isMe && <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderName}`} alt="Avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />}
                      <div>
                        {!isMe && <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{msg.senderName}</div>}
                        <div style={{ 
                          background: isMe ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
                          color: isMe ? 'white' : 'var(--text-primary)',
                          padding: '0.5rem 1rem', 
                          borderRadius: isMe ? '8px 0 8px 8px' : '0 8px 8px 8px' 
                        }}>
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              
              {typingUsers.size > 0 && (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2 mt-4" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
              <input 
                type="text" 
                className="clay-input"
                placeholder={`Message #${selectedRoom.name.replace(/\s+/g, '-').toLowerCase()}`}
                value={newMessage}
                onChange={handleTyping}
              />
              <button type="submit" className="clay-btn btn-primary"><Send size={20} /></button>
            </form>
          </div>
          
          <div style={{ width: '250px', borderLeft: '1px solid var(--card-border)', paddingLeft: '1.5rem', overflowY: 'auto' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 700 }}>Members</h3>
              {selectedRoom.admins?.some(a => a._id === user._id) && (
                <button 
                  className="clay-btn btn-outline p-1" 
                  title="Invite Friend"
                  onClick={() => { fetchFriends(); setShowInviteModal(true); }}
                >
                  <UserPlus size={16} />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {Array.isArray(selectedRoom.members) && selectedRoom.members.map(member => {
                if (!member || typeof member === 'string') return null;
                const isOnline = onlineMembers.has(member._id);
                const isAdmin = selectedRoom.admins?.some(a => a._id === member._id);
                const iAmAdmin = selectedRoom.admins?.some(a => a._id === user._id);
                return (
                  <div key={member._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div style={{ position: 'relative' }}>
                        <img src={member.profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`} alt={member.username} style={{ width: 32, height: 32, borderRadius: '50%' }} />
                        {isOnline && <span style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-success)', border: '2px solid var(--card-bg)' }}></span>}
                      </div>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div style={{ fontWeight: 600 }}>{member.username}</div>
                        {isAdmin && <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700 }}>Admin</div>}
                      </div>
                    </div>
                    {iAmAdmin && member._id !== user._id && (
                      <button onClick={() => handleKickMember(member._id)} className="clay-btn" style={{ padding: '0.25rem', color: 'var(--accent-danger)', background: 'transparent' }} title="Kick Member">
                        <UserMinus size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Group Challenge Modal */}
        {showChallengeModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="clay-card" style={{ width: '100%', maxWidth: '400px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Challenge {selectedRoom.name}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Broadcast a challenge to all {onlineMembers.size} online members. They will have 15 seconds to accept.
              </p>
              <form onSubmit={handleSendGroupChallenge} className="flex flex-col gap-4">
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Platform</label>
                  <select 
                    value={challengeData.platform}
                    onChange={e => setChallengeData({...challengeData, platform: e.target.value})}
                    className="clay-input"
                  >
                    <option value="LeetCode">LeetCode</option>
                    <option value="Codeforces">Codeforces</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Problem URL or Name</label>
                  <input 
                    type="text" required
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
                  <button type="submit" className="clay-btn btn-primary">Send Challenge</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Incoming Group Challenge Modal */}
        {incomingGroupChallenge && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
            <div className="card text-center" style={{ width: '100%', maxWidth: '400px', animation: 'fadeIn 0.3s' }}>
              <div style={{ padding: '1rem', background: 'rgba(217, 119, 6, 0.1)', borderRadius: '50%', marginBottom: '1rem', color: 'var(--accent-primary)', display: 'inline-block' }}>
                <Users size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Incoming Group Duel!</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                <strong>{incomingGroupChallenge.senderName}</strong> has initiated a group challenge for <strong>{incomingGroupChallenge.problem?.title}</strong>!
              </p>
              <div style={{ padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                Time Limit: <strong>{incomingGroupChallenge.timeLimit} Minutes</strong>
              </div>
              <div className="flex gap-4 justify-center">
                <button className="clay-btn btn-outline" onClick={() => setIncomingGroupChallenge(null)} style={{ flex: 1, borderColor: 'var(--accent-danger)', color: 'var(--accent-danger)' }}>Decline</button>
                <button className="clay-btn btn-primary" onClick={handleAcceptGroupChallenge} style={{ flex: 1 }}>Accept Duel</button>
              </div>
            </div>
          </div>
        )}

        {/* Invite Friend Modal */}
        {showInviteModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
            <div className="clay-card" style={{ width: '100%', maxWidth: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div className="flex justify-between items-center mb-4">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Invite a Friend</h3>
                <button onClick={() => setShowInviteModal(false)} className="clay-btn btn-outline" style={{ padding: '0.25rem' }}><X size={20}/></button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {friends.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No friends to invite.</div>
                ) : (
                  friends.map(friend => {
                    const isAlreadyMember = selectedRoom.members?.some(m => m._id === friend._id);
                    return (
                      <div key={friend._id} className="flex items-center justify-between p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg mb-2">
                        <div className="flex items-center gap-3">
                          <img src={friend.profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`} alt={friend.username} style={{ width: 36, height: 36, borderRadius: '50%' }} />
                          <div style={{ fontWeight: 600 }}>{friend.username}</div>
                        </div>
                        {isAlreadyMember ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Joined</span>
                        ) : (
                          <button onClick={() => handleInviteFriend(friend._id)} className="clay-btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                            Invite
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Private Rooms</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Collaborate and chat in real-time.</p>
        </div>
        <div className="flex gap-2">
          <button className="clay-btn btn-outline" onClick={() => setIsJoining(true)}>Join Room</button>
          <button className="clay-btn btn-primary" onClick={() => setIsCreating(true)}><Plus size={20} /> Create Room</button>
        </div>
      </header>

      {isJoining && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="clay-card" style={{ width: '400px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Join Private Room</h3>
            <form onSubmit={handleJoinRoom} className="flex flex-col gap-4">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Invite Code</label>
                <input 
                  type="text" required
                  className="clay-input"
                  value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                  placeholder="e.g. 5A3B9C"
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" className="clay-btn btn-outline" onClick={() => setIsJoining(false)}>Cancel</button>
                <button type="submit" className="clay-btn btn-primary">Join</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreating && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="clay-card" style={{ width: '400px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Create Private Room</h3>
            <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Room Name</label>
                <input 
                  type="text" required
                  className="clay-input"
                  value={newRoomData.name} onChange={e => setNewRoomData({...newRoomData, name: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Description</label>
                <input 
                  type="text" 
                  className="clay-input"
                  value={newRoomData.description} onChange={e => setNewRoomData({...newRoomData, description: e.target.value})}
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" className="clay-btn btn-outline" onClick={() => setIsCreating(false)}>Cancel</button>
                <button type="submit" className="clay-btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {rooms.map(room => (
          <div key={room._id || room.id} className="card flex flex-col justify-between cursor-pointer" onClick={() => setSelectedRoom(room)} style={{ transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } }}>
            <div>
              <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(217, 119, 6, 0.1)', padding: '0.5rem', borderRadius: '8px', color: 'var(--accent-primary)' }}>
                  <Hash size={24} />
                </div>
                <h3 style={{ fontWeight: 600, fontSize: '1.125rem' }}>{room.name}</h3>
              </div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                {room.description || 'A place to discuss algorithms, share memes, and challenge friends.'}
              </div>
            </div>
            <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
              <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <Users size={16} /> {room.members?.length || room.members} Members
              </div>
              <ChevronRight size={20} color="var(--text-muted)" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrivateRooms;
