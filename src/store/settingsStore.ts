'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Tech stack categories
export const TECH_CATEGORIES = {
    frontend: ['React', 'Vue.js', 'Angular', 'Next.js', 'TypeScript', 'React Native'],
    backend: ['Node.js', 'Python', 'Java', '.NET', 'Go', 'Ruby on Rails', 'PHP'],
    devops: ['AWS', 'Azure', 'GCP', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD'],
    data: ['PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Data Engineering'],
    other: ['Full Stack', 'Mobile (iOS)', 'Mobile (Android)', 'AI/ML', 'Blockchain', 'QA/Testing']
};

export interface BusinessContext {
    // Company Info
    companyName: string;
    whatWeDo: string;

    // Tech Stack We Provide
    techStack: {
        frontend: string[];
        backend: string[];
        devops: string[];
        data: string[];
        other: string[];
    };

    // Value Propositions
    valueProps: string[];

    // Case Studies / Social Proof
    caseStudies: string[];

    // Messaging Preferences
    toneOfVoice: 'casual' | 'professional' | 'consultative';
    senderName: string;
    senderTitle: string;

    // Qualification Criteria
    qualification: {
        minCompanySize: number;
        maxCompanySize: number;
        excludeCompetitors: string[];
        excludeIndustries: string[];
        cooldownDays: number; // Don't re-contact within X days
        workLocation: 'remote' | 'hybrid' | 'onsite' | 'any'; // Work location preference
        posterRequired: 'required' | 'any'; // Whether job poster name is required
    };
}

export interface IntegrationConfig {
    // Data Sources
    apify: {
        enabled: boolean;
        apiKey: string;
        actorId: string;
    };

    // Enrichment
    clay: {
        enabled: boolean;
        apiKey: string;
    };
    apollo: {
        enabled: boolean;
        apiKey: string;
    };
    hunter: {
        enabled: boolean;
        apiKey: string;
    };

    // AI Providers
    gemini: {
        enabled: boolean;
        apiKey: string;
        model: string;
    };
    claude: {
        enabled: boolean;
        apiKey: string;
        model: string;
    };

    // Export
    googleSheets: {
        enabled: boolean;
        spreadsheetId: string;
    };
}

export interface SafetySettings {
    dailyLimits: {
        linkedinConnections: number;
        linkedinMessages: number;
        emails: number;
    };
    sequenceTiming: {
        firstFollowupDays: number;
        secondFollowupDays: number;
        thirdFollowupDays: number;
    };
    optOutKeywords: string[];
}

interface SettingsState {
    businessContext: BusinessContext;
    integrations: IntegrationConfig;
    safety: SafetySettings;

    // Actions
    updateBusinessContext: (updates: Partial<BusinessContext>) => void;
    updateIntegrations: (updates: Partial<IntegrationConfig>) => void;
    updateSafety: (updates: Partial<SafetySettings>) => void;
    toggleTech: (category: keyof BusinessContext['techStack'], tech: string) => void;
    addValueProp: (prop: string) => void;
    removeValueProp: (index: number) => void;
    addCaseStudy: (study: string) => void;
    removeCaseStudy: (index: number) => void;
}

const defaultBusinessContext: BusinessContext = {
    companyName: 'Siema',
    whatWeDo: 'We\'re an outsource software development agency that provides pre-vetted, senior developers for companies that need to scale their engineering teams quickly without the overhead of full-time hiring.',
    techStack: {
        frontend: ['React', 'Vue.js', 'Angular', 'Next.js', 'TypeScript'],
        backend: ['Node.js', 'Python', 'Java', '.NET', 'Go'],
        devops: ['AWS', 'Azure', 'GCP', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD'],
        data: ['PostgreSQL', 'MongoDB'],
        other: ['Full Stack', 'QA/Testing']
    },
    valueProps: [
        'Pre-vetted senior developers (no interviewing dozens of candidates)',
        'Start in 1-2 weeks (vs 2-3 months for full-time hire)',
        'Flexible engagement (scale up/down as needed)',
        'Cost-effective (no benefits, equipment, overhead)',
        'Your timezone coverage'
    ],
    caseStudies: [],
    toneOfVoice: 'casual',
    senderName: 'Miki Gur',
    senderTitle: 'Head of Talent',
    qualification: {
        minCompanySize: 10,
        maxCompanySize: 500,
        excludeCompetitors: [],
        excludeIndustries: [],
        cooldownDays: 90,
        workLocation: 'remote', // Default to remote only
        posterRequired: 'any' // Default to any (not required)
    }
};

const defaultIntegrations: IntegrationConfig = {
    apify: { enabled: false, apiKey: '', actorId: 'bebity/linkedin-jobs-scraper' },
    clay: { enabled: true, apiKey: '' },
    apollo: { enabled: false, apiKey: '' },
    hunter: { enabled: false, apiKey: '' },
    gemini: { enabled: true, apiKey: '', model: 'gemini-1.5-pro' },
    claude: { enabled: false, apiKey: '', model: 'claude-3-sonnet' },
    googleSheets: { enabled: false, spreadsheetId: '' }
};

const defaultSafety: SafetySettings = {
    dailyLimits: {
        linkedinConnections: 20,
        linkedinMessages: 50,
        emails: 100
    },
    sequenceTiming: {
        firstFollowupDays: 3,
        secondFollowupDays: 7,
        thirdFollowupDays: 14
    },
    optOutKeywords: ['unsubscribe', 'stop', 'remove me', 'opt out', 'not interested']
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            businessContext: defaultBusinessContext,
            integrations: defaultIntegrations,
            safety: defaultSafety,

            updateBusinessContext: (updates: Partial<BusinessContext>) =>
                set((state: SettingsState) => ({
                    businessContext: { ...state.businessContext, ...updates }
                })),

            updateIntegrations: (updates: Partial<IntegrationConfig>) =>
                set((state: SettingsState) => ({
                    integrations: { ...state.integrations, ...updates }
                })),

            updateSafety: (updates: Partial<SafetySettings>) =>
                set((state: SettingsState) => ({
                    safety: { ...state.safety, ...updates }
                })),

            toggleTech: (category: keyof BusinessContext['techStack'], tech: string) =>
                set((state: SettingsState) => {
                    const current = state.businessContext.techStack[category];
                    const updated = current.includes(tech)
                        ? current.filter((t: string) => t !== tech)
                        : [...current, tech];
                    return {
                        businessContext: {
                            ...state.businessContext,
                            techStack: {
                                ...state.businessContext.techStack,
                                [category]: updated
                            }
                        }
                    };
                }),

            addValueProp: (prop: string) =>
                set((state: SettingsState) => ({
                    businessContext: {
                        ...state.businessContext,
                        valueProps: [...state.businessContext.valueProps, prop]
                    }
                })),

            removeValueProp: (index: number) =>
                set((state: SettingsState) => ({
                    businessContext: {
                        ...state.businessContext,
                        valueProps: state.businessContext.valueProps.filter((_: string, i: number) => i !== index)
                    }
                })),

            addCaseStudy: (study: string) =>
                set((state: SettingsState) => ({
                    businessContext: {
                        ...state.businessContext,
                        caseStudies: [...state.businessContext.caseStudies, study]
                    }
                })),

            removeCaseStudy: (index: number) =>
                set((state: SettingsState) => ({
                    businessContext: {
                        ...state.businessContext,
                        caseStudies: state.businessContext.caseStudies.filter((_: string, i: number) => i !== index)
                    }
                }))
        }),
        {
            name: 'outreach-settings-v2',
            version: 2,
            migrate: (persistedState: any, version: number) => {
                // IMPORTANT: Always preserve API keys during migration!
                const preservedApiKeys = {
                    gemini: persistedState?.integrations?.gemini?.apiKey || '',
                    apify: persistedState?.integrations?.apify?.apiKey || '',
                    clay: persistedState?.integrations?.clay?.apiKey || '',
                    apollo: persistedState?.integrations?.apollo?.apiKey || '',
                    hunter: persistedState?.integrations?.hunter?.apiKey || '',
                    claude: persistedState?.integrations?.claude?.apiKey || ''
                };

                // If coming from v1 or no version, reset to new defaults but keep API keys
                if (version < 2) {
                    return {
                        businessContext: {
                            ...defaultBusinessContext,
                            // Preserve any existing business context
                            companyName: persistedState?.businessContext?.companyName || defaultBusinessContext.companyName,
                            whatWeDo: persistedState?.businessContext?.whatWeDo || defaultBusinessContext.whatWeDo,
                            senderName: persistedState?.businessContext?.senderName || defaultBusinessContext.senderName,
                            senderTitle: persistedState?.businessContext?.senderTitle || defaultBusinessContext.senderTitle
                        },
                        integrations: {
                            ...defaultIntegrations,
                            // Preserve ALL API keys
                            gemini: { ...defaultIntegrations.gemini, apiKey: preservedApiKeys.gemini },
                            apify: { ...defaultIntegrations.apify, apiKey: preservedApiKeys.apify },
                            clay: { ...defaultIntegrations.clay, apiKey: preservedApiKeys.clay },
                            apollo: { ...defaultIntegrations.apollo, apiKey: preservedApiKeys.apollo },
                            hunter: { ...defaultIntegrations.hunter, apiKey: preservedApiKeys.hunter },
                            claude: { ...defaultIntegrations.claude, apiKey: preservedApiKeys.claude }
                        },
                        safety: defaultSafety
                    };
                }
                return persistedState;
            },
            // Ensure API keys are merged properly on rehydration
            merge: (persistedState: any, currentState: any) => {
                return {
                    ...currentState,
                    ...persistedState,
                    integrations: {
                        ...currentState.integrations,
                        ...persistedState?.integrations
                    }
                };
            }
        }
    )
);
