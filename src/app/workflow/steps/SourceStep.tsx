'use client';

import { useState, useCallback } from 'react';
import { useNewWorkflowStore } from '../../../store/newWorkflowStore';
import type { JobPost } from '../../../types';
import {
    Upload,
    Link2,
    FileJson,
    Trash2,
    ExternalLink,
    Building2,
    MapPin,
    User,
    Calendar,
    Code2,
    CheckCircle,
    AlertCircle,
    Search
} from 'lucide-react';

export default function SourceStep() {
    const { currentRun, addJobs, removeJob, clearJobs, updateStepStatus } = useNewWorkflowStore();
    const [uploadMode, setUploadMode] = useState<'upload' | 'apify'>('upload');
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const jobs = currentRun?.sourceData.jobs || [];
    const filteredJobs = jobs.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const parseJobsFromJSON = (data: any[]): JobPost[] => {
        return data.map((item, index) => {
            // Handle various JSON formats from different scrapers
            const job: JobPost = {
                id: item.id || item.jobId || `job_${Date.now()}_${index}`,
                title: item.title || item.jobTitle || item.position || 'Unknown Title',
                company: item.company || item.companyName || item.organization || 'Unknown Company',
                companyLinkedIn: item.companyUrl || item.companyLinkedIn || item.companyLinkedInUrl,
                location: item.location || item.jobLocation || item.place || 'Unknown Location',
                description: item.description || item.jobDescription || item.descriptionHtml || '',
                jobUrl: item.url || item.jobUrl || item.link || item.applyUrl || '',
                postedDate: item.postedAt || item.publishedAt || item.datePosted,
                scrapedAt: item.scrapedAt || new Date().toISOString(),

                // Job poster info
                poster: item.poster || item.recruiter || (item.recruiterName ? {
                    name: item.recruiterName || item.posterName,
                    title: item.recruiterTitle || item.posterTitle || 'Recruiter',
                    linkedInUrl: item.recruiterUrl || item.posterUrl || item.recruiterLinkedIn || ''
                } : undefined),

                // Additional metadata
                techStack: item.techStack || item.skills || extractTechStack(item.description || ''),
                companySize: item.companySize || item.employeeCount,
                isRemote: item.isRemote || item.remote ||
                    (item.location?.toLowerCase().includes('remote') ?? false),
                seniorityLevel: item.seniorityLevel || extractSeniority(item.title || '')
            };
            return job;
        });
    };

    const extractTechStack = (description: string): string[] => {
        const techKeywords = [
            'React', 'Angular', 'Vue', 'Node.js', 'Python', 'Java', 'TypeScript',
            'JavaScript', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'PostgreSQL',
            'MongoDB', 'Redis', 'GraphQL', 'REST', '.NET', 'C#', 'Go', 'Rust',
            'Ruby', 'Rails', 'Django', 'Flask', 'Next.js', 'Express'
        ];
        return techKeywords.filter(tech =>
            description.toLowerCase().includes(tech.toLowerCase())
        );
    };

    const extractSeniority = (title: string): JobPost['seniorityLevel'] => {
        const lower = title.toLowerCase();
        if (lower.includes('principal') || lower.includes('staff')) return 'staff';
        if (lower.includes('lead') || lower.includes('architect')) return 'lead';
        if (lower.includes('senior') || lower.includes('sr.')) return 'senior';
        if (lower.includes('junior') || lower.includes('jr.')) return 'junior';
        return 'mid';
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        setError(null);

        const files = e.dataTransfer.files;
        if (files?.[0]) {
            processFile(files[0]);
        }
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        if (e.target.files?.[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = async (file: File) => {
        if (!file.name.endsWith('.json')) {
            setError('Please upload a JSON file');
            return;
        }

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Handle both array and object with array property
            const jobsArray = Array.isArray(data) ? data :
                data.jobs || data.results || data.data || data.items || [];

            if (!Array.isArray(jobsArray) || jobsArray.length === 0) {
                setError('No jobs found in the file. Expected an array of job objects.');
                return;
            }

            const parsedJobs = parseJobsFromJSON(jobsArray);
            addJobs(parsedJobs);
            updateStepStatus('source', 'completed');
        } catch (err) {
            setError('Failed to parse JSON file. Please check the format.');
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
            {/* Import Options */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-blue-600" />
                    Import Job Posts
                </h2>

                {/* Mode Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setUploadMode('upload')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${uploadMode === 'upload'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <FileJson className="w-4 h-4" />
                        Upload JSON
                    </button>
                    <button
                        onClick={() => setUploadMode('apify')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${uploadMode === 'apify'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <Link2 className="w-4 h-4" />
                        Apify Scraper
                    </button>
                </div>

                {uploadMode === 'upload' && (
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragActive
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        <p className="text-gray-600 mb-2">
                            Drag and drop your JSON file here, or{' '}
                            <label className="text-blue-600 cursor-pointer hover:underline">
                                browse
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileInput}
                                    className="hidden"
                                />
                            </label>
                        </p>
                        <p className="text-sm text-gray-400">
                            Supports Apify LinkedIn Jobs Scraper output, or any JSON with job listings
                        </p>
                    </div>
                )}

                {uploadMode === 'apify' && (
                    <div className="bg-gray-50 rounded-xl p-6 text-center">
                        <p className="text-gray-600 mb-4">
                            Apify integration coming soon. For now, please run the scraper manually and upload the JSON output.
                        </p>
                        <a
                            href="https://apify.com/bebity/linkedin-jobs-scraper"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                        >
                            Open Apify LinkedIn Jobs Scraper
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                )}

                {error && (
                    <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}
            </div>

            {/* Jobs List */}
            {jobs.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    {/* Header with Clear/Replace Options */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                Imported Jobs
                                <span className="text-sm font-normal text-gray-500">({jobs.length})</span>
                            </h2>
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Data saved • Will persist across sessions
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search jobs..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64"
                                />
                            </div>
                            <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium cursor-pointer hover:bg-blue-100 transition-colors">
                                <Upload className="w-4 h-4" />
                                Add More
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileInput}
                                    className="hidden"
                                />
                            </label>
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to remove all imported jobs? This cannot be undone.')) {
                                        clearJobs();
                                        updateStepStatus('source', 'pending');
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear All
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {filteredJobs.map((job) => (
                            <div
                                key={job.id}
                                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                {/* Job Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{job.title}</h3>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    <Building2 className="w-3.5 h-3.5" />
                                                    {job.company}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    {job.location}
                                                </span>
                                                {job.postedDate && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(job.postedDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {job.jobUrl && (
                                                <a
                                                    href={job.jobUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                                    title="View Job Post"
                                                >
                                                    <ExternalLink className="w-4 h-4 text-gray-500" />
                                                </a>
                                            )}
                                            <button
                                                onClick={() => removeJob(job.id)}
                                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                                title="Remove"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        {job.poster && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                <User className="w-3 h-3" />
                                                {job.poster.name}
                                            </span>
                                        )}
                                        {job.isRemote && (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                🌍 Remote
                                            </span>
                                        )}
                                        {job.techStack && job.techStack.slice(0, 5).map((tech) => (
                                            <span
                                                key={tech}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                                            >
                                                <Code2 className="w-3 h-3" />
                                                {tech}
                                            </span>
                                        ))}
                                        {job.techStack && job.techStack.length > 5 && (
                                            <span className="text-xs text-gray-500">
                                                +{job.techStack.length - 5} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {jobs.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <FileJson className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Jobs Imported Yet</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        Upload a JSON file with LinkedIn job listings to get started. You can export this from Apify's LinkedIn Jobs Scraper.
                    </p>
                </div>
            )}
        </div>
    );
}
