import React, { useState, useEffect } from 'react';
import { Flame, Trophy, Activity, Swords, Code, ExternalLink, Calendar, Star, TrendingUp, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const Heatmap = ({ heatmapData = {} }) => {
  // Generate last 52 weeks = 364 days for a full horizontal heatmap
  const weeks = 52;
  const days = 7;
  const totalDays = weeks * days;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const dates = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }

  const getColor = (count) => {
    if (!count || count === 0) return 'rgba(255, 255, 255, 0.07)'; // Clearly visible empty tile
    if (count === 1) return '#A7F3D0'; // light mint
    if (count === 2) return '#6EE7B7'; 
    if (count >= 3 && count <= 5) return '#34D399'; 
    return '#10B981'; 
  };

  // Group columns by month to determine where to place the label
  const monthLabels = [];
  let currentMonth = -1;
  const columns = Array.from({ length: weeks }).map((_, weekIndex) => {
    const weekDates = [];
    let weekMonth = -1;
    for (let dayIndex = 0; dayIndex < days; dayIndex++) {
      const dateObj = dates[weekIndex * days + dayIndex];
      weekDates.push(dateObj);
      if (dayIndex === 0) weekMonth = new Date(dateObj).getMonth();
    }
    
    if (weekMonth !== currentMonth) {
      monthLabels.push({ index: weekIndex, label: new Date(dates[weekIndex * days]).toLocaleString('default', { month: 'short' }) });
      currentMonth = weekMonth;
    }
    
    return weekDates;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {columns.map((weekDates, weekIndex) => (
          <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {weekDates.map((dateStr, dayIndex) => {
              const count = heatmapData[dateStr] || 0;
              return (
                <div 
                  key={dayIndex}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    backgroundColor: getColor(count),
                    border: count === 0 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
                    opacity: 1,
                    transition: 'all 0.15s ease'
                  }}
                  title={`${count} submissions on ${dateStr}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Month Labels */}
      <div style={{ position: 'relative', height: '20px', fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: `${weeks * 16}px` }}>
        {monthLabels.map((ml, i) => (
          <div key={i} style={{ position: 'absolute', left: `${ml.index * 16}px` }}>
            {ml.label}
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = ({ setActiveTab, setSelectedPotd }) => {
  const { user, setUser } = useAuth();
  const [potd, setPotd] = useState(null);
  const [potdHistory, setPotdHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);
  const [arenaRank, setArenaRank] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const getAggregatedHeatmap = (u) => {
    if (!u) return {};
    const heatmap = {};

    // 1. Process u.heatmapData (Map or Object)
    if (u.heatmapData) {
      const entries = u.heatmapData instanceof Map
        ? Array.from(u.heatmapData.entries())
        : Object.entries(u.heatmapData);
      entries.forEach(([dateStr, count]) => {
        const num = typeof count === 'number' ? count : Number(count?.total || count || 0);
        if (!isNaN(num) && num > 0) heatmap[dateStr] = num;
      });
    }

    // 2. Aggregate from u.platformStats if empty or to ensure all platforms are covered
    if (u.platformStats) {
      Object.values(u.platformStats).forEach(pStats => {
        if (pStats && pStats.heatmapData) {
          const pEntries = pStats.heatmapData instanceof Map
            ? Array.from(pStats.heatmapData.entries())
            : Object.entries(pStats.heatmapData);
          pEntries.forEach(([dateStr, count]) => {
            const num = typeof count === 'number' ? count : Number(count?.total || count || 0);
            if (!isNaN(num) && num > 0) {
              heatmap[dateStr] = Math.max(heatmap[dateStr] || 0, num);
            }
          });
        }
      });
    }

    return heatmap;
  };

  const aggregatedHeatmap = getAggregatedHeatmap(user);
  const totalHeatmapSubmissions = Object.values(aggregatedHeatmap).reduce((acc, count) => acc + count, 0);
  const totalActiveDays = Object.keys(aggregatedHeatmap).length;

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncMsg('Syncing platforms...');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/platforms/sync-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const meRes = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (meRes.ok) {
          const updatedUser = await meRes.json();
          setUser(updatedUser);
        }
        setSyncMsg('Synced!');
      } else {
        setSyncMsg('Sync failed');
      }
    } catch (err) {
      setSyncMsg('Sync error');
    }
    setIsSyncing(false);
    setTimeout(() => setSyncMsg(''), 3000);
  };

  useEffect(() => {
    const fetchRank = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/leaderboard?type=xp&filter=global`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          const rankIndex = data.findIndex(u => u.username === user?.username);
          setArenaRank(rankIndex !== -1 ? rankIndex + 1 : '50+');
        }
      } catch (err) {
        console.error("Failed to fetch rank", err);
      }
    };
    if (user?.username) {
      fetchRank();
    }
  }, [user]);
  
  const stats = user?.stats || { globalRating: 0, dailyStreak: 0, problemsSolved: { easy: 0, medium: 0, hard: 0 } };
  const totalSolved = (stats.problemsSolved?.total) || ((stats.problemsSolved?.easy || 0) + (stats.problemsSolved?.medium || 0) + (stats.problemsSolved?.hard || 0));
  
  // Fake total counts for progress calculation
  const EASY_TOTAL = 800;
  const MED_TOTAL = 1500;
  const HARD_TOTAL = 700;
  const totalProblems = EASY_TOTAL + MED_TOTAL + HARD_TOTAL;

  useEffect(() => {
    // Fetch POTD dynamically
    const fetchPotd = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/problems/potd`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data && data.title) {
          setPotd(data);
        }
      } catch (err) {
        console.error("Failed to fetch POTD", err);
      }
    };
    fetchPotd();
  }, []);

  const fetchHistory = async () => {
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/problems/potd/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPotdHistory(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
    setHistoryLoading(false);
  };

  const pieData = [
    { name: 'Easy', value: stats.problemsSolved?.easy || 0, color: 'var(--accent-success)' },
    { name: 'Medium', value: stats.problemsSolved?.medium || 0, color: 'var(--accent-streak)' },
    { name: 'Hard', value: stats.problemsSolved?.hard || 0, color: 'var(--accent-danger)' },
  ];
  
  // Ensure the chart shows empty state if no problems solved
  const chartData = totalSolved === 0 ? [{ name: 'Empty', value: 1, color: 'var(--card-border)' }] : pieData;

  const recentSubmissions = user?.recentSubmissions || [];

  // Activity Line Chart Data
  const activityMap = {};
  const platformsSet = new Set();
  if (user?.platformStats) {
    Object.entries(user.platformStats).forEach(([platform, pStats]) => {
      if (pStats?.heatmapData) {
        platformsSet.add(platform);
        Object.entries(pStats.heatmapData).forEach(([date, count]) => {
          if (!activityMap[date]) activityMap[date] = { date };
          activityMap[date][platform] = count;
        });
      }
    });
  }
  const activityChartData = Object.values(activityMap)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-30); // Show up to last 30 active days

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Compact Top Profile Bar */}
      <div className="clay-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem' }}>
        <div className="flex items-center gap-4">
          <img src={user?.profile?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=default"} alt="Profile" style={{ width: '64px', height: '64px', borderRadius: '50%' }} />
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{user?.username}</h2>
            <div className="flex gap-4" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              <span>Level {user?.level || 1}</span>
              <span>{user?.xp || 0} XP</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-6">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Global Rating</div>
            <div className="flex items-center gap-1 justify-center" style={{ fontWeight: 700, fontSize: '1.25rem' }}>
              <Trophy size={20} color="var(--accent-primary)" />
              {stats.globalRating}
            </div>
          </div>
          <div style={{ width: '2px', background: 'var(--bg-primary)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Daily Streak</div>
            <div className="flex items-center gap-1 justify-center" style={{ fontWeight: 700, fontSize: '1.25rem' }}>
              <Flame size={20} color="var(--accent-streak)" />
              {stats.dailyStreak}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '2rem' }}>
        
        {/* Problems Solved */}
        <div className="clay-card flex flex-col items-center gap-2">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-secondary)', alignSelf: 'flex-start', marginBottom: '0.5rem' }}>Problems Solved</h3>
          
          <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={60}
                  paddingAngle={totalSolved > 0 ? 5 : 0}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={10}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalSolved}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Solved</div>
            </div>
          </div>

          <div className="flex gap-2 w-full justify-between mt-2">
            <div className="clay-recessed flex flex-col items-center" style={{ padding: '0.75rem', flex: 1 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-success)', marginBottom: '0.25rem', fontWeight: 700 }}>Easy</span>
              <span style={{ fontSize: '1.125rem', fontWeight: 800 }}>{stats.problemsSolved?.easy || 0}</span>
            </div>
            <div className="clay-recessed flex flex-col items-center" style={{ padding: '0.75rem', flex: 1 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-streak)', marginBottom: '0.25rem', fontWeight: 700 }}>Med</span>
              <span style={{ fontSize: '1.125rem', fontWeight: 800 }}>{stats.problemsSolved?.medium || 0}</span>
            </div>
            <div className="clay-recessed flex flex-col items-center" style={{ padding: '0.75rem', flex: 1 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', marginBottom: '0.25rem', fontWeight: 700 }}>Hard</span>
              <span style={{ fontSize: '1.125rem', fontWeight: 800 }}>{stats.problemsSolved?.hard || 0}</span>
            </div>
          </div>
        </div>

        {/* Duels Stats Card */}
        <div className="clay-card flex flex-col justify-between">
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '1rem' }}>Duel Statistics</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="clay-recessed" style={{ padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.125rem', fontWeight: 600 }}>Total Duels</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{user?.stats?.duels?.total || 0}</div>
              </div>
              <div className="clay-recessed" style={{ padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.125rem', fontWeight: 600 }}>Win Rate</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                  {user?.stats?.duels?.total ? Math.round(((user?.stats?.duels?.wins || 0) / user.stats.duels.total) * 100) : 0}%
                </div>
              </div>
              <div className="clay-recessed" style={{ padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.125rem', fontWeight: 600 }}>Wins</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-success)' }}>{user?.stats?.duels?.wins || 0}</div>
              </div>
              <div className="clay-recessed" style={{ padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.125rem', fontWeight: 600 }}>Losses</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-danger)' }}>{user?.stats?.duels?.losses || 0}</div>
              </div>
            </div>
            
            <div className="clay-recessed flex justify-between items-center" style={{ padding: '0.75rem 1rem' }}>
              <div className="flex items-center gap-2">
                <Trophy size={16} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Arena Rank</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {arenaRank ? `#${arenaRank}` : 'Loading...'}
              </div>
            </div>
          </div>
        </div>

        {/* POTD */}
        <div className="clay-card flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Problem of the Day</h3>
              <div 
                title="Past POTDs" 
                onClick={fetchHistory}
                style={{ cursor: 'pointer', padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: '50%' }} 
                className="clay-recessed hover:bg-gray-700 transition-colors"
              >
                <Calendar size={18} color="var(--accent-primary)" />
              </div>
            </div>
            
            {potd ? (
              <>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>{potd.title}</div>
                <div className="clay-recessed flex items-center gap-3" style={{ padding: '0.75rem', fontSize: '0.875rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <span style={{ 
                    color: potd.difficulty === 'Easy' ? 'var(--accent-success)' : potd.difficulty === 'Medium' ? 'var(--accent-warning)' : 'var(--accent-danger)', 
                    fontWeight: 700 
                  }}>
                    {potd.difficulty}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>•</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{potd.platform}</span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Loading Problem of the Day...</div>
            )}
          </div>
          
          {user?.solvedPotds?.includes(potd?._id) ? (
            <button 
              className="clay-btn btn-primary" 
              style={{ width: '100%', fontSize: '1rem', opacity: 0.7, cursor: 'default' }}
              disabled
            >
              <CheckCircle size={16} style={{ display: 'inline', marginRight: '8px' }} /> Already Solved
            </button>
          ) : (
            <button 
              className="clay-btn btn-primary" 
              style={{ width: '100%', fontSize: '1rem' }}
              onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  const res = await fetch(`${import.meta.env.VITE_API_URL}/problems/potd`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  const data = await res.json();
                  if (data && data.title) {
                    setPotd(data);
                    setSelectedPotd(data);
                    setActiveTab('potd-solver');
                  }
                } catch (err) {
                  console.error("Failed to fetch fresh POTD", err);
                  if (potd) {
                    setSelectedPotd(potd);
                    setActiveTab('potd-solver');
                  }
                }
              }}
              disabled={!potd}
            >
              Solve Now
            </button>
          )}
        </div>

      </div>

      {/* Heatmap (Full Width) */}
      <div className="clay-card">
        <div className="flex justify-between items-center flex-wrap gap-4" style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {totalHeatmapSubmissions}
            </span> submissions in the past one year
            {syncMsg && <span style={{ marginLeft: '1rem', fontSize: '0.875rem', color: 'var(--accent-primary)', fontWeight: 700 }}>{syncMsg}</span>}
          </div>
          
          <div className="flex gap-4 items-center flex-wrap" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            <span style={{ color: 'var(--text-muted)' }}>Total active days: <span style={{ color: 'var(--text-primary)' }}>{totalActiveDays}</span></span>
            <span style={{ color: 'var(--text-muted)' }}>Current streak: <span style={{ color: 'var(--text-primary)' }}>{stats.dailyStreak || 0}</span></span>
            <span style={{ color: 'var(--text-muted)' }}>Max streak: <span style={{ color: 'var(--text-primary)' }}>{Math.max(stats.maxStreak || 0, stats.dailyStreak || 0)}</span></span>
            <button 
              className="clay-btn btn-primary flex items-center gap-2" 
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8125rem' }} 
              onClick={handleSyncAll}
              disabled={isSyncing}
              title="Sync all connected platform handles"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> Sync Platforms
            </button>
          </div>
        </div>
        
        <div className="clay-recessed" style={{ padding: '1.5rem' }}>
          <Heatmap heatmapData={aggregatedHeatmap} />
        </div>
      </div>

      {/* Activity Timeline Chart */}
      {activityChartData.length > 0 && (
        <div className="clay-card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Activity Timeline</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--clay-outer-dark)" opacity={0.2} />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickFormatter={(tick) => new Date(tick).toLocaleDateString('default', { month: 'short', day: 'numeric' })} />
                <YAxis stroke="var(--text-muted)" fontSize={12} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card-bg)', border: 'none', borderRadius: '8px', boxShadow: '2px 2px 10px var(--clay-outer-dark)' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend />
                {Array.from(platformsSet).map((platform, i) => {
                  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6'];
                  return (
                    <Line key={platform} name={platform.charAt(0).toUpperCase() + platform.slice(1)} type="monotone" dataKey={platform} stroke={colors[i % colors.length]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Submissions */}
      <div className="clay-card">
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Recent Submissions</h3>
        <div className="flex flex-col gap-3">
          {recentSubmissions.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>No recent submissions. Sync your platforms to view activity!</div>
          ) : (
            (showAllSubmissions ? recentSubmissions : recentSubmissions.slice(0, 5)).map((sub, i) => (
              <div key={i} className="clay-recessed flex items-center justify-between" style={{ padding: '1rem 1.5rem' }}>
                <div className="flex items-center gap-4">
                  <CheckCircle size={20} color="var(--accent-success)" />
                  <div style={{ fontSize: '1rem', fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary)' }} onClick={() => sub.url && window.open(sub.url, '_blank')}>
                    {sub.title}
                  </div>
                  <span className="badge" style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {sub.platform}
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {new Date(sub.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
        {recentSubmissions.length > 5 && (
          <button 
            className="clay-btn w-full" 
            style={{ marginTop: '1rem', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            onClick={() => setShowAllSubmissions(!showAllSubmissions)}
          >
            {showAllSubmissions ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>

      {/* Platform Breakdowns */}
      {user?.platformStats && Object.keys(user.platformStats).length > 0 && (
        <div className="clay-card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Platform Breakdowns</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {Object.entries(user.platformStats).map(([platform, pStats]) => {
              if (!pStats || (pStats.problemsSolved?.total === 0 && pStats.rating === 0)) return null;
              return (
                <div key={platform} className="clay-recessed" style={{ padding: '1.25rem' }}>
                  <div className="flex items-center gap-3" style={{ fontWeight: 800, fontSize: '1rem', textTransform: 'capitalize', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                    <div style={{ padding: '0.5rem', background: 'var(--card-bg)', borderRadius: '50%', boxShadow: '2px 2px 5px var(--clay-outer-dark)' }}>
                      <Code size={16} color="var(--accent-primary)" />
                    </div>
                    {platform}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>Rating: <span style={{ color: 'var(--accent-primary)' }}>{pStats.rating || 'N/A'}</span></span>
                      <span style={{ color: 'var(--text-muted)' }}>Contests: <span style={{ color: 'var(--accent-warning)' }}>{pStats.contests || 0}</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>Solved: <span style={{ color: 'var(--accent-success)' }}>{pStats.problemsSolved?.total || 0}</span></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* History Modal */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div className="clay-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>POTD History</h3>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <XCircle size={24} />
              </button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              {historyLoading ? (
                <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)' }}>Loading history...</div>
              ) : potdHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)' }}>No past problems found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {potdHistory.map(p => {
                    const isSolved = user?.solvedPotds?.includes(p._id);
                    return (
                      <div key={p._id} className="clay-recessed" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{p.title}</div>
                          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.875rem' }}>
                            <span style={{ color: p.difficulty === 'Easy' ? 'var(--accent-success)' : p.difficulty === 'Medium' ? 'var(--accent-warning)' : 'var(--accent-danger)' }}>{p.difficulty}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{new Date(p.potdDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {isSolved ? (
                          <span style={{ color: 'var(--accent-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle size={16} /> Solved
                          </span>
                        ) : (
                          <button 
                            className="clay-btn btn-primary"
                            style={{ padding: '0.4rem 1rem', fontSize: '0.875rem' }}
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem('token');
                                const res = await fetch(`${import.meta.env.VITE_API_URL}/problems/${p._id}`, {
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                const data = await res.json();
                                if (data && data.title) {
                                  setSelectedPotd(data);
                                  setShowHistoryModal(false);
                                  setActiveTab('potd-solver');
                                } else {
                                  setSelectedPotd(p);
                                  setShowHistoryModal(false);
                                  setActiveTab('potd-solver');
                                }
                              } catch (err) {
                                console.error("Failed to fetch fresh history problem", err);
                                setSelectedPotd(p);
                                setShowHistoryModal(false);
                                setActiveTab('potd-solver');
                              }
                            }}
                          >
                            Solve
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
