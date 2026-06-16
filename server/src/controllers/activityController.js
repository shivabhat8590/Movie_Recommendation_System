const ActivityLog = require('../models/ActivityLog');

const logActivity = async (req, res) => {
  const { activityType, metadata, timestamp } = req.body;
  const userId = req.user._id;

  if (!activityType) {
    return res.status(400).json({ success: false, message: 'activityType is required' });
  }

  try {
    const log = await ActivityLog.create({
      userId,
      activityType,
      metadata: metadata || {},
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    res.status(201).json({ success: true, data: log });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { logActivity };
