'use client';

import EmailList from "@/components/EmailList";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function SentPage() {
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
           
          const now = new Date();
          // Filter for COMPLETED OR (PENDING/DELAYED in the past/now)
          const sent = data
              .filter((job: any) => {
                  if (job.status === 'COMPLETED') return true;
                  // Start showing as "sent" (sending) if status is PENDING/DELAYED and time has passed
                  if ((job.status === 'PENDING' || job.status === 'DELAYED')) {
                      return new Date(job.scheduledAt) <= now;
                  }
                  return false;
              })
              .map((job: any) => ({
                  id: job.id,
                  recipient: job.recipient,
                  subject: job.subject,
                  body: job.body,
                  status: job.status === 'COMPLETED' ? 'sent' : 'sent', // Show as sent/sending
                  date: job.status === 'COMPLETED' 
                        ? (job.sentAt ? new Date(job.sentAt).toLocaleString() : 'Sent')
                        : 'Sending...',
                  previewUrl: job.previewUrl
              }));
          setEmails(sent);
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

          // Listen for immediate updates
          const handleRefresh = () => fetchEmails(true);
          window.addEventListener('refresh-sidebar', handleRefresh);

          // Poll for status changes
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
  
  return <EmailList title="Sent" items={emails} isLoading={loading} onRefresh={() => fetchEmails(false)} />;
}
