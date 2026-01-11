'use client';

import { useEffect, useState } from 'react';
import WorkflowStages from '../components/WorkflowStages';
import MainContentArea from '../components/MainContentArea';
import DataInspector from '../components/DataInspector';
import { useWorkflowStore } from '../store/workflowStore';

export default function Home() {
    const [mounted, setMounted] = useState(false);
    const mode = useWorkflowStore((state) => state.mode);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null; // or a loading spinner
    }

    return (
        <main className="flex flex-col h-screen bg-white">
            {/* Header */}
            <header className="h-16 border-b border-gray-200 bg-white flex items-center px-6 justify-between flex-shrink-0 z-20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">S</span>
                    </div>
                    <span className="font-bold text-gray-900 text-lg">Siema Outreach</span>
                </div>
                <div className="flex items-center gap-4">
                    {/* Mode Toggle */}
                    <div className="bg-gray-100 p-1 rounded-lg flex items-center border border-gray-200">
                        <button
                            onClick={() => useWorkflowStore.getState().setMode('build')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'build'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Build
                        </button>
                        <button
                            onClick={() => useWorkflowStore.getState().setMode('run')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'run'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Run
                        </button>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-100">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        System Active
                    </div>
                </div>
            </header>

            {/* Workflow Ribbon */}
            <div className="flex-shrink-0 z-10">
                <WorkflowStages />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                <MainContentArea />

                {/* Right Sidebar - Data Inspector */}
                <div className="w-80 border-l border-gray-200 bg-white flex flex-col hidden lg:flex">
                    <div className="p-4 border-b border-gray-200 font-semibold text-gray-700 flex items-center gap-2 bg-gray-50">
                        Data Inspector
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <DataInspector />
                    </div>
                </div>
            </div>
        </main>
    );
}
