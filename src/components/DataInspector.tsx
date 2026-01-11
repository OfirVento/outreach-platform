import { useWorkflowStore } from '../store/workflowStore';
import { useMemo } from 'react';

export default function DataInspector() {
    const { nodes, currentNodeId } = useWorkflowStore();

    const selectedNode = useMemo(() => {
        return nodes.find((n) => n.id === currentNodeId);
    }, [nodes, currentNodeId]);

    if (!selectedNode) {
        return (
            <div className="text-gray-500 text-sm flex items-center justify-center h-full">
                Select a node to inspect its data
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Output Panel */}
                <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Node Output
                    </h4>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[300px] shadow-inner">
                        <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                            {JSON.stringify(selectedNode.data.output || {}, null, 2)}
                        </pre>
                    </div>
                </div>

                {/* Configuration Panel */}
                <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Current Configuration
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 overflow-auto max-h-[300px]">
                        <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">
                            {JSON.stringify(selectedNode.data.config || {}, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>

            {/* Error Panel (only if error exists) */}
            {selectedNode.data.error && (
                <div className="border-t border-red-100 pt-4">
                    <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                        Error Log
                    </h4>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-100 text-red-700 text-sm font-mono">
                        {selectedNode.data.error}
                    </div>
                </div>
            )}
        </div>
    );
}
