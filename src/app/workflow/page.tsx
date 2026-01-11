'use client';

import { useEffect, useState } from 'react';
import { useNewWorkflowStore, WORKFLOW_STEPS } from '../../store/newWorkflowStore';
import { useSettingsStore } from '../../store/settingsStore';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Settings,
    Play,
    RotateCcw,
    Plus,
    Upload,
    Sparkles,
    Download,
    ChevronRight
} from 'lucide-react';
import Link from 'next/link';

// Step Components
import SourceStep from './steps/SourceStep';
import QualifyStep from './steps/QualifyStep';
import EnrichStep from './steps/EnrichStep';
import ComposeStep from './steps/ComposeStep';
import ExportStep from './steps/ExportStep';

export default function WorkflowPage() {
    const [mounted, setMounted] = useState(false);
    const {
        currentRun,
        mode,
        setMode,
        createNewRun,
        goToNextStep,
        goToPrevStep,
        resetCurrentRun
    } = useNewWorkflowStore();
    const { businessContext } = useSettingsStore();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Separate effect to create run after mount (to ensure hydration has happened)
    useEffect(() => {
        if (mounted && !currentRun) {
            // Only create a new run if there's no persisted run
            createNewRun('Campaign ' + new Date().toLocaleDateString());
        }
    }, [mounted, currentRun, createNewRun]);

    if (!mounted || !currentRun) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Loading...</div>
            </div>
        );
    }

    const currentStepIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentRun.currentStep);
    const currentStepDef = WORKFLOW_STEPS[currentStepIndex];
    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === WORKFLOW_STEPS.length - 1;

    // Check if settings are configured
    const needsSetup = !businessContext.companyName ||
        Object.values(businessContext.techStack).flat().length === 0;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold text-lg">S</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">Siema Outreach</h1>
                                <p className="text-xs text-gray-500">{currentRun.name}</p>
                            </div>
                        </div>

                        {/* Mode Toggle */}
                        <div className="bg-gray-100 p-1 rounded-lg flex items-center border border-gray-200 ml-4">
                            <button
                                onClick={() => setMode('build')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${mode === 'build'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Settings className="w-4 h-4" />
                                Build
                            </button>
                            <button
                                onClick={() => setMode('run')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${mode === 'run'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Play className="w-4 h-4" />
                                Run
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm mr-4">
                            <div className="text-center">
                                <p className="text-gray-500">Jobs</p>
                                <p className="font-bold text-gray-900">{currentRun.stats.totalJobs}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-gray-500">Qualified</p>
                                <p className="font-bold text-green-600">{currentRun.stats.qualifiedJobs}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-gray-500">Contacts</p>
                                <p className="font-bold text-gray-900">{currentRun.stats.totalContacts}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-gray-500">Messages</p>
                                <p className="font-bold text-gray-900">{currentRun.stats.totalMessages}</p>
                            </div>
                        </div>

                        <Link
                            href="/settings"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Settings"
                        >
                            <Settings className="w-5 h-5 text-gray-500" />
                        </Link>

                        <button
                            onClick={resetCurrentRun}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Reset Campaign"
                        >
                            <RotateCcw className="w-5 h-5 text-gray-500" />
                        </button>

                        <button
                            onClick={() => createNewRun()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            New Campaign
                        </button>
                    </div>
                </div>
            </header>

            {/* Setup Warning */}
            {needsSetup && (
                <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <p className="text-amber-800 text-sm">
                            ⚠️ Please configure your <strong>Business Context</strong> and <strong>Tech Stack</strong> in Settings before running campaigns.
                        </p>
                        <Link
                            href="/settings"
                            className="text-amber-700 font-medium text-sm hover:underline flex items-center gap-1"
                        >
                            Open Settings <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            )}

            {/* Step Navigation */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between">
                        {/* Steps */}
                        <div className="flex items-center gap-2">
                            {WORKFLOW_STEPS.map((step, index) => {
                                const isActive = step.id === currentRun.currentStep;
                                const isCompleted = currentRun.steps[step.id].status === 'completed';
                                const isPast = index < currentStepIndex;
                                const StepIcon = step.icon;

                                return (
                                    <div key={step.id} className="flex items-center">
                                        <button
                                            onClick={() => useNewWorkflowStore.getState().setCurrentStep(step.id)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isActive
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : isCompleted || isPast
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                }`}
                                        >
                                            {isCompleted ? (
                                                <Check className="w-4 h-4" />
                                            ) : (
                                                <StepIcon className="w-4 h-4" />
                                            )}
                                            <span className="font-medium text-sm">{step.label}</span>
                                        </button>

                                        {index < WORKFLOW_STEPS.length - 1 && (
                                            <ChevronRight className="w-5 h-5 text-gray-300 mx-1" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={goToPrevStep}
                                disabled={isFirstStep}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isFirstStep
                                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                            <button
                                onClick={goToNextStep}
                                disabled={isLastStep}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isLastStep
                                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                            >
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Current Step Description */}
                    <div className="mt-3 flex items-center gap-2">
                        <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: currentStepDef.color }}
                        />
                        <span className="text-sm text-gray-600">{currentStepDef.description}</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="max-w-7xl mx-auto py-6 px-6">
                    {currentRun.currentStep === 'source' && <SourceStep />}
                    {currentRun.currentStep === 'qualify' && <QualifyStep />}
                    {currentRun.currentStep === 'enrich' && <EnrichStep />}
                    {currentRun.currentStep === 'compose' && <ComposeStep />}
                    {currentRun.currentStep === 'export' && <ExportStep />}
                </div>
            </main>
        </div>
    );
}
