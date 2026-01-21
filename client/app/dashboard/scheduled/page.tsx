'use client';

import EmailList from "@/components/EmailList";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function ScheduledPage() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEmails = async (silent = false) => {
    if (session?.user && (session.user as any).id) {
        if (!silent) setLoading(true);
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/${(session.user as any).id}`);
          if (res.ok) {
            const data = await res.json();
             // Filter for scheduled (PENDING or DELAYED) - STRICTLY FUTURE
            const now = new Date();
            const scheduled = data
                .filter((job: any) => {
                    if (job.status === 'PENDING' || job.status === 'DELAYED') {
                        return new Date(job.scheduledAt) > now;
                    }
                    return false;
                })
                .map((job: any) => ({
                    id: job.id,
                    recipient: job.recipient,
                    subject: job.subject,
                    body: job.body,
                    status: 'scheduled',
                    date: new Date(job.scheduledAt).toLocaleString()
                }));
            setEmails(scheduled);
          }
        } catch (error) {
          console.error("Failed to fetch emails", error);
        } finally {
          setLoading(false);
        }
    }
  };

  useEffect(() => {
    if (session) {
        fetchEmails();

        // Listen for immediate updates (e.g. from Compose)
        const handleRefresh = () => fetchEmails(true);
        window.addEventListener('refresh-sidebar', handleRefresh);

        // Poll for status changes (e.g. Scheduled -> Sent)
        const interval = setInterval(() => {
             if (!document.hidden) {
                 fetchEmails(true);
             }
        }, 5000);

        return () => {
            window.removeEventListener('refresh-sidebar', handleRefresh);
            clearInterval(interval);
        };
    }
  }, [session]);

  return <EmailList title="Scheduled" items={emails} isLoading={loading} onRefresh={() => fetchEmails(false)} />;
}
