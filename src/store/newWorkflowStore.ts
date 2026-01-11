'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
    WorkflowStep,
    StepStatus,
    JobPost,
    Contact,
    GeneratedMessage,
    ExportRow,
    WorkflowRun
} from '../types';
import {
    Search,
    Filter,
    Users,
    PenTool,
    FileSpreadsheet,
    type LucideIcon
} from 'lucide-react';

// Step Definitions
export interface StepDefinition {
    id: WorkflowStep;
    label: string;
    description: string;
    icon: LucideIcon;
    color: string;
}

export const WORKFLOW_STEPS: StepDefinition[] = [
    {
        id: 'source',
        label: 'Source',
        description: 'Import LinkedIn job posts',
        icon: Search,
        color: '#3B82F6' // blue
    },
    {
        id: 'qualify',
        label: 'Qualify',
        description: 'Filter by ICP & tech stack',
        icon: Filter,
        color: '#8B5CF6' // purple
    },
    {
        id: 'enrich',
        label: 'Enrich',
        description: 'Find contacts & emails',
        icon: Users,
        color: '#10B981' // green
    },
    {
        id: 'compose',
        label: 'Compose',
        description: 'Generate personalized messages',
        icon: PenTool,
        color: '#F59E0B' // amber
    },
    {
        id: 'export',
        label: 'Export',
        description: 'Create SDR action sheet',
        icon: FileSpreadsheet,
        color: '#EF4444' // red
    }
];

// Create empty workflow run
function createEmptyWorkflowRun(name: string = 'New Campaign'): WorkflowRun {
    const now = new Date().toISOString();
    return {
        id: crypto.randomUUID(),
        name,
        createdAt: now,
        updatedAt: now,
        steps: {
            source: { status: 'pending' },
            qualify: { status: 'pending' },
            enrich: { status: 'pending' },
            compose: { status: 'pending' },
            export: { status: 'pending' }
        },
        currentStep: 'source',
        sourceData: { jobs: [], totalImported: 0 },
        qualifyData: { qualifiedJobs: [], disqualifiedJobs: [], qualificationReasons: {} },
        enrichData: { contacts: [], enrichmentStats: { fromJobPoster: 0, fromEnrichment: 0, failed: 0 } },
        composeData: { messages: [], approvedCount: 0 },
        exportData: { rows: [] },
        stats: { totalJobs: 0, qualifiedJobs: 0, totalContacts: 0, totalMessages: 0, readyToSend: 0 }
    };
}

interface NewWorkflowState {
    // Current workflow run
    currentRun: WorkflowRun | null;

    // History of runs
    runHistory: WorkflowRun[];

    // UI State
    mode: 'build' | 'run';
    selectedJobIds: string[];
    selectedContactIds: string[];
    selectedMessageIds: string[];

    // Actions
    setMode: (mode: 'build' | 'run') => void;

    // Workflow Actions
    createNewRun: (name?: string) => void;
    loadRun: (runId: string) => void;
    deleteRun: (runId: string) => void;
    renameRun: (name: string) => void;

    // Step Navigation
    setCurrentStep: (step: WorkflowStep) => void;
    goToNextStep: () => void;
    goToPrevStep: () => void;

    // Step Status
    updateStepStatus: (step: WorkflowStep, status: StepStatus, error?: string) => void;

    // Source Step
    addJobs: (jobs: JobPost[]) => void;
    removeJob: (jobId: string) => void;
    clearJobs: () => void;

    // Qualify Step
    qualifyJob: (jobId: string, qualified: boolean, reason?: string) => void;
    qualifyAllByTechStack: (techStack: string[], workLocation?: 'remote' | 'hybrid' | 'onsite' | 'any') => void;

    // Enrich Step
    addContacts: (contacts: Contact[]) => void;
    updateContact: (contactId: string, updates: Partial<Contact>) => void;

    // Compose Step
    addMessages: (messages: GeneratedMessage[]) => void;
    updateMessage: (messageId: string, updates: Partial<GeneratedMessage>) => void;
    approveMessage: (messageId: string) => void;
    approveAllMessages: () => void;

    // Export Step
    generateExportRows: () => void;
    markExported: (spreadsheetUrl?: string) => void;

    // Selection
    toggleJobSelection: (jobId: string) => void;
    selectAllJobs: () => void;
    clearJobSelection: () => void;

    // Reset
    resetCurrentRun: () => void;
}

export const useNewWorkflowStore = create<NewWorkflowState>()(
    persist(
        (set, get) => ({
            currentRun: null,
            runHistory: [],
            mode: 'build',
            selectedJobIds: [],
            selectedContactIds: [],
            selectedMessageIds: [],

            setMode: (mode) => set({ mode }),

            // Workflow Actions
            createNewRun: (name) => {
                const newRun = createEmptyWorkflowRun(name);
                set((state) => ({
                    currentRun: newRun,
                    runHistory: [newRun, ...state.runHistory].slice(0, 50), // Keep last 50 runs
                    selectedJobIds: [],
                    selectedContactIds: [],
                    selectedMessageIds: []
                }));
            },

            loadRun: (runId) => {
                const { runHistory } = get();
                const run = runHistory.find(r => r.id === runId);
                if (run) {
                    set({ currentRun: run });
                }
            },

            deleteRun: (runId) => {
                set((state) => ({
                    runHistory: state.runHistory.filter(r => r.id !== runId),
                    currentRun: state.currentRun?.id === runId ? null : state.currentRun
                }));
            },

            renameRun: (name) => {
                set((state) => {
                    if (!state.currentRun) return state;
                    const updated = { ...state.currentRun, name, updatedAt: new Date().toISOString() };
                    return {
                        currentRun: updated,
                        runHistory: state.runHistory.map(r => r.id === updated.id ? updated : r)
                    };
                });
            },

            // Step Navigation
            setCurrentStep: (step) => {
                set((state) => {
                    if (!state.currentRun) return state;
                    return {
                        currentRun: { ...state.currentRun, currentStep: step }
                    };
                });
            },

            goToNextStep: () => {
                const { currentRun } = get();
                if (!currentRun) return;

                const stepOrder: WorkflowStep[] = ['source', 'qualify', 'enrich', 'compose', 'export'];
                const currentIndex = stepOrder.indexOf(currentRun.currentStep);
                if (currentIndex < stepOrder.length - 1) {
                    set({
                        currentRun: { ...currentRun, currentStep: stepOrder[currentIndex + 1] }
                    });
                }
            },

            goToPrevStep: () => {
                const { currentRun } = get();
                if (!currentRun) return;

                const stepOrder: WorkflowStep[] = ['source', 'qualify', 'enrich', 'compose', 'export'];
                const currentIndex = stepOrder.indexOf(currentRun.currentStep);
                if (currentIndex > 0) {
                    set({
                        currentRun: { ...currentRun, currentStep: stepOrder[currentIndex - 1] }
                    });
                }
            },

            // Step Status
            updateStepStatus: (step, status, error) => {
                set((state) => {
                    if (!state.currentRun) return state;
                    const now = new Date().toISOString();
                    const stepUpdate = {
                        ...state.currentRun.steps[step],
                        status,
                        error,
                        ...(status === 'running' && { startedAt: now }),
                        ...(status === 'completed' && { completedAt: now })
                    };
                    return {
                        currentRun: {
                            ...state.currentRun,
                            steps: { ...state.currentRun.steps, [step]: stepUpdate },
                            updatedAt: now
                        }
                    };
                });
            },

            // Source Step
            addJobs: (jobs) => {
                set((state) => {
                    if (!state.currentRun) return state;
                    const existingIds = new Set(state.currentRun.sourceData.jobs.map(j => j.id));
                    const newJobs = jobs.filter(j => !existingIds.has(j.id));
                    const allJobs = [...state.currentRun.sourceData.jobs, ...newJobs];
                    const updatedRun = {
                        ...state.currentRun,
                        sourceData: { jobs: allJobs, totalImported: allJobs.length },
                        stats: { ...state.currentRun.stats, totalJobs: allJobs.length },
                        updatedAt: new Date().toISOString()
                    };
                    return {
                        currentRun: updatedRun,
                        runHistory: state.runHistory.map(r => r.id === updatedRun.id ? updatedRun : r)
                    };
                });
            },

            removeJob: (jobId) => {
                set((state) => {
                    if (!state.currentRun) return state;
                    const jobs = state.currentRun.sourceData.jobs.filter(j => j.id !== jobId);
                    return {
                        currentRun: {
                            ...state.currentRun,
                            sourceData: { jobs, totalImported: jobs.length },
                            stats: { ...state.currentRun.stats, totalJobs: jobs.length },
                            updatedAt: new Date().toISOString()
                        }
                    };
                });
            },

            clearJobs: () => {
                set((state) => {
                    if (!state.currentRun) return state;
                    return {
                        currentRun: {
                            ...state.currentRun,
                            sourceData: { jobs: [], totalImported: 0 },
                            stats: { ...state.currentRun.stats, totalJobs: 0 },
                            updatedAt: new Date().toISOString()
                        }
                    };
                });
            },

            // Qualify Step
            qualifyJob: (jobId, qualified, reason) => {
                set((state) => {
                    if (!state.currentRun) return state;
                    const job = state.currentRun.sourceData.jobs.find(j => j.id === jobId);
                    if (!job) return state;

                    let qualifiedJobs = [...state.currentRun.qualifyData.qualifiedJobs];
                    let disqualifiedJobs = [...state.currentRun.qualifyData.disqualifiedJobs];
                    const reasons = { ...state.currentRun.qualifyData.qualificationReasons };

                    // Remove from both lists first
                    qualifiedJobs = qualifiedJobs.filter(j => j.id !== jobId);
                    disqualifiedJobs = disqualifiedJobs.filter(j => j.id !== jobId);

                    // Add to appropriate list
                    if (qualified) {
                        qualifiedJobs.push(job);
                        reasons[jobId] = reason || 'Manually qualified';
                    } else {
                        disqualifiedJobs.push(job);
                        reasons[jobId] = reason || 'Manually disqualified';
                    }

                    return {
                        currentRun: {
                            ...state.currentRun,
                            qualifyData: { qualifiedJobs, disqualifiedJobs, qualificationReasons: reasons },
                            stats: { ...state.currentRun.stats, qualifiedJobs: qualifiedJobs.length },
                            updatedAt: new Date().toISOString()
                        }
                    };
                });
            },

            qualifyAllByTechStack: (requiredTechStack, workLocation = 'any') => {
                set((state) => {
                    if (!state.currentRun) return state;

                    const qualifiedJobs: JobPost[] = [];
                    const disqualifiedJobs: JobPost[] = [];
                    const reasons: Record<string, string> = {};

                    state.currentRun.sourceData.jobs.forEach(job => {
                        const jobTech = job.techStack || [];
                        const hasMatch = requiredTechStack.some(tech =>
                            jobTech.some(jt => jt.toLowerCase().includes(tech.toLowerCase()))
                        );

                        // Check work location preference
                        let locationMatch = true;
                        let locationReason = '';

                        if (workLocation === 'remote') {
                            // Only remote jobs qualify
                            locationMatch = job.isRemote === true;
                            if (!locationMatch) {
                                locationReason = 'Not remote';
                            }
                        } else if (workLocation === 'hybrid') {
                            // Remote or hybrid jobs qualify
                            locationMatch = job.isRemote === true ||
                                (job.location?.toLowerCase().includes('hybrid') ?? false);
                            if (!locationMatch) {
                                locationReason = 'Not remote or hybrid';
                            }
                        }
                        // 'onsite' and 'any' accept all locations

                        if (hasMatch && locationMatch) {
                            qualifiedJobs.push(job);
                            const matchedTech = jobTech.filter(t =>
                                requiredTechStack.some(rt => t.toLowerCase().includes(rt.toLowerCase()))
                            ).join(', ');
                            reasons[job.id] = `Matches: ${matchedTech}${job.isRemote ? ' (Remote ✓)' : ''}`;
                        } else {
                            disqualifiedJobs.push(job);
                            if (!hasMatch && !locationMatch) {
                                reasons[job.id] = `No tech match & ${locationReason}`;
                            } else if (!hasMatch) {
                                reasons[job.id] = 'No tech stack match';
                            } else {
                                reasons[job.id] = locationReason;
                            }
                        }
                    });

                    return {
                        currentRun: {
                            ...state.currentRun,
                            qualifyData: { qualifiedJobs, disqualifiedJobs, qualificationReasons: reasons },
                            stats: { ...state.currentRun.stats, qualifiedJobs: qualifiedJobs.length },
                            updatedAt: new Date().toISOString()
                        }
                    };
                });
            },

            // Enrich Step
            addContacts: (contacts) => {
                set((state) => {
                    if (!state.currentRun) return state;
                    const existingIds = new Set(state.currentRun.enrichData.contacts.map(c => c.id));
                    const newContacts = contacts.filter(c => !existingIds.has(c.id));
                    const allContacts = [...state.currentRun.enrichData.contacts, ...newContacts];

                    // Update stats
                    const fromJobPoster = allContacts.filter(c => c.source === 'job_poster').length;
                    const fromEnrichment = allContacts.filter(c => c.source.startsWith('enrichment')).length;

                    return {
                        currentRun: {
                            ...state.currentRun,
                            enrichData: {
                                contacts: allContacts,
                                enrichmentStats: { fromJobPoster, fromEnrichment, failed: 0 }
                            },
                            stats: { ...state.currentRun.stats, totalContacts: allContacts.length },
                            updatedAt: new Date().toISOString()
                        }
                    };
                });
            },

            updateContact: (contactId, updates) => {
                set((state) => {
                    if (!state.currentRun) return state;
                    const contacts = state.currentRun.enrichData.contacts.map(c =>
                        c.id === contactId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
                    );
                    return {
                        currentRun: {
                            ...state.currentRun,
                            enrichData: { ...state.currentRun.enrichData, contacts },
                            updatedAt: new Date().toISOString()
                        }
                    };
                });
            },

            // Compose Step
            addMessages: (messages) => {
                set((state) => {
                    if (!state.currentRun) return state;
                    const existingIds = new Set(state.currentRun.composeData.messages.map(m => m.id));
                    const newMessages = messages.filter(m => !existingIds.has(m.id));
                    const allMessages = [...state.currentRun.composeData.messages, ...newMessages];
                    return {
                        currentRun: {
                            ...state.currentRun,
                            composeData: {
                                messages: allMessages,
                                approvedCount: allMessages.filter(m => m.status === 'approved').length
                            },
                            stats: { ...state.currentRun.stats, totalMessages: allMessages.length },
                            updatedAt: new Date().toISOString()
                        }
                    };
                });
            },

            updateMessage: (messageId, updates) => {
                set((state) => {
                    if (!state.currentRun) return state;
                    const messages = state.currentRun.composeData.messages.map(m =>
                        m.id === messageId ? { ...m, ...updates } : m
                    );
                    return {
                        currentRun: {
                            ...state.currentRun,
                            composeData: {
                                messages,
                                approvedCount: messages.filter(m => m.status === 'approved').length
                            },
                            updatedAt: new Date().toISOString()
                        }
                    };
                });
            },

            approveMessage: (messageId) => {
                const { updateMessage } = get();
                updateMessage(messageId, { status: 'approved' });
            },

            approveAllMessages: () => {
                set((state) => {
                    if (!state.currentRun) return state;
                    const messages = state.currentRun.composeData.messages.map(m => ({
                        ...m,
                        status: 'approved' as const
                    }));
                    return {
                        currentRun: {
                            ...state.currentRun,
                            composeData: { messages, approvedCount: messages.length },
                            updatedAt: new Date().toISOString()
                        }
                    };
                });
            },

            // Export Step
            generateExportRows: () => {
                set((state) => {
                    if (!state.currentRun) return state;

                    const { contacts } = state.currentRun.enrichData;
                    const { messages } = state.currentRun.composeData;
                    const { qualifiedJobs } = state.currentRun.qualifyData;

                    const rows: ExportRow[] = [];

                    messages.filter(m => m.status === 'approved').forEach(message => {
                        const contact = contacts.find(c => c.id === message.contactId);
                        const job = qualifiedJobs.find(j => j.id === message.jobId);

                        if (contact && job) {
                            rows.push({
                                status: '🔵 Ready',
                                priority: contact.source === 'job_poster' ? '⭐ High' : 'Medium',
                                sequenceStep: message.sequenceStep === '1st_touch' ? '1st Touch' :
                                    message.sequenceStep === '2nd_followup' ? '2nd Follow-up' :
                                        message.sequenceStep === '3rd_followup' ? '3rd Follow-up' : 'Final Touch',
                                channel: message.channel === 'linkedin' ? 'LinkedIn' :
                                    message.channel === 'email' ? 'Email' : 'LI+Email',
                                contactName: contact.name,
                                contactTitle: contact.title,
                                company: contact.company,
                                linkedInUrl: contact.linkedInUrl || '',
                                email: contact.email || '',
                                jobTitle: job.title,
                                techStack: (job.techStack || []).join(', '),
                                message: message.message,
                                personalizationNotes: message.personalizationFacts.join('; '),
                                jobPostUrl: job.jobUrl,
                                suggestedSendDate: message.suggestedSendDate
                            });
                        }
                    });

                    return {
                        currentRun: {
                            ...state.currentRun,
                            exportData: { rows, exportedAt: undefined, spreadsheetUrl: undefined },
                            stats: { ...state.currentRun.stats, readyToSend: rows.length },
                            updatedAt: new Date().toISOString()
                        }
                    };
                });
            },

            markExported: (spreadsheetUrl) => {
                set((state) => {
                    if (!state.currentRun) return state;
                    return {
                        currentRun: {
                            ...state.currentRun,
                            exportData: {
                                ...state.currentRun.exportData,
                                exportedAt: new Date().toISOString(),
                                spreadsheetUrl
                            },
                            updatedAt: new Date().toISOString()
                        }
                    };
                });
            },

            // Selection
            toggleJobSelection: (jobId) => {
                set((state) => ({
                    selectedJobIds: state.selectedJobIds.includes(jobId)
                        ? state.selectedJobIds.filter(id => id !== jobId)
                        : [...state.selectedJobIds, jobId]
                }));
            },

            selectAllJobs: () => {
                set((state) => ({
                    selectedJobIds: state.currentRun?.sourceData.jobs.map(j => j.id) || []
                }));
            },

            clearJobSelection: () => {
                set({ selectedJobIds: [] });
            },

            // Reset
            resetCurrentRun: () => {
                const { currentRun } = get();
                if (currentRun) {
                    const reset = createEmptyWorkflowRun(currentRun.name);
                    reset.id = currentRun.id; // Keep same ID
                    set((state) => ({
                        currentRun: reset,
                        runHistory: state.runHistory.map(r => r.id === reset.id ? reset : r),
                        selectedJobIds: [],
                        selectedContactIds: [],
                        selectedMessageIds: []
                    }));
                }
            }
        }),
        {
            name: 'outreach-workflow-v2',
            partialize: (state) => ({
                currentRun: state.currentRun,
                runHistory: state.runHistory,
                mode: state.mode
            })
        }
    )
);
