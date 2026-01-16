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

export const config = {
    port: process.env.PORT || 3000,
    databaseUrl: process.env.DATABASE_URL,
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback'
    },
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3001',
    jwtSecret: process.env.JWT_SECRET || 'secret',
    workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || '10', 10)
};
