import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkflowNode, WorkflowEdge, NodeType, NodeStatus } from '../types';
import {
    Search,
    FileText,
    Users,
    UserSearch,
    MessageSquare,
    Link2,
    Send,
    BarChart3,
} from 'lucide-react';

interface WorkflowState {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    mode: 'build' | 'run';
    currentNodeId: string | null;

    // Actions
    setMode: (mode: 'build' | 'run') => void;
    addNode: (type: NodeType, position: { x: number; y: number }) => void;
    updateNode: (id: string, data: Partial<WorkflowNode>) => void;
    deleteNode: (id: string) => void;
    addEdge: (edge: WorkflowEdge) => void;
    deleteEdge: (id: string) => void;
    setCurrentNode: (id: string | null) => void;
    approveNode: (id: string) => void;
    resetWorkflow: () => void;
}

const initialNodes: WorkflowNode[] = [
    {
        id: 'manual_1',
        type: 'manual_ingestion',
        position: { x: 100, y: 100 },
        data: {
            label: 'Custom Context',
            status: 'pending',
            config: { instructions: '', dataType: 'text' }
        },
    },
    {
        id: '1',
        type: 'linkedin_scrape',
        position: { x: 100, y: 175 },
        data: {
            label: 'LinkedIn Scrape',
            status: 'pending',
            config: { searchUrl: '', maxJobs: 10 }
        },
    },
    {
        id: '2',
        type: 'job_extraction',
        position: { x: 100, y: 325 },
        data: {
            label: 'Job Extraction',
            status: 'pending',
            config: {}
        },
    },
    {
        id: '3',
        type: 'job_validation',
        position: { x: 100, y: 475 },
        data: {
            label: 'Job Validation',
            status: 'pending',
            config: { geminiApiKey: '', prompt: 'Is this job qualified for our offering? Check if the company is hiring for engineering roles and has >50 employees.' }
        },
    },
    {
        id: '4',
        type: 'contact_enrichment',
        position: { x: 100, y: 625 },
        data: {
            label: 'Contact Enrichment',
            status: 'pending',
            config: {
                tools: {
                    clearbit: false,
                    hunter: false,
                    apollo: false,
                    clay: true
                }
            }
        },
    },
    {
        id: '5',
        type: 'message_generation',
        position: { x: 100, y: 775 },
        data: {
            label: 'Message Generation',
            status: 'pending',
            config: { model: 'gemini-1.5-pro' }
        },
    },
    {
        id: 'approval_1',
        type: 'approval_gate',
        position: { x: 100, y: 850 },
        data: {
            label: 'Quality Review',
            status: 'pending',
            config: {}
        },
    },
    {
        id: '6',
        type: 'linkedin_connection',
        position: { x: 100, y: 925 },
        data: {
            label: 'LinkedIn Connection',
            status: 'pending',
            config: {}
        },
    },
    {
        id: '7',
        type: 'outreach_sequence',
        position: { x: 100, y: 1075 },
        data: {
            label: 'Outreach Sequence',
            status: 'pending',
            config: { followUpDelay: 3, maxFollowUps: 3 }
        },
    },
    {
        id: '8',
        type: 'status_dashboard',
        position: { x: 100, y: 1225 },
        data: {
            label: 'Status Dashboard',
            status: 'pending',
            config: {}
        },
    },
];

const initialEdges: WorkflowEdge[] = [
    { id: 'emanual-1', source: 'manual_1', target: '1' },
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
    { id: 'e3-4', source: '3', target: '4' },
    { id: 'e4-5', source: '4', target: '5' },
    { id: 'e5-approval', source: '5', target: 'approval_1' },
    { id: 'eapproval-6', source: 'approval_1', target: '6' },
    { id: 'e6-7', source: '6', target: '7' },
    { id: 'e7-8', source: '7', target: '8' },
];

export const useWorkflowStore = create<WorkflowState>()(
    persist(
        (set, get) => ({
            nodes: initialNodes,
            edges: initialEdges,
            mode: 'build',
            currentNodeId: null,

            setMode: (mode) => set({ mode }),

            addNode: (type, position) => {
                const id = Math.random().toString(36).substring(7);
                const labels: Record<NodeType, string> = {
                    linkedin_scrape: 'LinkedIn Scrape',
                    job_extraction: 'Job Extraction',
                    job_validation: 'Job Validation',
                    contact_enrichment: 'Contact Enrichment',
                    message_generation: 'Message Generation',
                    linkedin_connection: 'LinkedIn Connection',
                    outreach_sequence: 'Outreach Sequence',
                    manual_ingestion: 'Manual Ingestion',
                    approval_gate: 'Approval Gate',
                    status_dashboard: 'Status Dashboard'
                };

                const newNode: WorkflowNode = {
                    id,
                    type,
                    position,
                    data: {
                        label: labels[type],
                        status: 'pending',
                        config: {},
                    },
                };

                set((state) => ({ nodes: [...state.nodes, newNode] }));
            },

            updateNode: (id, data) => {
                set((state) => ({
                    nodes: state.nodes.map((node) =>
                        node.id === id ? { ...node, ...data, data: { ...node.data, ...data.data } } : node
                    ),
                }));
            },

            deleteNode: (id) => {
                set((state) => ({
                    nodes: state.nodes.filter((node) => node.id !== id),
                    edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
                }));
            },

            addEdge: (edge) => {
                set((state) => ({ edges: [...state.edges, edge] }));
            },

            deleteEdge: (id) => {
                set((state) => ({ edges: state.edges.filter((edge) => edge.id !== id) }));
            },

            setCurrentNode: (id) => set({ currentNodeId: id }),

            approveNode: (id) => {
                const { nodes, edges, updateNode } = get();
                const node = nodes.find((n) => n.id === id);
                if (!node) return;

                updateNode(id, { data: { ...node.data, status: 'approved' } });

                // Activate next nodes
                const nextEdges = edges.filter((e) => e.source === id);
                nextEdges.forEach((edge) => {
                    const targetNode = nodes.find((n) => n.id === edge.target);
                    if (targetNode && targetNode.data.status === 'pending') {
                        // In a real app, this might trigger the next node
                        // For now, we leave it as pending until run manually
                    }
                });
            },

            resetWorkflow: () => {
                set({ nodes: initialNodes, edges: initialEdges, mode: 'build', currentNodeId: null });
            }
        }),
        {
            name: 'workflow-storage-v4',
            partialize: (state) => ({
                nodes: state.nodes,
                edges: state.edges,
                mode: state.mode
            }),
        }
    )
);
