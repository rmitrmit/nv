import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const GENIUS_BEARER = process.env.GENIUS_BEARER;

const allowedOrigins = [
    'http://localhost:3000',
    'https://evjbcx-s0.myshopify.com',
    'https://nv-prod.vercel.app',
    'https://your-app.vercel.app',  // Add your Vercel deployment URL
];

export async function GET(req: NextRequest) {
    const songId = req.nextUrl.searchParams.get('id');

    if (!songId) {
        console.error("Missing required parameter: id");
        return new NextResponse(
            JSON.stringify({ error: 'The "id" parameter is required' }),
            { status: 400, headers: corsHeaders(req) }
        );
    }

    if (!GENIUS_BEARER) {
        console.warn("GENIUS_BEARER is missing");
        return new NextResponse(
            JSON.stringify({ error: 'API key not configured on server' }),
            { status: 500, headers: corsHeaders(req) }
        );
    }

    try {
        const songResponse = await fetch(`https://api.genius.com/songs/${songId}`, {
            headers: { Authorization: `Bearer ${GENIUS_BEARER}` },
        });

        if (!songResponse.ok) {
            console.error(`Genius API request failed: ${songResponse.status}`);
            return new NextResponse(
                JSON.stringify({ error: `Genius API error: ${songResponse.statusText}` }),
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

        const lyrics = await fetchLyricsFromGenius(song.url);

        return new NextResponse(
            JSON.stringify({
                id: song.id,
                title: song.title,
                artist: song.primary_artist.name,
                image: song.song_art_image_url,
                album: song.album?.name || 'Unknown Album',
                lyrics,
            }),
            { status: 200, headers: corsHeaders(req) }
        );
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Unexpected error:', error);
        return new NextResponse(
            JSON.stringify({ error: 'Internal Server Error', details: errorMessage }),
            { status: 500, headers: corsHeaders(req) }
        );
    }
}

async function fetchLyricsFromGenius(url: string): Promise<string> {
    try {
        const response = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour if using ISR
        if (!response.ok) {
            console.error(`Failed to fetch lyrics page: ${response.status}`);
            return 'Lyrics not found';
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        let lyricsText = '';

        const lyricsContainers = $('[data-lyrics-container="true"]');
        if (lyricsContainers.length > 0) {
            lyricsContainers.each((_, element) => {
                const container = $(element);
                const html = container.html() || '';
                const text = html
                    .replace(/<br\s*\/?>/g, '\n')
                    .replace(/<(?:.|\n)*?>/gm, '');
                lyricsText += text + '\n\n';
            });
        } else if ($('.lyrics').length > 0) {
            lyricsText = $('.lyrics').text().trim();
        } else if ($('.song_body-lyrics').length > 0) {
            lyricsText = $('.song_body-lyrics').text().trim();
        }

        lyricsText = lyricsText
            .trim()
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\[/g, '\n[')
            .replace(/\n\s+/g, '\n')
            .trim();

        return lyricsText || 'Lyrics not found';
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        return 'Error fetching lyrics';
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

export const config = {
    runtime: 'nodejs', // Ensure Node.js runtime (default for Next.js API routes)
};