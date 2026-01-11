import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { apiKey, email } = await request.json();

        if (!apiKey) {
            return NextResponse.json({ error: 'API Key Required' }, { status: 400 });
        }

        const response = await fetch(`https://person.clearbit.com/v2/combined/find?email=${email}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
