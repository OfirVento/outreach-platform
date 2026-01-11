'use client';

import { useState } from 'react';
import { useNewWorkflowStore } from '../../../store/newWorkflowStore';
import type { Contact, JobPost } from '../../../types';
import {
    Users,
    Mail,
    Linkedin,
    Phone,
    Sparkles,
    User,
    Building2,
    CheckCircle,
    AlertCircle,
    ExternalLink,
    Plus,
    Edit2,
    Save,
    X
} from 'lucide-react';

export default function EnrichStep() {
    const { currentRun, addContacts, updateContact, updateStepStatus, goToNextStep } = useNewWorkflowStore();
    const [isEnriching, setIsEnriching] = useState(false);
    const [editingContactId, setEditingContactId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Contact>>({});

    const qualifiedJobs = currentRun?.qualifyData.qualifiedJobs || [];
    const contacts = currentRun?.enrichData.contacts || [];
    const stats = currentRun?.enrichData.enrichmentStats || { fromJobPoster: 0, fromEnrichment: 0, failed: 0 };

    // Extract contacts from job posters
    const extractContactsFromPosters = () => {
        const newContacts: Contact[] = [];
        const now = new Date().toISOString();

        qualifiedJobs.forEach(job => {
            // Check if contact already exists for this job
            if (contacts.some(c => c.jobId === job.id)) return;

            if (job.poster && job.poster.name) {
                // Use job poster as contact
                newContacts.push({
                    id: crypto.randomUUID(),
                    jobId: job.id,
                    name: job.poster.name,
                    title: job.poster.title || 'Recruiter',
                    company: job.company,
                    linkedInUrl: job.poster.linkedInUrl,
                    email: undefined, // Need to enrich
                    source: 'job_poster',
                    status: 'new',
                    createdAt: now,
                    updatedAt: now
                });
            } else {
                // No poster - create placeholder for manual entry
                newContacts.push({
                    id: crypto.randomUUID(),
                    jobId: job.id,
                    name: 'Unknown (needs enrichment)',
                    title: 'Hiring Manager / Recruiter',
                    company: job.company,
                    linkedInUrl: undefined,
                    email: undefined,
                    source: 'manual',
                    status: 'new',
                    createdAt: now,
                    updatedAt: now
                });
            }
        });

        return newContacts;
    };

    const handleEnrich = async () => {
        setIsEnriching(true);

        // Simulate enrichment delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newContacts = extractContactsFromPosters();
        addContacts(newContacts);
        updateStepStatus('enrich', 'completed');
        setIsEnriching(false);
    };

    const handleEditContact = (contact: Contact) => {
        setEditingContactId(contact.id);
        setEditForm({
            name: contact.name,
            title: contact.title,
            linkedInUrl: contact.linkedInUrl,
            email: contact.email,
            phone: contact.phone
        });
    };

    const handleSaveContact = () => {
        if (editingContactId && editForm) {
            updateContact(editingContactId, editForm);
            setEditingContactId(null);
            setEditForm({});
        }
    };

    const handleCancelEdit = () => {
        setEditingContactId(null);
        setEditForm({});
    };

    const getJobForContact = (contact: Contact): JobPost | undefined => {
        return qualifiedJobs.find(j => j.id === contact.jobId);
    };

    return (
        <div className="space-y-6">
            {/* Enrichment Panel */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-600" />
                        Contact Enrichment
                    </h2>

                    <button
                        onClick={handleEnrich}
                        disabled={isEnriching || qualifiedJobs.length === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isEnriching
                                ? 'bg-green-100 text-green-600'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                    >
                        <Sparkles className={`w-4 h-4 ${isEnriching ? 'animate-pulse' : ''}`} />
                        {isEnriching ? 'Extracting Contacts...' : 'Extract from Job Posters'}
                    </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    Extract contact information from job posters. For jobs without poster info, you'll need to manually add contacts or use enrichment tools.
                </p>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-gray-900">{qualifiedJobs.length}</p>
                        <p className="text-sm text-gray-500">Qualified Jobs</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{stats.fromJobPoster}</p>
                        <p className="text-sm text-gray-500">From Posters</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">{stats.fromEnrichment}</p>
                        <p className="text-sm text-gray-500">Enriched</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-amber-600">
                            {contacts.filter(c => !c.email && !c.linkedInUrl).length}
                        </p>
                        <p className="text-sm text-gray-500">Needs Info</p>
                    </div>
                </div>
            </div>

            {/* Contacts List */}
            {contacts.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">
                        Contacts ({contacts.length})
                    </h2>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {contacts.map((contact) => {
                            const job = getJobForContact(contact);
                            const isEditing = editingContactId === contact.id;
                            const hasContactInfo = contact.linkedInUrl || contact.email;

                            return (
                                <div
                                    key={contact.id}
                                    className={`border rounded-lg p-4 transition-all ${hasContactInfo ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            {isEditing ? (
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-xs text-gray-500">Name</label>
                                                            <input
                                                                type="text"
                                                                value={editForm.name || ''}
                                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-500">Title</label>
                                                            <input
                                                                type="text"
                                                                value={editForm.title || ''}
                                                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500">LinkedIn URL</label>
                                                        <input
                                                            type="text"
                                                            value={editForm.linkedInUrl || ''}
                                                            onChange={(e) => setEditForm({ ...editForm, linkedInUrl: e.target.value })}
                                                            placeholder="https://linkedin.com/in/..."
                                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-xs text-gray-500">Email</label>
                                                            <input
                                                                type="email"
                                                                value={editForm.email || ''}
                                                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                                placeholder="email@company.com"
                                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-500">Phone</label>
                                                            <input
                                                                type="tel"
                                                                value={editForm.phone || ''}
                                                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                                placeholder="+1 234 567 8900"
                                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleSaveContact}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                                                        >
                                                            <Save className="w-4 h-4" />
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                                                        >
                                                            <X className="w-4 h-4" />
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        {hasContactInfo ? (
                                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                                        ) : (
                                                            <AlertCircle className="w-5 h-5 text-amber-500" />
                                                        )}
                                                        <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${contact.source === 'job_poster'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            {contact.source === 'job_poster' ? 'From Job Post' : 'Manual'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-1">{contact.title}</p>
                                                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Building2 className="w-3.5 h-3.5" />
                                                            {contact.company}
                                                        </span>
                                                    </div>

                                                    {/* Contact Methods */}
                                                    <div className="flex items-center gap-3 mt-3">
                                                        {contact.linkedInUrl ? (
                                                            <a
                                                                href={contact.linkedInUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                                                            >
                                                                <Linkedin className="w-4 h-4" />
                                                                LinkedIn
                                                                <ExternalLink className="w-3 h-3 ml-1" />
                                                            </a>
                                                        ) : (
                                                            <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg text-sm">
                                                                <Linkedin className="w-4 h-4" />
                                                                No LinkedIn
                                                            </span>
                                                        )}

                                                        {contact.email ? (
                                                            <span className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                                                                <Mail className="w-4 h-4" />
                                                                {contact.email}
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg text-sm">
                                                                <Mail className="w-4 h-4" />
                                                                No Email
                                                            </span>
                                                        )}

                                                        {contact.phone && (
                                                            <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm">
                                                                <Phone className="w-4 h-4" />
                                                                {contact.phone}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Job Context */}
                                                    {job && (
                                                        <div className="mt-3 text-xs text-gray-500">
                                                            Hiring for: <span className="font-medium text-gray-700">{job.title}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {!isEditing && (
                                            <button
                                                onClick={() => handleEditContact(contact)}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                title="Edit Contact"
                                            >
                                                <Edit2 className="w-4 h-4 text-gray-500" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {contacts.length === 0 && qualifiedJobs.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Extract Contacts</h3>
                    <p className="text-gray-500 max-w-md mx-auto mb-6">
                        You have {qualifiedJobs.length} qualified jobs. Click "Extract from Job Posters" to pull contact information.
                    </p>
                    <button
                        onClick={handleEnrich}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                        <Sparkles className="w-5 h-5" />
                        Extract Contacts
                    </button>
                </div>
            )}

            {/* Continue Button */}
            {contacts.filter(c => c.linkedInUrl || c.email).length > 0 && (
                <div className="flex justify-end">
                    <button
                        onClick={goToNextStep}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        Continue with {contacts.filter(c => c.linkedInUrl || c.email).length} Contacts
                    </button>
                </div>
            )}
        </div>
    );
}
