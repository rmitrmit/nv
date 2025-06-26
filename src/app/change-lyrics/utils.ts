/*******************************************************************
 *                                                                 *
 *  WARNING:                                                       *
 *  - Please run "npm test --path /src/app/change-lyrics/test.ts"  *
 *  after editing this file.                                       *
 *  - Any edit without testing can lead to bugs! You have been     *
 *  warned!                                                        *
 *                                                                 *
 *******************************************************************/
// src\app\change-lyrics\utils.ts
import { diffWords, diffChars } from 'diff';
import { toast as sonnerToast } from 'sonner'; // Import toast type from sonner

export type CheckoutData = {
    title: string;
    artist: string;
    image?: string; // Add image field
    url: string;
    changedWords: string[];
    modifiedLyrics: string;
    originalLyrics?: string; // Add original lyrics field
    specialRequests: string;
    deliveryPreference: string;
    totalCost: string;
    generatedOn: string;
}

export interface FormValues {
    songUrl: string;
    lyrics: string;
}

// Add this at the beginning of the file or wherever the interface is defined
export interface WordChange {
    originalWord: string;
    newWord: string;
    originalIndex: number;
    newIndex: number;
    hasChanged: boolean;
    isTransformation?: boolean;
    isDeletion?: boolean;
    isAddition?: boolean;
    isSubstitution?: boolean;
    isExplicitDeletion?: boolean;
}

export type LyricLine = {
    id: number;
    original: string;
    modified: string;
    markedText?: string;
    wordChanges: WordChange[];
};

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function mergeAdjacentWordChanges(changes: WordChange[]): WordChange[] {
    if (!changes || changes.length === 0) return changes;
    const merged: WordChange[] = [];
    let i = 0;
    while (i < changes.length) {
        const current = changes[i];
        // Only merge adjacent deletion changes if they are not both explicitly generated
        if (current.isDeletion && i < changes.length - 1) {
            const next = changes[i + 1];
            if (
                next.isDeletion &&
                next.originalIndex === current.originalIndex + 1
            ) {
                // If both changes come from an explicit deletion branch, do NOT merge them.
                if (current.isExplicitDeletion && next.isExplicitDeletion) {
                    merged.push(current);
                    i++; // increment one by one so that explicit deletions remain separate
                    continue;
                }
                // Otherwise, merge adjacent deletion changes.
                const mergedChange: WordChange = {
                    originalWord: current.originalWord + ' ' + next.originalWord,
                    newWord: current.newWord + ' ' + next.newWord,
                    originalIndex: current.originalIndex,
                    newIndex: current.newIndex,
                    hasChanged: true,
                    isDeletion: true,
                    isAddition: false,
                    isSubstitution: false,
                };
                merged.push(mergedChange);
                i += 2; // skip the next item that was merged
                continue;
            }
        }
        merged.push(current);
        i++;
    }
    return merged;
}

const preservePunctuation = (text: string): string[] => {
    // Match words with their attached punctuation
    return text.match(/\S+/g) || [];
};

function isPunctuationOnly(text: string): boolean {
    // Matches strings that contain only whitespace and punctuation
    return /^[\s\p{P}]+$/u.test(text);
}

// Updated function to use diff library
export function calculateWordChanges(original: string, modified: string): WordChange[] {
    const isCJK = containsCJK(original);
    const diffs = isCJK ? diffChars(original, modified) : diffWords(original, modified);
    const changes: WordChange[] = [];
    let originalIndex = 0;
    let newIndex = 0;

    if (isCJK) {
        // [CJK branch remains unchanged …]
        const consecutiveChanges: {
            additions: string[],
            deletions: string[],
            startOriginalIndex: number,
            startNewIndex: number
        }[] = [];
        let currentGroup: {
            additions: string[],
            deletions: string[],
            startOriginalIndex: number,
            startNewIndex: number
        } | null = null;

        diffs.forEach(part => {
            if (part.added) {
                if (!currentGroup) {
                    currentGroup = {
                        additions: [],
                        deletions: [],
                        startOriginalIndex: originalIndex,
                        startNewIndex: newIndex
                    };
                    consecutiveChanges.push(currentGroup);
                }
                for (let i = 0; i < part.value.length; i++) {
                    currentGroup.additions.push(part.value[i]);
                    newIndex++;
                }
            } else if (part.removed) {
                if (!currentGroup) {
                    currentGroup = {
                        additions: [],
                        deletions: [],
                        startOriginalIndex: originalIndex,
                        startNewIndex: newIndex
                    };
                    consecutiveChanges.push(currentGroup);
                }
                for (let i = 0; i < part.value.length; i++) {
                    currentGroup.deletions.push(part.value[i]);
                    originalIndex++;
                }
            } else {
                currentGroup = null;
                for (let i = 0; i < part.value.length; i++) {
                    changes.push({
                        originalWord: part.value[i],
                        newWord: part.value[i],
                        originalIndex: originalIndex,
                        newIndex: newIndex,
                        hasChanged: false,
                    });
                    originalIndex++;
                    newIndex++;
                }
            }
        });

        consecutiveChanges.forEach(group => {
            if (group.deletions.length > 0 && group.additions.length > 0) {
                changes.push({
                    originalWord: group.deletions.join(''),
                    newWord: group.additions.join(''),
                    originalIndex: group.startOriginalIndex,
                    newIndex: group.startNewIndex,
                    hasChanged: true,
                    isSubstitution: true,
                    isAddition: false,
                    isDeletion: false,
                });
            } else if (group.deletions.length > 0) {
                changes.push({
                    originalWord: group.deletions.join(''),
                    newWord: '',
                    originalIndex: group.startOriginalIndex,
                    newIndex: -1,
                    hasChanged: true,
                    isDeletion: true,
                    isAddition: false,
                    isSubstitution: false,
                });
            } else if (group.additions.length > 0) {
                changes.push({
                    originalWord: '',
                    newWord: group.additions.join(''),
                    originalIndex: -1,
                    newIndex: group.startNewIndex,
                    hasChanged: true,
                    isAddition: true,
                    isDeletion: false,
                    isSubstitution: false,
                });
            }
        });

        changes.sort((a, b) => {
            const aIndex = a.originalIndex !== -1 ? a.originalIndex : a.newIndex;
            const bIndex = b.originalIndex !== -1 ? b.originalIndex : b.newIndex;
            return aIndex - bIndex;
        });

        return changes;
    } else {
        // NEW: Group diff results for non-CJK texts.
        let groupRemovals: { word: string }[] = [];
        let groupAdditions: { word: string }[] = [];
        const flushGroup = () => {
            if (groupRemovals.length > 0 && groupAdditions.length > 0) {
                // Merge entire group as a single substitution change.
                const origCombined = groupRemovals.map(r => r.word).join(' ');
                const newCombined = groupAdditions.map(a => a.word).join(' ');
                // Check if the two words differ only due to punctuation.
                const strippedOrig = origCombined.replace(/[.,!?;:]/g, '');
                const strippedNew = newCombined.replace(/[.,!?;:]/g, '');
                if (origCombined && newCombined && strippedOrig === strippedNew) {
                    // if differences are punctuation-only, then consider it unchanged.
                    changes.push({
                        originalWord: origCombined,
                        newWord: newCombined,
                        originalIndex: originalIndex++,
                        newIndex: newIndex++,
                        hasChanged: false,
                        isSubstitution: true,
                    });
                } else {
                    changes.push({
                        originalWord: origCombined,
                        newWord: newCombined,
                        originalIndex: originalIndex++,
                        newIndex: newIndex++,
                        hasChanged: true,
                        isSubstitution: true,
                    });
                }
            } else if (groupRemovals.length > 0) {
                // Process leftover removals individually.
                for (const { word } of groupRemovals) {
                    if (word.replace(/[.,!?;:]/g, '') === '') {
                        changes.push({
                            originalWord: word,
                            newWord: '',
                            originalIndex: originalIndex++,
                            newIndex: -1,
                            hasChanged: false,
                            isDeletion: true,
                        });
                    } else {
                        changes.push({
                            originalWord: word,
                            newWord: '',
                            originalIndex: originalIndex++,
                            newIndex: -1,
                            hasChanged: true,
                            isDeletion: true,
                        });
                    }
                }
            } else if (groupAdditions.length > 0) {
                // Process leftover additions individually.
                for (const { word } of groupAdditions) {
                    if (word.replace(/[.,!?;:]/g, '') === '') {
                        changes.push({
                            originalWord: '',
                            newWord: word,
                            originalIndex: -1,
                            newIndex: newIndex++,
                            hasChanged: false,
                            isAddition: true,
                        });
                    } else {
                        changes.push({
                            originalWord: '',
                            newWord: word,
                            originalIndex: -1,
                            newIndex: newIndex++,
                            hasChanged: true,
                            isAddition: true,
                        });
                    }
                }
            }
            groupRemovals = [];
            groupAdditions = [];
        };

        diffs.forEach(part => {
            const words = part.value.trim().split(/\s+/).filter(Boolean);
            if (part.added) {
                words.forEach(word => {
                    groupAdditions.push({ word });
                });
            } else if (part.removed) {
                words.forEach(word => {
                    groupRemovals.push({ word });
                });
            } else {
                // Before processing the unchanged words, flush any accumulated changes.
                if (groupRemovals.length || groupAdditions.length) {
                    flushGroup();
                }
                words.forEach(word => {
                    changes.push({
                        originalWord: word,
                        newWord: word,
                        originalIndex: originalIndex++,
                        newIndex: newIndex++,
                        hasChanged: false,
                    });
                });
            }
        });
        // Flush at end if any group remains.
        if (groupRemovals.length || groupAdditions.length) {
            flushGroup();
        }
        return changes;
    }
}

export function generateLyricsData(text: string): LyricLine[] {
    // Remove leading/trailing newlines and normalize line endings
    const cleanedText = text.replace(/^[\n\r]+|[\n\r]+$/g, '').replace(/\r\n|\r/g, '\n');
    const lines = cleanedText
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map((line, index) => ({
            id: index + 1,
            original: line.trim(),
            modified: line.trim(),
            markedText: line.trim(),  // <== Added initialization for markedText
            wordChanges: [],
        }));
    return lines;
}

// Helper to check for CJK characters (Chinese, Japansese, Korean)
export function containsCJK(text: string): boolean {
    return /[\u3000-\u303F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(text);
}
export function generateMarkedText(
    original: string,
    modified: string,
    wordChanges: WordChange[]
): string {
    if (containsCJK(original)) {
        return modified;
    }

    // If any deletion exists in the word changes, build the marked text from them.
    if (wordChanges.some(change => change.isDeletion && !change.isSubstitution)) {
        return wordChanges
            .map(change => {
                // First, handle substitutions to avoid inserting deletion markers
                if (change.isSubstitution) {
                    return `<span class="text-red-600">${change.newWord}</span>`;
                }
                if (change.isDeletion) {
                    const match = change.newWord.match(/(🗙)([.,!?;:]*)/);
                    if (match) {
                        return `<span class="text-red-600">${match[1]}</span>${match[2]}`;
                    }
                    return `<span class="text-red-600">🗙</span>`;
                }
                if (change.isAddition) {
                    return `<span class="text-red-600">${change.newWord}</span>`;
                }
                return change.newWord;
            })
            .join(' ')
            .replace(/\s+([,;:!?.])/g, '$1'); // Remove extra spaces before punctuation
    }

    // Fallback: If no explicit deletions, use diffWords to generate marked text for additions.
    const diffResult = diffWords(original, modified, { ignoreWhitespace: false });
    let htmlResult = '';

    diffResult.forEach(part => {
        const escapedValue = part.value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (part.added) {
            if (isPunctuationOnly(part.value)) {
                htmlResult += escapedValue;
            } else {
                const content = escapedValue.replace(/(\S+)/g, `<span class="text-red-600">$1</span>`);
                htmlResult += content;
            }
        } else if (!part.removed) {
            htmlResult += escapedValue;
        }
    });

    return htmlResult.replace(/\s{2,}/g, ' ').trim();
}

export function countChangedWords(line: LyricLine): number {
    if (!line.wordChanges || line.wordChanges.length === 0) {
        return 0;
    }

    if (containsCJK(line.original)) {
        let total = 0;
        for (const change of line.wordChanges) {
            if (change.hasChanged) {
                if (change.isSubstitution) {
                    total += Math.max(change.originalWord.length, change.newWord.length);
                } else if (change.isDeletion) {
                    total += change.originalWord.length;
                } else if (change.isAddition) {
                    total += change.newWord.length;
                }
            }
        }
        return total;
    } else {
        const mergedChanges = mergeAdjacentWordChanges(line.wordChanges);
        let total = 0;
        for (const change of mergedChanges) {
            if (!change.hasChanged) continue;
            if (change.isSubstitution) {
                // Remove punctuation tokens and extra whitespace before counting
                const origStripped = change.originalWord.replace(/[.,!?;:]/g, '').trim();
                const newStripped = change.newWord.replace(/[.,!?;:]/g, '').trim();
                if (origStripped === newStripped) {
                    // If after stripping punctuation the words are the same, do not count as a change.
                    continue;
                }

                // Split words and filter out tokens that are only punctuation.
                const origTokens = change.originalWord.split(/\s+/).filter(token => !/^[.,!?;:]+$/.test(token));
                const newTokens = change.newWord.split(/\s+/).filter(token => !/^[.,!?;:]+$/.test(token));
                const origCount = origTokens.length || 1;
                const newCount = newTokens.length || 1;
                total += Math.max(origCount, newCount);
            } else if (change.isAddition) {
                // For additions, count only tokens that are not just punctuation.
                const tokens = change.newWord.split(/\s+/).filter(token => !/^[.,!?;:]+$/.test(token));
                total += tokens.length || 1;
            } else if (change.isDeletion) {
                // For deletions, count as one word change.
                total += 1;
            } else {
                total += 1;
            }
        }
        return total;
    }
}

export function getDistinctChangedWords(lyrics: LyricLine[]): string[] {
    // Helper function to normalize a word:
    // It removes punctuation (and the deletion marker "🗙") from the start and end, then converts to lowercase.
    const normalizeWord = (word: string): string => {
        return word
            .replace(/^[.,!?;:"'\[\]{}\(\)\-—_🗙]+|[.,!?;:"'\[\]{}\(\)\-—_]+$/g, "")
            .toLowerCase();
    };

    // Two sets: one for words added (or substituted) and one for words that only appear in deletion.
    const additions = new Set<string>();
    const deletions = new Set<string>();

    lyrics.forEach(line => {
        // Use merged changes for non-CJK; otherwise, use as-is.
        const changes = containsCJK(line.original)
            ? line.wordChanges
            : mergeAdjacentWordChanges(line.wordChanges);

        changes.forEach(change => {
            if (change.hasChanged) {
                if (change.isSubstitution || change.isAddition) {
                    // Record addition/substitution words in a normalized way (without any prefix).
                    const newNorm = normalizeWord(change.newWord);
                    if (newNorm) {
                        additions.add(newNorm);
                    }
                } else if (change.isDeletion) {
                    // Record deletions as normalized words.
                    const originalNorm = normalizeWord(change.originalWord);
                    if (originalNorm) {
                        deletions.add(originalNorm);
                    }
                } else {
                    // Default fallback: treat as addition.
                    const fallbackNorm = normalizeWord(change.newWord);
                    if (fallbackNorm) {
                        additions.add(fallbackNorm);
                    }
                }
            }
        });
    });

    // For deletions, if a word is found in the additions set,
    // that means the same word was added elsewhere, so we do not want to use the deletion marker.
    // We only want the "added" version (i.e. without the 🗙 prefix).
    const finalDeletions = new Set<string>();
    deletions.forEach(word => {
        if (!additions.has(word)) {
            finalDeletions.add(word);
        }
    });

    // Combine the results: words from additions, and for words that appear only as deletion,
    // prepend the "🗙" marker.
    const result = new Set<string>([...additions]);
    finalDeletions.forEach(word => {
        result.add(`🗙${word}`);
    });

    return Array.from(result);
}


export const stripHtmlAndSymbols = (text: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;

    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    // Remove 🗙 symbols completely and trim excess spaces
    return plainText.replace(/🗙/g, ' ').replace(/\s{2,}/g, ' ').trim();
};

export function handleLyricChange(
    id: number,
    newText: string,
    setLyrics: React.Dispatch<React.SetStateAction<LyricLine[]>>,
    setFormValues: React.Dispatch<React.SetStateAction<FormValues>>,
    toast?: typeof sonnerToast
): void {
    setLyrics((prevLyrics: LyricLine[]) => {
        const updatedLyrics = prevLyrics.map((line: LyricLine) => {
            if (line.id !== id) return line;

            const sanitizedNewText = stripHtmlAndSymbols(newText);

            // Handle case: Empty input -> mark all words as deletions
            if (!sanitizedNewText.trim()) {
                const words = line.original.trim().split(/\s+/).filter(Boolean);
                const deletionMarkers = words.map(() => "🗙").join(" ");

                const wordChanges = words.map((word, idx) => ({
                    originalWord: word,
                    newWord: '',
                    originalIndex: idx,
                    newIndex: -1,
                    hasChanged: true,
                    isDeletion: true,
                    // Mark these deletion changes as explicit (so they won’t be merged)
                    isExplicitDeletion: true,
                }));

                const markedText = wordChanges
                    .map(() => `<span class="text-red-600">🗙</span>`)
                    .join(" ");

                return {
                    ...line,
                    modified: deletionMarkers,
                    markedText,
                    wordChanges,
                };
            }
            const effectiveText = stripHtmlAndSymbols(line.original);

            let normalizedNewText = sanitizedNewText.replace(/\s{2,}/g, ' ').trim();

            const originalWords = effectiveText.match(/\p{L}+/gu) || [];
            const newWords = normalizedNewText.match(/\p{L}+/gu) || [];


            if (originalWords.length > newWords.length) {
                const punctRegex = /([,;:])\s*([!?.])/g;
                let withMarkers = normalizedNewText.replace(punctRegex, "$1 🗙$2");

                if (withMarkers === normalizedNewText) {
                    const differences = diffWords(effectiveText, normalizedNewText);
                    const removals = differences.filter(d => d.removed);

                    if (removals.length > 0) {
                        const finalPunctMatch = normalizedNewText.match(/([,;:])?\s*([!?.])$/);
                        if (finalPunctMatch) {
                            const punctStart = finalPunctMatch.index!;
                            const hasMidPunct = finalPunctMatch[1];

                            if (hasMidPunct) {
                                const midPunctEnd = punctStart + hasMidPunct.length;
                                withMarkers =
                                    normalizedNewText.slice(0, midPunctEnd) +
                                    " 🗙" +
                                    normalizedNewText.slice(midPunctEnd);
                            } else {
                                const finalPunct = finalPunctMatch[2];
                                const finalPunctStart = normalizedNewText.lastIndexOf(finalPunct);
                                withMarkers =
                                    normalizedNewText.slice(0, finalPunctStart) +
                                    " 🗙" +
                                    normalizedNewText.slice(finalPunctStart);
                            }
                        }
                    }
                }

                normalizedNewText = withMarkers;
            }

            let wordChanges: WordChange[];

            // Handle 🗙 explicitly as deletion markers
            if (normalizedNewText.includes("🗙")) {
                const finalParts = preservePunctuation(normalizedNewText);
                const effectiveParts = preservePunctuation(effectiveText);

                wordChanges = finalParts.map((part, i) => {
                    if (part.includes("🗙")) {
                        const match = part.match(/(🗙)([.,!?;:]*)/);
                        return {
                            originalWord: effectiveParts[i] || '',
                            newWord: match ? match[1] + (match[2] || '') : part,
                            originalIndex: i,
                            newIndex: i,
                            hasChanged: true,
                            isDeletion: true,
                        };
                    } else {
                        return {
                            originalWord: effectiveParts[i] || part,
                            newWord: part,
                            originalIndex: i,
                            newIndex: i,
                            hasChanged: false,
                        };
                    }
                });
            } else {
                // Otherwise, compute diff and handle transformations
                wordChanges = calculateWordChanges(effectiveText, normalizedNewText);
                wordChanges = wordChanges.map(change => {
                    const prior = line.wordChanges.find(
                        prev =>
                            prev.originalWord === change.originalWord &&
                            prev.newWord !== prev.originalWord &&
                            prev.isTransformation
                    );
                    if (prior) {
                        return { ...change, isTransformation: true };
                    }
                    return change;
                });
                if (!containsCJK(effectiveText)) {
                    wordChanges = mergeAdjacentWordChanges(wordChanges);
                }
            }

            const markedText = generateMarkedText(effectiveText, normalizedNewText, wordChanges);

            return {
                ...line,
                modified: normalizedNewText,
                markedText,
                wordChanges,
            };
        });
        // Update the `lyrics` field in form values
        setFormValues((prev: FormValues) => ({
            ...prev,
            lyrics: updatedLyrics.map(line => line.modified).join('\n'),
        }));
        return updatedLyrics;
    });

    if (toast) {
        toast.success('Lyric updated successfully');
    }
}

export function handleReplaceAll(
    replaceTerm: string,
    replaceWith: string,
    setLyrics: React.Dispatch<React.SetStateAction<LyricLine[]>>,
    setFormValues: React.Dispatch<React.SetStateAction<FormValues>>,
    toast?: typeof sonnerToast
): void {
    if (!replaceTerm.trim() && replaceTerm !== '') {
        toast?.error('Please enter a term to replace');
        return;
    }

    const termMatch = replaceTerm.match(/^(.+?)([.,!?;:]*)$/);
    const termWord = termMatch ? termMatch[1] : replaceTerm;
    const termPunct = termMatch ? termMatch[2] : '';

    const escapedTermWord = escapeRegExp(termWord);
    const exactPattern = termPunct
        ? new RegExp(escapeRegExp(replaceTerm), 'g')
        : null;

    let totalReplacements = 0; // Accumulates all replacement instances

    // Helper function to check if a line should be ignored
    const shouldIgnoreLine = (text: string): boolean => {
        const trimmed = text.trim();
        if (!trimmed) return false;

        const startsWithBracket = trimmed.startsWith('<') || trimmed.startsWith('(') || trimmed.startsWith('[');
        const endsWithBracket = trimmed.endsWith('>') || trimmed.endsWith(')') || trimmed.endsWith(']');

        return startsWithBracket && endsWithBracket;
    };

    setLyrics(prevLyrics => {
        const updatedLyrics = prevLyrics.map(line => {
            const currentText = line.modified;

            // Skip replacement if line matches ignore pattern
            if (shouldIgnoreLine(currentText)) {
                return line; // Return unchanged line
            }

            let newModified = currentText;
            let replacedCountInLine = 0; // Count replacements for this line

            // First branch handles exact pattern (if any punctuation is attached)
            if (exactPattern) {
                newModified = newModified.replace(exactPattern, () => {
                    replacedCountInLine++;
                    return replaceWith + termPunct;
                });
            }

            const isCJKLine = containsCJK(newModified);
            // Create a regex pattern that matches whole words, optionally carrying punctuation
            const patternForBase = isCJKLine
                ? new RegExp(escapedTermWord, 'g')
                : new RegExp(
                    `\\b${escapedTermWord}\\b${termPunct ? `(?!${escapeRegExp(termPunct)})` : ''}`,
                    'gi'
                );

            newModified = newModified.replace(patternForBase, (matched: string) => {
                replacedCountInLine++;
                if (isCJKLine) {
                    return replaceWith;
                } else {
                    const punctuation = (matched.match(/[.,!?;:]+$/) || [''])[0];
                    return punctuation === termPunct ? replaceWith : replaceWith + punctuation;
                }
            });

            // Clean up extra spaces when replacing with an empty string.
            if (replaceWith === '') {
                newModified = newModified.replace(/\s{2,}/g, ' ').trim();
            }

            // IMPORTANT: Compute cumulative diff from the original.
            const wordChanges = calculateWordChanges(line.original, newModified);

            let markedText = '';
            if (isCJKLine) {
                // For CJK, generate marked text using diffChars and our updated wordChanges.
                const diffs = diffChars(line.original, newModified);
                diffs.forEach(part => {
                    if (part.added) {
                        markedText += `<span class="text-red-600">${part.value}</span>`;
                    } else if (!part.removed) {
                        markedText += part.value;
                    }
                });
            } else {
                markedText = generateMarkedText(line.original, newModified, wordChanges);
            }

            // Increase the total replacements by the replacements found in this line.
            totalReplacements += replacedCountInLine;

            return {
                ...line,
                modified: newModified,
                markedText,
                wordChanges
            };
        });

        // Update formValues after computing new lyrics.
        setFormValues(prev => ({
            ...prev,
            lyrics: updatedLyrics.map(line => line.modified).join('\n')
        }));

        return updatedLyrics;

    });

    // Delay the toast call until after the state update has been scheduled,
    // and call the toast only once.
    setTimeout(() => {
        if (totalReplacements > 0) {
            toast?.success(`Replaced ${Number(totalReplacements)} instance(s) of "${replaceTerm}" with "${replaceWith}"`);
        } else {
            toast?.info(`"${replaceTerm}" not found`);
        }
    }, 0);
}


export function handleResetLyrics(
    setLyrics: React.Dispatch<React.SetStateAction<LyricLine[]>>,
    setFormValues: React.Dispatch<React.SetStateAction<FormValues>>,
    toast?: typeof sonnerToast // Optional toast parameter
): void {
    setLyrics((prevLyrics: LyricLine[]) => {
        const resetLyrics = prevLyrics.map((line: LyricLine) => ({
            ...line,
            modified: line.original,
            markedText: line.original, // Reset marked text to original
            wordChanges: []
        }));
        setFormValues((prev: FormValues) => ({
            ...prev,
            lyrics: resetLyrics.map((line: LyricLine) => line.modified).join('\n')
        }));
        return resetLyrics;
    });

    toast?.success('Lyrics reset to original version'); // Optional chaining
}
export const handleResetLine = (
    lineId: number,
    setLyrics: React.Dispatch<React.SetStateAction<LyricLine[]>>,
    setFormValues: React.Dispatch<React.SetStateAction<{ songUrl: string; lyrics: string }>>
) => {
    setLyrics((prevLyrics) => {
        const updatedLyrics = prevLyrics.map(line =>
            line.id === lineId
                ? {
                    ...line,
                    modified: line.original,
                    wordChanges: line.original.split(' ').map((word, index) => ({
                        originalWord: word,
                        newWord: word,
                        originalIndex: index,
                        newIndex: index,
                        hasChanged: false
                    })),
                    markedText: line.original
                }
                : line
        );
        const entireLyricsText = updatedLyrics.map(line => line.modified).join('\n');
        setFormValues(prev => ({ ...prev, lyrics: entireLyricsText }));
        return updatedLyrics;
    });
};
// A snippet from src/app/change-lyrics/utils.ts
export const reconstructLyricsFromCheckout = (originalLyricsText: string, checkoutData: CheckoutData): LyricLine[] => {
    // console.log('=== RECONSTRUCT LYRICS DEBUG ===');
    // console.log('Original lyrics length:', originalLyricsText.length);
    // console.log('Modified lyrics length:', checkoutData.modifiedLyrics.length);
    // console.log('Changed words:', checkoutData.changedWords);

    const originalLines = originalLyricsText.split('\n');
    const modifiedLines = checkoutData.modifiedLyrics.split('\n');

    // console.log('Original lines count:', originalLines.length);
    // console.log('Modified lines count:', modifiedLines.length);

    const reconstructedLyrics: LyricLine[] = [];
    const maxLines = Math.max(originalLines.length, modifiedLines.length);

    for (let i = 0; i < maxLines; i++) {
        const originalLine = (originalLines[i] || '').trim();
        const modifiedLine = (modifiedLines[i] || '').trim();

        // Compute wordChanges using calculateWordChanges
        const wordChanges = calculateWordChanges(originalLine, modifiedLine);

        // Generate markedText for display consistency
        const markedText = generateMarkedText(originalLine, modifiedLine, wordChanges);

        reconstructedLyrics.push({
            id: i + 1,
            original: originalLine,
            modified: modifiedLine,
            markedText: markedText,
            wordChanges: wordChanges
        });
    }

    // console.log('Reconstructed lyrics sample:', reconstructedLyrics.slice(0, 3));
    // console.log('=== END RECONSTRUCT LYRICS DEBUG ===');

    return reconstructedLyrics;
};