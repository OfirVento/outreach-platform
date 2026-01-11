// Simplified 5-Step Workflow Types

export type WorkflowStep = 'source' | 'qualify' | 'enrich' | 'compose' | 'export';

export type StepStatus = 'pending' | 'running' | 'completed' | 'error' | 'skipped';

// Job Post Data (from LinkedIn scraping)
export interface JobPost {
    id: string;
    title: string;           // "Senior React Developer"
    company: string;         // "TechCorp Inc."
    companyLinkedIn?: string; // Company LinkedIn URL
    location: string;
    description: string;
    jobUrl: string;          // LinkedIn job URL
    postedDate?: string;
    scrapedAt: string;

    // Job Poster (Primary Contact when available)
    poster?: {
        name: string;
        title: string;
        linkedInUrl: string;
        profileImage?: string;
    };

    // Parsed from description
    techStack?: string[];
    seniorityLevel?: 'junior' | 'mid' | 'senior' | 'lead' | 'staff' | 'principal';
    isRemote?: boolean;
    companySize?: string;
}

// Contact Data (from enrichment or job poster)
export interface Contact {
    id: string;
    jobId: string;           // Reference to job post

    // Basic Info
    name: string;
    title: string;           // "Technical Recruiter", "VP Engineering"
    company: string;

    // Contact Methods
    linkedInUrl?: string;
    email?: string;
    phone?: string;

    // Source
    source: 'job_poster' | 'enrichment_clay' | 'enrichment_apollo' | 'manual';
    confidenceScore?: number; // 0-100

    // Status
    status: 'new' | 'pending' | 'contacted' | 'replied' | 'opted_out' | 'disqualified';
    lastContactedAt?: string;

    // Metadata
    createdAt: string;
    updatedAt: string;
}

// Generated Message
export interface GeneratedMessage {
    id: string;
    contactId: string;
    jobId: string;

    // Sequence Info
    sequenceStep: '1st_touch' | '2nd_followup' | '3rd_followup' | 'final_touch';
    channel: 'linkedin' | 'email' | 'both';

    // Content
    subject?: string;        // For emails
    message: string;

    // Personalization
    personalizationFacts: string[];

    // Send Info
    suggestedSendDate: string;
    status: 'draft' | 'approved' | 'sent' | 'failed';
    sentAt?: string;

    // Metadata
    createdAt: string;
}

// Export Row (for Google Sheets)
export interface ExportRow {
    // Status & Priority
    status: '🔵 Ready' | '🟡 In Progress' | '🟢 Replied' | '🔴 Opted Out' | '⚪ Skip';
    priority: '⭐ High' | 'Medium' | 'Low';

    // Sequence
    sequenceStep: string;    // "1st Touch", "2nd Follow-up"
    channel: string;         // "LinkedIn", "Email", "LI+Email"

    // Contact
    contactName: string;
    contactTitle: string;
    company: string;
    linkedInUrl: string;
    email: string;

    // Job Context
    jobTitle: string;        // The role they're hiring for
    techStack: string;       // Comma-separated

    // Message
    message: string;         // Ready to copy
    personalizationNotes: string;

    // Reference
    jobPostUrl: string;

    // Tracking
    suggestedSendDate: string;
    sentDate?: string;
    response?: string;
    notes?: string;
}

// Workflow State
export interface WorkflowRun {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;

    // Step Statuses
    steps: {
        source: { status: StepStatus; startedAt?: string; completedAt?: string; error?: string };
        qualify: { status: StepStatus; startedAt?: string; completedAt?: string; error?: string };
        enrich: { status: StepStatus; startedAt?: string; completedAt?: string; error?: string };
        compose: { status: StepStatus; startedAt?: string; completedAt?: string; error?: string };
        export: { status: StepStatus; startedAt?: string; completedAt?: string; error?: string };
    };

    // Current Step
    currentStep: WorkflowStep;

    // Data at each stage
    sourceData: {
        jobs: JobPost[];
        totalImported: number;
    };

    qualifyData: {
        qualifiedJobs: JobPost[];
        disqualifiedJobs: JobPost[];
        qualificationReasons: Record<string, string>; // jobId -> reason
    };

    enrichData: {
        contacts: Contact[];
        enrichmentStats: {
            fromJobPoster: number;
            fromEnrichment: number;
            failed: number;
        };
    };

    composeData: {
        messages: GeneratedMessage[];
        approvedCount: number;
    };

    exportData: {
        rows: ExportRow[];
        exportedAt?: string;
        spreadsheetUrl?: string;
    };

    // Summary Stats
    stats: {
        totalJobs: number;
        qualifiedJobs: number;
        totalContacts: number;
        totalMessages: number;
        readyToSend: number;
    };
}

// Legacy types for backwards compatibility
export type NodeType =
    | 'source'
    | 'qualify'
    | 'enrich'
    | 'compose'
    | 'export'
    // Legacy (to be removed)
    | 'linkedin_scrape'
    | 'job_extraction'
    | 'job_validation'
    | 'contact_enrichment'
    | 'message_generation'
    | 'linkedin_connection'
    | 'outreach_sequence'
    | 'manual_ingestion'
    | 'approval_gate'
    | 'status_dashboard';

export type NodeStatus = 'pending' | 'running' | 'completed' | 'approved' | 'error';

export interface WorkflowNode {
    id: string;
    type: NodeType;
    position: { x: number; y: number };
    data: {
        label: string;
        status: NodeStatus;
        config: any;
        output?: any;
        error?: string;
    };
}

export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
}

export interface WorkflowData {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

// Deprecated - use JobPost instead
export interface JobData {
    id: string;
    title: string;
    company: string;
    location: string;
    url: string;
    description: string;
    posted_at?: string;
    scraped_at: string;
}

// Deprecated - use Contact instead
export interface ContactData {
    name: string;
    email: string;
    linkedin_url?: string;
    role: string;
    company: string;
    confidence_score?: number;
}
