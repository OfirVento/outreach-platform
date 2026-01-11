import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const apiKey = searchParams.get('apiKey');

        if (!apiKey) {
            return NextResponse.json({ error: 'API Key Required' }, { status: 400 });
        }

        const response = await fetch(`https://api.hunter.io/v2/account?api_key=${apiKey}`);
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
