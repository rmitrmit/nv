export type ShopifyError = {
    field?: string[];
    message: string;
};

interface LineItemNode {
    title: string;
    originalUnitPrice: string;
    quantity: number;
    customAttributes?: { key: string; value: string }[];
}

export interface LineItemEdge {
    node: LineItemNode;
}

export interface GraphQLError {
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, unknown>;
}

export interface DraftOrderResponse {
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


type DiffWord = {
    word: string;
    inserted: boolean;
};

function diffWords(originalWords: string[], modifiedWords: string[]): DiffWord[] {
    const result: DiffWord[] = [];
    let i = 0,
        j = 0;
    while (i < originalWords.length && j < modifiedWords.length) {
        if (originalWords[i] === modifiedWords[j]) {
            // Words match exactly.
            result.push({ word: modifiedWords[j], inserted: false });
            i++;
            j++;
        } else {
            // If the next word in original matches the current modified word,
            // treat the current original word as missing.
            if (i + 1 < originalWords.length && originalWords[i + 1] === modifiedWords[j]) {
                result.push({ word: "[]", inserted: true });
                i++;
            } else {
                // Otherwise, treat it as a change.
                result.push({ word: `[${modifiedWords[j]}]`, inserted: false });
                i++;
                j++;
            }
        }
    }
    // If there are any remaining original words, they were removed.
    while (i < originalWords.length) {
        result.push({ word: "[]", inserted: true });
        i++;
    }
    // (If there are extra words in modified, mark them as changed.)
    while (j < modifiedWords.length) {
        result.push({ word: `<${modifiedWords[j]}>`, inserted: false });
        j++;
    }
    return result;
}

function mergeWithOriginalTokens(originalTokens: string[], diff: DiffWord[]): string[] {
    const result: string[] = [];
    let wordIndex = 0;
    for (const token of originalTokens) {
        if (isWord(token)) {
            if (wordIndex < diff.length) {
                result.push(diff[wordIndex].word);
                wordIndex++;
            } else {
                // Fallback if something went wrong.
                result.push(token);
            }
        } else {
            // For punctuation, use the original token.
            result.push(token);
        }
    }
    // If any diff words remain, append them.
    while (wordIndex < diff.length) {
        result.push(diff[wordIndex].word);
        wordIndex++;
    }
    return result;
}

export function formatLine(id: number, original: string, modified: string): string {
    const originalTokens: string[] = tokenize(original);
    const modifiedTokens: string[] = tokenize(modified);

    const originalWords: string[] = originalTokens.filter(isWord);
    const modifiedWords: string[] = modifiedTokens.filter(isWord);

    const diff = diffWords(originalWords, modifiedWords);
    const mergedTokens = mergeWithOriginalTokens(originalTokens, diff);

    // Join tokens with spacing; punctuation tokens attach to the previous token.
    let resultStr: string = mergedTokens[0] || "";
    for (let i = 1; i < mergedTokens.length; i++) {
        if (isAttachingPunctuation(mergedTokens[i])) {
            resultStr += mergedTokens[i];
        } else {
            resultStr += " " + mergedTokens[i];
        }
    }
    return `${id}: "${original}" → "${resultStr}"\n`;
}

// Helper: splits text into words and punctuation tokens.
function tokenize(text: string): string[] {
    return text.match(/[a-zA-Z0-9']+|[^a-zA-Z0-9'\s]+/g) || [];
}

// Helper: returns true if the token is a word.
function isWord(token: string): boolean {
    return /[a-zA-Z0-9']/.test(token);
}

// Helper: returns true if the token is punctuation that should attach to the previous token.
function isAttachingPunctuation(token: string): boolean {
    return [",", ".", "!", "?", ";", ":", ")", "]", "}", "\"", "'"].includes(token);
}