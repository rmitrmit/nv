import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Remove the edge runtime directive to maintain static generation capability
// export const runtime = 'edge';

const GENIUS_BEARER = process.env.GENIUS_BEARER;
// Cache duration in seconds (7 days)
const CACHE_DURATION = 60 * 60 * 24 * 7;

const allowedOrigins = [
    'http://localhost:3000',
    'https://evjbcx-s0.myshopify.com',
    'https://nv-prod.vercel.app'
];

// Simple in-memory cache (will reset on deployments)
// For production, consider using KV storage or another persistent solution
const lyricsCache: Record<string, { data: string, timestamp: number }> = {};

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

        // Check if we already have the song data in cache
        const cacheKey = `song_${songId}`;
        const now = Math.floor(Date.now() / 1000);

        // Try to get song from cache first
        if (lyricsCache[cacheKey] && now - lyricsCache[cacheKey].timestamp < CACHE_DURATION) {
            console.log(`Cache hit for song ID: ${songId}`);
            return new NextResponse(
                lyricsCache[cacheKey].data,
                { status: 200, headers: corsHeaders(req) }
            );
        }

        // Fetch from Genius API with retries
        const songResponse = await fetchWithRetry(
            `https://api.genius.com/songs/${songId}`,
            {
                headers: { Authorization: `Bearer ${GENIUS_BEARER}` },
            },
            3
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

        const responseData = JSON.stringify({
            id: song.id,
            title: song.title,
            artist: song.primary_artist.name,
            image: song.song_art_image_url,
            album: song.album?.name || "Unknown Album",
            lyrics: lyrics,
            _timestamp: new Date().toISOString() // Adding timestamp for debugging
        });

        // Store in cache
        lyricsCache[cacheKey] = {
            data: responseData,
            timestamp: now
        };

        return new NextResponse(
            responseData,
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
        console.log(`Starting lyrics fetch from: ${url}`);

        // Try to get lyrics from cache
        const cacheKey = `lyrics_${url}`;
        const now = Math.floor(Date.now() / 1000);

        if (lyricsCache[cacheKey] && now - lyricsCache[cacheKey].timestamp < CACHE_DURATION) {
            console.log(`Cache hit for lyrics URL: ${url}`);
            return lyricsCache[cacheKey].data;
        }

        console.log('Sending request with enhanced headers for better scraping compatibility');

        // Use a proxy service to bypass potential Vercel IP restrictions
        // For a real implementation, set up a proxy service or use a third-party service
        let html = '';
        let response;

        try {
            // First attempt - direct request with enhanced browser-like headers
            response = await fetchWithRetry(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'sec-ch-ua': '"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    // Potentially important for scraping
                    'Referer': 'https://genius.com/',
                }
            }, 3);

            if (response.ok) {
                html = await response.text();
                console.log(`Direct request successful, received ${html.length} bytes`);
            } else {
                throw new Error(`Failed with status: ${response.status}`);
            }
        } catch (error) {
            // Cast the unknown error to Error, or create a new Error if it's not
            const directError = error instanceof Error
                ? error
                : new Error(String(error));

            console.warn(`Direct request failed: ${directError.message}`);

            // Consider implementing a fallback approach here, like using a proxy service
            // This is a placeholder - you would need to implement an actual proxy solution
            console.log('Direct fetching failed, consider implementing a proxy solution');

            // Throw error to be caught by the outer try/catch
            throw new Error(`Could not fetch lyrics: ${directError.message}`);
        }

        // Log HTML length to check if we're getting proper content
        console.log(`Received HTML length: ${html.length} characters`);

        if (html.length < 1000) {
            console.warn("Suspiciously short HTML response, might be getting blocked or receiving a redirect");
            console.log("HTML preview:", html.substring(0, 200));
        }

        const $ = cheerio.load(html);

        let lyricsText = '';

        // Try different selectors in order of preference
        console.log("Attempting to extract lyrics with multiple selector strategies");

        // Strategy 1: New Genius layout with data-lyrics-container
        const lyricsContainers = $('[data-lyrics-container="true"]');
        if (lyricsContainers.length > 0) {
            console.log(`Found ${lyricsContainers.length} lyrics containers using data-lyrics-container`);
            lyricsContainers.each((_, element) => {
                const container = $(element);
                const html = container.html() || '';
                const text = html
                    .replace(/<br\s*\/?>/g, '\n')
                    .replace(/<(?:.|\n)*?>/gm, '');
                lyricsText += text + '\n\n';
            });
        }
        // Strategy 2: Classic .lyrics selector
        else if ($('.lyrics').length > 0) {
            console.log('Using .lyrics selector - found elements');
            lyricsText = $('.lyrics').text().trim();
        }
        // Strategy 3: Another potential container
        else if ($('.song_body-lyrics').length > 0) {
            console.log('Using .song_body-lyrics selector - found elements');
            lyricsText = $('.song_body-lyrics').text().trim();
        }
        // Strategy 4: Try to find any div with lyrics in the class name
        else if ($('div[class*="Lyrics__Container"]').length > 0) {
            console.log('Using Lyrics__Container selector - found elements');
            $('div[class*="Lyrics__Container"]').each((_, elem) => {
                lyricsText += $(elem).text() + '\n\n';
            });
        }
        // Strategy 5: Last resort - look for common lyrics patterns
        else {
            console.warn('No standard lyrics containers found, trying generic content extraction');
            // Look for content area
            const contentArea = $('.song_body, .lyrics, article, main, #lyrics-root');
            if (contentArea.length > 0) {
                lyricsText = contentArea.text().trim();
            } else {
                console.error('Failed to locate lyrics in the page content');
            }
        }

        lyricsText = lyricsText
            .trim()
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\[/g, '\n[')
            .replace(/\n\s+/g, '\n')
            .trim();

        console.log(`Extracted lyrics length: ${lyricsText.length} characters`);

        if (lyricsText.length < 10) {
            console.warn("Lyrics extraction likely failed - text too short");
            return 'Lyrics extraction failed';
        }

        // Store in cache
        lyricsCache[cacheKey] = {
            data: lyricsText,
            timestamp: now
        };

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

// Enhanced fetch with retry logic and timeout
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = 3,
    timeout = 15000
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Fetch attempt ${attempt}/${retries} for ${url}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const fetchOptions: RequestInit = {
                ...options,
                signal: controller.signal
            };

            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            // If we get a 429 Too Many Requests, wait longer before retrying
            if (response.status === 429 && attempt < retries) {
                const backoffTime = Math.pow(2, attempt) * 1000; // Exponential backoff
                console.log(`Received 429 rate limit, backing off for ${backoffTime}ms before retry`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
                continue;
            }

            return response;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (error instanceof DOMException && error.name === 'AbortError') {
                console.warn(`Fetch timeout after ${timeout}ms for ${url}`);
            } else {
                console.error(`Fetch error (attempt ${attempt}/${retries}):`, lastError.message);
            }

            if (attempt < retries) {
                const backoffTime = Math.pow(2, attempt) * 500; // Exponential backoff
                console.log(`Backing off for ${backoffTime}ms before retry`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
        }
    }

    throw lastError || new Error(`Failed to fetch after ${retries} attempts`);
}

// CORS Handling with improved debugging
function corsHeaders(req: NextRequest): Record<string, string> {
    const origin = req.headers.get('origin');
    const env = process.env.NODE_ENV || 'production';

    let allowedOrigin = 'null';

    // Set allowed origin
    if (allowedOrigins.includes(origin || '')) {
        allowedOrigin = origin || 'null';
        console.log(`CORS: Origin ${origin} is explicitly allowed`);
    } else if (env === 'development') {
        allowedOrigin = '*';
        console.log(`CORS: Development environment - allowing all origins`);
    } else {
        console.log(`CORS: Origin ${origin} is not in allowed list for production`);
    }

    console.log(`CORS headers set - Environment: ${env}, Request origin: ${origin}, Allowed origin: ${allowedOrigin}`);

    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400', // 24 hours
    };
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(req: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}