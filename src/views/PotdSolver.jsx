import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Trophy, ArrowLeft, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PotdSolver = ({ potd, setActiveTab }) => {
  const { user, fetchUser } = useAuth();
  const [code, setCode] = useState('');
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [language, setLanguage] = useState('javascript');
  const [solved, setSolved] = useState(false);

  const getLanguageStub = (lang) => {
    if (lang === 'javascript') return potd?.functionSignature || '// Write your solution here\nfunction solve() {\n  \n}\n';
    if (lang === 'java') return potd?.javaSignature || 'public class Solution {\n    // Ensure your function matches the required signature\n    public static void solve() {\n        \n    }\n}\n';
    if (lang === 'cpp') return potd?.cppSignature || '#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\n// Ensure your function matches the required signature\nvoid solve() {\n    \n}\n';
    return '';
  };

  useEffect(() => {
    setCode(getLanguageStub(language));
    if (user?.solvedPotds?.includes(potd?._id)) {
      setSolved(true);
      setConsoleOutput([{ type: 'success', text: 'You have already solved this POTD!' }]);
    }
  }, [potd, language, user]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    const currentStub = getLanguageStub(language);
    if (code === currentStub || code.trim() === '') {
      setCode(getLanguageStub(newLang));
    }
    setLanguage(newLang);
  };

  const handleSubmit = async () => {
    if (solved) return;
    setIsSubmitting(true);
    setConsoleOutput([{ type: 'info', text: 'Submitting and verifying against hidden tests...' }]);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/problems/potd/solve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          problemId: potd._id,
          code,
          language
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSolved(true);
        setConsoleOutput([
          { type: 'success', text: 'All test cases passed! POTD Solved.' },
          { type: 'info', text: 'Output: ' + data.output }
        ]);
        fetchUser(); // refresh user data to get updated solvedPotds
      } else {
        setConsoleOutput([
          { type: 'error', text: `Failed. Passed ${data.passed}/${data.total} tests.` },
          { type: 'info', text: 'Output: ' + data.output }
        ]);
      }
    } catch (error) {
      setConsoleOutput([{ type: 'error', text: 'Network error or server failed to respond.' }]);
    }
    
    setIsSubmitting(false);
  };

  if (!potd) {
    return (
      <div className="flex justify-center items-center h-full">
        <h2 style={{ color: 'var(--text-secondary)' }}>No POTD selected.</h2>
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 2rem)', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '-1rem' }}>
      {/* Main Split */}
      <div className="flex gap-4" style={{ flex: 1, minHeight: 0 }}>
        {/* Left Pane: Problem Description */}
        <div className="clay-card" style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '0 0 1rem 0', borderBottom: '1px solid var(--card-border)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="clay-btn btn-outline flex items-center gap-2"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, marginLeft: '0.5rem' }}>{potd.title}</h2>
            </div>
            <div className="flex items-center gap-3" style={{ fontSize: '0.75rem' }}>
              <span style={{ color: potd.difficulty === 'Easy' ? 'var(--accent-success)' : potd.difficulty === 'Hard' ? 'var(--accent-danger)' : 'var(--accent-streak)', fontWeight: 600 }}>{potd.difficulty}</span>
              <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{potd.platform}</span>
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, padding: '1rem' }}>
            {potd.description ? (
              <div style={{ whiteSpace: 'pre-wrap', marginBottom: '1.5rem' }}>{potd.description}</div>
            ) : (
              <div style={{ padding: '1rem', background: 'rgba(255,0,0,0.1)', color: 'red', borderRadius: '8px' }}>
                <strong>Data is stale!</strong> Please click "Dashboard" in the sidebar, then refresh the page to load the new POTD from the database!
              </div>
            )}

            {potd.sampleTests && potd.sampleTests.length > 0 && (
              <div className="mb-6">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>Sample Tests</h3>
                {potd.sampleTests.map((test, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <div style={{ marginBottom: '0.5rem' }}><strong>Input:</strong> <span style={{ fontFamily: 'monospace' }}>{test.input}</span></div>
                    <div><strong>Output:</strong> <span style={{ fontFamily: 'monospace' }}>{test.expected}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Editor and Console */}
        <div className="flex flex-col gap-4" style={{ flex: 1, minWidth: 0 }}>
          {/* Editor Area */}
          <div className="clay-card" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="flex justify-between items-center" style={{ padding: '1rem', borderBottom: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Code Editor</div>
              
              <div className="flex gap-2 items-center">
                <select 
                  value={language}
                  onChange={handleLanguageChange}
                  className="clay-input"
                  style={{ padding: '0.4rem 0.8rem', width: 'auto' }}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                </select>
                <button 
                  className="clay-btn btn-primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting || solved}
                  style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: solved ? 0.7 : 1 }}
                >
                  {solved ? <Trophy size={16} /> : <Play size={16} />}
                  {solved ? 'Solved' : isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
            
            <div className="flex-1" style={{ position: 'relative', minHeight: '300px' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  language={language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : 'javascript'}
                  theme="vs-dark"
                  value={code}
                  onChange={setCode}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    lineHeight: 24,
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    readOnly: solved
                  }}
                />
              </div>
              {solved && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10, backdropFilter: 'blur(4px)'
                }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--accent-success)' }}>
                    <Trophy size={48} color="var(--accent-success)" style={{ margin: '0 auto 1rem' }} />
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Problem Solved!</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>You have successfully completed this POTD.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Console Area */}
          <div className="clay-card" style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
              <Terminal size={16} /> Console Output
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-sm" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {consoleOutput.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Submit your code to see results...</div>
            ) : (
              consoleOutput.map((log, idx) => (
                <div key={idx} style={{ 
                  marginBottom: '0.5rem',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  backgroundColor: log.type === 'error' ? 'rgba(248, 113, 113, 0.1)' : log.type === 'success' ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                  color: log.type === 'error' ? '#f87171' : log.type === 'success' ? '#4ade80' : '#e5e7eb',
                  borderLeft: `3px solid ${log.type === 'error' ? '#f87171' : log.type === 'success' ? '#4ade80' : '#6b7280'}`,
                  whiteSpace: 'pre-wrap'
                }}>
                  {log.text}
                </div>
              ))
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PotdSolver;