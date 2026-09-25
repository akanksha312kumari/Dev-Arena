const platformService = require('../services/platformService');

const syncPlatformData = async (req, res) => {
  const { platform } = req.params;
  
  try {
    const user = await platformService.syncPlatform(req.user.id, platform);
    res.json({ 
      message: `${platform.charAt(0).toUpperCase() + platform.slice(1)} synced successfully!`, 
      stats: user.stats,
      platformStats: user.platformStats,
      lastSynced: user.lastSynced
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const syncAllPlatformsData = async (req, res) => {
  try {
    const { user, results } = await platformService.syncAllPlatforms(req.user.id);
    res.json({ 
      message: 'All connected platforms processed.', 
      results,
      stats: user.stats,
      platformStats: user.platformStats,
      lastSynced: user.lastSynced
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  syncPlatformData,
  syncAllPlatformsData
};
