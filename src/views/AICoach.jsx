import React, { useState, useEffect, useRef } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Bot, Send, Sparkles } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

// Helper to generate deterministic pseudo-random numbers based on a string seed
const getSeed = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const getDynamicData = (username) => {
  const seed = getSeed(username || 'Guest');
  
  // Use bitwise operations on the seed to get somewhat consistent 0-100 values
  const rand = (index) => Math.abs((Math.sin(seed + index) * 10000)) % 70 + 30;

  const data = [
    { subject: 'Dynamic Programming', A: Math.floor(rand(1)), fullMark: 100 },
    { subject: 'Graphs', A: Math.floor(rand(2)), fullMark: 100 },
    { subject: 'Strings', A: Math.floor(rand(3)), fullMark: 100 },
    { subject: 'Trees', A: Math.floor(rand(4)), fullMark: 100 },
    { subject: 'Math', A: Math.floor(rand(5)), fullMark: 100 },
    { subject: 'Greedy', A: Math.floor(rand(6)), fullMark: 100 },
  ];
  return data;
};

const AICoach = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('aiCoachMessages');
    const timestamp = localStorage.getItem('aiCoachTimestamp');
    if (saved && timestamp && (Date.now() - parseInt(timestamp) < 60 * 60 * 1000)) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { role: 'assistant', content: "Hello! I'm your DevArena AI Coach. Based on your stats, you're crushing Trees and Graphs, but Dynamic Programming could use some work. How can I help you today?" }
    ];
  });
  
  useEffect(() => {
    localStorage.setItem('aiCoachMessages', JSON.stringify(messages));
    localStorage.setItem('aiCoachTimestamp', Date.now().toString());
  }, [messages]);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');

  const handleSend = async (text) => {
    if (!text.trim() || loading) return;
    
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ messages: newMessages })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "An error occurred while connecting to the AI Coach." }]);
    } finally {
      setLoading(false);
    }
  };

  const dynamicRadarData = getDynamicData(user?.username);
  
  // Get two weakest subjects for Focus Areas
  const focusAreas = [...dynamicRadarData].sort((a, b) => a.A - b.A).slice(0, 2);

  return (
    <div className="dashboard-grid" style={{ height: 'calc(100vh - 4rem)', gridTemplateColumns: '1fr 2fr' }}>
      {/* Weakness Detection Panel */}
      <div className="card flex flex-col h-full">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Skill Analysis</h3>
        <div style={{ flex: 1, minHeight: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={dynamicRadarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar name="Proficiency" dataKey="A" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Focus Areas</h4>
          <div className="flex gap-2 flex-wrap">
            {focusAreas.map(area => (
              <span key={area.subject} className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)' }}>
                {area.subject} ({area.A}%)
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="card flex flex-col h-full" style={{ padding: '0', overflow: 'hidden' }}>
        <header className="flex items-center gap-2" style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--card-border)', background: 'var(--bg-secondary)' }}>
          <Bot size={20} color="var(--accent-primary)" />
          <h3 style={{ fontWeight: 600 }}>DevArena Coach</h3>
        </header>

        <div style={{ flex: 1, minHeight: 0, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div style={{
                maxWidth: '80%', padding: '0.75rem 1rem', borderRadius: '12px',
                background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                borderBottomRightRadius: msg.role === 'user' ? '4px' : '12px',
                borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '12px',
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--card-border)' }}>
          <div className="flex gap-2 mb-3 overflow-x-auto" style={{ paddingBottom: '0.5rem' }}>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }} onClick={() => handleSend("Analyze my recent Codeforces slump")}>
              <Sparkles size={14} /> Analyze my recent Codeforces slump
            </button>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }} onClick={() => handleSend("Give me a DP roadmap for interview prep")}>
              <Sparkles size={14} /> Give me a DP roadmap for interview prep
            </button>
          </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..." 
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                  disabled={loading}
                />
                <button className="btn btn-primary" onClick={() => handleSend(input)} disabled={loading}>
                  <Send size={20} />
                </button>
              </div>
        </div>
      </div>
    </div>
  );
};

export default AICoach;
