'use client';

import { Search, Filter, RotateCcw, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EmailItem {
    id: string;
    recipient: string;
    sender?: string; // Added sender support
    subject: string;
    body: string;
    status: 'scheduled' | 'sent' | 'inbox'; // Added inbox status
    date: string;
    previewUrl?: string; // Ethereal Preview
}

interface EmailListProps {
    title: string;
    items: EmailItem[];
    isLoading?: boolean;
    onRefresh?: () => void;
}

export default function EmailList({ title, items, isLoading, onRefresh }: EmailListProps) {
    const router = useRouter();
    return (
        <div className="h-full flex flex-col">
            {/* Top Bar */}
            <div className="px-8 py-6 flex items-center gap-4 border-b border-gray-100">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search" 
                        className="w-full bg-gray-100 pl-10 pr-4 py-2.5 rounded-lg text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500/20"
                    />
                </div>
                <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <Filter size={20} />
                    {items.length >= 0 && (
                        <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center shadow-sm border-2 border-white">
                            {items.length}
                        </span>
                    )}
                </button>
                <button 
                    onClick={onRefresh}
                    disabled={isLoading}
                    className={`p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors ${isLoading ? 'animate-spin text-green-600' : ''}`}
                >
                    <RotateCcw size={18} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p>Loading {title}...</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <p>No emails found</p>
                    </div>
                ) : (
                    <div>
                        {items.map((item) => <EmailListItem key={item.id} item={item} />)}
                    </div>
                )}
            </div>
        </div>
    );
}

const EmailListItem = ({ item }: { item: EmailItem }) => {
    const router = useRouter();
    return (
        <div 
            onClick={() => router.push(`/dashboard/email/${item.id}`)}
            className="group px-8 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-start gap-4 cursor-pointer"
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">
                        {item.sender ? `From: ${item.sender}` : `To: ${item.recipient}`}
                    </span>
                    
                    {item.status === 'scheduled' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100 text-[10px] font-medium tracking-wide">
                            <span className="w-2.5 h-2.5 rounded-full border border-current opacity-60 flex items-center justify-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            </span>
                            {item.date} 
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium tracking-wide">
                            {item.status === 'inbox' ? 'Inbox' : 'Sent'}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{item.subject}</span>
                    <span className="text-gray-400">-</span>
                    <span className="truncate">{item.body}</span>
                </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
                 {item.previewUrl && (
                    <a 
                        href={item.previewUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors whitespace-nowrap"
                    >
                        View Email ↗
                    </a>
                )}
                <button className="text-gray-300 hover:text-yellow-400 transition-colors">
                    <Star size={18} />
                </button>
            </div>
        </div>
    );
};
