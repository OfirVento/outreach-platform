import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { apiKey, name, company } = await request.json();

        if (!apiKey) {
            return NextResponse.json({ error: 'API key is required' }, { status: 400 });
        }

        // Mock Clay API behavior for now since we don't have a real endpoint URL from the user snippet
        // In a real implementation:
        // const clayResponse = await fetch('https://api.clay.com/v3/enrich', { ... });

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Mock successful enrichment
        return NextResponse.json({
            email: `${name.toLowerCase().replace(/\s+/g, '.')}@${company.toLowerCase().replace(/\s+/g, '')}.com`,
            linkedin_url: `https://linkedin.com/in/${name.toLowerCase().replace(/\s+/g, '-')}`,
            title: 'Senior Position', // fast approximation
            location: 'San Francisco, CA',
            enrichment_source: 'clay_mock'
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
