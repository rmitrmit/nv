import { NextRequest, NextResponse } from 'next/server';

const allowedOrigins = [
    'http://localhost:3000',
    'https://evjbcx-s0.myshopify.com',
    'https://nv-prod.vercel.app'
];

// Fix: Properly define the interface with correct syntax
interface LyricsResponse {
    id: number;
    artistName: string;
    trackName: string;
    albumName: string;
    duration: number;
    instrumental: boolean;
    plainLyrics: string;
    syncedLyrics: string;
}

export async function GET(req: NextRequest) {
    const trackName = req.nextUrl.searchParams.get('track_name');
    const artistName = req.nextUrl.searchParams.get('artist_name');

    // Parameter validation
    if (!trackName || !artistName) {
        console.error('Missing required parameter: track_name or artist_name');
        return new NextResponse(
            JSON.stringify({ error: 'The "track_name" and "artist_name" parameters are required' }),
            { status: 400, headers: corsHeaders(req) }
        );
    }

    try {
        // Encode parameters to handle special characters
        const encodedTrack = encodeURIComponent(trackName);
        const encodedArtist = encodeURIComponent(artistName);

        const response = await fetch(
            `https://lyricchanger.vercel.app/service/genius/lyric?track_name=${encodedTrack}&artist_name=${encodedArtist}`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://www.google.com/',
                },
            }
        );

        if (!response.ok) {
            console.error(`Failed to fetch lyrics: ${response.status} ${response.statusText}`);
            return new NextResponse(
                JSON.stringify({ error: 'Failed to fetch lyrics', status: response.status }),
                { status: response.status, headers: corsHeaders(req) }
            );
        }

        // Parse the JSON response
        const data = await response.json() as LyricsResponse;

        // Return formatted response
        return new NextResponse(
            JSON.stringify({
                id: data.id,
                title: data.trackName,
                artist: data.artistName,
                album: data.albumName || 'Unknown Album',
                lyrics: data.plainLyrics, // Fixed: was using "plainlyrics" which doesn't match the interface
            }),
            { status: 200, headers: corsHeaders(req) }
        );
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Unexpected error:', errorMessage);
        return new NextResponse(
            JSON.stringify({ error: 'Internal Server Error', details: errorMessage }),
            { status: 500, headers: corsHeaders(req) }
        );
    }
}

function corsHeaders(req: NextRequest): Record<string, string> {
    const origin = req.headers.get('origin');
    const allowedOrigin = allowedOrigins.includes(origin || '')
        ? origin
        : process.env.NODE_ENV === 'development'
            ? '*'
            : '';

    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin || 'null',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}