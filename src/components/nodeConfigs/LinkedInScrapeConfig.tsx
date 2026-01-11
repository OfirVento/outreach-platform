import { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Upload, CheckCircle2, X, FileJson } from 'lucide-react';

interface LinkedInScrapeConfigProps {
    nodeId: string;
}

const STORAGE_KEY = 'outreach_workflow_linkedin_scrape_json';

export default function LinkedInScrapeConfig({ nodeId }: LinkedInScrapeConfigProps) {
    const { nodes, updateNode, mode } = useWorkflowStore();
    const node = nodes.find((n) => n.id === nodeId);
    const [source, setSource] = useState<'apify' | 'json_upload'>(node?.data.config.source || 'json_upload');
    const [apifyApiKey, setApifyApiKey] = useState(node?.data.config.apifyApiKey || '');
    const [apifyActorId, setApifyActorId] = useState(node?.data.config.apifyActorId || '');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [savedFileName, setSavedFileName] = useState<string>('');
    const [savedJsonData, setSavedJsonData] = useState<any>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSavedFileName(parsed.fileName || '');
                setSavedJsonData(parsed.data);
                if (node) {
                    updateNode(nodeId, {
                        data: {
                            ...node.data,
                            config: {
                                ...node.data.config,
                                uploadedFile: parsed.fileName,
                                savedJsonData: parsed.data,
                            },
                        },
                    });
                }
            } catch (error) {
                console.error('Failed to load saved JSON:', error);
            }
        }
    }, [nodeId, updateNode]); // nodeId and updateNode are stable

    const saveJsonToStorage = (fileName: string, jsonData: any) => {
        if (typeof window === 'undefined') return;
        const dataToSave = {
            fileName,
            data: jsonData,
            timestamp: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        setSavedFileName(fileName);
        setSavedJsonData(jsonData);
    };

    const removeSavedJson = () => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(STORAGE_KEY);
        setSavedFileName('');
        setSavedJsonData(null);
        setUploadedFile(null);
        updateNode(nodeId, {
            data: {
                ...node!.data,
                config: {
                    ...node!.data.config,
                    uploadedFile: null,
                    savedJsonData: null,
                },
                output: null,
            },
        });
    };

    const handleFileUpload = async (file: File) => {
        if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
            setUploadedFile(file);
            try {
                const fileContent = await file.text();
                const jsonData = JSON.parse(fileContent);
                saveJsonToStorage(file.name, jsonData);
                updateNode(nodeId, {
                    data: {
                        ...node!.data,
                        config: {
                            ...node!.data.config,
                            uploadedFile: file.name,
                            savedJsonData: jsonData,
                        },
                    },
                });
            } catch (error) {
                alert('Failed to parse JSON file. Please ensure it is valid JSON.');
                console.error('JSON parse error:', error);
            }
        } else {
            alert('Please upload a valid JSON file');
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileUpload(file);
    };

    const handleTest = async () => {
        if (source === 'json_upload' && !uploadedFile && !savedJsonData) {
            alert('Please upload a JSON file first');
            return;
        }

        let jsonData = savedJsonData;

        if (!jsonData && uploadedFile) {
            try {
                const fileContent = await uploadedFile.text();
                jsonData = JSON.parse(fileContent);
            } catch (error) {
                alert('Failed to parse JSON file');
                return;
            }
        }

        const jobs = Array.isArray(jsonData) ? jsonData : jsonData.jobs || [];

        const processedJobs = jobs.map((job: any, index: number) => ({
            job_id: job.job_id || `job_${index + 1}`,
            job_url: job.job_url || job.url || job.link,
            company: job.company || job.company_name || 'Unknown',
            title: job.title || job.job_title || 'Unknown',
            location: job.location || job.city || 'Unknown',
            posted_date: job.posted_date || job.date_posted || new Date().toISOString().split('T')[0],
            description_preview: job.description_preview || job.description?.substring(0, 100) || '',
            linkedin_job_id: job.linkedin_job_id || job.job_id || `linkedin_${index + 1}`,
            description: job.description || job.full_description || job.job_description || '',
            ...job,
        }));

        const mockOutput = {
            status: 'ok' as const,
            jobs_scraped: processedJobs.length,
            jobs: processedJobs,
            source: source,
        };

        updateNode(nodeId, {
            data: {
                ...node!.data,
                output: mockOutput,
                status: 'completed',
            },
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Source
                </label>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            value="json_upload"
                            checked={source === 'json_upload'}
                            onChange={(e) => setSource(e.target.value as 'json_upload')}
                            className="w-4 h-4"
                        />
                        <span className="text-sm">JSON Upload</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            value="apify"
                            checked={source === 'apify'}
                            onChange={(e) => setSource(e.target.value as 'apify')}
                            className="w-4 h-4"
                        />
                        <span className="text-sm">Apify Integration</span>
                    </label>
                </div>
            </div>

            {source === 'json_upload' && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Upload JSON File
                        </label>
                        {(savedFileName || uploadedFile) && (
                            <button
                                onClick={removeSavedJson}
                                className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                                title="Remove saved JSON"
                            >
                                <X className="w-3 h-3" />
                                Remove
                            </button>
                        )}
                    </div>

                    {savedFileName && !uploadedFile && (
                        <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileJson className="w-4 h-4 text-green-600" />
                                    <div>
                                        <p className="text-sm font-medium text-green-900">{savedFileName}</p>
                                        <p className="text-xs text-green-700">
                                            {savedJsonData && Array.isArray(savedJsonData)
                                                ? `${savedJsonData.length} jobs loaded`
                                                : 'JSON data loaded'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={removeSavedJson}
                                    className="p-1 hover:bg-green-100 rounded"
                                    title="Remove"
                                >
                                    <X className="w-4 h-4 text-green-600" />
                                </button>
                            </div>
                        </div>
                    )}

                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                            }`}
                    >
                        <input
                            type="file"
                            accept=".json,application/json"
                            onChange={handleFileInputChange}
                            className="hidden"
                            id="json-upload"
                        />
                        <label
                            htmlFor="json-upload"
                            className="cursor-pointer flex flex-col items-center gap-2"
                        >
                            <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                            <span className={`text-sm ${isDragging ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                                {isDragging
                                    ? 'Drop JSON file here'
                                    : uploadedFile
                                        ? uploadedFile.name
                                        : savedFileName
                                            ? `Replace: ${savedFileName}`
                                            : 'Drag and drop JSON file or click to upload'}
                            </span>
                            {!uploadedFile && !savedFileName && !isDragging && (
                                <span className="text-xs text-gray-500 mt-1">
                                    Supports .json files
                                </span>
                            )}
                        </label>
                    </div>
                </div>
            )}

            {source === 'apify' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Apify API Key
                        </label>
                        <input
                            type="password"
                            value={apifyApiKey}
                            onChange={(e) => setApifyApiKey(e.target.value)}
                            placeholder="Enter Apify API key"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Actor ID
                        </label>
                        <input
                            type="text"
                            value={apifyActorId}
                            onChange={(e) => setApifyActorId(e.target.value)}
                            placeholder="Enter Apify Actor ID"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                    </div>
                    <button
                        onClick={() => {
                            updateNode(nodeId, {
                                data: {
                                    ...node!.data,
                                    config: {
                                        ...node!.data.config,
                                        apifyApiKey,
                                        apifyActorId,
                                        source: 'apify',
                                    },
                                },
                            });
                        }}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                        Test Connection
                    </button>
                </div>
            )}

            {mode === 'build' && (
                <button
                    onClick={handleTest}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700"
                >
                    Test Node
                </button>
            )}

            {node?.data.output && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-medium">
                            {node.data.output.jobs_scraped} jobs scraped successfully
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
