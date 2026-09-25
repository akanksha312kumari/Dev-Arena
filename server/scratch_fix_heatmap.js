require('dotenv').config({ override: true });
const mongoose = require('mongoose');

async function fixAllHeatmaps() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  
  for (const u of users) {
    const newHeatmap = {};
    if (u.heatmapData) {
      for (const [dateStr, val] of Object.entries(u.heatmapData)) {
        if (typeof val === 'number') {
          newHeatmap[dateStr] = val;
        } else if (val && typeof val === 'object') {
          newHeatmap[dateStr] = Number(val.total || val.count || Object.values(val)[0] || 0);
        }
      }
    }
    
    if (u.platformStats) {
      for (const [platform, stats] of Object.entries(u.platformStats)) {
        if (stats && stats.heatmapData) {
          for (const [dateStr, val] of Object.entries(stats.heatmapData)) {
            const count = typeof val === 'number' ? val : Number(val.total || val.count || 0);
            newHeatmap[dateStr] = Math.max(newHeatmap[dateStr] || 0, count);
          }
        }
      }
    }
    
    await db.collection('users').updateOne(
      { _id: u._id },
      { $set: { heatmapData: newHeatmap } }
    );
    console.log('Fixed user:', u.username, 'Heatmap entries count:', Object.keys(newHeatmap).length, newHeatmap);
  }
  
  await mongoose.disconnect();
}
fixAllHeatmaps();
