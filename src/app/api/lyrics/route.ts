import { NextRequest, NextResponse } from 'next/server';

interface ExternalLyricsResponse {
    artist_name: string;
    track_name: string;
    track_id: number;
    search_engine: string;
    artwork_url: string;
    lyrics: string;
}

export async function GET(req: NextRequest) {
    const trackName = req.nextUrl.searchParams.get('track_name');
    const artistName = req.nextUrl.searchParams.get('artist_name');
    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (!trackName || !artistName) {
        console.error('Missing required parameter: track_name or artist_name');
        return new NextResponse(
            JSON.stringify({ error: 'The "track_name" and "artist_name" parameters are required' }),
            { status: 400, headers: corsHeaders }
        );
    }

    try {
        const encodedTrack = encodeURIComponent(trackName);
        const encodedArtist = encodeURIComponent(artistName);
        const apiUrl = `${process.env.LYRICS_API_ADDRESS}/genius/lyrics?title=${encodedTrack}&artist=${encodedArtist}`;

        console.log('Fetching from URL:', apiUrl);

        // Add headers that mimic a browser request
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to fetch lyrics: ${response.status} ${response.statusText}`);
            console.error('Error response body:', errorText);

            return new NextResponse(
                JSON.stringify({
                    error: 'Failed to fetch lyrics',
                    status: response.status,
                    details: errorText
                }),
                { status: response.status, headers: corsHeaders }
            );
        }

        const data = await response.json() as ExternalLyricsResponse;
        // console.log('Received data structure:', Object.keys(data));

        return new NextResponse(
            JSON.stringify({
                id: data.track_id,
                title: data.track_name,
                artist: data.artist_name,
                lyrics: data.lyrics,
                artwork_url: data.artwork_url,
            }),
            { status: 200, headers: corsHeaders }
        );

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Unexpected error:', errorMessage);
        console.error('Full error:', error);

        return new NextResponse(
            JSON.stringify({ error: 'Internal Server Error', details: errorMessage }),
            { status: 500, headers: corsHeaders }
        );
    }
}