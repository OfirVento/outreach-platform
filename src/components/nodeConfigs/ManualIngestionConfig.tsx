"use client";
import { useState, useRef, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { FileText, Upload, Plus, X, BrainCircuit, Database, CheckCircle, Trash2, FileCode } from 'lucide-react';
import { clsx } from 'clsx';

interface ManualIngestionConfigProps {
    nodeId: string;
}

export default function ManualIngestionConfig({ nodeId }: ManualIngestionConfigProps) {
    const { nodes, updateNode } = useWorkflowStore();
    const node = nodes.find((n) => n.id === nodeId);
    const config = node?.data.config || {};

    const [instructions, setInstructions] = useState(config.instructions || '');
    const [dataType, setDataType] = useState<'text' | 'json' | 'csv'>(config.dataType || 'text');
    const [attachedFile, setAttachedFile] = useState<{ name: string, content: string, size: number } | null>(config.attachedFile || null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync instructions and dataType if changed externally (though unlikely here)
    useEffect(() => {
        setInstructions(config.instructions || '');
        setDataType(config.dataType || 'text');
        setAttachedFile(config.attachedFile || null);
    }, [nodeId]);

    const handleSave = (updatedFile = attachedFile) => {
        updateNode(nodeId, {
            data: {
                ...node!.data,
                config: {
                    ...config,
                    instructions,
                    dataType,
                    attachedFile: updatedFile
                },
                status: 'completed',
                output: {
                    content: instructions,
                    type: dataType,
                    attachedFile: updatedFile,
                    timestamp: new Date().toISOString()
                }
            }
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const fileData = {
                name: file.name,
                size: file.size,
                content: content
            };
            setAttachedFile(fileData);
            // Auto-save when file is uploaded
            updateNode(nodeId, {
                data: {
                    ...node!.data,
                    config: {
                        ...config,
                        attachedFile: fileData
                    }
                }
            });
        };
        reader.readAsText(file);
    };

    const handleRemoveFile = () => {
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Auto-save when file is removed
        updateNode(nodeId, {
            data: {
                ...node!.data,
                config: {
                    ...config,
                    attachedFile: null
                }
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".txt,.json,.csv"
            />

            {/* Header Description */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                <BrainCircuit className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 leading-relaxed">
                    Provide manual context or data records for the AI to process. This can include specific client instructions, LinkedIn profile notes, or custom data lists.
                </p>
            </div>

            {/* Input Type Selector */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                {(['text', 'json', 'csv'] as const).map((type) => (
                    <button
                        key={type}
                        onClick={() => setDataType(type)}
                        className={clsx(
                            "flex-1 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wider",
                            dataType === type ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-800"
                        )}
                    >
                        {type}
                    </button>
                ))}
            </div>

            {/* Main Textarea */}
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    {dataType === 'text' ? 'Instructions / Data' : `Raw ${dataType.toUpperCase()} Content`}
                </label>
                <div className="relative group">
                    <textarea
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder={dataType === 'text' ? "Enter instructions for the AI..." : `Paste your ${dataType.toUpperCase()} data here...`}
                        className="w-full h-48 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none font-mono"
                    />
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <FileText className="w-4 h-4 text-gray-400" />
                    </div>
                </div>
            </div>

            {/* Attached File View */}
            {attachedFile && (
                <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3 flex items-center justify-between animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <FileCode className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-900 truncate max-w-[180px]">{attachedFile.name}</p>
                            <p className="text-[10px] text-blue-600 font-medium">{(attachedFile.size / 1024).toFixed(1)} KB persisted</p>
                        </div>
                    </div>
                    <button
                        onClick={handleRemoveFile}
                        className="p-2 hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-lg transition-all group"
                        title="Remove file"
                    >
                        <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
                <button
                    onClick={() => handleSave()}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all flex items-center justify-center gap-2"
                >
                    <CheckCircle className="w-4 h-4" />
                    Commit Context
                </button>
                {!attachedFile && (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                        <Upload className="w-4 h-4" />
                        Upload File
                    </button>
                )}
            </div>

            {/* Preview Section */}
            {node?.data.output && (
                <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-700 mb-2">
                        <Database className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Active Input Context</span>
                    </div>
                    <p className="text-xs text-emerald-600 italic">
                        Node is currently providing {attachedFile ? 'file + ' : ''}{dataType} context to downstream nodes.
                    </p>
                </div>
            )}
        </div>
    );
}

