const Redis = require('ioredis');

let redisClient = null;

const connectRedis = () => {
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
    reconnectOnError(err) {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) return true;
      return false;
    },
  });

  redisClient.on('connect', () => console.log('✅ Redis connected'));
  redisClient.on('error', (err) => console.warn(`⚠️  Redis error: ${err.message}`));
  redisClient.on('reconnecting', () => console.log('🔄 Redis reconnecting...'));

  return redisClient;
};

const getRedisClient = () => redisClient;

module.exports = { connectRedis, getRedisClient };
