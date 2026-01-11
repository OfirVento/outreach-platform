import { useState, useMemo, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Users, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface HiringSizeConfigProps {
    nodeId: string;
}

const STORAGE_KEY = 'outreach_workflow_hiring_size_config';

export default function HiringSizeConfig({ nodeId }: HiringSizeConfigProps) {
    const { nodes, updateNode, mode, edges } = useWorkflowStore();
    const node = nodes.find((n) => n.id === nodeId);

    // Load saved config
    const loadSavedConfig = () => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch { } // Ignore errors
        return null;
    };

    const savedConfig = loadSavedConfig();

    const [geminiApiKey, setGeminiApiKey] = useState(
        savedConfig?.geminiApiKey || node?.data.config.geminiApiKey || ''
    );

    const [temperature, setTemperature] = useState(
        savedConfig?.temperature ?? node?.data.config.temperature ?? 0.7
    );

    const [isEstimating, setIsEstimating] = useState(false);
    const [estimationProgress, setEstimationProgress] = useState({ current: 0, total: 0 });

    // Auto-save
    useEffect(() => {
        if (typeof window !== 'undefined' && geminiApiKey) {
            const config = { geminiApiKey, temperature };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

            if (node) {
                updateNode(nodeId, {
                    data: {
                        ...node.data,
                        config: {
                            ...node.data.config,
                            ...config
                        }
                    }
                });
            }
        }
    }, [geminiApiKey, temperature, nodeId, updateNode, node]);

    const previousNode = useMemo(() => {
        const incomingEdge = edges.find((e) => e.target === nodeId);
        if (incomingEdge) {
            return nodes.find((n) => n.id === incomingEdge.source);
        }
        return null;
    }, [edges, nodes, nodeId]);

    const previousNodeOutput = previousNode?.data.output;

    const handleEstimate = async () => {
        if (!previousNodeOutput?.jobs) return;

        setIsEstimating(true);
        setEstimationProgress({ current: 0, total: previousNodeOutput.jobs.length });

        const jobsWithHiringSize = [];

        for (let i = 0; i < previousNodeOutput.jobs.length; i++) {
            const job = previousNodeOutput.jobs[i];
            setEstimationProgress({ current: i + 1, total: previousNodeOutput.jobs.length });

            // Mock API call to Gemini (in real version, this would be an actual call)
            await new Promise((resolve) => setTimeout(resolve, 500));

            let estimatedSize = "Unknown";
            // Simple mock logic
            if (job.company) {
                const len = job.company.length;
                if (len < 5) estimatedSize = "1-10 employees";
                else if (len < 10) estimatedSize = "11-50 employees";
                else if (len < 15) estimatedSize = "51-200 employees";
                else estimatedSize = "201+ employees";
            }

            jobsWithHiringSize.push({
                ...job,
                estimated_company_size: estimatedSize,
                hiring_size_confidence: 0.8 // high confidence mock
            });
        }

        setIsEstimating(false);

        const output = {
            status: 'ok',
            jobs_processed: jobsWithHiringSize.length,
            jobs: jobsWithHiringSize
        };

        updateNode(nodeId, {
            data: {
                ...node!.data,
                output,
                status: 'completed'
            }
        });

    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Users className="w-5 h-5" />
                <span>Hiring Size Estimation (Gemini 3)</span>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gemini API Key
                    </label>
                    <input
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="Enter Gemini API Key"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Temperature: {temperature}
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full"
                    />
                </div>
            </div>

            {!previousNodeOutput && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    Waiting for job data...
                </div>
            )}

            {mode === 'build' && previousNodeOutput && (
                <button
                    onClick={handleEstimate}
                    disabled={isEstimating || !geminiApiKey}
                    className={`w-full px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${isEstimating || !geminiApiKey
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                >
                    {isEstimating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Estimating... {estimationProgress.current}/{estimationProgress.total}
                        </>
                    ) : 'Estimate Hiring Size'}
                </button>
            )}

            {node?.data.output && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-medium">
                            Processed {node.data.output.jobs_processed} companies
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
