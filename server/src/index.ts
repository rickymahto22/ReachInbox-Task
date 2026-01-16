import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env';
import { redisConnection } from './config/redis';
import scheduleRoutes from './routes/schedule';
import authRoutes from './routes/auth';
import './worker'; // Start the BullMQ worker

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/schedule', scheduleRoutes);
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', redis: redisConnection.status });
});

app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`DB URL: ${process.env.DATABASE_URL}`);
});
