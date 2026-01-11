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

    // Process in batches of 15 to avoid token limits
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
        description: job.description?.substring(0, 1500),
        techStack: job.techStack
    }));

    const prompt = `Task: Classify Job Work Mode and Qualify for ${criteria.companyName}

You must analyze the title, location, and description fields for EVERY job entry to determine the work mode. Use the following strict logic to classify each job:

=== REMOTE ===
Classify as "remote" if you find keywords such as:
- "Remote", "Work from home", "WFH", "Work from anywhere", "Home-based", "Virtual", "Telecommute", "Fully distributed"
- "Remote first" (Note: Treat this as a definitive confirmation of remote work, even if a specific office location is also mentioned in the post)

Crucial Check: Look for "Remote" explicitly mentioned in the location field (e.g., "Remote - Israel") or the title (e.g., "Backend Engineer (Remote)").

=== HYBRID ===
Classify as "hybrid" if you find keywords such as:
- "Hybrid", "Flexible work", "Mix of office and home", "X days in office", "Office occasionally"

Context Clue: If the text mentions both a specific physical office location AND "flexible working options" without explicitly saying "fully remote," classify as hybrid.

=== ON-SITE ===
Classify as "onsite" if the description explicitly states:
- "On-site", "Work from office", "In-office"

Default Logic: If none of the above keywords (Remote/Hybrid) are found, and a specific physical location is provided (e.g., "Tel Aviv"), classify as "onsite".

=== QUALIFICATION CRITERIA ===
${criteria.workLocation === 'remote' ? '⚠️ We want REMOTE jobs only! Hybrid or on-site → qualified: false' : ''}
${criteria.workLocation === 'hybrid' ? 'Remote OR hybrid jobs qualify. On-site only → qualified: false' : ''}
${criteria.workLocation === 'any' ? 'Any work location is acceptable.' : ''}
Tech Stack Match: Job should mention at least one of: ${criteria.techStack.join(', ')}

A job is qualified ONLY if it meets BOTH the work location AND tech stack criteria.

=== JOBS TO ANALYZE ===
${JSON.stringify(jobsData, null, 2)}

=== OUTPUT FORMAT ===
Return ONLY a valid JSON array (no markdown, no code blocks, no explanation):
[
  {
    "jobId": "string",
    "qualified": boolean,
    "confidence": number (0-100),
    "reason": "Brief: Work mode found + tech match status",
    "extractedData": {
      "isRemote": boolean,
      "workLocation": "remote" | "hybrid" | "onsite",
      "detectedFrom": "title" | "location" | "description" | "none",
      "remoteEvidence": "EXACT quote or field where you found the work mode indicator, or null if defaulted to onsite",
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
