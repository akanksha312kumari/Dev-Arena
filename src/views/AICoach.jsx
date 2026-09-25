import React, { useState, useEffect, useRef } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Bot, Send, Sparkles, Volume2, Square, Loader2, Mic } from 'lucide-react';

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
      } catch (e) {
        console.error("Parse error:", e);
      }
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

  const [playingAudio, setPlayingAudio] = useState(null);
  const [loadingAudio, setLoadingAudio] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        setIsTranscribing(true);

        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${import.meta.env.VITE_API_URL}/voice/stt`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          if (!res.ok) {
            let errorMsg = 'Failed to transcribe audio.';
            try {
              const errData = await res.json();
              if (errData && errData.message) errorMsg = errData.message;
            } catch(e) {}
            throw new Error(errorMsg);
          }
          const data = await res.json();
          if (data.transcript && data.transcript.trim()) {
            setInput(prev => prev + (prev ? ' ' : '') + data.transcript);
          } else {
            alert('No speech detected.');
          }
        } catch (error) {
          console.error(error);
          alert(error.message || 'Failed to transcribe audio.');
        } finally {
          setIsTranscribing(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handlePlayTTS = async (text, index) => {
    if (loadingAudio === index) return;
    
    if (playingAudio === index) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingAudio(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingAudio(null);
    }

    setLoadingAudio(index);
    try {
      const token = localStorage.getItem('token');
      // Simple regex to clean up markdown (bold, italic, code blocks, etc.)
      const cleanedText = text
        .replace(/```[\s\S]*?```/g, ' code block ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#(.*?)(\n|$)/g, '$1$2')
        .trim();

      const res = await fetch(`${import.meta.env.VITE_API_URL}/voice/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: cleanedText })
      });

      if (!res.ok) {
        let errorMsg = 'TTS failed';
        try {
          const data = await res.json();
          if (data && data.message) errorMsg = data.message;
        } catch(e) {}
        throw new Error(errorMsg);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingAudio(null);
        URL.revokeObjectURL(url);
      };
      
      await audio.play();
      setPlayingAudio(index);
    } catch (error) {
      console.error(error);
      alert('Voice playback is currently unavailable.');
    } finally {
      setLoadingAudio(null);
    }
  };

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
                {msg.role === 'assistant' && (
                  <button 
                    onClick={() => handlePlayTTS(msg.content, i)} 
                    className="flex items-center justify-center mt-2 p-1" 
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', opacity: 0.8 }}
                    title={playingAudio === i ? "Stop playback" : "Play response"}
                  >
                    {loadingAudio === i ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : playingAudio === i ? (
                      <Square size={16} fill="currentColor" />
                    ) : (
                      <Volume2 size={16} />
                    )}
                  </button>
                )}
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
                <button 
                  className={`btn ${isRecording ? '' : 'btn-outline'}`}
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={loading || isTranscribing}
                  title={isRecording ? "Stop recording" : "Start voice input"}
                  style={{ 
                    padding: '0.75rem', 
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: isRecording ? 'var(--accent-danger)' : 'var(--card-border)',
                    background: isRecording ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                    color: isRecording ? 'var(--accent-danger)' : 'var(--text-primary)'
                  }}
                >
                  {isTranscribing ? <Loader2 size={20} className="animate-spin" /> : (isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />)}
                </button>
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isRecording ? 'Listening...' : (isTranscribing ? 'Transcribing...' : 'Ask me anything...')}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                  disabled={loading || isRecording || isTranscribing}
                />
                <button className="btn btn-primary" onClick={() => handleSend(input)} disabled={loading || isRecording || isTranscribing || (!input.trim() && !isRecording)}>
                  <Send size={20} />
                </button>
              </div>
        </div>
      </div>
    </div>
  );
};

export default AICoach;
