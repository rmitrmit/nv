// src\app\api\genius\lyrics\route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const GENIUS_BEARER = process.env.GENIUS_BEARER;

const allowedOrigins = [
    'http://localhost:3000',
    'https://evjbcx-s0.myshopify.com',
    'https://nv-prod.vercel.app'
];

export async function GET(req: NextRequest) {
    const songId = req.nextUrl.searchParams.get('id');
    const origin = req.headers.get('origin') || 'unknown';
    console.log(`Request received - SongID: ${songId}, Origin: ${origin}`);

    if (!songId) {
        console.error("Missing required parameter: id");
        return new NextResponse(
            JSON.stringify({ error: 'The "id" parameter is required' }),
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
        console.log(`Fetching song data for ID: ${songId}`);
        const songResponse = await fetch(
            `https://api.genius.com/songs/${songId}`,
            {
                headers: { Authorization: `Bearer ${GENIUS_BEARER}` },
            }
        );

        if (!songResponse.ok) {
            const errorText = await songResponse.text();
            console.error(`Genius API request failed: Status ${songResponse.status}, Response: ${errorText}`);
            return new NextResponse(
                JSON.stringify({
                    error: 'Failed to fetch song data from Genius API',
                    status: songResponse.status,
                    details: errorText
                }),
                { status: 502, headers: corsHeaders(req) }
            );
        }

        const songData = await songResponse.json();
        const song = songData.response.song;

        if (!song) {
            console.warn(`Song not found for ID: ${songId}`);
            return new NextResponse(
                JSON.stringify({ error: 'Song not found' }),
                { status: 404, headers: corsHeaders(req) }
            );
        }

        console.log(`Fetching lyrics from: ${song.url}`);
        const lyrics = await fetchLyricsFromGenius(song.url);

        return new NextResponse(
            JSON.stringify({
                id: song.id,
                title: song.title,
                artist: song.primary_artist.name,
                image: song.song_art_image_url,
                album: song.album?.name || "Unknown Album",
                lyrics: lyrics,
            }),
            { status: 200, headers: corsHeaders(req) }
        );
    } catch (error) {
        const errorDetails = error instanceof Error ? {
            message: error.message,
            stack: error.stack
        } : { message: String(error) };

        console.error("Unexpected error:", {
            ...errorDetails,
            songId,
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

async function fetchLyricsFromGenius(url: string): Promise<string> {
    try {
        console.log(`Fetching lyrics page from: ${url}`);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to fetch lyrics page: Status ${response.status}, Response: ${errorText}`);
            return 'Lyrics not found';
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        let lyricsText = '';
        const lyricsContainers = $('[data-lyrics-container="true"]');

        if (lyricsContainers.length > 0) {
            console.log(`Found ${lyricsContainers.length} lyrics containers`);
            lyricsContainers.each((_, element) => {
                const container = $(element);
                const html = container.html() || '';
                const text = html
                    .replace(/<br\s*\/?>/g, '\n')
                    .replace(/<(?:.|\n)*?>/gm, '');
                lyricsText += text + '\n\n';
            });
        }
        else if ($('.lyrics').length > 0) {
            console.log('Using .lyrics fallback selector');
            lyricsText = $('.lyrics').text().trim();
        }
        else if ($('.song_body-lyrics').length > 0) {
            console.log('Using .song_body-lyrics fallback selector');
            lyricsText = $('.song_body-lyrics').text().trim();
        }
        else {
            console.warn('No lyrics containers found in page');
        }

        lyricsText = lyricsText
            .trim()
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\[/g, '\n[')
            .replace(/\n\s+/g, '\n')
            .trim();

        console.log(`Lyrics length: ${lyricsText.length} characters`);
        return lyricsText || 'Lyrics not found';
    } catch (error) {
        const errorDetails = error instanceof Error ? {
            message: error.message,
            stack: error.stack
        } : { message: String(error) };

        console.error('Error fetching lyrics:', {
            ...errorDetails,
            url,
            timestamp: new Date().toISOString()
        });
        return 'Error fetching lyrics';
    }
}

// CORS Handling
function corsHeaders(req: NextRequest): Record<string, string> {
    const origin = req.headers.get('origin');
    const env = process.env.NODE_ENV || 'production';
    const allowedOrigin = allowedOrigins.includes(origin || '')
        ? origin
        : env === 'development' ? '*' : '';

    console.log(`CORS check - Environment: ${env}, Request origin: ${origin}, Allowed origin: ${allowedOrigin}`);

    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin || 'null',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}