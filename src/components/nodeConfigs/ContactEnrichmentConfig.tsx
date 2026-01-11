import { useState, useEffect, useMemo } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { UserSearch, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ContactEnrichmentConfigProps {
    nodeId: string;
}

const STORAGE_KEY = 'outreach_workflow_contact_enrichment_config';

export default function ContactEnrichmentConfig({ nodeId }: ContactEnrichmentConfigProps) {
    const { nodes, updateNode, mode, edges } = useWorkflowStore();
    const node = nodes.find((n) => n.id === nodeId);

    // Try to load saved config from local storage
    const loadSavedConfig = () => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error("Failed to load saved config", error);
        }
        return null;
    };

    const savedConfig = loadSavedConfig();

    const [tools, setTools] = useState(
        savedConfig?.tools || node?.data.config.tools || {
            clearbit: false,
            hunter: false,
            apollo: false,
            clay: true,
        }
    );

    const [clayApiKey, setClayApiKey] = useState(
        savedConfig?.clayApiKey || node?.data.config.clayApiKey || ''
    );

    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [connectionMessage, setConnectionMessage] = useState('');
    const [isEnriching, setIsEnriching] = useState(false);
    const [enrichmentProgress, setEnrichmentProgress] = useState({ current: 0, total: 0 });
    const [enrichmentLogs, setEnrichmentLogs] = useState<string[]>([]);

    const previousNode = useMemo(() => {
        const incomingEdge = edges.find((e) => e.target === nodeId);
        if (incomingEdge) {
            return nodes.find((n) => n.id === incomingEdge.source);
        }
        return null;
    }, [edges, nodes, nodeId]);

    const previousNodeOutput = previousNode?.data.output;

    // Auto-save to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const config = { tools, clayApiKey };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

            // Also update the node config so it persists in the graph
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
    }, [tools, clayApiKey, nodeId, updateNode]); // Removed 'node' to avoid loop, though risk is low if updateNode is stable.

    const testConnection = async () => {
        if (tools.clay && !clayApiKey) {
            setConnectionStatus('error');
            setConnectionMessage('Clay API Key is required');
            return;
        }

        setConnectionStatus('testing');
        setConnectionMessage('');

        try {
            if (tools.clay) {
                const response = await fetch('/api/proxy/clay/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey: clayApiKey }),
                });
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || result.details || 'Connection failed');
                }

                setConnectionStatus('success');
                setConnectionMessage('Successfully connected to Clay');
            } else {
                setConnectionStatus('success'); // No tools selected requiring auth test
            }
        } catch (error: any) {
            setConnectionStatus('error');
            setConnectionMessage(error.message || 'Connection failed');
        }
    };

    const handleEnrichment = async () => {
        if (!previousNodeOutput?.jobs) {
            setConnectionStatus('error');
            setConnectionMessage('No jobs to process');
            return;
        }

        if (tools.clay && !clayApiKey) {
            setConnectionStatus('error');
            setConnectionMessage('Clay API Key missing');
            return;
        }

        setIsEnriching(true);
        setEnrichmentLogs([]);
        setEnrichmentProgress({ current: 0, total: previousNodeOutput.jobs.length });

        const enrichedContacts = [];

        // We will extract poster names from jobs if possible, or try to enrich based on company
        for (let i = 0; i < previousNodeOutput.jobs.length; i++) {
            const job = previousNodeOutput.jobs[i];
            setEnrichmentProgress({ current: i + 1, total: previousNodeOutput.jobs.length });

            // Try to find a poster name in the job object
            // Common keys for poster name in scraped data
            const posterName = job.poster_name || job.poster || job.recruiter?.name || job.posted_by?.name;
            const companyName = job.company || job.company_name;

            if (posterName && companyName) {
                setEnrichmentLogs(prev => [...prev, `Enriching ${posterName} at ${companyName}...`]);

                if (tools.clay) {
                    try {
                        const response = await fetch('/api/proxy/clay/enrich', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                apiKey: clayApiKey,
                                name: posterName,
                                company: companyName
                            }),
                        });

                        if (response.ok) {
                            const data = await response.json();
                            enrichedContacts.push({
                                job_id: job.job_id || job.id,
                                contacts: [{
                                    name: posterName,
                                    company: companyName,
                                    ...data
                                }]
                            });
                            setEnrichmentLogs(prev => [...prev, `✅ Found data for ${posterName}`]);
                        } else {
                            const err = await response.json();
                            setEnrichmentLogs(prev => [...prev, `❌ Failed to enrich ${posterName}: ${err.error}`]);
                            // Add placeholder
                            enrichedContacts.push({
                                job_id: job.job_id || job.id,
                                contacts: [{ name: posterName, company: companyName, status: 'enrichment_failed' }]
                            });
                        }
                    } catch (e) {
                        console.error(e);
                        setEnrichmentLogs(prev => [...prev, `❌ Network error for ${posterName}`]);
                    }
                } else {
                    // Mock enrichment if no tool selected
                    enrichedContacts.push({
                        job_id: job.job_id || job.id,
                        contacts: [{ name: posterName, company: companyName, email: `${posterName.split(' ')[0]}@${companyName.replace(/\s+/g, '').toLowerCase()}.com` }]
                    });
                }
            } else {
                // Cannot enrich without a person name (basic implementation)
                // In a real scenario, we might search for "Head of X at Company"
                setEnrichmentLogs(prev => [...prev, `⚠️ Skipping job at ${companyName || 'Unknown'} - No poster name found`]);
            }
        }

        setIsEnriching(false);

        const output = {
            status: 'ok',
            contacts_found: enrichedContacts.length,
            contacts: enrichedContacts,
            logs: enrichmentLogs
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
                <UserSearch className="w-5 h-5" />
                <span>Contact Enrichment Settings</span>
            </div>

            <div className="space-y-3">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={tools.clay}
                        onChange={(e) => setTools({ ...tools, clay: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Use Clay (Official Integration)</span>
                </label>

                {tools.clay && (
                    <div className="ml-6 space-y-2">
                        <input
                            type="password"
                            value={clayApiKey}
                            onChange={(e) => setClayApiKey(e.target.value)}
                            placeholder="Enter Clay API Key"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <button
                            onClick={testConnection}
                            disabled={connectionStatus === 'testing' || !clayApiKey}
                            className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded border border-blue-200 hover:bg-blue-100"
                        >
                            {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                        </button>
                        {connectionStatus === 'error' && <p className="text-xs text-red-600">{connectionMessage}</p>}
                        {connectionStatus === 'success' && <p className="text-xs text-green-600">{connectionMessage}</p>}
                    </div>
                )}

                <label className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                    <input
                        type="checkbox"
                        checked={tools.clearbit}
                        disabled
                        className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Use Clearbit (Coming Soon)</span>
                </label>
                <label className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                    <input
                        type="checkbox"
                        checked={tools.hunter}
                        disabled
                        className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Use Hunter.io (Coming Soon)</span>
                </label>
                <label className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                    <input
                        type="checkbox"
                        checked={tools.apollo}
                        disabled
                        className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Use Apollo.io (Coming Soon)</span>
                </label>
            </div>

            {!previousNodeOutput && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    Waiting for job data from previous node...
                </div>
            )}

            {previousNodeOutput && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                    Ready to analyze {previousNodeOutput.jobs?.length} jobs
                </div>
            )}

            {mode === 'build' && (
                <div className="space-y-4">
                    <button
                        onClick={handleEnrichment}
                        disabled={isEnriching || !previousNodeOutput}
                        className={`w-full px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${isEnriching || !previousNodeOutput
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-600 text-white hover:bg-gray-700'
                            }`}
                    >
                        {isEnriching ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Enriching... {enrichmentProgress.current}/{enrichmentProgress.total}
                            </>
                        ) : (
                            'Run Enrichment'
                        )}
                    </button>

                    {enrichmentLogs.length > 0 && (
                        <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono max-h-48 overflow-y-auto">
                            {enrichmentLogs.map((log, i) => (
                                <div key={i}>{log}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
