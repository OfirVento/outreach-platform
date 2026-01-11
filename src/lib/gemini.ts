// Gemini API utility for AI-powered qualification

import type { JobPost } from '../types';

export interface QualificationResult {
    jobId: string;
    qualified: boolean;
    confidence: number; // 0-100
    reason: string;
    extractedData: {
        isRemote: boolean;
        workLocation: 'remote' | 'hybrid' | 'onsite' | 'unknown';
        detectedFrom: 'description' | 'title' | 'location' | 'none';
        remoteEvidence: string | null; // Quote from job showing remote/hybrid indication
        techStack: string[];
    };
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
    const noPosterFilteredJobs = jobs.filter(job =>
        criteria.posterRequired === 'required' && !(job.poster?.name || job.poster?.linkedInUrl)
    );

    // Create fallback results for filtered jobs
    const filteredResults: QualificationResult[] = noPosterFilteredJobs.map(job => ({
        jobId: job.id,
        qualified: false,
        confidence: 100,
        reason: 'No poster contact available',
        extractedData: {
            isRemote: false,
            workLocation: 'unknown' as const,
            detectedFrom: 'none' as const,
            remoteEvidence: null,
            techStack: job.techStack || []
        }
    }));

    if (jobsToAnalyze.length === 0) {
        return filteredResults;
    }

    // Process in batches of 15 to avoid token limits (smaller batches = faster)
    const batchSize = 15;
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
    }
): Promise<QualificationResult[]> {
    const jobsData = jobs.map(job => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description?.substring(0, 1500), // Limit for faster processing
        techStack: job.techStack
    }));

    const workLocationInstruction = criteria.workLocation === 'remote'
        ? 'ONLY fully remote positions qualify. Hybrid or on-site positions should NOT qualify.'
        : criteria.workLocation === 'hybrid'
            ? 'Remote OR hybrid positions qualify. Pure on-site positions should NOT qualify.'
            : criteria.workLocation === 'onsite'
                ? 'All locations qualify including on-site.'
                : 'Any location is fine, all qualify on location.';

    const prompt = `You are an expert job qualification AI for ${criteria.companyName}.

=== YOUR TASK ===
For each job, carefully analyze the FULL description, title, and location to:
1. Determine if the job allows REMOTE work
2. Extract relevant technologies mentioned
3. Qualify based on our criteria

=== WORK LOCATION DETECTION - CRITICAL ===
⚠️ SEARCH THE ENTIRE JOB TEXT (title + location + full description) for these EXACT keywords (case-insensitive):

MUST CHECK FOR THESE KEYWORDS:
- "remote" (anywhere in the text)
- "remote first"
- "remote friendly"
- "remote-first"
- "remote-friendly"
- "work from home"
- "WFH"
- "work remotely"
- "remote work"
- "fully remote"
- "100% remote"
- "remote position"
- "remote opportunity"
- "remote option"
- "hybrid"
- "flexible location"
- "work from anywhere"
- "distributed team"

SEARCH RULES:
1. Read the ENTIRE description from start to end - do not skip any section
2. If ANY of the above keywords appear ANYWHERE in the job → classify as "remote" or "hybrid"
3. The word "remote" appearing in benefits, about section, or anywhere = REMOTE JOB
4. Only mark as "onsite" if ZERO remote-related keywords are found
5. Provide the EXACT text snippet where you found the keyword


=== QUALIFICATION CRITERIA ===
${criteria.workLocation === 'remote' ? '⚠️ We want REMOTE jobs! Only jobs with remote work option qualify.' : ''}
Work Location: ${workLocationInstruction}
Tech Match: Should mention at least one of: ${criteria.techStack.join(', ')}

=== JOBS TO ANALYZE ===
${JSON.stringify(jobsData, null, 2)}

=== RESPONSE FORMAT ===
Return ONLY a valid JSON array (no markdown, no code blocks):
[
  {
    "jobId": "string",
    "qualified": boolean,
    "confidence": number (0-100),
    "reason": "Short explanation of work location + tech match",
    "extractedData": {
      "isRemote": boolean,
      "workLocation": "remote" | "hybrid" | "onsite" | "unknown",
      "detectedFrom": "description" | "title" | "location" | "none",
      "remoteEvidence": "EXACT quote from the job where you found remote/hybrid indication, or null if none",
      "techStack": ["detected technologies from our list"]
    }
  }
]`;


    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 4096,
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
                remoteEvidence: null,
                techStack: job.techStack || []
            }
        }));
    }
}
