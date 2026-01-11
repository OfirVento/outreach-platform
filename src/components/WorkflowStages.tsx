import {
    Search,
    FileText,
    Users,
    UserSearch,
    MessageSquare,
    Link2,
    Send,
    BarChart3,
    CheckCircle2,
    Clock,
    Circle,
    AlertCircle,
    ShieldCheck
} from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import clsx from 'clsx';
import type { NodeType } from '../types';

const stageIcons: Partial<Record<NodeType, any>> = {
    linkedin_scrape: Search,
    job_extraction: FileText,
    job_validation: ShieldCheck,
    contact_enrichment: UserSearch,
    message_generation: MessageSquare,
    linkedin_connection: Link2,
    outreach_sequence: Send,
    manual_ingestion: FileText,
    approval_gate: ShieldCheck,
    status_dashboard: BarChart3,
};

export default function WorkflowStages() {
    const { nodes, mode, currentNodeId, setCurrentNode } = useWorkflowStore();

    return (
        <div className="w-full bg-white border-b border-gray-200 overflow-x-auto">
            <div className="flex items-center min-w-max p-4 gap-4">
                {nodes.map((node, index) => {
                    const Icon = stageIcons[node.type] || Search;
                    const isSelected = currentNodeId === node.id;
                    const isCompleted = node.data.status === 'completed' || node.data.status === 'approved';
                    const isRunning = node.data.status === 'running';
                    const isError = node.data.status === 'error';

                    return (
                        <div key={node.id} className="flex items-center">
                            <button
                                onClick={() => setCurrentNode(node.id)}
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-2 rounded-lg border transition-all duration-200 relative group",
                                    isSelected
                                        ? "bg-blue-50 border-blue-200 shadow-sm"
                                        : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm"
                                )}
                            >
                                <div className={clsx(
                                    "p-2 rounded-md transition-colors",
                                    isSelected ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500 group-hover:text-blue-600 group-hover:bg-blue-50"
                                )}>
                                    <Icon className="w-5 h-5" />
                                </div>

                                <div className="text-left">
                                    <div className={clsx(
                                        "text-sm font-semibold mb-0.5",
                                        isSelected ? "text-blue-900" : "text-gray-700"
                                    )}>
                                        {node.data.label}
                                    </div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                        {isCompleted ? (
                                            <span className="text-green-600 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Completed
                                            </span>
                                        ) : isRunning ? (
                                            <span className="text-blue-600 flex items-center gap-1">
                                                <Clock className="w-3 h-3 animate-spin" /> Running...
                                            </span>
                                        ) : isError ? (
                                            <span className="text-red-600 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> Error
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <Circle className="w-3 h-3" /> Pending
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Arrow indicator for selected state */}
                                {isSelected && (
                                    <div className="absolute -bottom-[17px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-gray-200 rotate-45 z-10"></div>
                                )}
                            </button>

                            {/* Connector Line */}
                            {index < nodes.length - 1 && (
                                <div className="w-8 h-0.5 bg-gray-200 mx-2"></div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
