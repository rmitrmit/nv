// api/lyrics.ts
import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const GENIUS_BEARER = process.env.GENIUS_BEARER;
const CACHE_DURATION = 60 * 60 * 24 * 7;

export async function GET(req: NextRequest) {
    const songId = req.nextUrl.searchParams.get('id');
    if (!songId || !GENIUS_BEARER) {
        return new NextResponse(JSON.stringify({ error: 'Missing required parameters' }), { status: 400 });
    }

    try {
        const songResponse = await fetchWithRetry(`https://api.genius.com/songs/${songId}`, {
            headers: { Authorization: `Bearer ${GENIUS_BEARER}` }
        }, 3);
        const songData = await songResponse.json();
        const song = songData.response.song;

        const lyrics = await fetchLyricsFromGenius(song.url);
        return new NextResponse(JSON.stringify({ ...song, lyrics }), { status: 200 });
    } catch (error) {
        console.error('Error:', error);
        return new NextResponse(JSON.stringify({ error: 'Server error' }), { status: 500 });
    }
}

async function fetchLyricsFromGenius(url: string): Promise<string> {
    // Optional: Use a proxy service
    const proxyUrl = process.env.PROXY_URL ? `${process.env.PROXY_URL}?url=${encodeURIComponent(url)}` : url;
    
    const response = await fetchWithRetry(proxyUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Referer': 'https://genius.com/'
        }
    }, 3);
    
    const html = await response.text();
    const $ = cheerio.load(html);
    let lyricsText = $('[data-lyrics-container="true"]').text().trim() || 'Lyrics not found';
    
    return lyricsText;
}

async function fetchWithRetry(url: string, options: RequestInit, retries: number): Promise<Response> {
    let error;
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeout);
            if (response.ok) return response;
            error = new Error(`Status ${response.status}`);
        } catch (e) {
            error = e;
            await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
        }
    }
    throw error;
}