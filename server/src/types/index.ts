export interface Attachment {
    filename: string;
    content: string; // Base64
    encoding?: string;
}

export interface EmailJobData {
    recipient: string;
    subject: string;
    body: string;
    userId: string;
    emailJobId: string; // DB ID
    hourlyLimit?: number;
    minDelay?: number;
    attachments?: Attachment[];
}

export interface ScheduleEmailRequest {
    recipient: string;
    subject: string;
    body: string;
    userId: string;
    scheduledAt?: string;
    hourlyLimit?: number;
    minDelay?: number;
    attachments?: Attachment[];
}

export interface ScheduleEmailResponse {
    success: boolean;
    jobId: string;
    message: string;
}
