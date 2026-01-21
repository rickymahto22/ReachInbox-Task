import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    PORT: z.string().default('3000'),
    DATABASE_URL: z.string(),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.string().default('6379'),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    CLIENT_URL: z.string().default('http://localhost:3001'),
    JWT_SECRET: z.string().default('supersecret'),
    WORKER_CONCURRENCY: z.string().default('5'),
    MAX_EMAILS_PER_HOUR: z.string().default('10'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error("❌ Invalid environment variables:", _env.error.format());
    process.exit(1);
}

const env = _env.data;

export const config = {
    port: parseInt(env.PORT, 10),
    databaseUrl: env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL, // Optional, typically provided by Render
    redis: {
        host: env.REDIS_HOST,
        port: parseInt(env.REDIS_PORT, 10),
    },
    google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || `http://localhost:${env.PORT}/api/auth/google/callback`
    },
    clientUrl: env.CLIENT_URL,
    jwtSecret: env.JWT_SECRET,
    workerConcurrency: parseInt(env.WORKER_CONCURRENCY, 10),
    maxEmailsPerHour: parseInt(env.MAX_EMAILS_PER_HOUR, 10)
};
