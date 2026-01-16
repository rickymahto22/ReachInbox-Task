'use client';

import EmailList from "@/components/EmailList";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function SentPage() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEmails = async () => {
    if (session?.user && (session.user as any).id) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/${(session.user as any).id}`);
        if (res.ok) {
          const data = await res.json();
           // Filter for COMPLETED
          const sent = data
              .filter((job: any) => job.status === 'COMPLETED')
              .map((job: any) => ({
                  id: job.id,
                  recipient: job.recipient,
                  subject: job.subject,
                  body: job.body,
                  status: 'sent',
                  date: job.sentAt ? new Date(job.sentAt).toLocaleString() : 'Sent'
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
          const handleRefresh = () => fetchEmails();
          window.addEventListener('refresh-sidebar', handleRefresh);

          // Poll for status changes
          const interval = setInterval(fetchEmails, 5000);

          return () => {
              window.removeEventListener('refresh-sidebar', handleRefresh);
              clearInterval(interval);
          };
      }
    }, [session]);
  
    if (loading) return <div className="p-8 text-gray-500">Loading sent emails...</div>;

  return <EmailList title="Sent" items={emails} />;
}
