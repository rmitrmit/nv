import { NextRequest, NextResponse } from 'next/server';

export interface ExternalLyricsResponse {
    title: string;
    artist: string;
    slug: string;
    lyrics: string;
}

export async function GET(req: NextRequest) {
    const title = req.nextUrl.searchParams.get('title');
    const artist = req.nextUrl.searchParams.get('artist');
    const slug = req.nextUrl.searchParams.get('slug');
    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (!title || !artist || !slug) {
        return new NextResponse(
            JSON.stringify({
                error: "These parameters are required: ['title', 'artist', 'slug']",
            }),
            { status: 400, headers: corsHeaders }
        );
    }

    try {
        const encodedTitle = encodeURIComponent(title);
        const encodedArtist = encodeURIComponent(artist);
        const encodedSlug = encodeURIComponent(slug);
        const externalApiUrl = `${process.env.LYRICS_API_ADDRESS}/genius/lyrics?title=${encodedTitle}&artist=${encodedArtist}&slug=${encodedSlug}`;

        console.log('Fetching from URL:', externalApiUrl);

        // Add headers that mimic a browser request
        const response = await fetch(externalApiUrl, {
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
                title: data.title,
                artist: data.artist,
                slug: data.slug,
                lyrics: data.lyrics,
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