import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { 
  BookOpen, Clock, Target, ArrowRight, Activity, Zap, RefreshCw, 
  BrainCircuit, CheckCircle, XCircle, Trophy, Sparkles, ShieldAlert, 
  Award, MessageSquareCode, Send, HelpCircle, Layers, TrendingUp, History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PersonalizedLearning = () => {
  const { user, setUser } = useAuth();
  const [learningPlan, setLearningPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [planError, setPlanError] = useState(null);

  // Quiz State
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState(null);

  // Input States
  const [initialAnswer, setInitialAnswer] = useState('');
  const [defenseAnswer, setDefenseAnswer] = useState('');

  // Scorecard & Stats
  const [quizStats, setQuizStats] = useState(null);
  const [quizHistory, setQuizHistory] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchLearningPlan = async () => {
    setLoadingPlan(true);
    setPlanError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/ai/learning-plan`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate learning plan.');
      const data = await res.json();
      setLearningPlan(data);
      if (data?.roadmap && data.roadmap.length > 0 && !selectedTopic) {
        setSelectedTopic(data.roadmap[0].topic);
      }
    } catch (err) {
      console.error(err);
      setPlanError('Could not connect to the AI service. Please try again later.');
    } finally {
      setLoadingPlan(false);
    }
  };

  const fetchQuizStatsAndHistory = async () => {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('token');
      const [statsRes, historyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/quiz/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/quiz/history`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setQuizStats(statsData);
      }
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setQuizHistory(historyData);
      }
    } catch (err) {
      console.error('Failed to fetch quiz stats/history:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchLearningPlan();
    fetchQuizStatsAndHistory();
  }, []);

  // Clear answer textareas whenever question index or quiz changes
  useEffect(() => {
    setInitialAnswer('');
    setDefenseAnswer('');
    setQuizError(null);
  }, [activeQuiz?.currentQuestionIndex, activeQuiz?._id]);

  const handleStartQuiz = async (topicToUse) => {
    const topicName = topicToUse || (selectedTopic === 'custom' ? customTopic : selectedTopic);
    if (!topicName || !topicName.trim()) {
      setQuizError('Please select or type a valid topic to start the quiz.');
      return;
    }

    setQuizLoading(true);
    setQuizError(null);
    setInitialAnswer('');
    setDefenseAnswer('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/quiz/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic: topicName.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start quiz');

      setActiveQuiz(data.quiz);
    } catch (err) {
      console.error(err);
      setQuizError(err.message || 'Error initializing Socratic Quiz session.');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSubmitInitialAnswer = async () => {
    if (!initialAnswer.trim() || !activeQuiz) return;

    setQuizLoading(true);
    setQuizError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/quiz/submit-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quizId: activeQuiz._id,
          answer: initialAnswer.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit initial answer');

      setActiveQuiz(data.quiz);
    } catch (err) {
      console.error(err);
      setQuizError(err.message || 'Error analyzing initial answer.');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSubmitDefense = async () => {
    if (!defenseAnswer.trim() || !activeQuiz) return;

    setQuizLoading(true);
    setQuizError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/quiz/evaluate-defense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quizId: activeQuiz._id,
          defense: defenseAnswer.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to evaluate defense');

      setActiveQuiz(data.quiz);

      // Refresh stats & user profile
      fetchQuizStatsAndHistory();
      const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (meRes.ok) {
        const updatedUser = await meRes.json();
        setUser(updatedUser);
      }
    } catch (err) {
      console.error(err);
      setQuizError(err.message || 'Error evaluating defense.');
    } finally {
      setQuizLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!activeQuiz) return;
    setQuizLoading(true);
    setQuizError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/quiz/next-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quizId: activeQuiz._id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to advance to next question');
      setActiveQuiz(data.quiz);
      setInitialAnswer('');
      setDefenseAnswer('');
    } catch (err) {
      console.error(err);
      setQuizError(err.message || 'Error moving to next question.');
    } finally {
      setQuizLoading(false);
    }
  };

  const getDifficultyColor = (diff) => {
    const d = diff?.toLowerCase() || '';
    if (d.includes('easy')) return 'var(--accent-success)';
    if (d.includes('hard')) return 'var(--accent-danger)';
    if (d.includes('medium')) return 'var(--accent-warning)';
    return 'var(--accent-primary)';
  };

  const currentQ = activeQuiz?.questions ? activeQuiz.questions[activeQuiz.currentQuestionIndex] : null;

  return (
    <div style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Bar */}
      <div className="flex justify-between items-center flex-wrap gap-4" style={{ marginBottom: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BookOpen size={28} style={{ color: 'var(--accent-primary)' }} />
            Personalized Learning Path & Socratic Quiz
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            AI-powered coding roadmap & interactive Socratic diagnostic quizzes tailored to your skill progression.
          </p>
        </div>
        <button className="clay-btn btn-outline flex items-center gap-2" onClick={fetchLearningPlan} disabled={loadingPlan}>
          <RefreshCw size={18} className={loadingPlan ? "animate-spin" : ""} />
          {loadingPlan ? 'Analyzing Stats...' : 'Refresh Plan'}
        </button>
      </div>

      {loadingPlan ? (
        <div className="clay-card flex flex-col items-center justify-center" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div className="animate-pulse" style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-primary)', opacity: 0.5, marginBottom: '1.5rem' }}></div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Gemma is analyzing your performance...</h3>
          <p style={{ color: 'var(--text-muted)' }}>Generating your personalized coding roadmap.</p>
        </div>
      ) : planError ? (
        <div className="clay-card" style={{ borderLeft: '4px solid var(--accent-danger)', padding: '2rem' }}>
          <h3 style={{ color: 'var(--accent-danger)', fontWeight: 700, marginBottom: '0.5rem' }}>AI Service Unavailable</h3>
          <p style={{ color: 'var(--text-secondary)' }}>{planError}</p>
        </div>
      ) : (
        <div className="learning-path-grid-container">
          
          {/* Roadmap Section (Bigger & Wider Layout) */}
          <div className="clay-card" style={{ display: 'flex', flexDirection: 'column', maxHeight: '660px' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '1rem', flexShrink: 0 }}>
              <div className="flex items-center gap-2">
                <Target size={22} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Recommended Topics</h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ranked by your weak points</span>
            </div>
            
            <div className="no-scrollbar" style={{ position: 'relative', padding: '1rem 0.5rem 1rem 0', overflowY: 'auto', flex: 1, paddingRight: '0.75rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {/* Central dashed line */}
              <div style={{ position: 'absolute', left: '50%', top: '2rem', bottom: '2rem', width: '4px', borderLeft: '4px dashed var(--accent-primary)', transform: 'translateX(-50%)', opacity: 0.3 }}></div>
              
              {learningPlan?.roadmap?.map((item, idx) => {
                const isLeft = idx % 2 === 0;
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: isLeft ? 'flex-start' : 'flex-end', width: '100%', position: 'relative', marginBottom: '2.5rem' }}>
                    
                    {/* The Node on the central line */}
                    <div style={{
                      position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 38, height: 38, borderRadius: '50%', background: 'var(--bg-primary)', border: '3px solid var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent-primary)', zIndex: 10, boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                    }}>
                      {idx + 1}
                    </div>
                    
                    {/* The Topic Card */}
                    <div className="clay-recessed" style={{
                       width: '45%',
                       padding: '1.25rem',
                       position: 'relative',
                       display: 'flex',
                       flexDirection: 'column',
                       gap: '0.65rem',
                       transition: 'transform 0.25s ease',
                       zIndex: 5
                    }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                      
                       <div className="flex items-center justify-between gap-2" style={{ marginBottom: '0.1rem' }}>
                         <span style={{
                           display: 'inline-flex',
                           alignItems: 'center',
                           padding: '0.15rem 0.55rem',
                           borderRadius: '8px',
                           background: `${getDifficultyColor(item.difficulty)}20`,
                           color: getDifficultyColor(item.difficulty),
                           border: `1px solid ${getDifficultyColor(item.difficulty)}50`,
                           fontSize: '0.68rem',
                           fontWeight: 800,
                           letterSpacing: '0.5px',
                           textTransform: 'uppercase',
                           boxShadow: 'none'
                         }}>
                           {item.difficulty}
                         </span>
                       </div>

                       <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, wordBreak: 'break-word' }}>
                         {item.topic}
                       </h4>
                       
                       <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.reason}</p>
                       
                       {item.steps && item.steps.length > 0 && (
                         <div style={{ marginTop: '0.15rem' }}>
                           <ul style={{ margin: 0, paddingLeft: '1rem', listStyleType: 'disc', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                             {item.steps.map((step, sIdx) => (
                               <li key={sIdx} style={{ marginBottom: '0.1rem' }}>{step}</li>
                             ))}
                           </ul>
                         </div>
                       )}
                       
                       <div className="flex justify-between items-center mt-2" style={{ fontSize: '0.78rem' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                           <Clock size={13} style={{ color: 'var(--accent-primary)' }} /> {item.estimatedTime}
                         </div>
                         <button 
                           className="clay-btn btn-primary" 
                           style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                           onClick={() => {
                             setSelectedTopic(item.topic);
                             handleStartQuiz(item.topic);
                           }}
                         >
                           Take Quiz
                         </button>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Socratic Quiz Dedicated Workspace (Shorter & Sleeker Layout) */}
          <div className="clay-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '560px' }}>
             
             {/* Quiz Header */}
             <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--card-border)', flexShrink: 0 }}>
               <div className="flex items-center gap-2">
                 <BrainCircuit size={24} style={{ color: 'var(--accent-primary)' }} />
                 <div>
                   <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>Socratic Quiz Workspace</h3>
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deep Diagnostic AI Assessment</span>
                 </div>
               </div>
               {activeQuiz && (
                 <span style={{ background: 'var(--accent-primary)', color: 'white', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '10px', fontSize: '0.75rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                   {activeQuiz.topic}
                 </span>
               )}
             </div>

             {quizError && (
               <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)', fontSize: '0.85rem', flexShrink: 0 }}>
                 {quizError}
               </div>
             )}

             {/* Topic Selection View (When Quiz NOT Active or Completed) */}
             {(!activeQuiz || activeQuiz.status === 'completed') && (
               <div className="flex flex-col gap-4 no-scrollbar" style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                 {activeQuiz?.status === 'completed' && (
                   <div className="clay-recessed" style={{ padding: '1rem', textAlign: 'center', borderLeft: '4px solid var(--accent-success)' }}>
                     <Trophy size={28} style={{ color: 'var(--accent-warning)', margin: '0 auto 0.5rem' }} />
                     <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Quiz Session Completed!</h4>
                     <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                       Final Score: <strong>{activeQuiz.score}/100</strong> • Mastery: <strong>{activeQuiz.masteryLevel}%</strong> ({activeQuiz.masteryGained >= 0 ? `+${activeQuiz.masteryGained}` : activeQuiz.masteryGained}%) • XP: <strong>+{activeQuiz.pointsEarned}</strong>
                     </p>
                   </div>
                 )}

                 <div className="flex flex-col gap-2">
                   <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Select Roadmap Topic:</label>
                   <select 
                     className="clay-input" 
                     value={selectedTopic} 
                     onChange={(e) => setSelectedTopic(e.target.value)}
                     style={{ padding: '0.75rem', width: '100%', borderRadius: '10px' }}
                   >
                     {learningPlan?.roadmap?.map((t, i) => (
                       <option key={i} value={t.topic}>{t.topic} ({t.difficulty})</option>
                     ))}
                     <option value="custom">✍️ Type Custom Topic...</option>
                   </select>
                 </div>

                 {selectedTopic === 'custom' && (
                   <div className="flex flex-col gap-2">
                     <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Custom Topic Name:</label>
                     <input 
                       type="text" 
                       className="clay-input" 
                       placeholder="e.g. Segment Trees, Graph BFS, Trie" 
                       value={customTopic}
                       onChange={(e) => setCustomTopic(e.target.value)}
                       style={{ padding: '0.75rem', borderRadius: '10px' }}
                     />
                   </div>
                 )}

                 <button 
                   className="clay-btn btn-primary w-full flex items-center justify-center gap-2"
                   style={{ padding: '0.85rem', fontSize: '1rem', fontWeight: 700, marginTop: '0.5rem' }}
                   onClick={() => handleStartQuiz()}
                   disabled={quizLoading}
                 >
                   <Sparkles size={18} className={quizLoading ? "animate-spin" : ""} />
                   {quizLoading ? 'Generating AI Diagnostic Question...' : 'Take Quiz'}
                 </button>
               </div>
             )}

             {/* Active Quiz Workspace Flow */}
             {activeQuiz && activeQuiz.status === 'in_progress' && currentQ && (
               <div className="flex flex-col gap-4 no-scrollbar" style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                 
                 {/* Progress Bar & Question Step Indicator */}
                 <div className="flex flex-col gap-2">
                   <div className="flex justify-between items-center" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                     <span>Question {activeQuiz.currentQuestionIndex + 1} of {activeQuiz.totalQuestions}</span>
                     <span>State: {currentQ.stepState.replace(/_/g, ' ')}</span>
                   </div>
                   <div style={{ width: '100%', height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                     <div style={{ width: `${((activeQuiz.currentQuestionIndex + 1) / activeQuiz.totalQuestions) * 100}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.3s' }} />
                   </div>
                 </div>

                 {/* Step Flow Tracker */}
                 <div className="flex justify-between items-center gap-1" style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                   <span style={{ color: 'var(--accent-primary)' }}>1. Question</span>
                   <span>→</span>
                   <span style={{ color: currentQ.studentAnswer ? 'var(--accent-primary)' : 'var(--text-muted)' }}>2. Answer</span>
                   <span>→</span>
                   <span style={{ color: currentQ.socraticChallenge ? 'var(--accent-primary)' : 'var(--text-muted)' }}>3. Challenge</span>
                   <span>→</span>
                   <span style={{ color: currentQ.studentDefense ? 'var(--accent-primary)' : 'var(--text-muted)' }}>4. Defense</span>
                   <span>→</span>
                   <span style={{ color: currentQ.stepState === 'evaluated' ? 'var(--accent-success)' : 'var(--text-muted)' }}>5. Evaluation</span>
                 </div>

                 {/* STEP 1: Question Card */}
                 <div className="clay-recessed flex flex-col gap-3" style={{ padding: '1.25rem' }}>
                   <div className="flex items-center gap-2" style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>
                     <HelpCircle size={18} /> Question Context
                   </div>
                   <p style={{ fontSize: '0.925rem', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 600 }}>
                     {currentQ.questionText}
                   </p>
                   {currentQ.codeSnippet && (
                     <pre style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '0.8rem', overflowX: 'auto', border: '1px solid var(--card-border)', color: 'var(--accent-success)' }}>
                       <code>{currentQ.codeSnippet}</code>
                     </pre>
                   )}
                 </div>

                 {/* STEP 2: Initial Answer Input (When awaiting_initial_answer) */}
                 {currentQ.stepState === 'awaiting_initial_answer' && (
                   <div className="flex flex-col gap-3">
                     <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Your Answer & Reasoning:</label>
                     <textarea 
                       rows={4} 
                       className="clay-input"
                       placeholder="Explain your approach, algorithm selection, and why you believe it is optimal..."
                       value={initialAnswer}
                       onChange={(e) => setInitialAnswer(e.target.value)}
                       style={{ padding: '0.75rem', borderRadius: '10px', fontSize: '0.875rem' }}
                     />
                     <button 
                       className="clay-btn btn-primary flex items-center justify-center gap-2" 
                       onClick={handleSubmitInitialAnswer}
                       disabled={quizLoading || !initialAnswer.trim()}
                     >
                       <Send size={16} className={quizLoading ? "animate-spin" : ""} />
                       {quizLoading ? 'Analyzing Reasoning...' : 'Submit Initial Answer'}
                     </button>
                   </div>
                 )}

                 {/* STEP 3 & 4: Socratic Challenge & Defense Input */}
                 {(currentQ.stepState === 'awaiting_defense' || currentQ.stepState === 'evaluated') && (
                   <div className="flex flex-col gap-3">
                     
                     {/* Initial Answer Summary */}
                     <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-primary)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                       <strong>Your Initial Answer:</strong> "{currentQ.studentAnswer}"
                     </div>

                     {/* Socratic Challenge Card */}
                     <div className="clay-card" style={{ borderLeft: '4px solid var(--accent-streak)', padding: '1rem', background: 'var(--bg-secondary)' }}>
                       <div className="flex items-center gap-2" style={{ fontWeight: 800, color: 'var(--accent-streak)', fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                         <BrainCircuit size={18} /> Socratic Challenge Question
                       </div>
                       {currentQ.aiAnalysis && (
                         <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                           <em>Coach Note: {currentQ.aiAnalysis}</em>
                         </p>
                       )}
                       <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700, lineHeight: 1.4 }}>
                         {currentQ.socraticChallenge}
                       </p>
                     </div>

                     {/* STEP 4: Defense Textarea (When awaiting_defense) */}
                     {currentQ.stepState === 'awaiting_defense' && (
                       <div className="flex flex-col gap-3 mt-1">
                         <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Your Defense / Solution Explanation:</label>
                         <textarea 
                           rows={4} 
                           className="clay-input"
                           placeholder="Defend your approach, address the edge cases/traps raised, or adjust your logic..."
                           value={defenseAnswer}
                           onChange={(e) => setDefenseAnswer(e.target.value)}
                           style={{ padding: '0.75rem', borderRadius: '10px', fontSize: '0.875rem' }}
                         />
                         <button 
                           className="clay-btn btn-primary flex items-center justify-center gap-2" 
                           onClick={handleSubmitDefense}
                           disabled={quizLoading || !defenseAnswer.trim()}
                         >
                           <Award size={16} className={quizLoading ? "animate-spin" : ""} />
                           {quizLoading ? 'Evaluating Defense & Mastery...' : 'Submit Defense & Evaluate'}
                         </button>
                       </div>
                     )}
                   </div>
                 )}

                 {/* STEP 5: AI Evaluation Breakdown Card */}
                 {currentQ.stepState === 'evaluated' && currentQ.evaluation && (
                   <div className="clay-card flex flex-col gap-3" style={{ borderLeft: currentQ.evaluation.finalScore < 50 ? '4px solid var(--accent-danger)' : '4px solid var(--accent-success)', padding: '1.25rem' }}>
                     
                     <div className="flex justify-between items-center flex-wrap gap-2">
                       <div className="flex items-center gap-2" style={{ fontWeight: 800, color: currentQ.evaluation.finalScore < 50 ? 'var(--accent-danger)' : 'var(--accent-success)', fontSize: '0.95rem' }}>
                         {currentQ.evaluation.finalScore < 50 ? <XCircle size={20} /> : <CheckCircle size={20} />} 
                         {currentQ.evaluation.finalScore < 50 ? 'Incorrect Answer' : 'Question Evaluation Result'}
                       </div>
                       <div className="flex gap-2 flex-wrap">
                         <span className="badge" style={{ background: 'var(--bg-primary)', color: 'var(--accent-primary)', fontSize: '0.72rem' }}>
                           Initial: {currentQ.evaluation.initialAnswerScore}
                         </span>
                         <span className="badge" style={{ background: 'var(--bg-primary)', color: 'var(--accent-streak)', fontSize: '0.72rem' }}>
                           Defense: {currentQ.evaluation.defenseScore}
                         </span>
                         <span className="badge" style={{ background: currentQ.evaluation.finalScore < 50 ? 'var(--accent-danger)' : 'var(--accent-success)', color: 'white', fontSize: '0.75rem', fontWeight: 800 }}>
                           Final: {currentQ.evaluation.finalScore}/100
                         </span>
                       </div>
                     </div>

                     <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                       <strong>Conceptual Understanding:</strong> {currentQ.evaluation.understanding}
                     </p>

                     {currentQ.evaluation.misconceptions && currentQ.evaluation.misconceptions.length > 0 && (
                       <div className="flex items-start gap-2 flex-wrap" style={{ fontSize: '0.78rem' }}>
                         <span style={{ fontWeight: 700, color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                           <ShieldAlert size={14} /> Misconceptions:
                         </span>
                         {currentQ.evaluation.misconceptions.map((m, mIdx) => (
                           <span key={mIdx} className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)' }}>
                             {m}
                           </span>
                         ))}
                       </div>
                     )}

                     <div style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                       💡 <strong>Feedback:</strong> {currentQ.evaluation.feedback}
                     </div>

                     <button 
                       className="clay-btn btn-primary w-full flex items-center justify-center gap-2 mt-2"
                       onClick={handleNextQuestion}
                     >
                       {activeQuiz.currentQuestionIndex + 1 < activeQuiz.totalQuestions ? (
                         <>Proceed to Next Question <ArrowRight size={16} /></>
                       ) : (
                         <>Finish Quiz & Update Scorecard <Trophy size={16} /></>
                       )}
                     </button>
                   </div>
                 )}

               </div>
             )}

          </div>

        </div>
      )}

      {/* Quiz Scorecard & Skill Progress Dashboard (Full Width Section Below) */}
      <div className="flex flex-col gap-6" style={{ marginTop: '1rem' }}>
        
        {/* Scorecard Metrics Header */}
        <div className="clay-card">
          <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
            <Award size={24} style={{ color: 'var(--accent-warning)' }} />
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>Quiz Scorecard & Progress Overview</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Track your weighted skill mastery, points earned, and AI feedback history.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
            
            <div className="clay-recessed flex flex-col items-center" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <Trophy size={24} color="var(--accent-warning)" style={{ marginBottom: '0.35rem' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Average Quiz Score</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {quizStats?.averageScore || 0}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/100</span>
              </span>
            </div>

            <div className="clay-recessed flex flex-col items-center" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <TrendingUp size={24} color="var(--accent-success)" style={{ marginBottom: '0.35rem' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Mastery Gained</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-success)', marginTop: '0.25rem' }}>
                +{quizStats?.totalMasteryGained || 0}%
              </span>
            </div>

            <div className="clay-recessed flex flex-col items-center" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <Zap size={24} color="var(--accent-streak)" style={{ marginBottom: '0.35rem' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Points / XP Earned</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-streak)', marginTop: '0.25rem' }}>
                +{quizStats?.totalPointsEarned || 0} XP
              </span>
            </div>

            <div className="clay-recessed flex flex-col items-center" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <CheckCircle size={24} color="var(--accent-primary)" style={{ marginBottom: '0.35rem' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Questions Completed</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {quizStats?.totalQuestionsCompleted || 0}
              </span>
            </div>

            <div className="clay-recessed flex flex-col items-center" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <Target size={24} color="var(--accent-danger)" style={{ marginBottom: '0.35rem' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Correct / Incorrect</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                <span style={{ color: 'var(--accent-success)' }}>{quizStats?.correctCount || 0}</span> / <span style={{ color: 'var(--accent-danger)' }}>{quizStats?.incorrectCount || 0}</span>
              </span>
            </div>

          </div>
        </div>

        {/* Topic-wise Skill Mastery Breakdown */}
        <div className="clay-card">
          <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
            <Layers size={22} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Topic-wise Skill Mastery Progress</h3>
          </div>

          {!quizStats?.skillMastery || Object.keys(quizStats.skillMastery).length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No quiz mastery data recorded yet. Complete your first Socratic Quiz above to build your skill profile!
            </div>
          ) : (
            <div className="no-scrollbar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '0.5rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {Object.entries(quizStats.skillMastery).map(([topicName, stats]) => (
                <div key={topicName} className="clay-recessed" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="flex justify-between items-center">
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{topicName}</span>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-primary)' }}>
                      {stats.masteryLevel || 0}%
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '10px', background: 'var(--bg-primary)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.max(0, stats.masteryLevel || 0))}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-success))', transition: 'width 0.4s ease' }} />
                  </div>

                  <div className="flex justify-between items-center" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    <span>Quizzes: {stats.quizzesTaken || 0}</span>
                    <span>Points: +{stats.points || 0} XP</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Quiz History Table */}
        <div className="clay-card">
          <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
            <History size={22} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Recent Socratic Quiz History</h3>
          </div>

          {quizHistory.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No recent quizzes found. Start a quiz to track your history!
            </div>
          ) : (
            <div className="flex flex-col gap-3 no-scrollbar" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '0.5rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {quizHistory.map((att, i) => (
                <div key={att._id || i} className="clay-recessed flex flex-col gap-2" style={{ padding: '1.25rem' }}>
                  <div className="flex justify-between items-center flex-wrap gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="badge" style={{ background: 'var(--accent-primary)', color: 'white', fontWeight: 700, padding: '0.35rem 0.75rem' }}>
                        {att.topic}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {new Date(att.updatedAt || att.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Score: <strong style={{ color: 'var(--text-primary)' }}>{att.score}/100</strong>
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-success)' }}>
                        Mastery: <strong>{att.masteryLevel}%</strong> ({att.masteryGained >= 0 ? `+${att.masteryGained}` : att.masteryGained}%)
                      </span>
                      <span className="badge" style={{ background: 'var(--accent-streak)', color: 'white', fontWeight: 800 }}>
                        +{att.pointsEarned} XP
                      </span>
                    </div>
                  </div>

                  {att.questions && att.questions.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.4 }}>
                      <strong>Questions Evaluated:</strong> {att.questions.length} • 
                      <strong> Key Feedback:</strong> "{att.questions[att.questions.length - 1]?.evaluation?.feedback || 'Good attempt!'}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default PersonalizedLearning;
