"use client";
import { useWorkflowStore } from '../../store/workflowStore';
import { ShieldCheck, Info, XCircle, CheckCircle2, Eye, History } from 'lucide-react';
import { clsx } from 'clsx';

interface ApprovalGateConfigProps {
    nodeId: string;
}

export default function ApprovalGateConfig({ nodeId }: ApprovalGateConfigProps) {
    const { nodes, updateNode, approveNode } = useWorkflowStore();
    const node = nodes.find((n) => n.id === nodeId);
    const status = node?.data.status;

    // Find previous node output for review
    // In a real app, we'd traverse the store, for now we just show a placeholder
    const mockPreviousOutput = "Hi {First Name}, I saw that {Company} is hiring for {Role}. Given your growth in {Department}, I thought our solution could help...";

    const handleReject = () => {
        updateNode(nodeId, {
            data: {
                ...node!.data,
                status: 'error',
                error: 'Manual rejection by expert.'
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Mission Statement */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-sm font-bold text-amber-900">Expert Quality Gate</p>
                    <p className="text-xs text-amber-800 leading-relaxed">
                        This node pauses automation until you verify the output quality. Essential for maintaining brand voice and accuracy.
                    </p>
                </div>
            </div>

            {/* Review Section */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Eye className="w-3 h-3" />
                        Execution Preview
                    </label>
                    <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                        Awaiting Human
                    </div>
                </div>
                <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 shadow-inner relative group">
                    <p className="text-sm text-gray-300 font-medium leading-relaxed italic">
                        "{mockPreviousOutput}"
                    </p>
                    <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
                </div>
            </div>

            {/* Verification Checklist */}
            <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Verification Checklist</label>
                <div className="space-y-2">
                    {[
                        "Tone aligns with brand voice",
                        "Data placeholders are correctly resolved",
                        "No hallucinations in personalization facts"
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center bg-white">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 opacity-50" />
                            </div>
                            <span className="text-xs text-gray-600 font-medium">{item}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Direct Actions */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                <button
                    onClick={handleReject}
                    className="py-3 px-4 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                    <XCircle className="w-4 h-4" />
                    Reject
                </button>
                <button
                    onClick={() => approveNode(nodeId)}
                    className="py-3 px-4 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve
                </button>
            </div>

            {/* Audit Log */}
            <div className="pt-2">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <History className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Audit Activity</span>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>AI generated message at 15:08:42</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
