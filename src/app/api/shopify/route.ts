// src\app\api\shopify\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ShopifyError, DraftOrderResponse, GraphQLError, formatLine } from './utils';

// Shopify credentials (server-side only)
const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;

interface CartRequest {
    sessionId: string;
    price: number;
    numWordChanged: number,
    wordChanged: string[];
    songName?: string;
    artist?: string;
    songImage: string;
    songUrl?: string;
    deliveryType: 'standard' | 'rush';
    lyrics: { id: number, original: string; modified: string }[];
    specialRequests?: string;
}

export async function POST(request: NextRequest) {
    try {
        // Check environment variables
        if (!SHOPIFY_ADMIN_API_TOKEN || !SHOPIFY_STORE_DOMAIN) {
            console.error('Missing Shopify configuration:', {
                hasToken: !!SHOPIFY_ADMIN_API_TOKEN,
                hasDomain: !!SHOPIFY_STORE_DOMAIN,
            });
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing Shopify API credentials or Variant ID',
                    userMessage: 'Internal configuration error. Please contact support.'
                },
                { status: 500 }
            );
        }

        // Parse and validate request body
        let body: CartRequest;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid JSON payload',
                    userMessage: 'Invalid request format'
                },
                { status: 400 }
            );
        }

        const { sessionId, price, numWordChanged, wordChanged, songName, artist, songImage, songUrl, deliveryType, lyrics, specialRequests } = body;
        const countWords = (text: string): number => {
            return text ? text.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
        };
        const MAX_WORDS = 100;
        const specialRequestsWordCount = specialRequests ? countWords(specialRequests) : 0;

        // Enhanced validation
        if (!sessionId || typeof price !== 'number' || !Number.isFinite(price) || price < 0 ||
            typeof numWordChanged !== 'number' || !Number.isFinite(numWordChanged) || numWordChanged < 0 ||
            !deliveryType || !['standard', 'rush'].includes(deliveryType) ||
            !Array.isArray(lyrics) || lyrics.length === 0 ||
            !lyrics.every(line => typeof line.original === 'string' && typeof line.modified === 'string') ||
            !Array.isArray(wordChanged) || wordChanged.length !== numWordChanged ||
            !wordChanged.every(word => typeof word === 'string' && word.trim().length > 0)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request parameters',
                    userMessage: 'Please provide valid order details'
                },
                { status: 400 }
            );
        } else if (specialRequests && specialRequestsWordCount > MAX_WORDS) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Special Request is too long',
                    userMessage: `Your 'Special Request' is too long. Please go back to "Change Lyrics" and limit it to ${MAX_WORDS} words (currently ${specialRequestsWordCount} words).`
                },
                { status: 400 }
            );
        }

        const formattedLyricsChanges = lyrics
            .filter(line => line.modified !== line.original)
            .map(line => formatLine(line.id, line.original, line.modified))
            .join("\n") || "No lyrics changes specified";
        const formattedWordList = wordChanged.join(", ").replace(/,\s*$/, '');


        // const customAttributes = [
        //     { key: 'Order Id', value: sessionId },
        //     { key: 'Delivery Type', value: deliveryType === 'rush' ? "Rush Delivery (1 day)" : "Standard Delivery (2-7 days)" },
        //     { key: 'Song Name', value: songName || 'Not specified' },
        //     { key: 'Artist', value: artist || 'Not specified' },
        //     { key: 'Song Url', value: songUrl || 'Not specified' },
        //     { key: 'Special Requests', value: specialRequests || 'Not specified' },
        //     { key: 'Song Image', value: songImage || 'Not specified' },
        // ];

        const createDraftOrderQuery = `
            mutation draftOrderCreate($input: DraftOrderInput!) {
                draftOrderCreate(input: $input) {
                    draftOrder {
                        id
                        invoiceUrl
                        lineItems(first: 10) {
                            edges {
                                node {
                                    title
                                    originalUnitPrice
                                    quantity
                                    customAttributes {
                                        key
                                        value
                                    }
                                }
                            }
                        }
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const _customAttributes = [];
        if (sessionId) _customAttributes.push({ key: "* Order ID", value: sessionId });
        _customAttributes.push({
            key: "* Priority",
            value: deliveryType === 'rush' ? "Rush Delivery (1 business day)" : "Normal Delivery (2-7 business days)"
        });
        if (songName) _customAttributes.push({ key: "* Song", value: songName });
        if (artist) _customAttributes.push({ key: "* Artist", value: artist });
        if (songUrl) _customAttributes.push({ key: "* Song URL", value: songUrl });

        _customAttributes.push({
            key: "* Lyrics Change",
            value: `\n(Word changes: ${numWordChanged} word${numWordChanged > 1 ? 's' : ''}) "${formattedWordList}"\n${formattedLyricsChanges}`
        });
        if (specialRequests) _customAttributes.push({ key: "* Special Requests", value: `"${specialRequests}"` });
        _customAttributes.push({
            key: "* Order Status",
            value: deliveryType === 'rush' ? "We will update you via your email (1 day)" : "We will update you via your email (2-7 days)"
        });
        if (songImage) _customAttributes.push({ key: "* Song Image", value: songImage });

        const draftOrderInput = {
            lineItems: [{
                quantity: 1,
                title: "Change Song Lyrics Service | Nicevois.com",
                // originalUnitPrice: 0,
                originalUnitPrice: String(price.toFixed(2)), // Standardized format
                customAttributes: _customAttributes,
                taxable: false
            }],
            // customAttributes,
            // note: `Lyrics change:\n(${wordChanged} word${wordChanged > 1 ? 's' : ''})\n${formattedLyricsChanges}`,
            tags: [`${deliveryType}-delivery`, "custom-lyrics"],
            shippingLine: {
                title: "Digital Delivery",
                price: price.toFixed(2)
            },
            taxExempt: true,
        };

        const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}.myshopify.com/admin/api/2025-01/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
            },
            body: JSON.stringify({
                query: createDraftOrderQuery,
                variables: { input: draftOrderInput }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Shopify API Error: ${response.status} ${response.statusText}`, errorText);
            return NextResponse.json(
                {
                    success: false,
                    error: `Network error (${response.status})`,
                    userMessage: 'Unable to connect to Shopify. Please try again later.'
                },
                { status: response.status }
            );
        }

        const json = await response.json() as DraftOrderResponse;

        if (json.errors?.length || json.data?.draftOrderCreate?.userErrors?.length) {
            const errorDetails = (json.errors || json.data.draftOrderCreate.userErrors)
                .map((e: ShopifyError | GraphQLError) => e.message)
                .join(', ');
            console.error(`Shopify GraphQL Error: ${errorDetails}`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'GraphQL error',
                    details: errorDetails,
                    userMessage: 'Failed to create your order. Please try again.'
                },
                { status: 400 }
            );
        }

        const draftOrder = json.data.draftOrderCreate.draftOrder;
        if (!draftOrder?.id || !draftOrder?.invoiceUrl) {
            console.error('Incomplete draft order response:', draftOrder);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid Shopify response',
                    userMessage: 'Order created but response incomplete'
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                orderId: draftOrder.id,
                invoiceUrl: draftOrder.invoiceUrl,
                lineItems: draftOrder.lineItems.edges.map(edge => edge.node)
            }
        });

    } catch (error) {
        console.error('Error in draft order creation:', error instanceof Error ? error.stack : error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                userMessage: 'Something went wrong. Please try again later.'
            },
            { status: 500 }
        );
    }
}