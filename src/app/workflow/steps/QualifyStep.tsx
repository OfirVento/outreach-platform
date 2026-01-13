'use client';

import { useState } from 'react';
import { useNewWorkflowStore } from '../../../store/newWorkflowStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { qualifyJobsWithGemini, type QualificationResult } from '../../../lib/gemini';
import type { JobPost } from '../../../types';
import {
    Filter,
    Check,
    X,
    Sparkles,
    ChevronDown,
    ChevronUp,
    Building2,
    Code2,
    Users,
    User,
    MapPin,
    Calendar,
    AlertCircle,
    CheckCircle,
    XCircle,
    Bot,
    Loader2
} from 'lucide-react';

export default function QualifyStep() {
    const { currentRun, qualifyJob, updateStepStatus, goToNextStep, addJobs } = useNewWorkflowStore();
    const { businessContext, integrations, prompts } = useSettingsStore();
    const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
    const [isAIQualifying, setIsAIQualifying] = useState(false);
    const [aiProgress, setAiProgress] = useState<{ current: number; total: number } | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    const jobs = currentRun?.sourceData.jobs || [];
    const qualifiedJobs = currentRun?.qualifyData.qualifiedJobs || [];
    const disqualifiedJobs = currentRun?.qualifyData.disqualifiedJobs || [];
    const reasons = currentRun?.qualifyData.qualificationReasons || {};

    const unprocessedJobs = jobs.filter(j =>
        !qualifiedJobs.some(qj => qj.id === j.id) &&
        !disqualifiedJobs.some(dj => dj.id === j.id)
    );

    // Sort jobs: Remote first, then Hybrid, then On-site, then unknown
    const sortedJobs = [...jobs].sort((a, b) => {
        const locationOrder = { remote: 0, hybrid: 1, onsite: 2, unknown: 3 };
        const reasonA = reasons[a.id] || '';
        const reasonB = reasons[b.id] || '';

        // Extract work location from reason or from isRemote flag
        const getLocationPriority = (job: typeof a, reason: string): number => {
            if (reason.includes('remote (from') || job.isRemote) return locationOrder.remote;
            if (reason.includes('hybrid (from')) return locationOrder.hybrid;
            if (reason.includes('onsite (from')) return locationOrder.onsite;
            return locationOrder.unknown;
        };

        return getLocationPriority(a, reasonA) - getLocationPriority(b, reasonB);
    });

    // Get configured tech stack
    const configuredTechStack = Object.values(businessContext.techStack).flat();

    const handleAIQualify = async () => {
        const apiKey = integrations.gemini.apiKey;

        if (!apiKey) {
            setAiError('Please configure your Gemini API key in Settings');
            return;
        }

        setIsAIQualifying(true);
        setAiError(null);
        setAiProgress({ current: 0, total: jobs.length });

        try {
            // Call Gemini API to qualify jobs (work location + tech match only)
            const results = await qualifyJobsWithGemini(
                jobs,
                apiKey,
                integrations.gemini.model || 'gemini-2.5-flash',
                {
                    techStack: configuredTechStack,
                    workLocation: businessContext.qualification.workLocation,
                    posterRequired: businessContext.qualification.posterRequired || 'any',
                    companyName: businessContext.companyName,
                    companyDescription: businessContext.whatWeDo
                },
                prompts.qualify
            );

            // Process results and update the store
            const newQualifiedJobs: JobPost[] = [];
            const newDisqualifiedJobs: JobPost[] = [];
            const newReasons: Record<string, string> = {};
            const updatedJobs: JobPost[] = [];

            // Helper for weighted scoring
            const calculateMatchScore = (jobSkills: string[], mySkills: string[]) => {
                if (!jobSkills || jobSkills.length === 0) return { score: 0, percentage: 0 };

                const mySkillsLower = new Set(mySkills.map(s => s.toLowerCase()));
                let totalPossibleWeight = 0;
                let earnedScore = 0;

                jobSkills.forEach((skill, index) => {
                    // Weight: first 3 items (critical) get weight 2, others 1
                    const weight = index < 3 ? 2 : 1;
                    totalPossibleWeight += weight;

                    // Check for match (fuzzy)
                    const skillLower = skill.toLowerCase();
                    const isMatch = Array.from(mySkillsLower).some(mySkill =>
                        skillLower.includes(mySkill) || mySkill.includes(skillLower)
                    );

                    if (isMatch) {
                        earnedScore += weight;
                    }
                });

                return {
                    score: earnedScore,
                    percentage: totalPossibleWeight > 0 ? (earnedScore / totalPossibleWeight) : 0
                };
            };

            results.forEach((result, index) => {
                setAiProgress({ current: index + 1, total: results.length });

                const job = jobs.find(j => j.id === result.jobId);
                if (!job) return;

                // 1. Calculate Tech Match Score (Local Logic)
                const { percentage } = calculateMatchScore(
                    result.extractedData.techStack,
                    configuredTechStack
                );

                // 2. Determine Final Qualification
                // Qualify = (AI said Remote/OK) AND (Tech Match >= 50%)
                const techPass = percentage >= 0.5;
                const isLocationQualified = result.qualified; // From AI
                const isFinallyQualified = isLocationQualified && techPass;

                // Update job with extracted data from AI
                const updatedJob: JobPost = {
                    ...job,
                    isRemote: result.extractedData.isRemote,
                    techStack: result.extractedData.techStack.length > 0
                        ? result.extractedData.techStack
                        : job.techStack
                };

                updatedJobs.push(updatedJob);

                if (isFinallyQualified) {
                    newQualifiedJobs.push(updatedJob);
                } else {
                    newDisqualifiedJobs.push(updatedJob);
                }

                // Format the reason
                // Format the reason
                const locationSource = result.extractedData.detectedFrom !== 'none' ? ` (${result.extractedData.detectedFrom})` : '';
                const evidence = result.extractedData.remoteEvidence ? ` | "${result.extractedData.remoteEvidence}"` : '';

                let reasonText = '';
                if (result.extractedData.isRemote) {
                    reasonText = `Remote ✓${locationSource}${evidence}`;
                } else {
                    reasonText = `Not Remote (${result.extractedData.workLocation}${locationSource})`;
                }

                newReasons[result.jobId] = reasonText;
            });

            // Verify all jobs were processed - add any missing ones
            const processedIds = new Set(results.map(r => r.jobId));
            const missingJobs = jobs.filter(j => !processedIds.has(j.id));
            if (missingJobs.length > 0) {
                console.warn(`AI did not process ${missingJobs.length} jobs, adding as disqualified`);
                missingJobs.forEach(job => {
                    updatedJobs.push(job);
                    newDisqualifiedJobs.push(job);
                    newReasons[job.id] = '[0%] Job not processed by AI | Location: unknown';
                });
            }

            console.log(`Total jobs: ${jobs.length}, Qualified: ${newQualifiedJobs.length}, Disqualified: ${newDisqualifiedJobs.length}`);

            // Update the store with AI-qualified results (no messages - those are generated in Compose)
            useNewWorkflowStore.setState((state) => {
                if (!state.currentRun) return state;
                return {
                    currentRun: {
                        ...state.currentRun,
                        sourceData: {
                            jobs: updatedJobs.length > 0 ? updatedJobs : state.currentRun.sourceData.jobs,
                            totalImported: state.currentRun.sourceData.totalImported
                        },
                        qualifyData: {
                            qualifiedJobs: newQualifiedJobs,
                            disqualifiedJobs: newDisqualifiedJobs,
                            qualificationReasons: newReasons
                        },
                        stats: {
                            ...state.currentRun.stats,
                            qualifiedJobs: newQualifiedJobs.length
                        },
                        updatedAt: new Date().toISOString()
                    }
                };
            });

            updateStepStatus('qualify', 'completed');

        } catch (error) {
            console.error('AI Qualification error:', error);
            setAiError(error instanceof Error ? error.message : 'AI qualification failed');
        } finally {
            setIsAIQualifying(false); // Ensure this is reset!
            setAiProgress(null);
        }
    };

    const handleQualify = (jobId: string, qualified: boolean, reason?: string) => {
        qualifyJob(jobId, qualified, reason);

        // Check if all jobs are processed
        const remainingUnprocessed = jobs.filter(j =>
            j.id !== jobId &&
            !qualifiedJobs.some(qj => qj.id === j.id) &&
            !disqualifiedJobs.some(dj => dj.id === j.id)
        );

        if (remainingUnprocessed.length === 0) {
            updateStepStatus('qualify', 'completed');
        }
    };

    const getJobStatus = (jobId: string): 'qualified' | 'disqualified' | 'pending' => {
        if (qualifiedJobs.some(j => j.id === jobId)) return 'qualified';
        if (disqualifiedJobs.some(j => j.id === jobId)) return 'disqualified';
        return 'pending';
    };

    const getTechMatch = (job: JobPost): string[] => {
        const jobTech = job.techStack || [];
        return configuredTechStack.filter(tech =>
            jobTech.some(jt => jt.toLowerCase().includes(tech.toLowerCase()))
        );
    };

    return (
        <div className="space-y-6">
            {/* Qualification Panel */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Filter className="w-5 h-5 text-purple-600" />
                        Qualify Leads by Tech Stack
                    </h2>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleAIQualify}
                            disabled={isAIQualifying || jobs.length === 0}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isAIQualifying
                                ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-600'
                                : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                                }`}
                        >
                            {isAIQualifying ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    AI Qualifying... {aiProgress && `(${aiProgress.current}/${aiProgress.total})`}
                                </>
                            ) : (
                                <>
                                    <Bot className="w-4 h-4" />
                                    AI Qualify
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* AI Error Display */}
                {aiError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                        <div>
                            <p className="text-sm text-red-700 font-medium">{aiError}</p>
                            <a href="/settings" className="text-sm text-red-600 underline">Go to Settings</a>
                        </div>
                    </div>
                )}

                {/* AI Progress Bar */}
                {isAIQualifying && aiProgress && (
                    <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Analyzing jobs with AI...</span>
                            <span>{Math.round((aiProgress.current / aiProgress.total) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(aiProgress.current / aiProgress.total) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Tech Stack Being Matched */}
                {configuredTechStack.length > 0 ? (
                    <div className="bg-purple-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-purple-700 mb-2 font-medium">
                            Matching against your configured tech stack:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {configuredTechStack.map((tech) => (
                                <span
                                    key={tech}
                                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                                >
                                    {tech}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-amber-50 rounded-lg p-4 mb-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="text-sm text-amber-700">
                            No tech stack configured. Please go to{' '}
                            <a href="/settings" className="font-medium underline">Settings</a>
                            {' '}to define the technologies you provide.
                        </p>
                    </div>
                )}

                {/* Filters Row - Work Location & Poster Required */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <div className="flex flex-wrap gap-8 justify-between">
                        {/* Work Location Preference */}
                        <div className="flex-1 min-w-[280px]">
                            <p className="text-sm text-blue-700 mb-2 font-medium">
                                Work Location Preference:
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                {[
                                    { value: 'remote', label: '🌍 Remote Only', desc: 'Only remote positions' },
                                    { value: 'hybrid', label: '🏠 Hybrid', desc: 'Remote or hybrid' },
                                    { value: 'onsite', label: '🏢 On-site', desc: 'Includes on-site' },
                                    { value: 'any', label: '✓ Any', desc: 'All locations' }
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => useSettingsStore.getState().updateBusinessContext({
                                            qualification: { ...businessContext.qualification, workLocation: option.value as any }
                                        })}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${businessContext.qualification.workLocation === option.value
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                            }`}
                                        title={option.desc}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-blue-600 mt-2">
                                {businessContext.qualification.workLocation === 'remote' && '✓ Filtering for remote-only positions'}
                                {businessContext.qualification.workLocation === 'hybrid' && '✓ Including remote and hybrid positions'}
                                {businessContext.qualification.workLocation === 'onsite' && '✓ Including all work arrangements'}
                                {businessContext.qualification.workLocation === 'any' && '✓ No location filter applied'}
                            </p>
                        </div>

                        {/* Poster Name Required */}
                        <div className="min-w-[200px]">
                            <p className="text-sm text-blue-700 mb-2 font-medium">
                                Poster Name:
                            </p>
                            <div className="flex gap-2">
                                {[
                                    { value: 'required', label: '👤 Required', desc: 'Only jobs with poster name' },
                                    { value: 'any', label: '✓ Any', desc: 'All jobs' }
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => useSettingsStore.getState().updateBusinessContext({
                                            qualification: { ...businessContext.qualification, posterRequired: option.value as any }
                                        })}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${(businessContext.qualification.posterRequired || 'any') === option.value
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                            }`}
                                        title={option.desc}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-blue-600 mt-2">
                                {(businessContext.qualification.posterRequired || 'any') === 'required' && '✓ Only jobs with poster name'}
                                {(businessContext.qualification.posterRequired || 'any') === 'any' && '✓ All jobs included'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{unprocessedJobs.length}</p>
                        <p className="text-sm text-gray-500">To Review</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{qualifiedJobs.length}</p>
                        <p className="text-sm text-gray-500">Qualified</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-red-600">{disqualifiedJobs.length}</p>
                        <p className="text-sm text-gray-500">Disqualified</p>
                    </div>
                </div>
            </div>

            {/* Jobs to Review */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                    All Jobs ({jobs.length})
                </h2>

                <div className="space-y-3">
                    {sortedJobs.map((job) => {
                        const status = getJobStatus(job.id);
                        const techMatch = getTechMatch(job);
                        const isExpanded = expandedJobId === job.id;
                        const reason = reasons[job.id];

                        return (
                            <div
                                key={job.id}
                                className={`border rounded-lg transition-all ${status === 'qualified' ? 'border-green-200 bg-green-50/50' :
                                    status === 'disqualified' ? 'border-red-200 bg-red-50/50' :
                                        'border-gray-200'
                                    }`}
                            >
                                <div className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                {status === 'qualified' && <CheckCircle className="w-5 h-5 text-green-600" />}
                                                {status === 'disqualified' && <XCircle className="w-5 h-5 text-red-500" />}
                                                <h3 className="font-semibold text-gray-900">{job.title}</h3>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    <Building2 className="w-3.5 h-3.5" />
                                                    {job.company}
                                                </span>
                                            </div>

                                            {/* Clean Row: Location, Date, Poster */}
                                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {job.location}
                                                {job.postedDate && (
                                                    <>
                                                        <span className="text-gray-300">•</span>
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(job.postedDate).toLocaleDateString()}
                                                    </>
                                                )}
                                                {job.poster?.name && (
                                                    <>
                                                        <span className="text-gray-300">•</span>
                                                        <User className="w-3.5 h-3.5" />
                                                        {job.poster.name}
                                                    </>
                                                )}
                                            </div>

                                            {/* Extracted Tech Skills */}
                                            {job.techStack && job.techStack.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-3">
                                                    {job.techStack.map((tech, i) => {
                                                        const isMatch = configuredTechStack.some(ct =>
                                                            tech.toLowerCase().includes(ct.toLowerCase()) ||
                                                            ct.toLowerCase().includes(tech.toLowerCase())
                                                        );
                                                        return (
                                                            <span
                                                                key={i}
                                                                className={`px-2 py-0.5 rounded text-xs border ${isMatch
                                                                    ? 'bg-green-50 border-green-200 text-green-700 font-medium'
                                                                    : 'bg-gray-50 border-gray-200 text-gray-500'
                                                                    }`}
                                                            >
                                                                {tech}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {reason && (
                                                <p className="text-xs text-gray-500 mt-2 italic">{reason}</p>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 ml-4">
                                            <button
                                                onClick={() => handleQualify(job.id, true, `Matches: ${techMatch.join(', ') || 'Manual approval'}`)}
                                                className={`p-2 rounded-lg transition-all ${status === 'qualified'
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-600'
                                                    }`}
                                                title="Qualify"
                                            >
                                                <Check className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleQualify(job.id, false, 'Manually disqualified')}
                                                className={`p-2 rounded-lg transition-all ${status === 'disqualified'
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600'
                                                    }`}
                                                title="Disqualify"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                                                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                title="Show Details"
                                            >
                                                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">
                                                {job.description || 'No description available'}
                                            </p>
                                            {job.poster && (
                                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                    <p className="text-xs text-gray-500 mb-1">Job Poster:</p>
                                                    <p className="font-medium text-gray-900">{job.poster.name}</p>
                                                    <p className="text-sm text-gray-600">{job.poster.title}</p>
                                                    {job.poster.linkedInUrl && (
                                                        <a
                                                            href={job.poster.linkedInUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                                                        >
                                                            View LinkedIn Profile
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Continue Button */}
            {qualifiedJobs.length > 0 && (
                <div className="flex justify-end">
                    <button
                        onClick={goToNextStep}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        Continue with {qualifiedJobs.length} Qualified Leads
                        <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                    </button>
                </div>
            )}
        </div>
    );
}
