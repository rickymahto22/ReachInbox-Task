import { Worker, Job } from 'bullmq';
import { prisma } from './config/db';
import { redisConnection } from './config/redis';
import { sendEmail } from './services/emailService';
import { config } from './config/env';
import { EmailJobData } from './types';

const EMAIL_QUEUE_NAME = 'email-queue';
const MIN_DELAY_MS = 2000; // Default minimum delay

// Queue Configuration is done where the queue is instantiated (in routes/schedule.ts or separate file)
// Here we define the Worker

console.log("Worker initialized and listening to queue:", EMAIL_QUEUE_NAME);

export const emailWorker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, async (job: Job<EmailJobData>) => {
    console.log(`[Worker] Picked up job ${job.id}`);
    const { recipient, subject, body, userId, emailJobId, attachments, hourlyLimit, minDelay } = job.data;

    // Use job specific limit or global config
    const limit = hourlyLimit || config.maxEmailsPerHour;

    // 1. Rate Limiting Check
    const now = new Date();
    const currentHour = now.getHours();
    const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const rateLimitKey = `rate-limit:${userId}:${dateKey}:${currentHour}`;

    const currentCountStr = await redisConnection.get(rateLimitKey);
    const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;

    if (currentCount >= limit) {
        // Reschedule for next hour
        const nextHour = new Date(now);
        nextHour.setHours(currentHour + 1, 0, 0, 0); // Start of next hour
        const delay = nextHour.getTime() - now.getTime();

        await job.moveToDelayed(Date.now() + delay, job.token);
        console.log(`Rate limit reached for user ${userId} (${limit}/hr). Rescheduling job ${job.id} to ${nextHour.toISOString()}`);
        return; // Stop processing this job execution
    }

    // 2. Process Email
    try {
        console.log(`Sending email to ${recipient} (Job ${job.id}, DB ID ${emailJobId})`);

        // Fetch Sender Info
        const sender = await prisma.user.findUnique({ where: { id: userId } });
        const fromName = sender?.name || "ReachInbox User";
        const fromEmail = sender?.email || "user@reachinbox.com";

        // Personalization Logic
        let personalizedSubject = subject;
        let personalizedBody = body;

        // Extract Name from Recipient (e.g. "Oliver <oliver@test.com>" or just "oliver@test.com")
        // If strict email format, we can split by @ and capitalize.
        let recipientName = "there";
        if (recipient.includes('<')) {
            recipientName = recipient.split('<')[0].trim();
        } else {
            const parts = recipient.split('@');
            if (parts.length > 0) {
                recipientName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            }
        }

        // Variable Substitution
        personalizedSubject = personalizedSubject.replace(/{{name}}/g, recipientName);
        personalizedBody = personalizedBody.replace(/{{name}}/g, recipientName);

        // Append Unique Job ID to Subject as requested
        // Using a short substring of Job ID to keep it readable but unique
        const shortJobId = job.id?.slice(-6).toUpperCase() || 'REF#000';
        personalizedSubject = `${personalizedSubject} | ${shortJobId}`;

        const { previewUrl } = await sendEmail(recipient, personalizedSubject, personalizedBody, attachments, fromName, fromEmail);

        if (previewUrl) {
            console.log(`[Worker] Saved Preview URL for job ${job.id}: ${previewUrl}`);
        }

        // Update DB status
        await prisma.emailJob.update({
            where: { id: emailJobId },
            data: {
                status: 'COMPLETED',
                sentAt: new Date(),
                previewUrl: typeof previewUrl === 'string' ? previewUrl : undefined
            }
        });

        // Increment Rate Limit Counter
        await redisConnection.incr(rateLimitKey);
        // Set expiry for 2 hours just to be safe it cleans up
        await redisConnection.expire(rateLimitKey, 7200);

        // 3. Delay mechanism (simulate throttling)
        // Use job specific delay or global default, ensuring safety
        const delayMs = Math.max(MIN_DELAY_MS, minDelay || 0);
        await new Promise(resolve => setTimeout(resolve, delayMs));

    } catch (error) {
        console.error(`Failed to send email job ${job.id}:`, error);
        await prisma.emailJob.update({
            where: { id: emailJobId },
            data: { status: 'FAILED' }
        });
        throw error; // Let BullMQ handle retries
    }

}, {
    connection: redisConnection as any,
    concurrency: config.workerConcurrency, // Use config
    limiter: {
        max: 10, // BullMQ internal limiter (safety net)
        duration: 1000
    }
});

emailWorker.on('completed', job => {
    console.log(`${job.id} has completed!`);
});

emailWorker.on('failed', (job, err) => {
    console.log(`${job?.id} has failed with ${err.message}`);
});
