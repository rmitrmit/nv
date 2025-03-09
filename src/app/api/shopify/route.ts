// src\app\api\shopify\route.ts
import { NextRequest, NextResponse } from 'next/server';

// Shopify credentials (server-side only)
const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const VARIANT_ID = process.env.VARIANT_ID; // Get variant ID from env variables

// Interface for the request payload
interface CartRequest {
    sessionId: string;
    price: number; // Price in dollars (e.g., 10.00)
    wordChanged: number
    songName?: string; // Optional song name
    artist?: string; // Optional artist name
    songUrl?: string; // Optional song URL (fallback if name/artist not provided)
    deliveryType: 'standard' | 'rush'; // Delivery type (standard or rush)
    lyrics: { original: string; modified: string }[]; // Add lyrics array
}

type ShopifyError = {
    field?: string[];
    message: string;
};

// Type definitions for the Shopify response
interface LineItemNode {
    title: string;
    originalUnitPrice: string;
    quantity: number;
    customAttributes?: {
        key: string;
        value: string;
    }[];
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
                lineItems: {
                    edges: LineItemEdge[];
                };
            };
            userErrors: ShopifyError[];
        };
    };
    errors?: GraphQLError[]; // Properly typed GraphQL errors
}

// POST handler to create a Shopify draft order
export async function POST(request: NextRequest) {
    try {
        if (!SHOPIFY_ADMIN_API_TOKEN || !SHOPIFY_STORE_DOMAIN || !VARIANT_ID) {
            console.error('Shopify Admin API credentials or Variant ID are not set.');
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing Shopify API credentials or Variant ID',
                    userMessage: 'Internal configuration error. Please contact support.',
                },
                { status: 500 }
            );
        }

        // Parse request body
        const { sessionId, price, wordChanged, songName, artist, songUrl, deliveryType, lyrics }: CartRequest = await request.json();

        // Validate required fields
        if (!sessionId || price == null || !deliveryType || !lyrics) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required parameters',
                    userMessage: 'Please provide session ID, price, delivery type, and lyrics.',
                },
                { status: 400 }
            );
        }

        // Prepare custom attributes for the draft order
        const customAttributes = [
            { key: 'sessionId', value: sessionId },
            { key: 'deliveryType', value: deliveryType },
            { key: 'songName', value: songName || 'Not specified' },
            { key: 'artist', value: artist || 'Not specified' },
            ...(songUrl ? [{ key: 'songUrl', value: songUrl }] : []),
            // Add original and modified lyrics as attributes
            ...lyrics.map((line, index) => ({
                key: `line${index + 1}`,
                value: `Original: ${line.original} → Modified: ${line.modified}`,
            })),
        ];

        // GraphQL mutation to create draft order
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

        // Create title based on song name if available
        let itemTitle;

        if (songUrl && songUrl !== "") {
            itemTitle = `Change lyrics for: "${songUrl}"`;
        } else {
            itemTitle = `Change lyrics for: "${songName} - ${artist}"`;
        }

        const draftOrderInput = {
            lineItems: [
                {
                    variantId: `gid://shopify/ProductVariant/${VARIANT_ID}`,
                    quantity: 1,
                    title: itemTitle,
                    customAttributes: [
                        {
                            key: "Priority",
                            value: deliveryType === 'rush' ? "Rush Delivery (1 day)" : "Normal Delivery (2-7 days)"
                        },
                        {
                            key: "Words Changed",
                            value: wordChanged.toString()
                        },
                        {
                            key: "Order ID",
                            value: sessionId
                        }
                    ]
                }
            ],
            customAttributes,
            note: "Custom lyrics order",
            tags: ["custom-lyrics", "ai-generated"],
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
                variables: { input: draftOrderInput },
            }),
        });

        if (!response.ok) {
            console.error(`Shopify API Error: ${response.status} ${response.statusText}`);
            return NextResponse.json(
                {
                    success: false,
                    error: `Network error (${response.status})`,
                    userMessage: 'Unable to connect to Shopify. Please try again later.',
                },
                { status: response.status }
            );
        }

        const json = await response.json() as DraftOrderResponse;

        if (json.errors || json.data?.draftOrderCreate?.userErrors?.length) {
            const errorDetails = (json.errors || json.data.draftOrderCreate.userErrors)
                .map((e: ShopifyError) => e.message)
                .join(', ');
            console.error(`Shopify GraphQL Error: ${errorDetails}`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'GraphQL error',
                    details: errorDetails,
                    userMessage: 'Failed to create your order. Please try again.',
                },
                { status: 400 }
            );
        }

        const draftOrder = json.data.draftOrderCreate.draftOrder;

        // Return draft order details including invoice URL
        return NextResponse.json({
            success: true,
            data: {
                orderId: draftOrder.id,
                invoiceUrl: draftOrder.invoiceUrl,  // This is the invoice URL
                lineItems: draftOrder.lineItems.edges.map((edge: LineItemEdge) => edge.node)
            },
        });
    } catch (error) {
        console.error('Error in draft order creation:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                userMessage: 'Something went wrong. Please try again later.',
            },
            { status: 500 }
        );
    }
}