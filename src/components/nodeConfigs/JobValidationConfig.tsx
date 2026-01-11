"use client";
import { useState, useMemo, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, BrainCircuit, Key, MessageSquare, Zap, XCircle, ChevronDown, ChevronUp, Filter, Info, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

interface JobValidationConfigProps {
    nodeId: string;
}

const STORAGE_KEY = 'outreach_workflow_job_validation_config';

export default function JobValidationConfig({ nodeId }: JobValidationConfigProps) {
    const { nodes, updateNode, mode, edges } = useWorkflowStore();
    const node = nodes.find((n) => n.id === nodeId);
    const config = node?.data.config || {};

    // UI state
    const [filter, setFilter] = useState<'all' | 'qualified' | 'disqualified'>('all');
    const [expandedJobIds, setExpandedJobIds] = useState<Set<number>>(new Set());

    // Load saved config
    const loadSavedConfig = () => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch { }
        return null;
    };

    const savedConfig = loadSavedConfig();

    const [geminiApiKey, setGeminiApiKey] = useState(
        savedConfig?.geminiApiKey || config.geminiApiKey || ''
    );
    const [geminiModel, setGeminiModel] = useState(
        savedConfig?.geminiModel || config.geminiModel || 'gemini-1.5-flash-latest'
    );
    const [prompt, setPrompt] = useState(
        savedConfig?.prompt || config.prompt || 'Is this job qualified for our offering? Check if the company is hiring for engineering roles and has >50 employees.'
    );

    const [isValidating, setIsValidating] = useState(false);
    const [validationProgress, setValidationProgress] = useState({ current: 0, total: 0 });

    const models = [
        { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash (Latest)', desc: 'Speed & Efficiency' },
        { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro (Latest)', desc: 'Complex Reasoning' },
        { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Exp)', desc: 'Next-gen Performance' },
    ];

    // Auto-save settings
    useEffect(() => {
        if (typeof window !== 'undefined' && (geminiApiKey || prompt || geminiModel)) {
            const newConfig = { geminiApiKey, prompt, geminiModel };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));

            if (node) {
                updateNode(nodeId, {
                    data: {
                        ...node.data,
                        config: {
                            ...node.data.config,
                            ...newConfig
                        }
                    }
                });
            }
        }
    }, [geminiApiKey, prompt, geminiModel, nodeId]);

    const previousNode = useMemo(() => {
        const incomingEdge = edges.find((e) => e.target === nodeId);
        if (incomingEdge) {
            return nodes.find((n) => n.id === incomingEdge.source);
        }
        return null;
    }, [edges, nodes, nodeId]);

    const previousNodeOutput = previousNode?.data.output;

    const toggleJobExpansion = (idx: number) => {
        const newSet = new Set(expandedJobIds);
        if (newSet.has(idx)) newSet.delete(idx);
        else newSet.add(idx);
        setExpandedJobIds(newSet);
    };

    const cleanJsonResponse = (text: string) => {
        // Remove markdown formatting if present
        let clean = text.trim();
        if (clean.startsWith('```json')) {
            clean = clean.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (clean.startsWith('```')) {
            clean = clean.replace(/^```/, '').replace(/```$/, '').trim();
        }
        return clean;
    };

    const handleValidate = async () => {
        const sourceJobs = previousNodeOutput?.jobs || [];

        if (sourceJobs.length === 0) {
            console.error("No jobs found in previous node output.");
            updateNode(nodeId, {
                data: {
                    ...node!.data,
                    error: "No jobs available for validation. Please run the Job Extraction step first."
                }
            });
            return;
        }

        if (!geminiApiKey) {
            alert("Please provide a Gemini API Key in the Build tab.");
            return;
        }

        setIsValidating(true);
        setValidationProgress({ current: 0, total: sourceJobs.length });

        const validatedJobs = [];

        for (let i = 0; i < sourceJobs.length; i++) {
            const job = sourceJobs[i];
            setValidationProgress({ current: i + 1, total: sourceJobs.length });

            try {
                const systemPrompt = `Act as a recruitment lead qualifier. Based on the provided qualification criteria and job details, determine if this job is a good fit. 
                
                RESPONSE FORMAT:
                Return ONLY a valid JSON object with the following keys:
                {
                  "is_qualified": boolean,
                  "qualification_reason": "A brief explanation of why this was qualified or disqualified",
                  "score": number (0 to 1)
                }`;

                const userPromptText = `QUALIFICATION CRITERIA:
                ${prompt}

                JOB DETAILS:
                Title: ${job.title}
                Company: ${job.company}
                Location: ${job.location || 'N/A'}
                Description: ${job.description || 'No description provided.'}`;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: `${systemPrompt}\n\n${userPromptText}` }]
                        }],
                        generationConfig: {
                            response_mime_type: "application/json"
                        }
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || 'Failed to call Gemini API');
                }

                const data = await response.json();
                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!rawText) throw new Error("Empty response from AI");

                const cleanText = cleanJsonResponse(rawText);
                const aiResponse = JSON.parse(cleanText);

                validatedJobs.push({
                    ...job,
                    is_qualified: !!aiResponse.is_qualified,
                    qualification_score: aiResponse.score || 0,
                    qualification_reason: aiResponse.qualification_reason || "No reasoning provided."
                });

            } catch (err: any) {
                console.error(`Error validating job ${i + 1}:`, err);
                validatedJobs.push({
                    ...job,
                    is_qualified: false,
                    qualification_score: 0,
                    qualification_reason: `AI Failure: ${err.message}`
                });
            }
        }

        setIsValidating(false);

        const output = {
            status: 'ok',
            jobs_processed: validatedJobs.length,
            jobs_qualified: validatedJobs.filter(j => j.is_qualified).length,
            jobs: validatedJobs,
            timestamp: new Date().toISOString()
        };

        updateNode(nodeId, {
            data: {
                ...node!.data,
                output,
                status: 'completed',
                error: undefined
            }
        });
    };

    const filteredJobs = useMemo(() => {
        const jobs = node?.data.output?.jobs || [];
        if (filter === 'all') return jobs;
        if (filter === 'qualified') return jobs.filter((j: any) => j.is_qualified);
        if (filter === 'disqualified') return jobs.filter((j: any) => !j.is_qualified);
        return jobs;
    }, [node?.data.output?.jobs, filter]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">AI Job Validation</h3>
                        <p className="text-[10px] text-gray-500 font-medium">Qualifying leads via Google Gemini</p>
                    </div>
                </div>
                {mode === 'build' && (
                    <button
                        onClick={handleValidate}
                        disabled={isValidating || !geminiApiKey}
                        className={clsx(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                            isValidating || !geminiApiKey
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                        )}
                    >
                        {isValidating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        Run Validation
                    </button>
                )}
            </div>

            {mode === 'build' ? (
                <div className="space-y-6">
                    {/* Build View: Settings */}
                    <div className="space-y-4">
                        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                        <Key className="w-3 h-3" />
                                        Gemini API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={geminiApiKey}
                                        onChange={(e) => setGeminiApiKey(e.target.value)}
                                        placeholder="sk-..."
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <BrainCircuit className="w-3 h-3" />
                                            Model selection
                                        </label>
                                        <button
                                            onClick={async () => {
                                                if (!geminiApiKey) return alert("API Key required");
                                                try {
                                                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
                                                    const data = await res.json();
                                                    console.log("Available Gemini Models:", data);
                                                    alert(`Found ${data.models?.length || 0} models. Check console for list.`);
                                                } catch (e: any) {
                                                    alert("ListModels failed: " + e.message);
                                                }
                                            }}
                                            className="text-[9px] font-bold text-blue-500 hover:text-blue-600 underline"
                                        >
                                            Check Availability
                                        </button>
                                    </div>
                                    <select
                                        value={geminiModel}
                                        onChange={(e) => setGeminiModel(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                    >
                                        {models.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    <MessageSquare className="w-3 h-3" />
                                    Qualification Prompt
                                </label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Define what makes a job 'Qualified'..."
                                    className="w-full h-32 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                />
                                <p className="mt-2 text-[10px] text-gray-500 italic">
                                    Tip: Be specific about company size, industry, or job seniority.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Run View: Progress & Results */}
                    {isValidating ? (
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                                <BrainCircuit className="w-6 h-6 text-blue-600 absolute inset-0 m-auto" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-blue-900">AI Analysis in Progress</h4>
                                <p className="text-xs text-blue-700 mt-1">
                                    Validating record {validationProgress.current} of {validationProgress.total}...
                                </p>
                            </div>
                        </div>
                    ) : node?.data.output ? (
                        <div className="space-y-6">
                            {/* Stats Summary */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setFilter('qualified')}
                                    className={clsx(
                                        "p-4 border rounded-2xl transition-all text-center",
                                        filter === 'qualified' ? "bg-emerald-50 border-emerald-200 shadow-sm" : "bg-white border-gray-100 hover:border-emerald-100"
                                    )}
                                >
                                    <span className="text-2xl font-black text-emerald-600">{node.data.output.jobs_qualified}</span>
                                    <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mt-1">Qualified</p>
                                </button>
                                <button
                                    onClick={() => setFilter('disqualified')}
                                    className={clsx(
                                        "p-4 border rounded-2xl transition-all text-center",
                                        filter === 'disqualified' ? "bg-red-50 border-red-200 shadow-sm" : "bg-white border-gray-100 hover:border-red-100"
                                    )}
                                >
                                    <span className="text-2xl font-black text-red-600">{node.data.output.jobs_processed - node.data.output.jobs_qualified}</span>
                                    <p className="text-[10px] font-bold text-red-800 uppercase tracking-widest mt-1">Disqualified</p>
                                </button>
                            </div>

                            {/* Filters & Header */}
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AI Validation Answers</h4>
                                </div>
                                {filter !== 'all' && (
                                    <button
                                        onClick={() => setFilter('all')}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                                    >
                                        Show All
                                    </button>
                                )}
                            </div>

                            {/* Job List */}
                            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredJobs.length === 0 ? (
                                    <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-xs text-gray-500">No {filter !== 'all' ? filter : 'jobs'} to display.</p>
                                    </div>
                                ) : filteredJobs.map((job: any, i: number) => {
                                    const actualIdx = node.data.output.jobs.indexOf(job);
                                    const isExpanded = expandedJobIds.has(actualIdx);

                                    return (
                                        <div
                                            key={actualIdx}
                                            className={clsx(
                                                "group border rounded-2xl transition-all overflow-hidden",
                                                isExpanded ? "border-blue-200 shadow-md bg-white" : "border-gray-100 bg-white hover:border-blue-100"
                                            )}
                                        >
                                            <div
                                                onClick={() => toggleJobExpansion(actualIdx)}
                                                className="flex items-center justify-between p-4 cursor-pointer"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={clsx(
                                                        "w-1.5 h-10 rounded-full",
                                                        job.is_qualified ? "bg-emerald-500" : "bg-red-500"
                                                    )} />
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate max-w-[200px]">{job.title}</p>
                                                        <p className="text-[11px] text-gray-500 font-medium">{job.company}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {job.is_qualified ? (
                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span className="text-[10px] font-bold uppercase tracking-wide">Pass</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full">
                                                            <XCircle className="w-3 h-3" />
                                                            <span className="text-[10px] font-bold uppercase tracking-wide">Fail</span>
                                                        </div>
                                                    )}
                                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="px-12 pb-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                    <div className="h-px bg-gray-100" />
                                                    <div className="space-y-3">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <BrainCircuit className="w-3.5 h-3.5 text-blue-500" />
                                                                <h5 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">AI Reasoning</h5>
                                                            </div>
                                                            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-50">
                                                                <p className="text-xs text-gray-700 leading-relaxed font-medium">
                                                                    {job.qualification_reason}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between text-[10px] font-bold">
                                                            <span className="text-gray-400 uppercase tracking-widest">Confidence Score</span>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={clsx(
                                                                            "h-full rounded-full transition-all duration-1000",
                                                                            job.qualification_score > 0.7 ? "bg-emerald-500" : job.qualification_score > 0.4 ? "bg-yellow-500" : "bg-red-500"
                                                                        )}
                                                                        style={{ width: `${job.qualification_score * 100}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-gray-700 w-8">{(job.qualification_score * 100).toFixed(0)}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-4">
                                <ShieldCheck className="w-8 h-8 text-gray-300" />
                            </div>
                            <h4 className="text-sm font-bold text-gray-900 mb-1">Queue Ready</h4>
                            <p className="text-xs text-gray-500 max-w-[240px] leading-relaxed">
                                {node?.data.error ? (
                                    <span className="text-red-500 font-medium">{node.data.error}</span>
                                ) : "Wait for the Job Extraction step to finish, then run validation to qualify leads."}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
