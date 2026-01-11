import { useCallback } from 'react';
import type { NodeType } from '../types';
import {
    Search,
    FileText,
    UserSearch,
    MessageSquare,
    Link2,
    Send,
    BarChart3,
    ShieldCheck,
} from 'lucide-react';

interface PaletteItem {
    type: NodeType;
    label: string;
    icon: any;
    color: string;
}

const paletteItems: PaletteItem[] = [
    { type: 'linkedin_scrape', label: 'LinkedIn Scrape', icon: Search, color: 'bg-blue-500' },
    { type: 'job_extraction', label: 'Job Extraction', icon: FileText, color: 'bg-purple-500' },
    { type: 'job_validation', label: 'Job Validation', icon: ShieldCheck, color: 'bg-blue-600' },
    { type: 'contact_enrichment', label: 'Contact Enrichment', icon: UserSearch, color: 'bg-yellow-500' },
    { type: 'message_generation', label: 'Message Generation', icon: MessageSquare, color: 'bg-pink-500' },
    { type: 'linkedin_connection', label: 'LinkedIn Connection', icon: Link2, color: 'bg-indigo-500' },
    { type: 'outreach_sequence', label: 'Outreach Sequence', icon: Send, color: 'bg-orange-500' },
    { type: 'manual_ingestion', label: 'Manual Ingestion', icon: FileText, color: 'bg-emerald-500' },
    { type: 'approval_gate', label: 'Approval Gate', icon: ShieldCheck, color: 'bg-amber-500' },
    { type: 'status_dashboard', label: 'Status Dashboard', icon: BarChart3, color: 'bg-gray-500' },
];

export default function NodePalette() {
    const onDragStart = useCallback(
        (event: React.DragEvent, item: PaletteItem) => {
            event.dataTransfer.setData('application/reactflow', JSON.stringify(item));
            event.dataTransfer.effectAllowed = 'move';
        },
        []
    );

    return (
        <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto hidden md:block">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Node Palette</h2>
            <div className="space-y-2">
                {paletteItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.type}
                            draggable
                            onDragStart={(e) => onDragStart(e, item)}
                            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-move transition-colors"
                        >
                            <div className={`p-2 rounded-lg ${item.color}`}>
                                <Icon className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{item.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
