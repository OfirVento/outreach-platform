// Gemini API utility for AI-powered qualification and message generation

import type { JobPost, GeneratedMessage, Contact } from '../types';

export interface QualificationResult {
    jobId: string;
    qualified: boolean;
    confidence: number; // 0-100
    reason: string;
    extractedData: {
        isRemote: boolean;
        workLocation: 'remote' | 'hybrid' | 'onsite' | 'unknown';
        detectedFrom: 'description' | 'title' | 'location' | 'none';
        techStack: string[];
    };
    message: {
        subject: string | null;
        body: string | null;
    } | null;
}

export async function qualifyJobsWithGemini(
    jobs: JobPost[],
    apiKey: string,
    criteria: {
        techStack: string[];
        workLocation: 'remote' | 'hybrid' | 'onsite' | 'any';
        posterRequired: 'required' | 'any';
        companyName: string;
        companyDescription: string;
        senderName: string;
        senderTitle: string;
        toneOfVoice: 'casual' | 'professional' | 'consultative';
    }
): Promise<QualificationResult[]> {
    // Use gemini-2.0-flash which is the currently available model
    const model = 'gemini-2.0-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Pre-filter jobs based on poster requirement (done programmatically)
    const jobsToAnalyze = criteria.posterRequired === 'required'
        ? jobs.filter(job => !!(job.poster?.name || job.poster?.linkedInUrl))
        : jobs;

    // Jobs filtered out due to no poster
    const noPosterfilteredJobs = jobs.filter(job =>
        criteria.posterRequired === 'required' && !(job.poster?.name || job.poster?.linkedInUrl)
    );

    // Create fallback results for filtered jobs
    const filteredResults: QualificationResult[] = noPosterfilteredJobs.map(job => ({
        jobId: job.id,
        qualified: false,
        confidence: 100,
        reason: 'No poster contact available',
        extractedData: {
            isRemote: false,
            workLocation: 'unknown' as const,
            detectedFrom: 'none' as const,
            techStack: job.techStack || []
        },
        message: null
    }));

    if (jobsToAnalyze.length === 0) {
        return filteredResults;
    }

    // Process in batches of 10 to avoid token limits
    const batchSize = 10;
    const aiResults: QualificationResult[] = [];

    for (let i = 0; i < jobsToAnalyze.length; i += batchSize) {
        const batch = jobsToAnalyze.slice(i, i + batchSize);
        const batchResults = await qualifyBatch(batch, endpoint, criteria);
        aiResults.push(...batchResults);
    }

    return [...aiResults, ...filteredResults];
}

async function qualifyBatch(
    jobs: JobPost[],
    endpoint: string,
    criteria: {
        techStack: string[];
        workLocation: 'remote' | 'hybrid' | 'onsite' | 'any';
        posterRequired: 'required' | 'any';
        companyName: string;
        companyDescription: string;
        senderName: string;
        senderTitle: string;
        toneOfVoice: 'casual' | 'professional' | 'consultative';
    }
): Promise<QualificationResult[]> {
    const jobsData = jobs.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description?.substring(0, 2000),
        posterName: job.poster?.name || null,
        techStack: job.techStack
    }));

    const workLocationInstruction = criteria.workLocation === 'remote'
        ? 'ONLY fully remote positions qualify. Hybrid or on-site positions should NOT qualify.'
        : criteria.workLocation === 'hybrid'
            ? 'Remote OR hybrid positions qualify. Pure on-site positions should NOT qualify.'
            : criteria.workLocation === 'onsite'
                ? 'All locations qualify including on-site.'
                : 'Any location is fine, all qualify on location.';

    const toneInstructions = criteria.toneOfVoice === 'casual'
        ? 'friendly, conversational, use contractions, be warm and personable'
        : criteria.toneOfVoice === 'professional'
            ? 'formal but warm, clear value proposition, polished language'
            : 'consultative, ask insightful questions, demonstrate expertise';

    const prompt = `You are an expert lead qualification and outreach AI for ${criteria.companyName}.

=== ABOUT ${criteria.companyName.toUpperCase()} ===
What We Do: ${criteria.companyDescription || 'We provide tech talent solutions'}
Our Tech Stack: ${criteria.techStack.join(', ')}
Sender: ${criteria.senderName}, ${criteria.senderTitle}

=== YOUR TASK ===
For each job:
1. Detect if it's Remote, Hybrid, or On-site (check description FIRST)
2. Extract the tech stack mentioned
3. Determine if it qualifies based on our criteria
4. **ONLY generate outreach messages for QUALIFIED jobs** (jobs that meet ALL criteria)

=== HOW TO DETECT WORK LOCATION ===
Search in this ORDER (priority):
1. DESCRIPTION (PRIMARY): Look for patterns especially at the START like:
   - "Remote – Israel", "Remote - US", "100% Remote", "Fully Remote", "Work from home", "WFH" → REMOTE
   - "Hybrid (Flexible)", "Hybrid - Tel Aviv", "Remote/Hybrid", "Flexible location" → HYBRID
   - "On-site Tel Aviv", "Office based", no remote mention → ONSITE

2. TITLE (SECONDARY): May contain "(Remote)", "- Remote", "Hybrid"

3. LOCATION (SECONDARY): "Remote", "Hybrid", or city-only = onsite

Rules:
- "Remote" clearly stated (not just "remote work options") → workLocation: "remote", isRemote: true
- "Hybrid" anywhere → workLocation: "hybrid", isRemote: false
- Only city/country with no remote/hybrid → workLocation: "onsite", isRemote: false

=== QUALIFICATION CRITERIA ===
${criteria.workLocation === 'remote' ? `
⚠️ IMPORTANT: Only REMOTE jobs qualify! 
- If workLocation is "hybrid" or "onsite" → qualified: false, message: null
- Do NOT generate messages for non-remote jobs
` : ''}
Work Location: ${workLocationInstruction}
Tech Match: Should mention at least one of our technologies: ${criteria.techStack.join(', ')}

A job qualifies ONLY if it meets ALL criteria above. If it fails ANY criteria, set qualified: false and message: null.

=== JOBS TO ANALYZE ===
${JSON.stringify(jobsData, null, 2)}

=== RESPONSE FORMAT ===
Return ONLY a valid JSON array (no markdown, no code blocks, no explanation):
[
  {
    "jobId": "string",
    "qualified": boolean,
    "confidence": number (0-100),
    "reason": "Brief explanation including work location found",
    "extractedData": {
      "isRemote": boolean,
      "workLocation": "remote" | "hybrid" | "onsite" | "unknown",
      "detectedFrom": "description" | "title" | "location" | "none",
      "techStack": ["array of detected technologies from our list"]
    },
    "message": {
      "subject": "Subject line ONLY if qualified, otherwise null",
      "body": "Message body ONLY if qualified, otherwise null"
    }
  }
]

=== MESSAGE GUIDELINES (for QUALIFIED jobs ONLY) ===
⚠️ Generate messages ONLY for jobs where qualified: true
- Address by first name if posterName exists
- Reference their specific role at their company
- Mention 2-3 matching technologies from their job
- Tone: ${toneInstructions}
- Sign as: ${criteria.senderName}, ${criteria.senderTitle} at ${criteria.companyName}
- Subject: max 50 chars, compelling and specific
- Body: max 120 words, focused and actionable`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 8192,
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Gemini API error:', error);
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No response from Gemini');
        }

        // Clean and parse the JSON response
        let cleanedText = text.trim();
        // Remove markdown code blocks if present
        if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const results: QualificationResult[] = JSON.parse(cleanedText);
        return results;

    } catch (error) {
        console.error('Error qualifying with Gemini:', error);
        // Return fallback results for this batch
        return jobs.map(job => ({
            jobId: job.id,
            qualified: false,
            confidence: 0,
            reason: `AI qualification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            extractedData: {
                isRemote: false,
                workLocation: 'unknown' as const,
                detectedFrom: 'none' as const,
                techStack: job.techStack || []
            },
            message: null
        }));
    }
}
