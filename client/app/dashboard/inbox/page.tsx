'use client';

import EmailList from "@/components/EmailList";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function InboxPage() {
  const { data: session } = useSession();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInbox = async (silent = false) => {
    if (!session?.user?.email) return;
    if (!silent) setLoading(true);
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/inbox/${session.user.email}`);
        if (res.ok) {
            const data = await res.json();
            const mapped = data.map((job: any) => ({
                id: job.id,
                recipient: job.recipient,
                sender: job.user?.name || job.user?.email || 'Unknown', // Map sender info
                subject: job.subject,
                body: job.body,
                status: 'inbox',
                date: job.sentAt ? new Date(job.sentAt).toLocaleDateString() : 'Draft'
            }));
            setEmails(mapped);
        }
    } catch (err) {
        console.error("Failed to fetch inbox", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
    
    // Polling with optimization: Stop polling if tab is hidden
    const interval = setInterval(() => {
        if (!document.hidden) {
            fetchInbox(true);
        }
    }, 5000);

    return () => clearInterval(interval);
  }, [session?.user?.email]);

  return <EmailList title="Inbox" items={emails} isLoading={loading} onRefresh={() => fetchInbox(false)} />;
}
