import { BarChart3, CheckCircle2, XCircle, RefreshCw, Activity } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import clsx from 'clsx';
import { useMemo, useEffect, useState } from 'react';

export default function StatusDashboard() {
    const { nodes } = useWorkflowStore();
    const [backendStatus, setBackendStatus] = useState<'checking' | 'ok' | 'error'>('checking');
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    // Check backend health
    const checkBackendHealth = async () => {
        setBackendStatus('checking');
        try {
            // Updated to use Next.js API route
            const response = await fetch('/api/health');
            if (response.ok) {
                setBackendStatus('ok');
            } else {
                setBackendStatus('error');
            }
        } catch (error) {
            console.error('Backend health check failed:', error);
            setBackendStatus('error');
        } finally {
            setLastChecked(new Date());
        }
    };

    // Check on mount and every 30 seconds
    useEffect(() => {
        checkBackendHealth();
        const interval = setInterval(checkBackendHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    const stats = useMemo(() => {
        let jobsScraped = 0;
        let contactsFound = 0;
        let messagesGenerated = 0;
        let connectionsSent = 0;

        nodes.forEach((node) => {
            if (node.data.output) {
                if (node.type === 'linkedin_scrape' || node.type === 'job_extraction') {
                    jobsScraped = Math.max(jobsScraped, node.data.output.jobs?.length || 0);
                }
                if (node.type === 'contact_enrichment') {
                    contactsFound = node.data.output.contacts?.length || 0;
                }
                if (node.type === 'message_generation') {
                    messagesGenerated = node.data.output.messages_generated || 0;
                }
                if (node.type === 'linkedin_connection') {
                    connectionsSent = node.data.output.connections_sent || 0;
                }
            }
        });

        return { jobsScraped, contactsFound, messagesGenerated, connectionsSent };
    }, [nodes]);

    const completedNodes = nodes.filter((n) => n.data.status === 'completed' || n.data.status === 'approved').length;
    const progress = (completedNodes / nodes.length) * 100;

    return (
        <div className="space-y-6">
            {/* Backend Status Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Backend Status
                    </h3>
                    <button
                        onClick={checkBackendHealth}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                        <RefreshCw className={clsx("w-3 h-3", backendStatus === 'checking' && "animate-spin")} />
                        Refresh
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {backendStatus === 'checking' && (
                        <div className="flex items-center gap-2 text-gray-500">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-500"></span>
                            </span>
                            <span className="text-sm">Checking connection...</span>
                        </div>
                    )}

                    {backendStatus === 'ok' && (
                        <div className="flex items-center gap-2 text-green-600">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <span className="text-sm font-medium">System Online</span>
                        </div>
                    )}

                    {backendStatus === 'error' && (
                        <div className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">Connection Failed</span>
                        </div>
                    )}
                </div>
                {lastChecked && (
                    <p className="text-xs text-gray-400 mt-2">
                        Last checked: {lastChecked.toLocaleTimeString()}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div className="text-blue-600 text-sm font-medium mb-1">Jobs Scraped</div>
                    <div className="text-2xl font-bold text-blue-900">{stats.jobsScraped}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <div className="text-purple-600 text-sm font-medium mb-1">Contacts Found</div>
                    <div className="text-2xl font-bold text-purple-900">{stats.contactsFound}</div>
                </div>
                <div className="bg-pink-50 p-4 rounded-xl border border-pink-100">
                    <div className="text-pink-600 text-sm font-medium mb-1">Messages Generated</div>
                    <div className="text-2xl font-bold text-pink-900">{stats.messagesGenerated}</div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <div className="text-indigo-600 text-sm font-medium mb-1">Connections Sent</div>
                    <div className="text-2xl font-bold text-indigo-900">{stats.connectionsSent}</div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-gray-500" />
                        Workflow Progress
                    </h3>
                    <span className="text-sm font-medium text-gray-500">
                        {Math.round(progress)}% Complete
                    </span>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-2.5 mb-6">
                    <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <div className="space-y-3">
                    {nodes.map((node) => (
                        <div key={node.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className={clsx(
                                    "w-2 h-2 rounded-full",
                                    node.data.status === 'completed' || node.data.status === 'approved' ? 'bg-green-500' :
                                        node.data.status === 'running' ? 'bg-blue-500 animate-pulse' :
                                            node.data.status === 'error' ? 'bg-red-500' :
                                                'bg-gray-300'
                                )}></div>
                                <span className={clsx(
                                    "text-sm font-medium",
                                    node.data.status === 'pending' ? 'text-gray-500' : 'text-gray-900'
                                )}>
                                    {node.data.label}
                                </span>
                            </div>

                            {node.data.status === 'completed' || node.data.status === 'approved' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : node.data.status === 'running' ? (
                                <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                            ) : node.data.status === 'error' ? (
                                <XCircle className="w-5 h-5 text-red-500" />
                            ) : (
                                <span className="text-xs text-gray-400">Pending</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
