import { Router } from 'express';
import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/db';
import { z } from 'zod';

const router = Router();
const emailQueue = new Queue('email-queue', { connection: redisConnection as any });

const scheduleSchema = z.object({
    recipient: z.string().email(),
    subject: z.string(),
    body: z.string(),
    userId: z.string().uuid(),
    scheduledAt: z.string().optional(),
    hourlyLimit: z.number().optional(),
    minDelay: z.number().optional(),
    attachments: z.array(z.object({
        filename: z.string(),
        content: z.string(), // Base64
        encoding: z.string().optional(),
    })).optional()
});

router.post('/', async (req, res) => {
    try {
        const { recipient, subject, body, userId, scheduledAt, hourlyLimit, minDelay, attachments } = scheduleSchema.parse(req.body);

        // Calculate delay
        let delay = 0;
        let scheduledDate = new Date();
        if (scheduledAt) {
            scheduledDate = new Date(scheduledAt);
            const now = new Date();
            delay = Math.max(0, scheduledDate.getTime() - now.getTime());
        }

        // Add to DB first (Persistence)
        const jobRecord = await prisma.emailJob.create({
            data: {
                userId,
                recipient,
                subject,
                body,
                status: 'PENDING',
                scheduledAt: scheduledDate,
                attachments: attachments ? JSON.parse(JSON.stringify(attachments)) : undefined // Ensure JSON compatibility
            }
        });

        // Add to Queue
        const job = await emailQueue.add('send-email', {
            recipient,
            subject,
            body,
            userId,
            hourlyLimit,
            minDelay,
            emailJobId: jobRecord.id, // Pass DB ID to worker to avoid race condition
            attachments
        }, {
            delay,
            jobId: jobRecord.id // Use DB ID as Job ID for tracking
        });

        // Update DB with Job ID (if we didn't use it as Primary Key directly, but good to be explicit/redundant or if ID was diverse)
        await prisma.emailJob.update({
            where: { id: jobRecord.id },
            data: { jobId: job.id }
        });

        res.json({ success: true, jobId: job.id, message: 'Email scheduled' });
    } catch (error: any) {
        console.error("Schedule Error:", error);
        if (error instanceof z.ZodError) {
            // Fix: access error.issues instead of error.errors for Zod
            res.status(400).json({ error: 'Validation Error', details: error.issues });
        } else {
            res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
    }
});

// Get scheduled emails
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    const jobs = await prisma.emailJob.findMany({
        where: { userId },
        orderBy: { scheduledAt: 'desc' }
    });
    res.json(jobs);
});

// Get received emails (simulate Inbox by finding emails sent TO this address)
router.get('/inbox/:email', async (req, res) => {
    const { email } = req.params;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const jobs = await prisma.emailJob.findMany({
            where: {
                recipient: { equals: email, mode: 'insensitive' },
                status: 'COMPLETED' // Only show emails that have actually been sent
            },
            include: {
                user: { // Include sender info
                    select: { name: true, email: true, avatar: true }
                }
            },
            orderBy: { sentAt: 'desc' }
        });
        res.json(jobs);
    } catch (error) {
        console.error("Inbox Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch inbox" });
    }
});

// Get Single Job (Email Detail)
router.get('/job/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const job = await prisma.emailJob.findUnique({
            where: { id },
            include: {
                user: {
                    select: { name: true, email: true, avatar: true }
                }
            }
        });
        if (!job) return res.status(404).json({ error: "Email not found" });
        res.json(job);
    } catch (error) {
        console.error("Job Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch email" });
    }
});

export default router;
