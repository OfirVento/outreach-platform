import { useState, useEffect, useMemo } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { MessageSquare, Save, Send, CheckCircle2, AlertCircle, Loader } from 'lucide-react';

interface MessageGenerationConfigProps {
    nodeId: string;
}

const STORAGE_KEY = 'outreach_workflow_message_generation_config';

export default function MessageGenerationConfig({ nodeId }: MessageGenerationConfigProps) {
    const { nodes, updateNode, mode, edges } = useWorkflowStore();
    const node = nodes.find((n) => n.id === nodeId);

    // Get data from previous node (Contact Enrichment)
    const previousNode = useMemo(() => {
        const incomingEdge = edges.find((e) => e.target === nodeId);
        if (incomingEdge) {
            return nodes.find((n) => n.id === incomingEdge.source);
        }
        return null;
    }, [edges, nodes, nodeId]);

    const previousNodeOutput = previousNode?.data.output as any;

    // Find Job Extraction node to get job descriptions
    const jobExtractionNode = useMemo(() => {
        return nodes.find((n) => n.type === 'job_extraction');
    }, [nodes]);

    const jobExtractionOutput = jobExtractionNode?.data.output as any;

    // Find Contact Enrichment node to get jobs with poster names
    const contactEnrichmentNode = useMemo(() => {
        return nodes.find((n) => n.type === 'contact_enrichment');
    }, [nodes]);

    const contactEnrichmentOutput = contactEnrichmentNode?.data.output as any;

    // Load saved config from localStorage
    const loadSavedConfig = () => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed;
            }
        } catch (error) {
            console.error('Failed to load saved config:', error);
        }
        return null;
    };

    const savedConfig = loadSavedConfig();

    const [geminiApiKey, setGeminiApiKey] = useState(
        savedConfig?.geminiApiKey || node?.data.config.geminiApiKey || ''
    );
    const [businessText, setBusinessText] = useState(
        savedConfig?.businessText || node?.data.config.businessText || ''
    );
    const [prompt, setPrompt] = useState(
        savedConfig?.prompt || node?.data.config.prompt || ''
    );
    const [temperature, setTemperature] = useState(
        savedConfig?.temperature ?? node?.data.config.temperature ?? 0.7
    );
    const [model, setModel] = useState(
        savedConfig?.model || node?.data.config.model || 'gemini-1.5-pro'
    );
    const [isConnecting, setIsConnecting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [connectionError, setConnectionError] = useState('');
    const [generatedResponse, setGeneratedResponse] = useState('');
    const [responseError, setResponseError] = useState('');

    // Save config to localStorage
    const saveConfig = () => {
        if (typeof window === 'undefined') return;
        const config = {
            geminiApiKey,
            businessText,
            prompt,
            temperature,
            model,
            timestamp: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

        // Also update node config
        updateNode(nodeId, {
            data: {
                ...node!.data,
                config: {
                    ...node!.data.config,
                    ...config,
                },
            },
        });
    };

    // Test Gemini API connection
    const testConnection = async () => {
        if (!geminiApiKey) {
            setConnectionError('Please enter your Gemini API key');
            setConnectionStatus('error');
            return;
        }

        setIsConnecting(true);
        setConnectionStatus('idle');
        setConnectionError('');

        try {
            const testPrompt = 'Say "Connection successful" if you can read this.';

            // Clean API key (remove any whitespace)
            const cleanApiKey = geminiApiKey.trim();

            // Try v1beta endpoint first (newer API)
            let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanApiKey}`;

            console.log('Testing Gemini API connection with model:', model);

            let response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: testPrompt
                        }]
                    }]
                }),
            });

            // If v1beta fails, try v1 endpoint
            if (!response.ok && (response.status === 404 || response.status === 400)) {
                console.log('Trying v1 endpoint...');
                url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${cleanApiKey}`;
                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: testPrompt
                            }]
                        }]
                    }),
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: { message: errorText || `HTTP ${response.status}` } };
                }

                const errorMessage = errorData.error?.message ||
                    errorData.message ||
                    `HTTP error! status: ${response.status}`;

                throw new Error(errorMessage);
            }

            const data = await response.json();

            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                setConnectionStatus('success');
                setConnectionError('');
                saveConfig();
            } else if (data.text) {
                setConnectionStatus('success');
                setConnectionError('');
                saveConfig();
            } else {
                throw new Error('Unexpected response format from Gemini API. Check console for details.');
            }
        } catch (error: any) {
            console.error('Gemini API connection error:', error);
            setConnectionStatus('error');

            // Provide more helpful error messages
            let errorMessage = error.message || 'Failed to connect to Gemini API';

            if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401')) {
                errorMessage = 'Invalid API key. Please check your Gemini API key.';
            } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
                errorMessage = `Model "${model}" not found. Try using "gemini-1.5-pro" or "gemini-1.5-flash".`;
            } else if (errorMessage.includes('403') || errorMessage.includes('permission')) {
                errorMessage = 'API key does not have permission. Check your Google Cloud project settings.';
            } else if (errorMessage.includes('429') || errorMessage.includes('quota')) {
                errorMessage = 'API quota exceeded. Check your usage limits.';
            }

            setConnectionError(errorMessage);
        } finally {
            setIsConnecting(false);
        }
    };

    // Generate message using Gemini API
    const generateMessage = async () => {
        if (!geminiApiKey) {
            setResponseError('Please enter and test your Gemini API key first');
            return;
        }

        if (!prompt) {
            setResponseError('Please enter a prompt');
            return;
        }

        setIsGenerating(true);
        setGeneratedResponse('');
        setResponseError('');

        try {
            // Get job descriptions from Job Extraction node
            let jobDescriptionsText = '';

            // Get jobs with poster names from Contact Enrichment node
            const jobsWithPosterNames = new Set<string>();
            const jobIdToPosterName = new Map<string, string>();

            if (contactEnrichmentOutput?.contacts && contactEnrichmentOutput.contacts.length > 0) {
                contactEnrichmentOutput.contacts.forEach((contact: any) => {
                    if (contact.job_id && contact.contacts && contact.contacts.length > 0) {
                        // Check if any contact has a name
                        const contactWithName = contact.contacts.find((c: any) => c.name && c.name.trim().length > 0);
                        if (contactWithName) {
                            jobsWithPosterNames.add(contact.job_id);
                            jobIdToPosterName.set(contact.job_id, contactWithName.name);
                        }
                    }
                });
            }

            // Get job descriptions from Job Extraction node
            let jobsData = null;
            if (jobExtractionOutput?.jobs && jobExtractionOutput.jobs.length > 0) {
                jobsData = jobExtractionOutput.jobs;
            } else if (previousNodeOutput?.jobs && previousNodeOutput.jobs.length > 0) {
                jobsData = previousNodeOutput.jobs;
            }

            if (jobsData && jobsData.length > 0) {
                let filteredJobs;
                if (jobsWithPosterNames.size > 0) {
                    filteredJobs = jobsData.filter((job: any) => {
                        const jobId = job.job_id || job.id || job.linkedin_job_id;
                        if (jobsWithPosterNames.has(jobId)) {
                            return true;
                        }
                        const jobIndex = jobsData.indexOf(job);
                        const contactByIndex = contactEnrichmentOutput?.contacts?.[jobIndex];
                        if (contactByIndex && contactByIndex.contacts?.some((c: any) => c.name)) {
                            const posterName = contactByIndex.contacts.find((c: any) => c.name)?.name;
                            if (posterName) {
                                jobIdToPosterName.set(jobId, posterName);
                                return true;
                            }
                        }
                        return false;
                    });

                    if (filteredJobs.length === 0 && jobsData.some((j: any) => j.full_description || j.description)) {
                        filteredJobs = jobsData.filter((j: any) => j.full_description || j.description);
                    }
                } else {
                    filteredJobs = jobsData;
                }

                const jobsWithDescriptions = filteredJobs
                    .filter((job: any) => {
                        const description = job.full_description || job.description || '';
                        const hasDescription = description && description.trim().length > 0;
                        return hasDescription;
                    })
                    .map((job: any, index: number) => {
                        const description = job.full_description || job.description || '';
                        const jobId = job.job_id || job.id;
                        const posterName = jobIdToPosterName.get(jobId) ||
                            contactEnrichmentOutput?.contacts?.find((c: any) => c.job_id === jobId)?.contacts?.[0]?.name ||
                            'Unknown';

                        return `Job ${index + 1}:\nTitle: ${job.title || 'Unknown'}\nCompany: ${job.company || 'Unknown'}\nPoster Name: ${posterName}\nDescription:\n${description.trim()}\n`;
                    });

                if (jobsWithDescriptions.length > 0) {
                    jobDescriptionsText = `\n\n--- JOB DESCRIPTIONS (Only jobs with poster names) ---\n\n${jobsWithDescriptions.join('\n---\n\n')}`;
                } else {
                    const allJobsWithDesc = jobsData.filter((j: any) => {
                        const desc = j.full_description || j.description || '';
                        return desc && desc.trim().length > 0;
                    });

                    if (allJobsWithDesc.length > 0 && jobsWithPosterNames.size === 0) {
                        const fallbackJobs = allJobsWithDesc.map((job: any, index: number) => {
                            const description = job.full_description || job.description || '';
                            return `Job ${index + 1}:\nTitle: ${job.title || 'Unknown'}\nCompany: ${job.company || 'Unknown'}\nDescription:\n${description.trim()}\n`;
                        });
                        jobDescriptionsText = `\n\n--- JOB DESCRIPTIONS ---\n\n${fallbackJobs.join('\n---\n\n')}`;
                    }
                }
            }

            // Build the full prompt
            const promptParts: string[] = [];

            if (businessText && businessText.trim().length > 0) {
                promptParts.push(`--- ABOUT MY BUSINESS ---\n\n${businessText.trim()}`);
            }

            if (jobDescriptionsText && jobDescriptionsText.trim().length > 0) {
                promptParts.push(jobDescriptionsText.trim());
            }

            if (prompt && prompt.trim().length > 0) {
                promptParts.push(`--- YOUR PROMPT ---\n\n${prompt.trim()}`);
            }

            const fullPrompt = promptParts.join('\n\n');

            const cleanApiKey = geminiApiKey.trim();
            let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanApiKey}`;

            let response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: fullPrompt
                        }]
                    }],
                    generationConfig: {
                        temperature: temperature,
                    }
                }),
            });

            if (!response.ok && (response.status === 404 || response.status === 400)) {
                url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${cleanApiKey}`;
                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: fullPrompt
                            }]
                        }],
                        generationConfig: {
                            temperature: temperature,
                        }
                    }),
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: { message: errorText || `HTTP ${response.status}` } };
                }

                const errorMessage = errorData.error?.message ||
                    errorData.message ||
                    `HTTP error! status: ${response.status}`;

                throw new Error(errorMessage);
            }

            const data = await response.json();

            let generatedText = '';
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                generatedText = data.candidates[0].content.parts[0].text;
            } else if (data.text) {
                generatedText = data.text;
            } else {
                throw new Error('Unexpected response format from Gemini API.');
            }

            if (generatedText) {
                setGeneratedResponse(generatedText);

                // Save response to node output
                const output = {
                    status: 'ok' as const,
                    messages_generated: 1,
                    messages: [{
                        job_id: 'generated',
                        contact_name: 'Generated',
                        contact_role: 'Contact',
                        message_type: 'initial_message' as const,
                        message: generatedText,
                        personalization_facts: [],
                    }],
                    generated_at: new Date().toISOString(),
                };

                updateNode(nodeId, {
                    data: {
                        ...node!.data,
                        output,
                        status: 'completed' as const,
                    },
                });

                saveConfig();
            } else {
                throw new Error('No text generated.');
            }
        } catch (error: any) {
            console.error('Gemini API generation error:', error);
            setResponseError(error.message || 'Failed to generate message');
        } finally {
            setIsGenerating(false);
        }
    };

    // Auto-save on changes
    useEffect(() => {
        if (!node) return;

        const timer = setTimeout(() => {
            // Only auto-save if using component state that might differ from node state
            if (geminiApiKey || businessText || prompt) {
                const config = {
                    geminiApiKey,
                    businessText,
                    prompt,
                    temperature,
                    model,
                    timestamp: new Date().toISOString(),
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

                updateNode(nodeId, {
                    data: {
                        ...node.data,
                        config: {
                            ...node.data.config,
                            ...config,
                        },
                    },
                });
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [geminiApiKey, businessText, prompt, temperature, model, nodeId, updateNode, node]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MessageSquare className="w-5 h-5" />
                <span>Message Generation (Gemini 3)</span>
            </div>

            {/* Business Information */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    About Your Business
                </label>
                <textarea
                    value={businessText}
                    onChange={(e) => setBusinessText(e.target.value)}
                    placeholder="Enter information about your business, services, value proposition, etc. This will be included in the prompt sent to Gemini."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-y"
                />
                <p className="text-xs text-gray-500 mt-1">
                    This information will be automatically included with your prompt when generating messages.
                </p>
            </div>

            {/* Prompt */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prompt for Gemini
                </label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter your prompt for message generation. The business information above will be included automatically."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-y"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Your prompt + business information + job descriptions (from previous node) will be sent to Gemini API.
                </p>
            </div>

            {/* Gemini API Configuration */}
            <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Gemini API Configuration</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Gemini API Key
                        </label>
                        <input
                            type="password"
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            placeholder="Enter your Gemini API key from Google AI Studio"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Get your API key from <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Model
                        </label>
                        <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                            <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash (Latest)</option>
                            <option value="gemini-pro">Gemini Pro (Legacy)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            If connection fails, try "Gemini 1.5 Flash" or "Gemini Pro (Legacy)"
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Temperature: {temperature}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Lower = more deterministic, Higher = more creative
                        </p>
                    </div>

                    {/* Connection Status */}
                    {connectionStatus === 'success' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-green-700">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="text-sm font-medium">Successfully connected to Gemini API</span>
                            </div>
                        </div>
                    )}

                    {connectionStatus === 'error' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-red-700">
                                <AlertCircle className="w-5 h-5" />
                                <div className="flex-1">
                                    <span className="text-sm font-medium">Connection failed</span>
                                    {connectionError && (
                                        <p className="text-xs mt-1">{connectionError}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={testConnection}
                        disabled={isConnecting || !geminiApiKey}
                        className={`w-full px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${isConnecting || !geminiApiKey
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                            } text-white`}
                    >
                        {isConnecting ? (
                            <>
                                <Loader className="w-4 h-4 animate-spin" />
                                Testing Connection...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Test Connection
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={saveConfig}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 flex items-center justify-center gap-2"
            >
                <Save className="w-4 h-4" />
                Save Configuration
            </button>

            {/* Job Extraction & Contact Enrichment Data Status */}
            {jobExtractionOutput && contactEnrichmentOutput && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <p className="text-sm font-medium text-blue-900">
                                Jobs with Poster Names
                            </p>
                            {jobExtractionOutput.jobs && contactEnrichmentOutput.contacts && (
                                <p className="text-xs text-blue-700 mt-1">
                                    {jobExtractionOutput.jobs.length} total jobs from Job Extraction
                                    {contactEnrichmentOutput.contacts.length > 0 && (
                                        <span className="ml-2 font-semibold">
                                            → {contactEnrichmentOutput.contacts.length} jobs with poster names will be sent to Gemini
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    </div>
                </div>
            )}

            {(!jobExtractionOutput || !contactEnrichmentOutput) && mode === 'run' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <p className="text-sm text-yellow-700">
                            {!jobExtractionOutput && !contactEnrichmentOutput
                                ? 'Please run Job Extraction and Contact Enrichment first.'
                                : !jobExtractionOutput
                                    ? 'Please run Job Extraction first.'
                                    : 'Please run Contact Enrichment first. Only jobs with poster names will be included.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Generate Message - Run Mode */}
            {mode === 'run' && (
                <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Generate Message</h3>

                    {/* Show what will be sent */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                        <p className="text-xs font-medium text-gray-700 mb-2">What will be sent to Gemini:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                            {businessText && businessText.trim().length > 0 && (
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                                    About Your Business ({businessText.trim().length} characters)
                                </li>
                            )}
                            {(() => {
                                // Calculate how many job descriptions will be sent
                                let jobCount = 0;
                                if (contactEnrichmentOutput?.contacts && contactEnrichmentOutput.contacts.length > 0) {
                                    jobCount = contactEnrichmentOutput.contacts.length;
                                } else if (jobExtractionOutput?.jobs) {
                                    // Count jobs with descriptions
                                    jobCount = jobExtractionOutput.jobs.filter((j: any) =>
                                        (j.full_description || j.description) && (j.full_description || j.description).trim().length > 0
                                    ).length;
                                }
                                return jobCount > 0 ? (
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                                        Job Descriptions ({jobCount} jobs with descriptions{prompt && contactEnrichmentOutput?.contacts ? ' and poster names' : ''})
                                    </li>
                                ) : (
                                    <li className="flex items-center gap-2">
                                        <AlertCircle className="w-3 h-3 text-yellow-600" />
                                        <span className="text-yellow-700">No job descriptions will be sent</span>
                                    </li>
                                );
                            })()}
                            {prompt && prompt.trim().length > 0 && (
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                                    Your Prompt ({prompt.trim().length} characters)
                                </li>
                            )}
                        </ul>
                    </div>

                    {responseError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2 text-red-700">
                                <AlertCircle className="w-5 h-5" />
                                <span className="text-sm">{responseError}</span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={generateMessage}
                        disabled={isGenerating || !geminiApiKey}
                        className={`w-full px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 ${isGenerating || !geminiApiKey
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                            } text-white`}
                    >
                        {isGenerating ? (
                            <>
                                <Loader className="w-4 h-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Generate Message
                            </>
                        )}
                    </button>

                    {generatedResponse && (
                        <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Generated Response:</h4>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                                <p className="text-sm whitespace-pre-wrap">{generatedResponse}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 text-right">
                                Generated at {new Date().toLocaleTimeString()}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
