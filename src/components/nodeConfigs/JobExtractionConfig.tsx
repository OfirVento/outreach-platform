import { useWorkflowStore } from '../../store/workflowStore';
import { useMemo, useState } from 'react';
import {
    FileText,
    CheckCircle2,
    AlertCircle,
    User,
    Building2,
    MapPin,
    Calendar,
    Link as LinkIcon,
    ChevronRight,
    Search,
    Database,
    Code
} from 'lucide-react';
import { clsx } from 'clsx';

interface JobExtractionConfigProps {
    nodeId: string;
}

export default function JobExtractionConfig({ nodeId }: JobExtractionConfigProps) {
    const { nodes, updateNode, mode, edges } = useWorkflowStore();
    const node = nodes.find((n) => n.id === nodeId);
    const [selectedJobIndex, setSelectedJobIndex] = useState<number | null>(null);
    const [showRaw, setShowRaw] = useState(false);

    const previousNode = useMemo(() => {
        const incomingEdge = edges.find((e) => e.target === nodeId);
        if (incomingEdge) {
            return nodes.find((n) => n.id === incomingEdge.source);
        }
        return null;
    }, [edges, nodes, nodeId]);

    const previousNodeOutput = previousNode?.data.output;

    const extractDescription = (job: any) => {
        const description = job.description || job.full_description || job.job_description || '';
        if (description) return description;
        const descKey = Object.keys(job).find(k => k.toLowerCase().includes('description'));
        return descKey ? job[descKey] : '';
    };

    const getPosterName = (job: any) => {
        return job.posterFullName || job.poster_name || job.posterName || job.posted_by || job.author || job.poster || '';
    };

    const handleTest = () => {
        let sourceJobs = previousNodeOutput?.jobs;

        // Mock data fallback for verification
        if (!sourceJobs) {
            sourceJobs = [
                {
                    title: "Senior Frontend Engineer",
                    company: "TechFlow Systems",
                    location: "Remote",
                    description: "We are looking for a React expert to build our next-gen workflow engine. Must have 5+ years of experience with TypeScript and Tailwind.",
                    posterFullName: "Sarah Chen"
                },
                {
                    title: "Product Designer",
                    company: "DesignCo",
                    location: "San Francisco, CA",
                    description: "Lead our design system initiative. Proficiency in Figma and design-to-code workflows required.",
                    posterFullName: "James Wilson"
                },
                {
                    title: "Backend Architect",
                    company: "ScaleGrid",
                    location: "Austin, TX",
                    description: "Own the architecture of our distributed processing pipeline. Go, Kubernetes, and gRPC experience wanted.",
                    posterFullName: "Elena Rodriguez"
                }
            ];
        }

        const processedJobs = sourceJobs.map((job: any) => {
            const description = extractDescription(job);
            const posterName = getPosterName(job);

            return {
                ...job,
                full_description: description,
                poster_name: posterName,
                has_description: !!description && description.length > 50,
                has_poster_name: !!posterName && posterName.trim().length > 0
            };
        });

        const jobsWithDescription = processedJobs.filter((j: any) => j.has_description && j.has_poster_name);

        const mockOutput = {
            status: 'ok',
            jobs_processed: processedJobs.length,
            jobs_filtered_qualified: jobsWithDescription.length,
            jobs: jobsWithDescription,
            all_processed_jobs: processedJobs
        };

        updateNode(nodeId, {
            data: {
                ...node!.data,
                output: mockOutput,
                status: 'completed',
            },
        });
    };

    const selectedJob = selectedJobIndex !== null
        ? (node?.data.output?.all_processed_jobs || node?.data.output?.jobs)?.[selectedJobIndex]
        : null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Structured Job Extraction</h3>
                        <p className="text-[10px] text-gray-500 font-medium">Extracting metadata from scraping results</p>
                    </div>
                </div>
                {mode === 'build' && (
                    <button
                        onClick={handleTest}
                        className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
                    >
                        <Search className="w-3.5 h-3.5" />
                        Execute Extraction
                    </button>
                )}
            </div>

            {/* Input Status Handling */}
            {!previousNode ? (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 italic">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-800">Please connect a LinkedIn Scrape node as input.</p>
                </div>
            ) : !previousNodeOutput ? (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex gap-3 italic">
                    <Database className="w-5 h-5 text-gray-400 shrink-0" />
                    <p className="text-xs text-gray-500 font-medium">Waiting for data from {previousNode.data.label}...</p>
                </div>
            ) : (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white rounded shadow-sm text-blue-600">
                            <Database className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">Input Stream Active</span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700">
                        {previousNodeOutput.jobs_scraped} raw jobs available
                    </span>
                </div>
            )}

            {/* Extraction Results */}
            {node?.data.output && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                    {/* Left: Job List Recap */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Scanned Records</span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                                {node.data.output.jobs_filtered_qualified} Qualified
                            </span>
                        </div>

                        <div className="max-h-[600px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {(node.data.output.all_processed_jobs || node.data.output.jobs).map((job: any, index: number) => {
                                const isQualified = job.has_description && job.has_poster_name;
                                const isSelected = selectedJobIndex === index;
                                return (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedJobIndex(index)}
                                        className={clsx(
                                            "w-full text-left p-3 rounded-xl border transition-all group",
                                            isSelected
                                                ? "bg-purple-50 border-purple-200 ring-2 ring-purple-100"
                                                : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-1.5">
                                            <h4 className={clsx("text-xs font-bold leading-tight line-clamp-1", isSelected ? "text-purple-900" : "text-gray-900")}>
                                                {job.title}
                                            </h4>
                                            {isQualified ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertCircle className="w-3 h-3 text-amber-500" />}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                                            <Building2 className="w-3 h-3" />
                                            <span>{job.company}</span>
                                            {job.location && (
                                                <>
                                                    <span className="text-gray-300">|</span>
                                                    <MapPin className="w-3 h-3" />
                                                    <span>{job.location}</span>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Detailed Structured View */}
                    <div className="space-y-4">
                        {selectedJob ? (
                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm animate-in zoom-in-95 duration-200">
                                {/* Detail Header */}
                                <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[8px] font-black uppercase rounded tracking-widest">
                                            Analysis Preview
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowRaw(!showRaw)}
                                        className="text-[10px] font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1.5 uppercase transition-colors"
                                    >
                                        <Code className="w-3 h-3" />
                                        {showRaw ? 'Hide JSON' : 'Raw Data'}
                                    </button>
                                </div>

                                {showRaw ? (
                                    <div className="p-4 bg-gray-900 overflow-hidden">
                                        <pre className="text-[10px] text-emerald-400 font-mono overflow-auto max-h-[500px] leading-relaxed">
                                            {JSON.stringify(selectedJob, null, 2)}
                                        </pre>
                                    </div>
                                ) : (
                                    <div className="p-6 space-y-6">
                                        {/* Primary Stats */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Job Category</label>
                                                <p className="text-xs font-bold text-gray-900">{selectedJob.title}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Company Branding</label>
                                                <p className="text-xs font-bold text-gray-900">{selectedJob.company}</p>
                                            </div>
                                        </div>

                                        {/* Poster Metadata */}
                                        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 text-indigo-600" />
                                                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Author Intelligence</span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[11px]">
                                                    <span className="text-indigo-700/70">Full Name</span>
                                                    <span className="font-bold text-indigo-900">{selectedJob.poster_name || 'Anonymous User'}</span>
                                                </div>
                                                {selectedJob.poster_title && (
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-indigo-700/70">Position</span>
                                                        <span className="font-bold text-indigo-900 italic">{selectedJob.poster_title}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Structured Description */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deep Content Analysis</span>
                                            </div>
                                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                <p className="text-[11px] text-gray-600 leading-relaxed font-medium line-clamp-[12]">
                                                    {selectedJob.full_description || "No extensive description data found for this entry."}
                                                </p>
                                            </div>
                                        </div>

                                        {/* External Links */}
                                        {selectedJob.url && (
                                            <a
                                                href={selectedJob.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-purple-300 hover:text-purple-600 transition-all group"
                                            >
                                                <span className="text-[10px] font-bold uppercase tracking-widest">View Original Source</span>
                                                <LinkIcon className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 p-8 text-center">
                                <Search className="w-10 h-10 text-gray-300 mb-4" />
                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Metadata Selection</h4>
                                <p className="text-xs text-gray-500 max-w-[200px] leading-relaxed">Select a scanned job from the list to view its structured analysis and raw extraction data.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
