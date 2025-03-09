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
            JSON.stringify({ error: 'API key not configured' }),
            { status: 500, headers: corsHeaders(req) }
        );
    }

    try {
        // Fetch song details from Genius
        const songResponse = await fetch(
            `https://api.genius.com/songs/${songId}`,
            {
                headers: { Authorization: `Bearer ${GENIUS_BEARER}` },
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

        // Fetch lyrics from Genius website (not API)
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
        console.error("Unexpected error:", error);
        return new NextResponse(
            JSON.stringify({ error: 'Internal Server Error' }),
            { status: 500, headers: corsHeaders(req) }
        );
    }
}

async function fetchLyricsFromGenius(url: string): Promise<string> {
    try {
        // Fetch the HTML content of the Genius lyrics page
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Failed to fetch lyrics page: ${response.status}`);
            return 'Lyrics not found';
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Find the lyrics container - Genius has changed this structure multiple times
        // Try different selectors that have been used by Genius
        let lyricsText = '';

        // Current structure (as of early 2025)
        const lyricsContainers = $('[data-lyrics-container="true"]');
        if (lyricsContainers.length > 0) {
            lyricsContainers.each((_, element) => {
                const container = $(element);
                // Clean the HTML: replace <br> with newlines and remove other tags
                const html = container.html() || '';
                const text = html
                    .replace(/<br\s*\/?>/g, '\n') // Replace <br> with newlines
                    .replace(/<(?:.|\n)*?>/gm, ''); // Remove other HTML tags

                lyricsText += text + '\n\n';
            });
        }
        // Older structure
        else if ($('.lyrics').length > 0) {
            lyricsText = $('.lyrics').text().trim();
        }
        // Even older structure
        else if ($('.song_body-lyrics').length > 0) {
            lyricsText = $('.song_body-lyrics').text().trim();
        }

        // Clean up the lyrics text
        lyricsText = lyricsText
            .trim()
            .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
            .replace(/\[/g, '\n[') // Put section headers on new lines
            .replace(/\n\s+/g, '\n') // Remove leading whitespace on lines
            .trim();

        return lyricsText || 'Lyrics not found';
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        return 'Error fetching lyrics';
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