import { useState } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Send, CheckCircle2 } from 'lucide-react';

interface OutreachSequenceConfigProps {
    nodeId: string;
}

export default function OutreachSequenceConfig({ nodeId }: OutreachSequenceConfigProps) {
    const { nodes, updateNode, mode } = useWorkflowStore();
    const node = nodes.find((n) => n.id === nodeId);

    const [followUpDelay, setFollowUpDelay] = useState(
        node?.data.config.followUpDelay || 3
    );

    const [maxFollowUps, setMaxFollowUps] = useState(
        node?.data.config.maxFollowUps || 3
    );

    const handleTest = () => {
        updateNode(nodeId, {
            data: {
                ...node!.data,
                config: {
                    ...node!.data.config,
                    followUpDelay,
                    maxFollowUps
                },
                output: {
                    status: 'ok',
                    sequence_created: true
                },
                status: 'completed'
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Send className="w-5 h-5" />
                <span>Outreach Sequence Settings</span>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Follow-up Delay (Days)
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="30"
                        value={followUpDelay}
                        onChange={(e) => setFollowUpDelay(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Follow-ups
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="10"
                        value={maxFollowUps}
                        onChange={(e) => setMaxFollowUps(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                </div>
            </div>

            {mode === 'build' && (
                <button
                    onClick={handleTest}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700"
                >
                    Validate Configuration
                </button>
            )}

            {node?.data.output && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-medium">
                            Sequence configured successfully
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
