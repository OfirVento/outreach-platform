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
        hasPoster: boolean;
        posterName?: string;
        posterTitle?: string;
        posterLinkedIn?: string;
        techStack: string[];
        seniorityLevel: string;
        companySize?: string;
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
    const model = 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Process in batches of 10 to avoid token limits
    const batchSize = 10;
    const results: QualificationResult[] = [];

    for (let i = 0; i < jobs.length; i += batchSize) {
        const batch = jobs.slice(i, i + batchSize);
        const batchResults = await qualifyBatch(batch, endpoint, criteria);
        results.push(...batchResults);
    }

    return results;
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
        description: job.description?.substring(0, 1500), // Limit description length
        poster: job.poster,
        techStack: job.techStack,
        isRemote: job.isRemote
    }));

    const prompt = `You are a lead qualification AI for "${criteria.companyName}".
${criteria.companyDescription ? `About us: ${criteria.companyDescription}` : ''}

We provide services related to: ${criteria.techStack.join(', ')}

QUALIFICATION CRITERIA:
- Work Location: ${criteria.workLocation === 'remote' ? 'ONLY remote positions' : criteria.workLocation === 'hybrid' ? 'Remote OR hybrid positions' : criteria.workLocation === 'onsite' ? 'All locations including on-site' : 'Any location is fine'}
- Poster Contact: ${criteria.posterRequired === 'required' ? 'MUST have a job poster name' : 'Poster is optional'}
- Tech Match: The job should use at least one of our technologies

For each job below, analyze and extract:
1. Is it remote, hybrid, or on-site? Look for keywords like "remote", "work from home", "hybrid", "on-site", "office" in the location and description.
2. Does it have a job poster/recruiter with name and LinkedIn URL?
3. What technologies are mentioned?
4. Should we qualify this job based on our criteria?

JOBS TO ANALYZE:
${JSON.stringify(jobsData, null, 2)}

Respond ONLY with a valid JSON array in this exact format (no markdown, no code blocks):
[
  {
    "jobId": "string",
    "qualified": boolean,
    "confidence": number (0-100),
    "reason": "string explaining why qualified or not",
    "extractedData": {
      "isRemote": boolean,
      "workLocation": "remote" | "hybrid" | "onsite" | "unknown",
      "hasPoster": boolean,
      "posterName": "string or null",
      "posterTitle": "string or null", 
      "posterLinkedIn": "string or null",
      "techStack": ["array of detected technologies"],
      "seniorityLevel": "junior" | "mid" | "senior" | "lead" | "staff",
      "companySize": "string or null"
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
            reason: 'AI qualification failed - using fallback',
            extractedData: {
                isRemote: job.isRemote || false,
                workLocation: job.isRemote ? 'remote' as const : 'unknown' as const,
                hasPoster: !!job.poster?.name,
                posterName: job.poster?.name,
                posterTitle: job.poster?.title,
                posterLinkedIn: job.poster?.linkedInUrl,
                techStack: job.techStack || [],
                seniorityLevel: 'mid',
                companySize: job.companySize
            }
        }));
    }
}
