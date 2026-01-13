'use client';

import { useState } from 'react';
import { useNewWorkflowStore } from '../../../store/newWorkflowStore';
import { useSettingsStore } from '../../../store/settingsStore';
import type { GeneratedMessage, Contact, JobPost } from '../../../types';
import {
    PenTool,
    Sparkles,
    Check,
    CheckCircle,
    Copy,
    Edit2,
    Save,
    X,
    Linkedin,
    Mail,
    MessageSquare,
    RefreshCw
} from 'lucide-react';

export default function ComposeStep() {
    const { currentRun, addMessages, updateMessage, approveMessage, approveAllMessages, updateStepStatus, goToNextStep } = useNewWorkflowStore();
    const { businessContext, prompts } = useSettingsStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const contacts = currentRun?.enrichData.contacts || [];
    const qualifiedJobs = currentRun?.qualifyData.qualifiedJobs || [];
    const messages = currentRun?.composeData.messages || [];
    const contactsWithInfo = contacts.filter(c => c.linkedInUrl || c.email);

    const generateMessage = (contact: Contact, job: JobPost, sequenceStep: GeneratedMessage['sequenceStep']): GeneratedMessage => {
        const now = new Date();
        const sendDate = new Date(now);

        // Calculate send date based on sequence
        if (sequenceStep === '2nd_followup') {
            sendDate.setDate(sendDate.getDate() + 3);
        } else if (sequenceStep === '3rd_followup') {
            sendDate.setDate(sendDate.getDate() + 7);
        } else if (sequenceStep === 'final_touch') {
            sendDate.setDate(sendDate.getDate() + 14);
        }

        const techMatch = (job.techStack || []).join(', ') || 'software development';
        const personalizationFacts: string[] = [];

        if (job.poster?.name === contact.name) {
            personalizationFacts.push(`Posted the ${job.title} role`);
        }
        if (job.isRemote) {
            personalizationFacts.push('Remote position');
        }
        if (job.postedDate) {
            const daysAgo = Math.floor((Date.now() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24));
            personalizationFacts.push(`Posted ${daysAgo} days ago`);
        }

        // Prepare variables for template injection
        const variables: Record<string, string> = {
            '{{firstName}}': contact.name.split(' ')[0],
            '{{company}}': contact.company,
            '{{jobTitle}}': job.title,
            '{{techMatch}}': (job.techStack || []).join(', ') || 'software development',
            '{{myCompany}}': businessContext.companyName || 'our agency',
            '{{senderName}}': businessContext.senderName || '[Your Name]',
            '{{valueProps}}': businessContext.valueProps.length > 0
                ? businessContext.valueProps.map(vp => `• ${vp}`).join('\n')
                : '• Pre-vetted senior developers\n• Start in 1-2 weeks'
        };

        // Select template based on sequence step
        let template = '';
        switch (sequenceStep) {
            case '1st_touch':
                template = prompts.compose_1st_touch;
                break;
            case '2nd_followup':
                template = prompts.compose_2nd_followup;
                break;
            case '3rd_followup':
                template = prompts.compose_3rd_followup;
                break;
            case 'final_touch':
                template = prompts.compose_final_touch;
                break;
            default:
                template = prompts.compose_1st_touch;
        }

        // Replace all variables in the template
        let message = template;
        Object.entries(variables).forEach(([placeholder, value]) => {
            message = message.split(placeholder).join(value);
        });

        return {
            id: crypto.randomUUID(),
            contactId: contact.id,
            jobId: job.id,
            sequenceStep,
            channel: contact.email ? 'both' : 'linkedin',
            subject: sequenceStep === '1st_touch'
                ? `Re: ${job.title} at ${contact.company}`
                : `Quick follow-up - ${job.title}`,
            message,
            personalizationFacts,
            suggestedSendDate: sendDate.toISOString().split('T')[0],
            status: 'draft',
            createdAt: now.toISOString()
        };
    };

    const handleGenerate = async () => {
        setIsGenerating(true);

        // Simulate AI generation delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newMessages: GeneratedMessage[] = [];

        contactsWithInfo.forEach(contact => {
            const job = qualifiedJobs.find(j => j.id === contact.jobId);
            if (!job) return;

            // Check if messages already exist for this contact
            if (messages.some(m => m.contactId === contact.id)) return;

            // Generate message sequence
            newMessages.push(generateMessage(contact, job, '1st_touch'));
            newMessages.push(generateMessage(contact, job, '2nd_followup'));
            newMessages.push(generateMessage(contact, job, '3rd_followup'));
        });

        addMessages(newMessages);
        updateStepStatus('compose', 'completed');
        setIsGenerating(false);
    };

    const handleEditMessage = (message: GeneratedMessage) => {
        setEditingMessageId(message.id);
        setEditContent(message.message);
    };

    const handleSaveMessage = () => {
        if (editingMessageId) {
            updateMessage(editingMessageId, { message: editContent });
            setEditingMessageId(null);
            setEditContent('');
        }
    };

    const handleCopy = (message: GeneratedMessage) => {
        navigator.clipboard.writeText(message.message);
        setCopiedId(message.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getContact = (contactId: string) => contacts.find(c => c.id === contactId);
    const getJob = (jobId: string) => qualifiedJobs.find(j => j.id === jobId);

    const groupedMessages = messages.reduce((acc, msg) => {
        if (!acc[msg.contactId]) {
            acc[msg.contactId] = [];
        }
        acc[msg.contactId].push(msg);
        return acc;
    }, {} as Record<string, GeneratedMessage[]>);

    const approvedCount = messages.filter(m => m.status === 'approved').length;
    const draftCount = messages.filter(m => m.status === 'draft').length;

    return (
        <div className="space-y-6">
            {/* Generation Panel */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <PenTool className="w-5 h-5 text-amber-600" />
                        Compose Messages
                    </h2>

                    <div className="flex items-center gap-2">
                        {messages.length > 0 && draftCount > 0 && (
                            <button
                                onClick={approveAllMessages}
                                className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium hover:bg-green-200 transition-colors"
                            >
                                <Check className="w-4 h-4" />
                                Approve All ({draftCount})
                            </button>
                        )}
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || contactsWithInfo.length === 0}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isGenerating
                                ? 'bg-amber-100 text-amber-600'
                                : 'bg-amber-600 text-white hover:bg-amber-700'
                                }`}
                        >
                            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
                            {isGenerating ? 'Generating...' : messages.length > 0 ? 'Regenerate' : 'Generate Messages'}
                        </button>
                    </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    Generate personalized outreach messages for each contact. Messages are tailored based on your business context and the job details.
                </p>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{contactsWithInfo.length}</p>
                        <p className="text-sm text-gray-500">Contacts</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-amber-600">{messages.length}</p>
                        <p className="text-sm text-gray-500">Messages</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-600">{draftCount}</p>
                        <p className="text-sm text-gray-500">Drafts</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
                        <p className="text-sm text-gray-500">Approved</p>
                    </div>
                </div>
            </div>

            {/* Messages by Contact */}
            {Object.keys(groupedMessages).length > 0 && (
                <div className="space-y-6">
                    {Object.entries(groupedMessages).map(([contactId, contactMessages]) => {
                        const contact = getContact(contactId);
                        const job = contact ? getJob(contact.jobId) : undefined;
                        if (!contact) return null;

                        return (
                            <div key={contactId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                {/* Contact Header */}
                                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                                            <p className="text-sm text-gray-500">{contact.title} at {contact.company}</p>
                                            {job && (
                                                <p className="text-xs text-gray-400 mt-1">Hiring for: {job.title}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {contact.linkedInUrl && (
                                                <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                                    <Linkedin className="w-3 h-3" />
                                                    LinkedIn
                                                </span>
                                            )}
                                            {contact.email && (
                                                <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                                    <Mail className="w-3 h-3" />
                                                    Email
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="divide-y divide-gray-100">
                                    {contactMessages.map((message) => {
                                        const isEditing = editingMessageId === message.id;
                                        const isCopied = copiedId === message.id;

                                        return (
                                            <div key={message.id} className="p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${message.sequenceStep === '1st_touch'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            {message.sequenceStep === '1st_touch' ? '1st Touch' :
                                                                message.sequenceStep === '2nd_followup' ? '2nd Follow-up' :
                                                                    message.sequenceStep === '3rd_followup' ? '3rd Follow-up' : 'Final Touch'}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {message.suggestedSendDate}
                                                        </span>
                                                        {message.status === 'approved' && (
                                                            <span className="flex items-center gap-1 text-green-600 text-xs">
                                                                <CheckCircle className="w-3 h-3" />
                                                                Approved
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {!isEditing && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleCopy(message)}
                                                                    className={`p-1.5 rounded transition-colors ${isCopied ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-500'
                                                                        }`}
                                                                    title="Copy"
                                                                >
                                                                    {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEditMessage(message)}
                                                                    className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                                                                    title="Edit"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                {message.status !== 'approved' && (
                                                                    <button
                                                                        onClick={() => approveMessage(message.id)}
                                                                        className="p-1.5 hover:bg-green-100 rounded text-gray-500 hover:text-green-600"
                                                                        title="Approve"
                                                                    >
                                                                        <Check className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {isEditing ? (
                                                    <div className="space-y-2">
                                                        <textarea
                                                            value={editContent}
                                                            onChange={(e) => setEditContent(e.target.value)}
                                                            rows={8}
                                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={handleSaveMessage}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                                                            >
                                                                <Save className="w-4 h-4" />
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingMessageId(null)}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                                                            >
                                                                <X className="w-4 h-4" />
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 rounded-lg p-3">
                                                        {message.message}
                                                    </pre>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Empty State */}
            {messages.length === 0 && contactsWithInfo.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Generate Messages</h3>
                    <p className="text-gray-500 max-w-md mx-auto mb-6">
                        Create personalized outreach messages for your {contactsWithInfo.length} contacts.
                    </p>
                    <button
                        onClick={handleGenerate}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
                    >
                        <Sparkles className="w-5 h-5" />
                        Generate Messages
                    </button>
                </div>
            )}

            {/* Continue Button */}
            {approvedCount > 0 && (
                <div className="flex justify-end">
                    <button
                        onClick={goToNextStep}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        Continue with {approvedCount} Approved Messages
                    </button>
                </div>
            )}
        </div>
    );
}
