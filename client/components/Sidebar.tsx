'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  Clock, 
  Send, 
  ChevronDown, 
  Plus
} from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [counts, setCounts] = useState({ scheduled: 0, sent: 0, inbox: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const { data: session } = useSession(); // Access session here

  useEffect(() => {
    async function fetchCounts() {
        if (!session?.user) return;

        // Debug: Log to see if we have the ID
        console.log("Fetching counts for user:", (session.user as any).id);

        if (!(session.user as any).id) {
             console.warn("User ID is missing in session. Login sync might have failed.");
             return;
        }

        try {
            // Fetch Sent/Scheduled
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/${(session.user as any).id}`);
            let scheduled = 0;
            let sent = 0;
            let inbox = 0;

            if (res.ok) {
                const data = await res.json();
                const now = new Date();
                // Split by time: Future -> Scheduled, Past/Present -> Sent
                scheduled = data.filter((job: any) => {
                    if (job.status === 'PENDING' || job.status === 'DELAYED') {
                        return new Date(job.scheduledAt) > now;
                    }
                    return false;
                }).length;

                sent = data.filter((job: any) => {
                    if (job.status === 'COMPLETED') return true;
                    if (job.status === 'PENDING' || job.status === 'DELAYED') {
                        return new Date(job.scheduledAt) <= now;
                    }
                    return false;
                }).length;
            } else {
                console.error("Fetch counts failed:", res.status);
            }

            // Fetch Inbox Count
            if (session.user.email) {
                const resInbox = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/inbox/${session.user.email}`);
                if (resInbox.ok) {
                    const dataInbox = await resInbox.json();
                    inbox = dataInbox.length;
                }
            }

            setCounts({ scheduled, sent, inbox });

        } catch (err) {
            console.error("Failed to fetch sidebar counts", err);
        }
    }
    
    if (session) fetchCounts();
    
    // Listen for global refresh event (from ComposePage etc)
    const handleRefresh = () => {
         if(session) fetchCounts();
    };
    window.addEventListener('refresh-sidebar', handleRefresh);

    // Poll every 5s (reduced from 1s to stop "reloading" feel)
    const interval = setInterval(() => { if(session) fetchCounts() }, 5000);
    return () => {
        clearInterval(interval);
        window.removeEventListener('refresh-sidebar', handleRefresh);
    };
  }, [session]);

  const navItems = [
    { name: 'Scheduled', icon: Clock, path: '/dashboard/scheduled', count: counts.scheduled },
    { name: 'Sent', icon: Send, path: '/dashboard/sent', count: counts.sent },
  ];

  return (
    <div className="w-64 bg-gray-50 h-screen border-r border-gray-200 flex flex-col p-4 flex-shrink-0">
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tighter text-gray-900">ReachInbox</h1>
      </div>

      {/* Connection Warning */}
      {session && !(session.user as any).id && (
          <div className="mb-4 bg-red-50 border border-red-200 p-2 rounded text-xs text-red-600">
              ⚠️ <strong>Connection Error</strong><br/>
              Backend sync failed. Please <strong>Logout</strong> and Login again.
          </div>
      )}

      {/* User Profile & Dropdown */}
      <div className="relative mb-6">
          <div 
            onClick={() => setShowMenu(!showMenu)}
            className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {session?.user?.image ? (
                <img src={session.user.image} alt="User" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold uppercase">
                    {(session?.user?.name?.[0] || session?.user?.email?.[0] || 'U')}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-gray-900 truncate">{session?.user?.name || 'User'}</span>
                <span className="text-xs text-gray-500 truncate">{session?.user?.email || 'user@example.com'}</span>
              </div>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </div>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden py-1">
                <button 
                    onClick={() => { setShowMenu(false); router.push('/dashboard/inbox'); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-8 flex justify-center"><Send size={16} className="rotate-180"/></div>
                        Inbox
                    </div>
                    {counts.inbox > 0 && (
                        <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center mr-2">
                            {counts.inbox}
                        </span>
                    )}
                </button>
                 <div className="h-px bg-gray-100 my-1"></div>
                 <button 
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                    <div className="w-8 flex justify-center">→</div>
                    Logout
                </button>
            </div>
          )}
      </div>

      {/* Compose Button */}
      <button 
        onClick={() => router.push('/dashboard/compose')}
        className="w-full bg-white border-2 border-green-500 text-green-600 font-bold py-2.5 px-4 rounded-full flex items-center justify-center gap-2 mb-8 hover:bg-green-50 transition-colors shadow-sm"
      >
        <span className="text-lg">+</span> Compose
      </button>

      {/* Navigation */}
      <div className="flex-1">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Core</h3>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            const Icon = item.icon;
            
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.path)}
                className={clsx(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-green-100 text-gray-900' 
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-gray-900' : 'text-gray-500'} />
                  {item.name}
                </div>
                <span className={clsx("text-xs", isActive ? "text-gray-900" : "text-gray-400")}>
                    {item.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
