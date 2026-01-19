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


    // Export
    googleSheets: {
        enabled: boolean;
        spreadsheetId: string;
        clientId?: string;
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

export interface PromptConfig {
    qualify: string;
    compose_sys_instruction: string;
    compose_1st_touch: string;
    compose_2nd_followup: string;
    compose_3rd_followup: string;
    compose_final_touch: string;
}

interface SettingsState {
    businessContext: BusinessContext;
    integrations: IntegrationConfig;
    safety: SafetySettings;
    prompts: PromptConfig;

    // Actions
    updateBusinessContext: (updates: Partial<BusinessContext>) => void;
    updateIntegrations: (updates: Partial<IntegrationConfig>) => void;
    updateSafety: (updates: Partial<SafetySettings>) => void;
    toggleTech: (category: keyof BusinessContext['techStack'], tech: string) => void;
    addValueProp: (prop: string) => void;
    removeValueProp: (index: number) => void;
    addCaseStudy: (study: string) => void;
    removeCaseStudy: (index: number) => void;
    updatePrompt: (key: keyof PromptConfig, value: string) => void;
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
    apify: { enabled: false, apiKey: process.env.NEXT_PUBLIC_APIFY_API_KEY || '', actorId: 'bebity/linkedin-jobs-scraper' },
    clay: { enabled: true, apiKey: process.env.NEXT_PUBLIC_CLAY_API_KEY || '' },
    apollo: { enabled: false, apiKey: process.env.NEXT_PUBLIC_APOLLO_API_KEY || '' },
    hunter: { enabled: false, apiKey: process.env.NEXT_PUBLIC_HUNTER_API_KEY || '' },
    gemini: { enabled: true, apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '', model: 'gemini-2.5-flash' },

    googleSheets: { enabled: false, spreadsheetId: process.env.NEXT_PUBLIC_SHEETS_ID || '', clientId: process.env.NEXT_PUBLIC_SHEETS_CLIENT_ID || '' }
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

const DEFAULT_QUALIFY_PROMPT = `Task: Classify Job Work Mode, Extract Prioritized Tech Skills, and Qualify

You must analyze the title, location, and description fields for EVERY job entry.

=== 1. WORK MODE CLASSIFICATION ===
Use the following strict logic to classify each job:

**REMOTE**
Classify as "remote" if you find keywords such as:
* "Remote", "Work from home", "WFH", "Work from anywhere", "Home-based", "Virtual", "Telecommute", "Fully distributed"
* "Remote first"
* *Crucial Check:* Look for "Remote" explicitly mentioned in the location field or title.

**HYBRID**
Classify as "hybrid" if you find keywords such as:
* "Hybrid", "Flexible work", "Mix of office and home", "X days in office", "Office occasionally"

**ON-SITE**
Classify as "onsite" if the description explicitly states:
* "On-site", "Work from office", "In-office"
* *Default Logic:* If none of the above are found, and a specific physical location is provided, classify as "onsite".

=== 2. TECH SKILLS EXTRACTION & PRIORITIZATION ===
Extract an EXHAUSTIVE list of all technical skills, programming languages, frameworks, libraries, databases, cloud platforms, tools, CI/CD, and methodologies mentioned in the job description.
**Do not summarize.** List every specific technology found.
**Crucial Ordering Rule:** You must return a single list sorted by importance so the downstream application can calculate a match score.

1. **Top Priority (Index 0-N):** Skills listed in the **Job Title**, **"Must Have"**, **"Required Qualifications"**, or **"Core Responsibilities"**.
2. **Lower Priority:** Skills listed in **"Nice to have"**, **"Bonus points"**, **"Preferred"**, or "Pluses".

*Format:* Return a flat array of strings. The most critical skills must appear at the beginning of the array.

=== 3. QUALIFICATION LOGIC ===
For the purpose of this output, a job is **qualified** based solely on location availability.

* **Qualified = TRUE** if the classification is **"remote"**.
* **Qualified = FALSE** if the classification is "hybrid" or "onsite".

*(Note: The downstream app will perform the 50% skills matching logic using the extracted techSkills list).*

=== JOBS TO ANALYZE ===
{{jobsData}}

=== OUTPUT FORMAT ===
Return ONLY a valid JSON array:
[
  {
    "jobId": "string",
    "qualified": boolean,
    "confidence": number,
    "reason": "string",
    "extractedData": {
      "isRemote": boolean,
      "workLocation": "remote" | "hybrid" | "onsite",
      "detectedFrom": "title" | "location" | "description" | "none",
      "remoteEvidence": "string | null",
      "techSkills": ["string"]
    }
  }
]`;

// Compose Templates Defaults
// Compose Templates Defaults
const DEFAULT_COMPOSE_SYS_INSTRUCTION = `SYSTEM / ROLE
You are an elite LinkedIn SDR + hiring-adjacent advisor for Siema. Your job is to generate a 3-message outreach SEQUENCE from {{senderName}} ({{senderTitle}}) to {{contactName}} ({{contactTitle}}) at {{contactCompany}}.

SIEMA CONTEXT (use this in messaging)
- Offer: On-demand senior engineers / outcome-driven pods (not outsourcing, not “butts in seats”).
- Core value props:
  1) Top-tier seniors only: ~3.4% acceptance rate (high bar).
  2) ~50% lower burn vs typical local senior hiring; often framed as ~53% savings (cost efficiency for senior output, not cheap labor).
  3) Fast deployment: bench-to-start in ~48 hours; designed to get someone productive fast.
  4) Enterprise trust: ISO 27001 / SOC 2 Type II / GDPR-ready.
- Messaging thesis: “Don’t hire seats. Hire outcomes.” Emphasize first-week outcomes + governance + speed + reduced risk.

TONE
Direct, human, helpful, slightly blunt. No hype words (“world-class”, “revolutionary”, etc.). No robotic formatting. Short lines. Confident but not pushy.

INPUTS
- Persona: {{personaType}}
- Relationship: {{relationshipState}}
- Trigger: {{triggerSignal}}
- Job: {{jobTitle}} ({{jobTechStack}})
- Urgency: {{urgencyLevel}}

HARD RULES (Global)
1) Each message must reference 1 concrete detail from the job post (stack, responsibility, seniority, timeline, etc.).
2) No meeting ask in Msg1. Only micro-yes CTA (Yes/No or A/B/C).
3) No links. No attachments mentioned. No emojis unless the tone explicitly calls for it.`;

const DEFAULT_COMPOSE_1ST = `Task: Write Message 1 (LinkedIn Connection Note or 1st DM).
Rules:
- If relationshipState is 'not_connected', write a connection note (max 300 chars).
- If 'request_sent' or 'connected', write a direct message (max 650 chars).
- Proven Angle: 48h deploy OR direction-check framing.
- Offer ONE micro-asset: “2–3 profile sampler pack” or “48h start plan”.
- No meeting ask.

Output: Return ONLY the message body text.`;

const DEFAULT_COMPOSE_2ND = `Task: Write Message 2 (2-3 days later).
Assumption: They did not reply to Message 1.
Rules:
- Proven Angle: Quality bar (3.4% acceptance) OR Trust (ISO/SOC2/GDPR).
- If urgencyLevel is 'high', pivot to "bench drop: available Monday".
- Keep it short (max 400 chars).

Output: Return ONLY the message body text.`;

const DEFAULT_COMPOSE_3RD = `Task: Write Message 3 (5-7 days later).
Assumption: They did not reply to Message 2.
Rules:
- Proven Angle: Cost efficiency (~50% burn / ~53% savings).
- CTA: "Start Monday" check or permission to close file.

Output: Return ONLY the message body text.`;

const DEFAULT_COMPOSE_FINAL = `Task: Write Message 4 (Break-up / Final Touch).
Assumption: No reply after 3 attempts.
Rules:
- Professional closing.
- Leave the door open but stop following up.
- One-liner.

Output: Return ONLY the message body text.`;

const defaultPrompts: PromptConfig = {
    qualify: DEFAULT_QUALIFY_PROMPT,
    compose_sys_instruction: DEFAULT_COMPOSE_SYS_INSTRUCTION,
    compose_1st_touch: DEFAULT_COMPOSE_1ST,
    compose_2nd_followup: DEFAULT_COMPOSE_2ND,
    compose_3rd_followup: DEFAULT_COMPOSE_3RD,
    compose_final_touch: DEFAULT_COMPOSE_FINAL
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            businessContext: defaultBusinessContext,
            integrations: defaultIntegrations,
            safety: defaultSafety,
            prompts: defaultPrompts,

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
                })),

            updatePrompt: (key: keyof PromptConfig, value: string) =>
                set((state: SettingsState) => ({
                    prompts: { ...state.prompts, [key]: value }
                })),
        }),
        {
            name: 'outreach-settings-v2', // Keeping store name to avoid data reset
            version: 7, // Bump version to trigger migration check for new prompts
            migrate: (persistedState: any, version: number) => {
                // IMPORTANT: Always preserve API keys during migration!
                const preservedApiKeys = {
                    gemini: persistedState?.integrations?.gemini?.apiKey || '',
                    apify: persistedState?.integrations?.apify?.apiKey || '',
                    clay: persistedState?.integrations?.clay?.apiKey || '',
                    apollo: persistedState?.integrations?.apollo?.apiKey || '',
                    hunter: persistedState?.integrations?.hunter?.apiKey || '',
                };

                let state = persistedState;

                // Migration from versions < 4
                if (version < 4) {
                    state = {
                        ...defaultBusinessContext,
                        ...state, // Keep existing state
                        integrations: {
                            ...defaultIntegrations,
                            ...state?.integrations,
                            // Ensure API keys are preserved even if object structure changed
                            gemini: { ...defaultIntegrations.gemini, ...(state?.integrations?.gemini || {}), apiKey: preservedApiKeys.gemini || state?.integrations?.gemini?.apiKey || '' },
                            apify: { ...defaultIntegrations.apify, ...(state?.integrations?.apify || {}), apiKey: preservedApiKeys.apify || state?.integrations?.apify?.apiKey || '' },
                        },
                        prompts: {
                            ...defaultPrompts, // Ensure new prompt keys exist
                            ...(state?.prompts || {})
                        }
                    };
                }

                // Migration to version 5: Update Qualify Prompt to new exhaustive version
                if (version < 5) {
                    state = {
                        ...state,
                        prompts: {
                            ...(state.prompts || {}),
                            qualify: DEFAULT_QUALIFY_PROMPT
                        }
                    };
                }

                // Migration to version 6: Add Compose System Instruction
                if (version < 6) {
                    state = {
                        ...state,
                        prompts: {
                            ...(state.prompts || {}),
                            compose_sys_instruction: DEFAULT_COMPOSE_SYS_INSTRUCTION,
                            compose_1st_touch: DEFAULT_COMPOSE_1ST,
                            compose_2nd_followup: DEFAULT_COMPOSE_2ND,
                            compose_3rd_followup: DEFAULT_COMPOSE_3RD,
                            compose_final_touch: DEFAULT_COMPOSE_FINAL
                        }
                    };
                }

                // Migration to version 7: Update Compose System & Logic to Elite Strategy
                if (version < 7) {
                    state = {
                        ...state,
                        prompts: {
                            ...(state.prompts || {}),
                            compose_sys_instruction: DEFAULT_COMPOSE_SYS_INSTRUCTION,
                            compose_1st_touch: DEFAULT_COMPOSE_1ST,
                            compose_2nd_followup: DEFAULT_COMPOSE_2ND,
                            compose_3rd_followup: DEFAULT_COMPOSE_3RD,
                            compose_final_touch: DEFAULT_COMPOSE_FINAL
                        }
                    };
                }

                return state;
            },
            // Improved merge strategy for deep merging integrations
            merge: (persistedState: any, currentState: any) => {
                const mergedIntegrations = { ...currentState.integrations };

                if (persistedState?.integrations) {
                    for (const key in persistedState.integrations) {
                        // @ts-ignore
                        if (mergedIntegrations[key]) {
                            // @ts-ignore
                            mergedIntegrations[key] = {
                                // @ts-ignore
                                ...mergedIntegrations[key],
                                ...persistedState.integrations[key]
                            };
                        }
                    }
                }

                return {
                    ...currentState,
                    ...persistedState,
                    integrations: mergedIntegrations,
                    prompts: {
                        ...currentState.prompts,
                        ...(persistedState?.prompts || {})
                    }
                };
            }
        }
    )
);
