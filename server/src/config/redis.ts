import Redis from 'ioredis';
import { config } from './env';

export const redisConnection = config.redisUrl
    ? new Redis(config.redisUrl, {
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 50, 2000)
    })
    : new Redis({
        host: config.redis.host,
        port: config.redis.port,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 50, 2000)
    });

redisConnection.on('error', (err) => {
    console.error('Redis connection error:', err);
});

redisConnection.on('connect', () => {
    console.log('Connected to Redis');
});
