import { useWorkflowStore } from '../store/workflowStore';
import { Play, CheckCircle, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
// Import config components
import LinkedInScrapeConfig from './nodeConfigs/LinkedInScrapeConfig';
import JobExtractionConfig from './nodeConfigs/JobExtractionConfig';
import JobValidationConfig from './nodeConfigs/JobValidationConfig';
import ContactEnrichmentConfig from './nodeConfigs/ContactEnrichmentConfig';
import MessageGenerationConfig from './nodeConfigs/MessageGenerationConfig';
import LinkedInConnectionConfig from './nodeConfigs/LinkedInConnectionConfig';
import OutreachSequenceConfig from './nodeConfigs/OutreachSequenceConfig';
import ManualIngestionConfig from './nodeConfigs/ManualIngestionConfig';
import ApprovalGateConfig from './nodeConfigs/ApprovalGateConfig';
import StatusDashboardConfig from './nodeConfigs/StatusDashboardConfig';

interface NodeConfigPanelProps {
    nodeId: string;
}

export default function NodeConfigPanel({ nodeId }: NodeConfigPanelProps) {
    const { nodes, updateNode, approveNode } = useWorkflowStore();
    const node = nodes.find((n) => n.id === nodeId);

    if (!node) return null;

    const renderConfigComponent = () => {
        switch (node.type) {
            case 'linkedin_scrape':
                return <LinkedInScrapeConfig nodeId={nodeId} />;
            case 'job_extraction':
                return <JobExtractionConfig nodeId={nodeId} />;
            case 'job_validation':
                return <JobValidationConfig nodeId={nodeId} />;
            case 'contact_enrichment':
                return <ContactEnrichmentConfig nodeId={nodeId} />;
            case 'message_generation':
                return <MessageGenerationConfig nodeId={nodeId} />;
            case 'linkedin_connection':
                return <LinkedInConnectionConfig nodeId={nodeId} />;
            case 'outreach_sequence':
                return <OutreachSequenceConfig nodeId={nodeId} />;
            case 'manual_ingestion':
                return <ManualIngestionConfig nodeId={nodeId} />;
            case 'approval_gate':
                return <ApprovalGateConfig nodeId={nodeId} />;
            case 'status_dashboard':
                return <StatusDashboardConfig nodeId={nodeId} />;
            default:
                return <div>Configuration not available for this node type.</div>;
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Node Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">{node.data.label}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={clsx(
                            "text-xs px-2 py-0.5 rounded-full font-medium uppercase tracking-wide",
                            node.data.status === 'completed' || node.data.status === 'approved' ? 'bg-green-100 text-green-800' :
                                node.data.status === 'running' ? 'bg-blue-100 text-blue-800' :
                                    node.data.status === 'error' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-600'
                        )}>
                            {node.data.status}
                        </span>
                        {node.data.error && (
                            <span className="flex items-center gap-1 text-xs text-red-600 max-w-xs truncate" title={node.data.error}>
                                <AlertTriangle className="w-3 h-3" />
                                Error detected
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {node.data.status === 'completed' && (
                        <button
                            onClick={() => approveNode(nodeId)}
                            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 flex items-center gap-2 shadow-sm transition-all"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Approve & Continue
                        </button>
                    )}

                    {/* Generic Action Button (mock) - Specific actions are inside config components */}
                    {/* 
          <button 
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
            onClick={() => {}} 
          >
             Actions
          </button>
          */}
                </div>
            </div>

            {/* Config Content */}
            <div className="flex-1 p-6 overflow-y-auto">
                {renderConfigComponent()}
            </div>
        </div>
    );
}
