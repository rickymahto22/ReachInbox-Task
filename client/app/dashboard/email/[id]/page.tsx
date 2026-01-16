'use client';

import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Trash2, 
  Archive, 
  Star,
  MoreVertical,
  Reply,
  ChevronDown,
  Download,
  FileText
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface Attachment {
    filename: string;
    content: string; // Base64
    encoding: string;
}

interface EmailJob {
    id: string;
    subject: string;
    body: string;
    recipient: string;
    sentAt: string | null;
    scheduledAt: string;
    status: string;
    attachments: Attachment[] | null;
    user: {
        name: string | null;
        email: string;
        avatar: string | null;
    };
}

export default function EmailDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [email, setEmail] = useState<EmailJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.id) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/schedule/job/${params.id}`)
            .then(res => {
                if(res.ok) return res.json();
                throw new Error("Failed to fetch");
            })
            .then(data => setEmail(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }
  }, [params?.id]);

  if (loading) {
      return <div className="h-screen flex items-center justify-center text-gray-500">Loading email...</div>;
  }

  if (!email) {
      return (
        <div className="h-screen flex flex-col items-center justify-center text-gray-500 gap-4">
            <p>Email not found.</p>
            <button onClick={() => router.back()} className="text-blue-600 hover:underline">Go Back</button>
        </div>
      );
  }

  const dateStr = email.sentAt 
    ? new Date(email.sentAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }) 
    : new Date(email.scheduledAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });

  const senderName = email.user?.name || "Unknown Sender";
  const senderEmail = email.user?.email || "sender@example.com";
  const avatarUrl = email.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`;

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 font-sans">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 truncate max-w-2xl" title={email.subject}>
            {email.subject}
          </h1>
          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono">{email.status}</span>
        </div>
        
        <div className="flex items-center gap-3 text-gray-400">
             {/* Actions */}
            <button className="p-2 hover:bg-gray-100 rounded-full hover:text-yellow-400 transition-colors">
                <Star size={20} />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full hover:text-gray-600 transition-colors">
                <Archive size={20} />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full hover:text-red-500 transition-colors">
                <Trash2 size={20} />
            </button>
             <div className="h-6 w-px bg-gray-200 mx-1"></div>
             {session?.user?.image && (
                 <img src={session.user.image} className="w-8 h-8 rounded-full border border-gray-200" alt="Me" />
             )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 md:px-16 py-8">
        
        {/* Email Header Info */}
        <div className="flex justify-between items-start mb-8">
            <div className="flex gap-4">
                <img 
                    src={avatarUrl} 
                    alt={senderName} 
                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                />
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{senderName}</span>
                        <span className="text-gray-500 text-sm hidden sm:inline">&lt;{senderEmail}&gt;</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5 relative group/tooltip cursor-pointer w-fit">
                        <span>to {session?.user?.email === senderEmail ? email.recipient : 'me'}</span>
                        <ChevronDown size={12} />
                        
                        {/* Tooltip implementation if needed later, but for now just text change is sufficient */}
                    </div>
                </div>
            </div>
            <div className="text-sm text-gray-500 whitespace-nowrap">
                {dateStr}
            </div>
        </div>

        {/* Body */}
        <div className="max-w-4xl text-gray-800 leading-relaxed text-[15px] space-y-6 whitespace-pre-wrap">
             {/* If body contains HTML, verify safety. For now assuming plain text or simple formatting */}
             {email.body}
        </div>
        
        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <FileText size={16}/> {email.attachments.length} Attachments
                </h3>
                <div className="flex flex-wrap gap-4">
                    {email.attachments.map((file, i) => (
                        <div key={i} className="group relative w-48 border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-gray-50">
                            {/* Preview Area */}
                            <div className="h-32 bg-gray-200 flex items-center justify-center relative overflow-hidden">
                                {file.filename.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                    <img 
                                        src={`data:image/png;base64,${file.content}`} 
                                        alt={file.filename} 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <FileText size={40} className="text-gray-400" />
                                )}
                                {/* Overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                     <a 
                                        href={`data:application/octet-stream;base64,${file.content}`} 
                                        download={file.filename}
                                        className="bg-white/90 p-2 rounded-full shadow-sm text-gray-700 hover:text-blue-600"
                                     >
                                        <Download size={20} />
                                     </a>
                                </div>
                            </div>
                            {/* Footer */}
                            <div className="p-3 bg-white">
                                <div className="text-xs font-medium text-gray-900 truncate" title={file.filename}>
                                    {file.filename}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1">
                                    {/* Mock size if not stored */}
                                    {(file.content.length * 0.75 / 1024).toFixed(1)} KB
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
