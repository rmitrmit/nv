// src\app\api\genius\route.ts
import { NextRequest, NextResponse } from 'next/server';

const GENIUS_BEARER = process.env.GENIUS_BEARER;

type Song = {
    id: string;
    title: string;
    artist: string;
    image: string;
    url: string;
};

type GeniusResponse = {
    response: {
        hits: Array<{
            result: {
                id: number;
                title: string;
                artist_names: string;
                song_art_image_url: string;
                url: string;
            }
        }>
    }
};

const allowedOrigins = [
    'http://localhost:3000',
    'https://evjbcx-s0.myshopify.com',
    'https://nv-prod.vercel.app'
];

export async function GET(req: NextRequest) {
    const query = req.nextUrl.searchParams.get('q');
    const origin = req.headers.get('origin') || 'unknown';
    console.log(`Request received - Query: ${query}, Origin: ${origin}`);

    if (!query) {
        console.error("Missing query parameter");
        return new NextResponse(
            JSON.stringify({ error: 'Query parameter "q" is required' }),
            { status: 400, headers: corsHeaders(req) }
        );
    }

    if (!GENIUS_BEARER) {
        console.error("GENIUS_BEARER environment variable is not set");
        return new NextResponse(
            JSON.stringify({
                error: 'Server configuration error',
                details: 'Genius API token is not configured'
            }),
            { status: 500, headers: corsHeaders(req) }
        );
    }

    try {
        console.log(`Fetching from Genius API with query: ${query}`);
        const response = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(query)}`, {
            headers: {
                Authorization: `Bearer ${GENIUS_BEARER}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Genius API request failed: Status ${response.status}, Response: ${errorText}`);
            return new NextResponse(
                JSON.stringify({
                    error: 'Genius API request failed',
                    status: response.status,
                    details: errorText
                }),
                { status: 502, headers: corsHeaders(req) }
            );
        }

        const data: GeniusResponse = await response.json();
        console.log(`Received ${data.response.hits.length} hits from Genius API`);

        // Transform the response to match our Song type
        const songs: Song[] = data.response.hits.map((hit) => ({
            id: hit.result.id.toString(),
            title: hit.result.title,
            artist: hit.result.artist_names,
            image: hit.result.song_art_image_url,
            url: hit.result.url
        }));

        return new NextResponse(
            JSON.stringify(songs),
            { status: 200, headers: corsHeaders(req) }
        );
    } catch (error) {
        const errorDetails = error instanceof Error ? {
            message: error.message,
            stack: error.stack
        } : { message: String(error) };

        console.error("Unexpected error:", {
            ...errorDetails,
            query,
            origin,
            timestamp: new Date().toISOString()
        });

        return new NextResponse(
            JSON.stringify({
                error: 'Internal Server Error',
                details: errorDetails.message,
                timestamp: new Date().toISOString()
            }),
            { status: 500, headers: corsHeaders(req) }
        );
    }
}

// CORS Handling
function corsHeaders(req: NextRequest): Record<string, string> {
    const origin = req.headers.get('origin');
    const allowedOrigin = allowedOrigins.includes(origin || '') ? origin : '';

    console.log(`CORS check - Request origin: ${origin}, Allowed origin: ${allowedOrigin}`);

    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin || 'null',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}