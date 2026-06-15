const Badge = require('../models/Badge');
const User = require('../models/User');

const checkAndAwardBadges = async (userId) => {
  const user = await User.findById(userId).populate('badges');
  if (!user) return [];

  const allBadges = await Badge.find();
  const newlyAwarded = [];

  for (const badge of allBadges) {
    // Skip if user already has this badge
    if (user.badges.some(b => b._id.toString() === badge._id.toString())) continue;

    let qualifies = false;
    switch (badge.criteria.type) {
      case 'watch_count':
        qualifies = user.watchedCount >= badge.criteria.value;
        break;
      case 'rate_count':
        qualifies = user.totalRatings >= badge.criteria.value;
        break;
      // Add more criteria logic here as needed
    }

    if (qualifies) {
      user.badges.push(badge._id);
      user.points += 50; // Bonus points for badge
      newlyAwarded.push(badge);
    }
  }

  if (newlyAwarded.length > 0) {
    await user.save();
  }

  return newlyAwarded;
};

module.exports = { checkAndAwardBadges };
