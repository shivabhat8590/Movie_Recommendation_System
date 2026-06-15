// Simple in-memory cache fallback if Redis is not available
const memoryCache = new Map();

const get = async (key) => {
  try {
    // Check memory cache first
    if (memoryCache.has(key)) {
      const { value, expiry } = memoryCache.get(key);
      if (expiry && expiry < Date.now()) {
        memoryCache.delete(key);
        return null;
      }
      return value;
    }
    return null;
  } catch {
    return null;
  }
};

const set = async (key, value, ttlSeconds = 3600) => {
  try {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    memoryCache.set(key, { value, expiry });
    return true;
  } catch {
    return false;
  }
};

const del = async (key) => {
  try {
    memoryCache.delete(key);
    return true;
  } catch {
    return false;
  }
};

const flushPattern = async (pattern) => {
  try {
    // Basic glob to regex conversion for in-memory flush
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let count = 0;
    for (const key of memoryCache.keys()) {
      if (regex.test(key)) {
        memoryCache.delete(key);
        count++;
      }
    }
    return count;
  } catch {
    return 0;
  }
};

module.exports = { get, set, del, flushPattern };
