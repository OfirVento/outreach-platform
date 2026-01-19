import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { apiKey, model, systemInstruction, taskInstruction } = await req.json();

        if (!apiKey) {
            return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({
            model: model || 'gemini-2.5-flash',
            systemInstruction: systemInstruction
        });

        const result = await geminiModel.generateContent(taskInstruction);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ message: text });
    } catch (error: any) {
        console.error('Gemini API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate message' }, { status: 500 });
    }
}
