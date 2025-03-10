import { NextRequest, NextResponse } from 'next/server';

// Shopify credentials (server-side only)
const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;

interface CartRequest {
    sessionId: string;
    price: number;
    wordChanged: number;
    songName?: string;
    artist?: string;
    songUrl?: string;
    deliveryType: 'standard' | 'rush';
    lyrics: { id: number, original: string; modified: string }[];
    specialRequests?: string;
}

type ShopifyError = {
    field?: string[];
    message: string;
};

interface LineItemNode {
    title: string;
    originalUnitPrice: string;
    quantity: number;
    customAttributes?: { key: string; value: string }[];
}

interface LineItemEdge {
    node: LineItemNode;
}

interface GraphQLError {
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, unknown>;
}

interface DraftOrderResponse {
    data: {
        draftOrderCreate: {
            draftOrder: {
                id: string;
                invoiceUrl: string;
                lineItems: { edges: LineItemEdge[] };
            };
            userErrors: ShopifyError[];
        };
    };
    errors?: GraphQLError[];
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

        const { sessionId, price, wordChanged, songName, artist, songUrl, deliveryType, lyrics, specialRequests } = body;

        // Enhanced validation
        if (!sessionId || typeof price !== 'number' || !Number.isFinite(price) || price < 0 ||
            typeof wordChanged !== 'number' || !Number.isFinite(wordChanged) || wordChanged < 0 ||
            !deliveryType || !['standard', 'rush'].includes(deliveryType) ||
            !Array.isArray(lyrics) || lyrics.length === 0 ||
            !lyrics.every(line => typeof line.original === 'string' && typeof line.modified === 'string')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request parameters',
                    userMessage: 'Please provide valid order details'
                },
                { status: 400 }
            );
        }

        const formattedLyricsChanges = lyrics
            .filter(line => line.modified !== line.original)
            .map((line) => `${line.id}: "${line.original}" → "${line.modified}"`)
            .join("\n") || "No lyrics changes specified";

        const customAttributes = [
            { key: 'Order Id', value: sessionId },
            { key: 'Delivery Type', value: deliveryType === 'rush' ? "Rush Delivery (1 day)" : "Standard Delivery (2-7 days)" },
            { key: 'Song Name', value: songName || 'Not specified' },
            { key: 'Artist', value: artist || 'Not specified' },
            { key: 'Song Url', value: songUrl || 'Not specified' },
            { key: 'Special Requests', value: specialRequests || 'Not specified' }
        ];

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

        const itemTitle = songUrl?.trim()
            ? `Change lyrics for: "${songUrl}"`
            : `Change lyrics for: "${songName || 'Unknown'} - ${artist || 'Unknown'}"`;

        const draftOrderInput = {
            lineItems: [{
                quantity: 1,
                title: itemTitle,
                originalUnitPrice: "0.00", // Standardized format
                customAttributes: [
                    { key: "Priority", value: deliveryType === 'rush' ? "Rush Delivery (1 day)" : "Normal Delivery (2-7 days)" },
                    { key: "Words changed", value: wordChanged.toString() },
                    { key: "Order ID", value: sessionId },
                    { key: "Special Requests", value: specialRequests || "None" }
                ]
            }],
            customAttributes,
            note: `Lyrics change:\n${formattedLyricsChanges}`,
            tags: [`${deliveryType}-delivery`, "custom-lyrics"],
            shippingLine: {
                title: "Digital Delivery",
                price: price.toFixed(2)
            }
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