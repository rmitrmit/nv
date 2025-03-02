// src\app\api\genius\route.ts
import { NextRequest, NextResponse } from 'next/server';

const GENIUS_API_KEY = process.env.GENIUS_API_KEY;

type Song = {
    id: string;
    title: string;
    artist: string;
};

type GeniusResponse = {
    response: {
        hits: Array<{
            result: {
                id: number;
                title: string;
                artist_names: string;
            }
        }>
    }
};

const mockResults: Song[] = [
    { id: '12345', title: 'Reptilia', artist: 'The Strokes' },
    { id: '2', title: 'Reptile', artist: 'Nine Inch Nails' },
    { id: '3', title: 'No Reptiles', artist: 'Everything Everything' },
    { id: '4', title: 'Minecraftcito (Despacito 3)', artist: 'ReptileLegitYT' },
    { id: '5', title: 'Reptile', artist: 'Periphery (Ft. Mikee W Goodman)' },
    { id: '6', title: 'Minecraft Dreams', artist: 'ReptileLegitYT (Ft. Galaxy Goats)' },
    { id: '7', title: 'Fairly Bruh Parents', artist: 'reptilelegit (Ft. mol$ archive & wonder)' },
    { id: '8', title: 'Reptile', artist: 'SIDxRAM' },
    { id: '9', title: 'Minecraft on My Mind', artist: 'ReptileLegitYT (Ft. Minecraft King27)' },
    { id: '10', title: 'Nikolai Reptile', artist: 'Shadowax' }
];

const allowedOrigins = [
    'http://localhost:3000',  
    'https://yourproductiondomain.com' 
];

export async function GET(req: NextRequest) {
    const query = req.nextUrl.searchParams.get('q');

    if (!query) {
        console.error("Missing query parameter");
        return new NextResponse(
            JSON.stringify({ error: 'Query parameter "q" is required' }),
            { status: 400, headers: corsHeaders(req) }
        );
    }

    if (!GENIUS_API_KEY) {
        console.warn("GENIUS_API_KEY is missing, returning mock data");
        return new NextResponse(JSON.stringify(mockResults), {
            status: 200,
            headers: corsHeaders(req),
        });
    }

    try {
        const response = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(query)}`, {
            headers: {
                Authorization: `Bearer ${GENIUS_API_KEY}`,
            },
        });

        if (!response.ok) {
            console.error(`Genius API request failed: ${response.status}`);
            return new NextResponse(
                JSON.stringify({ error: 'Failed to fetch from Genius API' }),
                { status: response.status, headers: corsHeaders(req) }
            );
        }

        const data: GeniusResponse = await response.json();

        // Transform the response to match our Song type
        const songs: Song[] = data.response.hits.map((hit) => ({
            id: hit.result.id.toString(),
            title: hit.result.title,
            // Use artist_names instead of primary_artist.name
            artist: hit.result.artist_names
        }));

        return new NextResponse(
            JSON.stringify(songs),
            { status: 200, headers: corsHeaders(req) }
        );
    } catch (error) {
        console.error("Unexpected error:", error);
        return new NextResponse(
            JSON.stringify({ error: 'Internal Server Error' }),
            { status: 500, headers: corsHeaders(req) }
        );
    }
}

// CORS Handling
function corsHeaders(req: NextRequest): Record<string, string> {
    const origin = req.headers.get('origin');
    const allowedOrigin = allowedOrigins.includes(origin || '') ? origin : '';

    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin || 'null',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}