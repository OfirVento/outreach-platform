import { useState } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Link2, CheckCircle2 } from 'lucide-react';

interface LinkedInConnectionConfigProps {
    nodeId: string;
}

export default function LinkedInConnectionConfig({ nodeId }: LinkedInConnectionConfigProps) {
    const { nodes, updateNode, mode } = useWorkflowStore();
    const node = nodes.find((n) => n.id === nodeId);

    const [integrationType, setIntegrationType] = useState<'linkedin_api' | 'phantombuster' | 'manual_export'>('manual_export');
    const [apiKey, setApiKey] = useState('');

    const handleTest = () => {
        // Mock successful connection
        updateNode(nodeId, {
            data: {
                ...node!.data,
                output: {
                    status: 'ok',
                    connections_sent: 5, // Mock number
                    integration: integrationType
                },
                status: 'completed'
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Link2 className="w-5 h-5" />
                <span>LinkedIn Connection Integration</span>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Integration Method
                    </label>
                    <select
                        value={integrationType}
                        onChange={(e) => setIntegrationType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                        <option value="linkedin_api">LinkedIn Official API (Enterprise)</option>
                        <option value="phantombuster">Phantombuster Automation</option>
                        <option value="manual_export">Manual CSV Export</option>
                    </select>
                </div>

                {integrationType !== 'manual_export' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            API Key / Session Cookie
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter API Key"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                    </div>
                )}

                {integrationType === 'manual_export' && (
                    <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                        This option will generate a CSV file with connection notes that you can use to manually connect or import into other tools.
                    </div>
                )}
            </div>

            {mode === 'build' && (
                <button
                    onClick={handleTest}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700"
                >
                    {integrationType === 'manual_export' ? 'Generate CSV Preview' : 'Test Connection'}
                </button>
            )}

            {node?.data.output && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-medium">
                            Configuration Validated
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
