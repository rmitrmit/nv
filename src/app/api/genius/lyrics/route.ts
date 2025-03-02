import { NextRequest, NextResponse } from 'next/server';

const GENIUS_API_KEY = process.env.GENIUS_API_KEY;

const allowedOrigins = [
    'http://localhost:3000',  
    'https://yourproductiondomain.com' 
];

// Define a type for mock lyrics
interface LyricData {
    id: number;
    title: string;
    artist: string;
    album: string;
    lyrics: string;
}

// Mock data for lyrics
const mockLyrics: Record<string, LyricData> = {
    "800688": {
        id: 800688,
        title: "The Hills",
        artist: "The Weeknd",
        album: "Beauty Behind the Madness",
        lyrics: "[Mock lyrics for The Hills]"
    },
    "12345": {
        id: 12345,
        title: "Reptilia",
        artist: "The Strokes",
        album: "Room on Fire",
        lyrics: "[Mock lyrics for Reptilia]"
    },
};

export async function GET(req: NextRequest) {
    const songId = req.nextUrl.searchParams.get('id');

    if (!songId) {
        console.error("Missing required parameter: id");
        return new NextResponse(
            JSON.stringify({ error: 'The "id" parameter is required' }),
            { status: 400, headers: corsHeaders(req) }
        );
    }

    // Check if we have mock data for this song
    if (mockLyrics[songId]) {
        return new NextResponse(
            JSON.stringify(mockLyrics[songId]),
            { status: 200, headers: corsHeaders(req) }
        );
    }

    if (!GENIUS_API_KEY) {
        console.warn("GENIUS_API_KEY is missing");
        return new NextResponse(
            JSON.stringify({ error: 'API key not configured' }),
            { status: 500, headers: corsHeaders(req) }
        );
    }

    try {
        // Fetch song details from Genius
        const songResponse = await fetch(
            `https://api.genius.com/songs/${songId}`,
            {
                headers: { Authorization: `Bearer ${GENIUS_API_KEY}` },
            }
        );

        if (!songResponse.ok) {
            console.error(`Genius API request failed: ${songResponse.status}`);
            return new NextResponse(
                JSON.stringify({ error: 'Failed to fetch song data from Genius API' }),
                { status: songResponse.status, headers: corsHeaders(req) }
            );
        }

        const songData = await songResponse.json();
        const song = songData.response.song;
        
        if (!song) {
            return new NextResponse(
                JSON.stringify({ error: 'Song not found' }),
                { status: 404, headers: corsHeaders(req) }
            );
        }

        // Fetch lyrics from the new API endpoint
        const lyricsResponse = await fetch(
            `${process.env.BASE_URL}/api/genius/lyric?track_name=${song.id}`
        );

        if (!lyricsResponse.ok) {
            console.error(`Lyrics API request failed: ${lyricsResponse.status}`);
            return new NextResponse(
                JSON.stringify({
                    id: song.id,
                    title: song.title,
                    artist: song.primary_artist.name,
                    album: song.album?.name || "Unknown Album",
                    lyrics: 'Lyrics not found',
                }),
                { status: 200, headers: corsHeaders(req) }
            );
        }

        const lyricsData = await lyricsResponse.json();

        return new NextResponse(
            JSON.stringify({
                id: song.id,
                title: song.title,
                artist: song.primary_artist.name,
                album: song.album?.name || "Unknown Album",
                lyrics: lyricsData.lyrics,
            }),
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
    const allowedOrigin = allowedOrigins.includes(origin || '')
        ? origin
        : process.env.NODE_ENV === 'development' ? '*' : '';

    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin || 'null',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}