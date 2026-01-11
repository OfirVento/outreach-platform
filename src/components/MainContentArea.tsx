import { useWorkflowStore } from '../store/workflowStore';
import NodeConfigPanel from './NodeConfigPanel';
import { LayoutDashboard } from 'lucide-react';

export default function MainContentArea() {
    const { currentNodeId } = useWorkflowStore();

    return (
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-8">
            <div className="max-w-5xl mx-auto h-full">
                {currentNodeId ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px] h-full overflow-hidden flex flex-col">
                        <NodeConfigPanel nodeId={currentNodeId} />
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                            <LayoutDashboard className="w-12 h-12 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Stage Selected</h3>
                        <p className="max-w-md text-center text-gray-500">
                            Select a stage from the workflow ribbon above to configure settings, view status, and execute tasks.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
