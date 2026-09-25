import React, { useState, useEffect } from 'react';
import { Target, Search, ExternalLink, Calendar, Filter, Award } from 'lucide-react';

const Problems = () => {
  const [problems, setProblems] = useState([]);
  const [potd, setPotd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState({ platform: '', difficulty: '' });

  useEffect(() => {
    // Automatically seed the DB if empty, for testing purposes
    const seedAndFetch = async () => {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${import.meta.env.VITE_API_URL}/problems/seed`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchData();
      } catch (err) {
        console.error(err);
      }
    };
    seedAndFetch();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const [problemsRes, potdRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/problems?platform=${filter.platform}&difficulty=${filter.difficulty}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_URL}/problems/potd`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      if (problemsRes.ok) {
        const data = await problemsRes.json();
        setProblems(data.problems || []);
      }
      
      if (potdRes.ok) {
        const data = await potdRes.json();
        if (data && data._id) setPotd(data);
      }
    } catch (error) {
      console.error('Failed to fetch problems', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [filter.platform, filter.difficulty]);

  const getDifficultyColor = (diff) => {
    if (diff === 'Easy') return 'var(--accent-success)';
    if (diff === 'Medium') return 'var(--accent-streak)';
    return 'var(--accent-danger)';
  };

  const handleVerify = async (platform) => {
    setSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/platforms/${platform}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Sync successful! If your total solved increased, you've earned XP!");
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to sync platform');
      }
    } catch (err) {
      alert("Error syncing");
    }
    setSyncing(false);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '2rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Problem Explorer</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Discover problems and train to earn XP.</p>
      </header>

      {potd && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, var(--accent-primary) 0%, #3B82F6 100%)', color: 'white', position: 'relative', overflow: 'hidden', padding: '1rem 1.5rem' }}>
          <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.1 }}>
            <Award size={100} />
          </div>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem' }}>
            <Calendar size={16} /> Problem of the Day (POTD)
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{potd.title}</h3>
          <div className="flex items-center gap-4" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(255,255,255,0.2)', borderRadius: '12px' }}>{potd.platform}</span>
            <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(255,255,255,0.2)', borderRadius: '12px' }}>{potd.difficulty}</span>
            <span>Reward: 50 XP</span>
          </div>
          <div className="flex gap-4">
            <a href={potd.url} target="_blank" rel="noreferrer" className="btn" style={{ background: 'white', color: 'var(--accent-primary)' }}>
              Solve on {potd.platform} <ExternalLink size={16} />
            </a>
            <button 
              className="btn btn-outline" 
              style={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
              onClick={() => handleVerify(potd.platform)}
              disabled={syncing}
            >
              {syncing ? 'Verifying...' : 'Verify Solve'}
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="flex items-center justify-between flex-wrap gap-4" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>All Problems</h3>
          <div className="flex gap-4">
            <select 
              className="btn btn-outline" 
              value={filter.platform} 
              onChange={e => setFilter({...filter, platform: e.target.value})}
            >
              <option value="">All Platforms</option>
              <option value="leetcode">LeetCode</option>
              <option value="codeforces">Codeforces</option>
            </select>
            <select 
              className="btn btn-outline"
              value={filter.difficulty} 
              onChange={e => setFilter({...filter, difficulty: e.target.value})}
            >
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Loading...</div>
        ) : problems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>No problems found.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {problems.map(prob => (
              <div key={prob._id} className="flex items-center justify-between gap-4" style={{ padding: '0.75rem 1rem', border: '1px solid var(--card-border)', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '1rem', marginBottom: '0.2rem' }}>{prob.title}</div>
                  <div className="flex gap-3" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: getDifficultyColor(prob.difficulty) }}>{prob.difficulty}</span>
                    <span style={{ textTransform: 'capitalize' }}>{prob.platform}</span>
                    <span className="flex gap-1 items-center"><Target size={14} /> 10 XP</span>
                  </div>
                </div>
                <a href={prob.url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
                  Solve
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Problems;
