'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Settings,
    Building2,
    Code2,
    MessageSquare,
    Shield,
    Plug,
    ChevronRight,
    Check,
    Plus,
    X,
    Save,
    ArrowLeft,
    Brain
} from 'lucide-react';
import { useSettingsStore, TECH_CATEGORIES } from '../../store/settingsStore';

type SettingsTab = 'business' | 'integrations' | 'safety' | 'prompts';

export default function SettingsPage() {
    console.log('App Version: v1.8 (Prompts & Logic)');
    const [activeTab, setActiveTab] = useState<SettingsTab>('business');
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/workflow"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-2"
                            title="Back to Workflow"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                            <Settings className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
                            <p className="text-sm text-gray-500">Configure your outreach platform</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${saved
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {saved ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto py-8 px-6">
                <div className="flex gap-8">
                    {/* Sidebar Navigation */}
                    <nav className="w-64 shrink-0">
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            {[
                                { id: 'business', label: 'Business Context', icon: Building2, desc: 'Company & tech stack' },
                                { id: 'integrations', label: 'Integrations', icon: Plug, desc: 'APIs & connections' },
                                { id: 'safety', label: 'Safety & Limits', icon: Shield, desc: 'Rate limits & rules' },
                                { id: 'prompts', label: 'Prompts & Logic', icon: Brain, desc: 'AI prompts & steps' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                                    className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-all ${activeTab === tab.id
                                        ? 'bg-blue-50 border-l-4 border-blue-600'
                                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                                        }`}
                                >
                                    <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
                                    <div className="flex-1">
                                        <p className={`font-medium ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-700'}`}>
                                            {tab.label}
                                        </p>
                                        <p className="text-xs text-gray-500">{tab.desc}</p>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-300'}`} />
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 text-center mt-4">v1.8 (Prompts)</p>
                    </nav>

                    {/* Main Content */}
                    <main className="flex-1">
                        {activeTab === 'business' && <BusinessContextTab />}
                        {activeTab === 'integrations' && <IntegrationsTab />}
                        {activeTab === 'safety' && <SafetyTab />}
                        {activeTab === 'prompts' && <PromptsTab />}
                    </main>
                </div>
            </div>
        </div>
    );
}

// Business Context Tab
function BusinessContextTab() {
    const { businessContext, updateBusinessContext, toggleTech, addValueProp, removeValueProp, addCaseStudy, removeCaseStudy } = useSettingsStore();
    const [newValueProp, setNewValueProp] = useState('');
    const [newCaseStudy, setNewCaseStudy] = useState('');

    return (
        <div className="space-y-6">
            {/* Company Profile */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    Company Profile
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                        <input
                            type="text"
                            value={businessContext.companyName}
                            onChange={(e) => updateBusinessContext({ companyName: e.target.value })}
                            placeholder="Your Agency Name"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">What We Do</label>
                        <textarea
                            value={businessContext.whatWeDo}
                            onChange={(e) => updateBusinessContext({ whatWeDo: e.target.value })}
                            rows={4}
                            placeholder="Describe your agency and value proposition..."
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black"
                        />
                        <p className="text-xs text-gray-500 mt-1">This context is injected into AI message generation</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name</label>
                            <input
                                type="text"
                                value={businessContext.senderName}
                                onChange={(e) => updateBusinessContext({ senderName: e.target.value })}
                                placeholder="John Smith"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sender Title</label>
                            <input
                                type="text"
                                value={businessContext.senderTitle}
                                onChange={(e) => updateBusinessContext({ senderTitle: e.target.value })}
                                placeholder="Business Development"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tone of Voice</label>
                        <div className="flex gap-2">
                            {['casual', 'professional', 'consultative'].map((tone) => (
                                <button
                                    key={tone}
                                    onClick={() => updateBusinessContext({ toneOfVoice: tone as any })}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${businessContext.toneOfVoice === tone
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {tone}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Tech Stack */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-blue-600" />
                    Talent We Provide
                </h2>
                <p className="text-sm text-gray-500 mb-4">Select technologies your team can deliver. This is used to match jobs and personalize outreach.</p>

                <div className="grid grid-cols-2 gap-6">
                    {Object.entries(TECH_CATEGORIES).map(([category, techs]) => (
                        <div key={category}>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2 capitalize">{category}</h3>
                            <div className="flex flex-wrap gap-2">
                                {techs.map((tech) => {
                                    const isSelected = businessContext.techStack[category as keyof typeof businessContext.techStack]?.includes(tech);
                                    return (
                                        <button
                                            key={tech}
                                            onClick={() => toggleTech(category as any, tech)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isSelected
                                                ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-600 ring-offset-1'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                                            {tech}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Value Propositions */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    Value Propositions
                </h2>
                <p className="text-sm text-gray-500 mb-4">Key selling points used in message generation</p>

                <div className="space-y-2 mb-4">
                    {businessContext.valueProps.map((prop, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
                            <span className="text-sm text-gray-700 flex-1">{prop}</span>
                            <button
                                onClick={() => removeValueProp(index)}
                                className="p-1 hover:bg-gray-200 rounded"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newValueProp}
                        onChange={(e) => setNewValueProp(e.target.value)}
                        placeholder="Add a value proposition..."
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && newValueProp.trim()) {
                                addValueProp(newValueProp.trim());
                                setNewValueProp('');
                            }
                        }}
                    />
                    <button
                        onClick={() => {
                            if (newValueProp.trim()) {
                                addValueProp(newValueProp.trim());
                                setNewValueProp('');
                            }
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </section>

            {/* Case Studies */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Case Studies & Social Proof</h2>
                <p className="text-sm text-gray-500 mb-4">Examples and testimonials to reference in outreach</p>

                <div className="space-y-2 mb-4">
                    {businessContext.caseStudies.map((study, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
                            <span className="text-sm text-gray-700 flex-1">{study}</span>
                            <button
                                onClick={() => removeCaseStudy(index)}
                                className="p-1 hover:bg-gray-200 rounded"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    ))}
                    {businessContext.caseStudies.length === 0 && (
                        <p className="text-sm text-gray-400 italic">No case studies added yet</p>
                    )}
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newCaseStudy}
                        onChange={(e) => setNewCaseStudy(e.target.value)}
                        placeholder="e.g., Helped [Client] ship their MVP in 6 weeks..."
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && newCaseStudy.trim()) {
                                addCaseStudy(newCaseStudy.trim());
                                setNewCaseStudy('');
                            }
                        }}
                    />
                    <button
                        onClick={() => {
                            if (newCaseStudy.trim()) {
                                addCaseStudy(newCaseStudy.trim());
                                setNewCaseStudy('');
                            }
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </section>

            {/* Qualification Criteria */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Qualification Criteria</h2>
                <p className="text-sm text-gray-500 mb-4">Auto-applied filters for lead qualification</p>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Min Company Size</label>
                        <input
                            type="number"
                            value={businessContext.qualification.minCompanySize}
                            onChange={(e) => updateBusinessContext({
                                qualification: { ...businessContext.qualification, minCompanySize: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Company Size</label>
                        <input
                            type="number"
                            value={businessContext.qualification.maxCompanySize}
                            onChange={(e) => updateBusinessContext({
                                qualification: { ...businessContext.qualification, maxCompanySize: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cooldown Period (days)</label>
                        <input
                            type="number"
                            value={businessContext.qualification.cooldownDays}
                            onChange={(e) => updateBusinessContext({
                                qualification: { ...businessContext.qualification, cooldownDays: parseInt(e.target.value) || 90 }
                            })}
                            className="w-32 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        />
                        <p className="text-xs text-gray-500 mt-1">Don't re-contact same person within this period</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

// Integrations Tab
function IntegrationsTab() {
    const { integrations, updateIntegrations } = useSettingsStore();

    const IntegrationCard = ({
        name,
        description,
        enabled,
        onToggle,
        children
    }: {
        name: string;
        description: string;
        enabled: boolean;
        onToggle: () => void;
        children?: React.ReactNode;
    }) => (
        <div className={`border rounded-xl p-4 transition-all ${enabled ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="font-semibold text-gray-900">{name}</h3>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>
                <button
                    onClick={onToggle}
                    className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'left-7' : 'left-1'}`} />
                </button>
            </div>
            {enabled && children && <div className="mt-3 pt-3 border-t border-gray-200">{children}</div>}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Data Sources */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Data Sources</h2>
                <div className="space-y-4">
                    <IntegrationCard
                        name="Apify"
                        description="LinkedIn Jobs Scraper"
                        enabled={integrations.apify.enabled}
                        onToggle={() => updateIntegrations({ apify: { ...integrations.apify, enabled: !integrations.apify.enabled } })}
                    >
                        <div className="space-y-3">
                            <input
                                type="password"
                                placeholder="API Key"
                                value={integrations.apify.apiKey}
                                onChange={(e) => updateIntegrations({ apify: { ...integrations.apify, apiKey: e.target.value } })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                            <input
                                type="text"
                                placeholder="Actor ID"
                                value={integrations.apify.actorId}
                                onChange={(e) => updateIntegrations({ apify: { ...integrations.apify, actorId: e.target.value } })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                    </IntegrationCard>
                </div>
            </section>

            {/* Enrichment */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Enrichment</h2>
                <div className="space-y-4">
                    <IntegrationCard
                        name="Clay"
                        description="Data enrichment platform"
                        enabled={integrations.clay.enabled}
                        onToggle={() => updateIntegrations({ clay: { ...integrations.clay, enabled: !integrations.clay.enabled } })}
                    >
                        <input
                            type="password"
                            placeholder="API Key"
                            value={integrations.clay.apiKey}
                            onChange={(e) => updateIntegrations({ clay: { ...integrations.clay, apiKey: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </IntegrationCard>

                    <IntegrationCard
                        name="Apollo"
                        description="Contact & company data"
                        enabled={integrations.apollo.enabled}
                        onToggle={() => updateIntegrations({ apollo: { ...integrations.apollo, enabled: !integrations.apollo.enabled } })}
                    >
                        <input
                            type="password"
                            placeholder="API Key"
                            value={integrations.apollo.apiKey}
                            onChange={(e) => updateIntegrations({ apollo: { ...integrations.apollo, apiKey: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </IntegrationCard>

                    <IntegrationCard
                        name="Hunter.io"
                        description="Email finder"
                        enabled={integrations.hunter.enabled}
                        onToggle={() => updateIntegrations({ hunter: { ...integrations.hunter, enabled: !integrations.hunter.enabled } })}
                    >
                        <input
                            type="password"
                            placeholder="API Key"
                            value={integrations.hunter.apiKey}
                            onChange={(e) => updateIntegrations({ hunter: { ...integrations.hunter, apiKey: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </IntegrationCard>
                </div>
            </section>

            {/* AI Providers */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">AI Providers</h2>
                <div className="space-y-4">
                    <IntegrationCard
                        name="Google Gemini"
                        description="Message generation & qualification"
                        enabled={integrations.gemini.enabled}
                        onToggle={() => updateIntegrations({ gemini: { ...integrations.gemini, enabled: !integrations.gemini.enabled } })}
                    >
                        <div className="space-y-3">
                            <input
                                type="password"
                                placeholder="API Key"
                                value={integrations.gemini.apiKey}
                                onChange={(e) => updateIntegrations({ gemini: { ...integrations.gemini, apiKey: e.target.value } })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            />
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-gray-500 font-medium">Model</label>
                                <select
                                    value={integrations.gemini.model || 'gemini-2.5-flash'}
                                    onChange={(e) => updateIntegrations({ gemini: { ...integrations.gemini, model: e.target.value } })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white"
                                >
                                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
                                    <option value="gemini-2.5-flash-preview-09-2025">Gemini 2.5 Flash Preview</option>
                                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                    <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
                                </select>
                            </div>
                        </div>
                    </IntegrationCard>
                </div>
            </section>

            {/* Export */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Export</h2>
                <div className="space-y-4">
                    <IntegrationCard
                        name="Google Sheets"
                        description="Export to spreadsheet"
                        enabled={integrations.googleSheets.enabled}
                        onToggle={() => updateIntegrations({ googleSheets: { ...integrations.googleSheets, enabled: !integrations.googleSheets.enabled } })}
                    >
                        <input
                            type="text"
                            placeholder="Spreadsheet ID"
                            value={integrations.googleSheets.spreadsheetId}
                            onChange={(e) => updateIntegrations({ googleSheets: { ...integrations.googleSheets, spreadsheetId: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                        <input
                            type="text"
                            placeholder="Client ID (OAuth 2.0)"
                            value={integrations.googleSheets.clientId || ''}
                            onChange={(e) => updateIntegrations({ googleSheets: { ...integrations.googleSheets, clientId: e.target.value } })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-black mt-3"
                        />
                        <p className="text-xs text-gray-500 mt-1">Required for writing to Sheets. Create in Google Cloud Console.</p>
                    </IntegrationCard>
                </div>
            </section>
        </div>
    );
}

// Safety Tab
function SafetyTab() {
    const { safety, updateSafety } = useSettingsStore();

    return (
        <div className="space-y-6">
            {/* Daily Limits */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Daily Limits
                </h2>
                <p className="text-sm text-gray-500 mb-4">Prevent LinkedIn account restrictions</p>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Connections</label>
                        <input
                            type="number"
                            value={safety.dailyLimits.linkedinConnections}
                            onChange={(e) => updateSafety({
                                dailyLimits: { ...safety.dailyLimits, linkedinConnections: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-black"
                        />
                        <p className="text-xs text-gray-500 mt-1">Recommended: 20-25</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Messages</label>
                        <input
                            type="number"
                            value={safety.dailyLimits.linkedinMessages}
                            onChange={(e) => updateSafety({
                                dailyLimits: { ...safety.dailyLimits, linkedinMessages: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-black"
                        />
                        <p className="text-xs text-gray-500 mt-1">Recommended: 50</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Emails</label>
                        <input
                            type="number"
                            value={safety.dailyLimits.emails}
                            onChange={(e) => updateSafety({
                                dailyLimits: { ...safety.dailyLimits, emails: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-black"
                        />
                        <p className="text-xs text-gray-500 mt-1">Recommended: 100</p>
                    </div>
                </div>
            </section>

            {/* Sequence Timing */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Sequence Timing</h2>
                <p className="text-sm text-gray-500 mb-4">Days to wait between follow-ups</p>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">1st Follow-up</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={safety.sequenceTiming.firstFollowupDays}
                                onChange={(e) => updateSafety({
                                    sequenceTiming: { ...safety.sequenceTiming, firstFollowupDays: parseInt(e.target.value) || 3 }
                                })}
                                className="w-20 px-4 py-2 border border-gray-200 rounded-lg text-black"
                            />
                            <span className="text-sm text-gray-500">days</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">2nd Follow-up</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={safety.sequenceTiming.secondFollowupDays}
                                onChange={(e) => updateSafety({
                                    sequenceTiming: { ...safety.sequenceTiming, secondFollowupDays: parseInt(e.target.value) || 7 }
                                })}
                                className="w-20 px-4 py-2 border border-gray-200 rounded-lg text-black"
                            />
                            <span className="text-sm text-gray-500">days</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">3rd Follow-up</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={safety.sequenceTiming.thirdFollowupDays}
                                onChange={(e) => updateSafety({
                                    sequenceTiming: { ...safety.sequenceTiming, thirdFollowupDays: parseInt(e.target.value) || 14 }
                                })}
                                className="w-20 px-4 py-2 border border-gray-200 rounded-lg text-black"
                            />
                            <span className="text-sm text-gray-500">days</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Opt-out Keywords */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Opt-out Detection</h2>
                <p className="text-sm text-gray-500 mb-4">Keywords that auto-mark contacts as opted out</p>

                <div className="flex flex-wrap gap-2">
                    {safety.optOutKeywords.map((keyword, index) => (
                        <span key={index} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">
                            {keyword}
                        </span>
                    ))}
                </div>
            </section>
        </div>
    );
}

// Prompts & Logic Tab
function PromptsTab() {
    const { prompts, updatePrompt } = useSettingsStore();
    const [activeNode, setActiveNode] = useState('qualify');
    const [composeTab, setComposeTab] = useState('1st_touch');

    const nodes = [
        { id: 'source', label: 'Source', desc: 'Job Import' },
        { id: 'qualify', label: 'Qualify', desc: 'AI Classification' },
        { id: 'enrich', label: 'Enrich', desc: 'Data Enrichment' },
        { id: 'compose', label: 'Compose', desc: 'Message Gen' },
        { id: 'export', label: 'Export', desc: 'Sync & CSV' }
    ];

    return (
        <div className="flex gap-6 min-h-[600px]">
            {/* Node Sidebar */}
            <div className="w-48 shrink-0 space-y-2">
                {nodes.map(node => (
                    <button
                        key={node.id}
                        onClick={() => setActiveNode(node.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${activeNode === node.id
                            ? 'bg-blue-50 text-blue-600 border border-blue-200'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        {node.label}
                        <p className="text-xs font-normal opacity-70">{node.desc}</p>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 p-6 overflow-y-auto">
                {activeNode === 'source' && (
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Source Node Logic</h3>
                        <p className="text-gray-600 mb-4">
                            Imports job posts from JSON files (e.g., from Apify LinkedIn Scraper or manual uploads).
                            Parses standard fields (Title, Company, Location, Date, Poster) and stores them in the workflow run.
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Prompt</span>
                            <p className="text-sm text-gray-500 mt-2 italic">No AI prompt used in this step.</p>
                        </div>
                    </div>
                )}
                {activeNode === 'qualify' && (
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Qualify Node Logic</h3>
                        <p className="text-gray-600 mb-4">
                            Uses Google Gemini AI to analyze job descriptions.
                            Determines if the job matches your configured work location preference (Remote/Hybrid/On-site) and tech stack.
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Gemini Prompt Template</label>
                            <div className="relative">
                                <textarea
                                    value={prompts.qualify}
                                    onChange={(e) => updatePrompt('qualify', e.target.value)}
                                    rows={20}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-xs leading-relaxed text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                                <span className="font-semibold">Available Variables:</span>
                                <span className="ml-2 font-mono bg-gray-100 px-1 rounded">{'{{companyName}}'}</span>
                                <span className="ml-2 font-mono bg-gray-100 px-1 rounded">{'{{techStack}}'}</span>
                                <span className="ml-2 font-mono bg-gray-100 px-1 rounded">{'{{workLocationCriteria}}'}</span>
                                <span className="ml-2 font-mono bg-gray-100 px-1 rounded">{'{{jobsData}}'}</span>
                            </div>
                        </div>
                    </div>
                )}
                {activeNode === 'enrich' && (
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Enrich Node Logic</h3>
                        <p className="text-gray-600 mb-4">
                            Enriches qualified leads using third-party providers (Clay, Apollo, Hunter) to find contact emails and additional company data.
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Prompt</span>
                            <p className="text-sm text-gray-500 mt-2 italic">No AI prompt used in this step (API integration only).</p>
                        </div>
                    </div>
                )}
                {activeNode === 'compose' && (
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Compose Node Logic</h3>
                        <p className="text-gray-600 mb-4">
                            Define the message templates used for outreach sequences. Use variables like <code>{'{{firstName}}'}</code> to inject contact data dynamically.
                        </p>

                        <div className="border-b border-gray-200 mb-4">
                            <div className="flex gap-4">
                                {['1st_touch', '2nd_followup', '3rd_followup', 'final_touch'].map(step => (
                                    <button
                                        key={step}
                                        onClick={() => setComposeTab(step)}
                                        className={`pb-2 text-sm font-medium transition-colors border-b-2 ${composeTab === step
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {step.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <textarea
                                // @ts-ignore
                                value={prompts[`compose_${composeTab}`]}
                                // @ts-ignore
                                onChange={(e) => updatePrompt(`compose_${composeTab}`, e.target.value)}
                                rows={12}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-xs leading-relaxed text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                            <span className="font-semibold">Available Variables:</span>
                            <span className="ml-2 font-mono bg-gray-100 px-1 rounded">{'{{firstName}}'}</span>
                            <span className="ml-2 font-mono bg-gray-100 px-1 rounded">{'{{company}}'}</span>
                            <span className="ml-2 font-mono bg-gray-100 px-1 rounded">{'{{jobTitle}}'}</span>
                            <span className="ml-2 font-mono bg-gray-100 px-1 rounded">{'{{techMatch}}'}</span>
                            <span className="ml-2 font-mono bg-gray-100 px-1 rounded">{'{{myCompany}}'}</span>
                            <span className="ml-2 font-mono bg-gray-100 px-1 rounded">{'{{valueProps}}'}</span>
                            <span className="ml-2 font-mono bg-gray-100 px-1 rounded">{'{{senderName}}'}</span>
                        </div>
                    </div>
                )}
                {activeNode === 'export' && (
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Export Node Logic</h3>
                        <p className="text-gray-600 mb-4">
                            Syncs final data to Google Sheets or downloads as CSV.
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Prompt</span>
                            <p className="text-sm text-gray-500 mt-2 italic">No AI prompt used in this step.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
