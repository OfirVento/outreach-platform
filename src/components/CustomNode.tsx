import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { NodeType, NodeStatus } from '../types';
import {
    Search,
    FileText,
    Users,
    UserSearch,
    MessageSquare,
    Link2,
    Send,
    BarChart3,
    ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';

const nodeIcons: Partial<Record<NodeType, any>> = {
    linkedin_scrape: Search,
    job_extraction: FileText,
    job_validation: ShieldCheck,
    contact_enrichment: UserSearch,
    message_generation: MessageSquare,
    linkedin_connection: Link2,
    outreach_sequence: Send,
    status_dashboard: BarChart3,
    manual_ingestion: FileText,
    approval_gate: ShieldCheck,
};

const nodeColors: Partial<Record<NodeType, string>> = {
    linkedin_scrape: 'bg-blue-500',
    job_extraction: 'bg-purple-500',
    job_validation: 'bg-blue-600',
    contact_enrichment: 'bg-yellow-500',
    message_generation: 'bg-pink-500',
    linkedin_connection: 'bg-indigo-500',
    outreach_sequence: 'bg-orange-500',
    status_dashboard: 'bg-gray-500',
    manual_ingestion: 'bg-teal-500',
    approval_gate: 'bg-emerald-600',
};

const statusColors: Record<NodeStatus, string> = {
    pending: 'bg-gray-200 text-gray-600',
    running: 'bg-blue-200 text-blue-700',
    completed: 'bg-green-200 text-green-700',
    approved: 'bg-purple-200 text-purple-700',
    error: 'bg-red-200 text-red-700',
};

function CustomNode({ data, selected }: NodeProps) {
    const Icon = nodeIcons[data.type as NodeType] || Search;
    const colorClass = nodeColors[data.type as NodeType] || 'bg-gray-500';
    const statusClass = statusColors[data.status as NodeStatus] || statusColors.pending;

    return (
        <div
            className={clsx(
                'px-4 py-3 rounded-lg border-2 shadow-lg bg-white min-w-[200px]',
                selected ? 'border-blue-500' : 'border-gray-200'
            )}
        >
            <Handle type="target" position={Position.Top} className="w-3 h-3" />

            <div className="flex items-center gap-3">
                <div className={clsx('p-2 rounded-lg', colorClass)}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                    <div className="font-semibold text-gray-900">{data.label}</div>
                    <div className={clsx('text-xs px-2 py-1 rounded mt-1 inline-block', statusClass)}>
                        {data.status}
                    </div>
                </div>
            </div>

            {data.output && (
                <div className="mt-2 text-xs text-gray-500">
                    {data.output.jobs_scraped && `${data.output.jobs_scraped} jobs`}
                    {data.output.contacts_found && `${data.output.contacts_found} contacts`}
                    {data.output.messages_generated && `${data.output.messages_generated} messages`}
                </div>
            )}

            <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
        </div>
    );
}

export default memo(CustomNode);
