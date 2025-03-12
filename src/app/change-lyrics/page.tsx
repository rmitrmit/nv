"use client";

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronRight, ListMusic, ArrowRight, Eraser } from 'lucide-react';
import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Form from '@radix-ui/react-form';
import * as Separator from '@radix-ui/react-separator';
import SignInToSaveButton from "@/components/SignInToSaveButton";
import { Toaster, toast } from 'sonner';
import { StepIndicator, StepDivider, type StepProps } from '@/components/layouts/StepNavigation';
import BackButton from '@/components/BackButton';
import Image from 'next/image';

// src/app/change-lyrics/page.tsx
// Type definitions
interface WordChange {
    originalWord: string;
    newWord: string;
    originalIndex: number;
    newIndex: number;
    hasChanged: boolean;
    isTransformation?: boolean; // Added optional property
}

type LyricLine = {
    id: number;
    original: string;
    modified: string;
    markedText?: string;
    wordChanges: WordChange[];
};

// Utility functions
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function calculateWordChanges(original: string, modified: string): WordChange[] {
    const normalizeText = (text: string) => {
        return text.replace(/[\n\r]+/g, ' ')
            .trim()
            .replace(/\s+/g, ' ');
    };

    const normalizedOriginal = normalizeText(original || '');
    const normalizedModified = normalizeText(modified || '');

    // If texts are identical, return empty array
    if (normalizedOriginal === normalizedModified) {
        return [];
    }

    // Split into words (preserve punctuation by keeping it with words)
    const originalWords = normalizedOriginal.split(/\s+/).filter(word => word.length > 0);
    const modifiedWords = normalizedModified.split(/\s+/).filter(word => word.length > 0);

    if (originalWords.length === 0 && modifiedWords.length === 0) {
        return [];
    }

    // Compute diff using Myers algorithm approach with a simplified implementation
    const changes: WordChange[] = [];

    // We'll use dynamic programming to find the longest common subsequence (LCS)
    // This will help us identify unchanged words
    const lcs = findLongestCommonSubsequence(originalWords, modifiedWords);

    // Use the LCS to identify changes
    let origPos = 0;
    let modPos = 0;
    let lcsPos = 0;

    while (origPos < originalWords.length || modPos < modifiedWords.length) {
        // Case 1: Word is unchanged (part of LCS)
        if (lcsPos < lcs.length &&
            origPos < originalWords.length &&
            modPos < modifiedWords.length &&
            originalWords[origPos] === lcs[lcsPos] &&
            modifiedWords[modPos] === lcs[lcsPos]) {

            changes.push({
                originalWord: originalWords[origPos],
                newWord: modifiedWords[modPos],
                originalIndex: origPos,
                newIndex: modPos,
                hasChanged: false
            });

            origPos++;
            modPos++;
            lcsPos++;
            continue;
        }

        if (origPos < originalWords.length && modPos < modifiedWords.length) {
            const originalWithoutPunctuation = originalWords[origPos].replace(/[.,()[\]{}:;!?-]+/g, '').toLowerCase();
            const modifiedWithoutPunctuation = modifiedWords[modPos].replace(/[.,()[\]{}:;!?-]+/g, '').toLowerCase();

            // If only punctuation is different, mark as unchanged
            if (originalWithoutPunctuation === modifiedWithoutPunctuation && originalWithoutPunctuation.length > 0) {
                changes.push({
                    originalWord: originalWords[origPos],
                    newWord: modifiedWords[modPos],
                    originalIndex: origPos,
                    newIndex: modPos,
                    hasChanged: false // Mark as unchanged since only punctuation differs
                });

                origPos++;
                modPos++;
                continue;
            }
        }

        // Case 2: Words in both texts, but don't match - likely a replacement
        if (origPos < originalWords.length && modPos < modifiedWords.length) {
            // Check if next words match to confirm this is a simple replacement
            const isSimpleReplacement =
                (origPos + 1 < originalWords.length &&
                    modPos + 1 < modifiedWords.length &&
                    originalWords[origPos + 1] === modifiedWords[modPos + 1]) ||
                // Or if we're at the end of both sequences
                (origPos === originalWords.length - 1 && modPos === modifiedWords.length - 1);

            if (isSimpleReplacement) {
                changes.push({
                    originalWord: originalWords[origPos],
                    newWord: modifiedWords[modPos],
                    originalIndex: origPos,
                    newIndex: modPos,
                    hasChanged: true
                });

                origPos++;
                modPos++;
                continue;
            }
        }

        // Case 3: Word was deleted from original
        if (origPos < originalWords.length &&
            (modPos >= modifiedWords.length ||
                !modifiedWords.includes(originalWords[origPos]) ||
                lcsPos < lcs.length && originalWords[origPos] !== lcs[lcsPos])) {

            changes.push({
                originalWord: originalWords[origPos],
                newWord: '',
                originalIndex: origPos,
                newIndex: modPos,
                hasChanged: true
            });

            origPos++;
            continue;
        }

        // Case 4: Word was added in modified
        if (modPos < modifiedWords.length) {
            changes.push({
                originalWord: '',
                newWord: modifiedWords[modPos],
                originalIndex: origPos > 0 ? origPos - 1 : 0,
                newIndex: modPos,
                hasChanged: true
            });

            modPos++;
            continue;
        }
    }

    return changes;
}

function findLongestCommonSubsequence(arr1: string[], arr2: string[]): string[] {
    const dp: number[][] = Array(arr1.length + 1)
        .fill(null)
        .map(() => Array(arr2.length + 1).fill(0));

    // Fill the dp table
    for (let i = 1; i <= arr1.length; i++) {
        for (let j = 1; j <= arr2.length; j++) {
            if (arr1[i - 1] === arr2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to find the sequence
    const result: string[] = [];
    let i = arr1.length;
    let j = arr2.length;

    while (i > 0 && j > 0) {
        if (arr1[i - 1] === arr2[j - 1]) {
            result.unshift(arr1[i - 1]);
            i--;
            j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }

    return result;
}


function generateLyricsData(text: string): LyricLine[] {
    // Remove leading/trailing newlines and normalize line endings
    const cleanedText = text.replace(/^[\n\r]+|[\n\r]+$/g, '').replace(/\r\n|\r/g, '\n');
    const lines = cleanedText
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map((line, index) => ({
            id: index + 1,
            text: line.trim(),
            original: line.trim(),
            modified: line.trim(),
            wordChanges: [],
        }));
    return lines;
}

// Create a wrapper component that uses useSearchParams
function ChangeLyricsPageContent() {
    // Get URL parameters
    const searchParams = useSearchParams();
    const [songId, setSongId] = useState<string | null>(searchParams.get('id'));
    const [songTitle, setSongTitle] = useState<string | null>(searchParams.get('title'));
    const [songArtist, setSongArtist] = useState<string | null>(searchParams.get('artist'));
    const [songImage, setSongImage] = useState<string | null>(searchParams.get('image'));
    const [songUrl, setSongUrl] = useState<string | null>(searchParams.get('url'));
    const isManualEntry = searchParams.get('manualEntry') === 'true';
    const router = useRouter();

    // State definitions
    const [currentStep, setCurrentStep] = useState(2);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [originalLyricsText, setOriginalLyricsText] = useState<string>('');
    const [isError, setIsError] = useState<boolean>(false);
    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [specialRequests, setSpecialRequests] = useState('');
    const [replaceTerm, setReplaceTerm] = useState('');
    const [replaceWith, setReplaceWith] = useState('');
    const [formValues, setFormValues] = useState({
        songUrl: songUrl || '',
        lyrics: '',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Constants
    const BASE_COST = 35;
    const ADDITIONAL_COST_PER_CHANGE = 5;

    // Calculate total word changes
    function countChangedWords(line: LyricLine): number {
        let changedWordCount = 0;

        // Track positions to avoid double-counting substitutions and deletions
        const countedOriginalPositions = new Set<number>();

        // Process each change in the line
        line.wordChanges.forEach(change => {
            if (!change.hasChanged) return; // Skip unchanged words

            if (change.originalWord && change.newWord) {
                // Substitution: Count only if this original position hasn't been counted
                if (!countedOriginalPositions.has(change.originalIndex)) {
                    changedWordCount++;
                    countedOriginalPositions.add(change.originalIndex);
                }
            } else if (change.originalWord && !change.newWord) {
                // Deletion: Always count, using originalIndex to track
                if (!countedOriginalPositions.has(change.originalIndex)) {
                    changedWordCount++;
                    countedOriginalPositions.add(change.originalIndex);
                }
            } else if (!change.originalWord && change.newWord) {
                // Insertion: Each insertion is a separate change
                changedWordCount++;
                // No need to track position for insertions, as each is unique by definition
            }
        });

        return changedWordCount;
    }


    // Updated totalWordChanges calculation
    const totalWordChanges = useMemo(() => {
        return lyrics.reduce((sum, line) => {
            return sum + countChangedWords(line);
        }, 0);
    }, [lyrics]);

    // Calculate cost
    const [cost, setCost] = useState(BASE_COST);
    useEffect(() => {
        // Only run if song details are not already set (e.g., from URL params)
        if (!songId && !songTitle && !songArtist && !songImage) {
            try {
                const storedSongId = localStorage.getItem('songId');
                const storedSongTitle = localStorage.getItem('songTitle');
                const storedSongArtist = localStorage.getItem('songArtist');
                const storedSongImage = localStorage.getItem('songImage');
                const storedSongUrl = localStorage.getItem('songUrl');

                if (storedSongId) setSongId(storedSongId);
                if (storedSongTitle) setSongTitle(storedSongTitle);
                if (storedSongArtist) setSongArtist(storedSongArtist);
                if (storedSongImage) setSongImage(storedSongImage);
                if (storedSongUrl) setSongUrl(storedSongUrl);
            } catch (error) {
                console.error('Error retrieving song details from localStorage:', error);
            }
        }
    }, [songArtist, songId, songImage, songTitle]);

    // Update cost whenever word changes are modified
    useEffect(() => {
        const additionalChanges = Math.max(0, totalWordChanges - 1); // First change is free
        setCost(BASE_COST + additionalChanges * ADDITIONAL_COST_PER_CHANGE);
        setIsError(false);
    }, [totalWordChanges]);

    // Manual Entry and Initial State Setup
    useEffect(() => {
        if (!isManualEntry) return;

        try {
            const storedLyrics = localStorage.getItem('manualEntryLyrics');
            console.log('Retrieved manualEntryLyrics:', storedLyrics);
            if (storedLyrics) {
                setOriginalLyricsText(storedLyrics);
                setLyrics(generateLyricsData(storedLyrics));
                setFormValues(prev => ({ ...prev, lyrics: storedLyrics }));
                console.log('Manual entry lyrics set successfully');
                setIsLoading(false);
            } else {
                setFormErrors(prev => ({
                    ...prev,
                    general: 'No lyrics found for manual entry. Please try again.'
                }));
                console.log('No manual entry lyrics found in localStorage');
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Error retrieving manual entry lyrics from localStorage:', error);
            setFormErrors(prev => ({
                ...prev,
                general: 'Error loading manual entry lyrics. Please try again.'
            }));
            setIsLoading(false);
        }
    }, [isManualEntry]);

    // Fetch Lyrics from API for Song ID
    useEffect(() => {
        let isMounted = true;

        const fetchLyricsByTitleAndArtist = async (songTitle: string, songArtist: string) => {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/genius/lyrics?track_name=${encodeURIComponent(songTitle)}&artist_name=${encodeURIComponent(songArtist)}`);
                if (!response.ok) {
                    toast.error('We had problem fetching the lyrics. Please go "back" and select "manual entry" tab.');
                    setIsError(true);
                    throw new Error(`API error: ${response.status}`);
                }
                const data = await response.json();

                if (!isMounted) return;

                if (data.lyrics) {
                    setOriginalLyricsText(data.lyrics);
                    setLyrics(generateLyricsData(data.lyrics));
                    setFormValues(prev => ({ ...prev, lyrics: data.lyrics }));
                    console.log('API lyrics fetched and set successfully');
                } else {
                    setFormErrors(prev => ({ ...prev, general: 'Lyrics not found' }));
                    console.error('Lyrics not found from API');
                }
            } catch (error) {
                if (!isMounted) return;
                setFormErrors(prev => ({
                    ...prev,
                    general: `Error loading lyrics: ${error instanceof Error ? error.message : 'Unknown error'}`
                }));
                console.error('Error fetching lyrics:', error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        // Skip API fetch if manual entry or required data is missing
        if (isManualEntry || !songTitle || !songArtist) return;

        // Check if there are saved lyrics in localStorage
        const savedLyrics = localStorage.getItem('lyrics');
        if (savedLyrics) {
            console.log('Skipping API fetch; using saved lyrics from localStorage');
            return; // Exit early if saved lyrics exist
        }

        // Proceed with fetch if no saved lyrics
        if (songId) {
            fetchLyricsByTitleAndArtist(songTitle, songArtist);
        }

        return () => {
            isMounted = false;
        };
    }, [songTitle, songArtist, songId, isManualEntry]);

    // State Restoration for Non-Manual Entry
    useEffect(() => {
        if (isManualEntry) return; // Skip restoration for manual entry

        try {
            const savedStep = localStorage.getItem('currentStep');
            if (savedStep) setCurrentStep(parseInt(savedStep, 10));

            const savedLyrics = localStorage.getItem('lyrics');
            if (savedLyrics) {
                setLyrics(JSON.parse(savedLyrics));
                console.log('Restored saved lyrics:', JSON.parse(savedLyrics));
            }

            const savedRequests = localStorage.getItem('specialRequests');
            if (savedRequests) setSpecialRequests(savedRequests);

            const savedFormValues = localStorage.getItem('formValues');
            if (savedFormValues) setFormValues(JSON.parse(savedFormValues));

            const savedCost = localStorage.getItem('cost');
            if (savedCost) setCost(parseFloat(savedCost));

            console.log('State restoration completed');
        } catch (error) {
            console.error('Error restoring state from localStorage:', error);
            toast.error('Failed to restore previous changes');
        }
    }, [isManualEntry]); // Run only on mount

    // Improved stripHtmlAndSymbols function
    const stripHtmlAndSymbols = (text: string) => {
        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;

        // Get plain text content
        const plainText = tempDiv.textContent || tempDiv.innerText || '';

        // Remove ⌧ symbols completely and trim excess spaces
        return plainText.replace(/⌧/g, ' ').replace(/\s{2,}/g, ' ').trim();
    };

    function handleLyricChange(id: number, newText: string) {
        setLyrics(prevLyrics => {
            const updatedLyrics = prevLyrics.map(line => {
                if (line.id !== id) return line;

                // Clean up the input text
                const sanitizedNewText = stripHtmlAndSymbols(newText);

                // If there's no content after sanitizing, return the line unchanged
                if (!sanitizedNewText.trim()) {
                    return line;
                }

                // Normalize the text to remove extra whitespace
                const normalizedNewText = sanitizedNewText.replace(/\s{2,}/g, ' ').trim();

                // Calculate word changes by comparing to original
                const wordChanges = calculateWordChanges(line.original, normalizedNewText);

                // Split the modified text
                const modifiedWords = normalizedNewText.split(/\s+/).filter(word => word.length > 0);

                // Create a result array with all the words including original and new
                const result: Array<{ text: string, type: 'unchanged' | 'changed' | 'deleted' }> = [];

                // First add all modified words with their status
                modifiedWords.forEach((word, index) => {
                    // Find if this word exists in the changes
                    const change = wordChanges.find(c =>
                        c.newIndex === index && c.newWord === word);

                    if (change && change.hasChanged) {
                        // Check if this is only a punctuation change
                        const originalWithoutPunctuation = (change.originalWord || '').replace(/[.,()[\]{}:;!?-]+/g, '');
                        const newWithoutPunctuation = word.replace(/[.,()[\]{}:;!?-]+/g, '');

                        const isPunctuationChangeOnly =
                            originalWithoutPunctuation.toLowerCase() === newWithoutPunctuation.toLowerCase() &&
                            originalWithoutPunctuation.length > 0;

                        // If it's only a punctuation change, don't mark it as changed at all
                        if (isPunctuationChangeOnly) {
                            result.push({
                                text: change.originalWord || word,
                                type: 'unchanged'
                            });
                        } else {
                            result.push({
                                text: word,
                                type: 'changed'
                            });
                        }
                    } else {
                        result.push({
                            text: word,
                            type: 'unchanged'
                        });
                    }
                });

                // Handle deletions - add a deletion marker for EACH deleted word
                const deletions = wordChanges.filter(change =>
                    change.hasChanged && !change.newWord && change.originalWord
                );

                // Sort deletions by their original position
                deletions.sort((a, b) => a.newIndex - b.newIndex);

                // Group deletions by their position to handle multiple consecutive deletes
                const positionMap = new Map<number, number>();

                deletions.forEach(deletion => {
                    const position = deletion.newIndex;
                    positionMap.set(position, (positionMap.get(position) || 0) + 1);
                });

                // Insert deletion markers for each position
                Array.from(positionMap.entries()).sort((a, b) => a[0] - b[0]).forEach(([position, count]) => {
                    // Make sure position is valid
                    const insertPosition = Math.max(0, Math.min(position, result.length));

                    // Add a deletion marker for each deleted word at this position
                    for (let i = 0; i < count; i++) {
                        result.splice(insertPosition, 0, {
                            text: '⌧',
                            type: 'deleted'
                        });
                    }
                });

                // Build the marked text with proper HTML
                const markedText = result.map(item => {
                    if (item.type === 'deleted') {
                        return `<span class="text-red-600">⌧</span>`;
                    } else if (item.type === 'changed') {
                        return `<span class="text-red-600">${item.text}</span>`;
                    } else {
                        return item.text;
                    }
                }).join(' ');

                // Build the actual modified text from the result array to ensure it matches what we're displaying
                const actualModified = result.map(item => item.text).join(' ');

                return {
                    ...line,
                    modified: actualModified,
                    markedText,
                    wordChanges
                };
            });

            // Update form values with joined lyrics
            setFormValues(prev => ({
                ...prev,
                lyrics: updatedLyrics.map(line => line.modified).join('\n')
            }));

            return updatedLyrics;
        });
    }

    const handleReplaceAll = () => {
        if (!replaceTerm.trim()) {
            toast.error('Please enter a term to replace');
            return;
        }

        setLyrics(prevLyrics => {
            const updatedLyrics = prevLyrics.map(line => {
                if (!line.modified.includes(replaceTerm)) {
                    return line;
                }

                // Split the line into words
                const words = line.modified.split(/\b/);

                // Process each word to see if it contains the replace term
                const newMarked = words.map(word => {
                    // Check if this word contains the replaceTerm (case insensitive)
                    if (word.match(new RegExp(escapeRegExp(replaceTerm), 'i'))) {
                        // Replace the matched part while preserving case
                        const modifiedWord = word.replace(
                            new RegExp(escapeRegExp(replaceTerm), 'gi'),
                            match => {
                                // Determine the case pattern of the matched text
                                if (match === match.toUpperCase()) {
                                    return replaceWith.toUpperCase();
                                } else if (match === match.toLowerCase()) {
                                    return replaceWith.toLowerCase();
                                } else if (match[0] === match[0].toUpperCase()) {
                                    return replaceWith.charAt(0).toUpperCase() + replaceWith.slice(1).toLowerCase();
                                } else {
                                    return replaceWith;
                                }
                            }
                        );

                        // Highlight the entire word
                        return `<span class="text-red-600">${modifiedWord}</span>`;
                    }
                    return word;
                }).join('');

                const newModifiedPlain = stripHtmlAndSymbols(newMarked);
                const wordChanges = calculateWordChanges(line.original, newModifiedPlain);

                // Use the existing handler to process the changes
                handleLyricChange(line.id, newModifiedPlain);

                return {
                    ...line,
                    modified: newModifiedPlain,
                    markedText: newMarked,
                    wordChanges
                };
            });

            setFormValues(prev => ({
                ...prev,
                lyrics: updatedLyrics.map(line => line.modified).join('\n')
            }));

            return updatedLyrics;
        });

        toast.success(`Replaced all instances of "${replaceTerm}" with "${replaceWith}"`);
    };

    const handleResetLyrics = () => {
        setLyrics(prevLyrics => {
            const resetLyrics = prevLyrics.map(line => ({
                ...line,
                modified: line.original,
                markedText: line.original,
                wordChanges: []
            }));
            setFormValues(prev => ({
                ...prev,
                lyrics: resetLyrics.map(line => line.modified).join('\n')
            }));
            return resetLyrics;
        });
        toast.success('Lyrics reset to original version');
    };
    const validateForm = () => {
        const errors: Record<string, string> = {};
        let isValid = true;

        // Validate lyrics
        if (!formValues.lyrics.trim()) {
            errors.lyrics = 'Lyrics are required';
            isValid = false;
        } else if (formValues.lyrics.trim().length < 50) {
            errors.lyrics = 'Your lyrics are too short, at least 50 characters are required.';
            isValid = false;
        }

        // Validate special requests word count
        const MAX_WORDS = 100;
        const countWords = (text: string): number => {
            return text ? text.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
        };
        const specialRequestsWordCount = specialRequests ? countWords(specialRequests) : 0;

        if (specialRequests && specialRequestsWordCount > MAX_WORDS) {
            errors.specialRequests = `Your request is too long. Please limit it to ${MAX_WORDS} words (currently ${specialRequestsWordCount} words).`;
            isValid = false;
        }

        setFormErrors(errors);
        return { isValid, errors }; // Return both the validity and the errors object
    };

    const handleNextStep = async (e: React.FormEvent) => {
        e.preventDefault();
        const hasChanges = lyrics.some((line) =>
            line.wordChanges && line.wordChanges.some(change => change.hasChanged)
        );
        if (!hasChanges) {
            toast.error('No changes made', {
                description: 'Please modify at least one lyric before proceeding.',
            });
            return;
        }

        // Run validation and get the fresh errors object
        const { isValid, errors } = validateForm();

        // Show toast for special requests error if that's the issue
        if (!isValid) {
            if (errors.specialRequests) {
                toast.error('Special request too long', {
                    description: errors.specialRequests,
                });
                return;
            }

            // Show toast for other validation errors
            const firstError = Object.values(errors)[0];
            toast.error('Invalid input', {
                description: firstError || 'Please fix the errors in the form',
            });
            return;
        }

        try {
            // Store lyric-related data
            localStorage.setItem('lyrics', JSON.stringify(lyrics));
            localStorage.setItem('cost', cost.toString());
            localStorage.setItem('currentStep', (currentStep + 1).toString());
            localStorage.setItem('specialRequests', specialRequests);
            localStorage.setItem('formValues', JSON.stringify(formValues));
            localStorage.setItem('deliveryOption', 'Standard Delivery');

            // Store song information safely in localStorage
            if (songId) localStorage.setItem('songId', songId);
            if (songTitle) localStorage.setItem('songTitle', songTitle);
            if (songArtist) localStorage.setItem('songArtist', songArtist);
            if (songImage) localStorage.setItem('songImage', songImage);
            if (songUrl) localStorage.setItem('songUrl', songUrl);

            setCurrentStep(currentStep + 1);
            router.push("/review");

        } catch (err) {
            console.error('Error during next step:', err);
            toast.error('Error', {
                description: 'Failed to save data. Please try again.',
            });
        }
    };


    // Define step data
    const steps: StepProps[] = [
        { step: 1, label: "Choose A Song", isActive: currentStep === 1, isComplete: currentStep > 1 },
        { step: 2, label: "Change Lyrics", isActive: currentStep === 2, isComplete: currentStep > 2 },
        { step: 3, label: "Review Order", isActive: currentStep === 3, isComplete: false },
    ];
    return (
        <main className="min-h-0 w-full">
            <div className="w-full min-h-full">
                <Toaster
                    position="top-center"
                    toastOptions={{
                        style: {
                            marginTop: "7rem",
                            padding: "16px",
                            color: "oklch(0.396 0.141 25.723)",
                            backgroundColor: "oklch(0.971 0.013 17.38)",
                            fontSize: "1.15rem"
                        },
                    }}
                />
                <section className="mx-auto w-full max-w-[1280px] flex flex-col space-y-4 px-6 sm:px-12 md:px-16 lg:px-32 xl:px-40 2xl:px-52">
                    {/* Header/Nav */}
                    <nav className="w-full bg-transparent px-4 pb-4">
                        <div className="container mx-auto flex justify-end">
                            <SignInToSaveButton />
                        </div>
                    </nav>

                    {/* Step Indicators as Tabs */}
                    <Tabs.Root
                        value={`step-${currentStep}`}
                        className="flex flex-col space-y-4 md:space-y-6"
                        onValueChange={(value) => {
                            const step = parseInt(value.split('-')[1]);
                            if (step <= currentStep) {
                                setCurrentStep(step);
                            }
                        }}
                    >
                        <Tabs.List className="flex items-center gap-2 pointer-events-none">
                            {steps.map((step, index) => (
                                <React.Fragment key={step.step}>
                                    <Tabs.Trigger value={`step-${step.step}`} asChild>
                                        <div>
                                            <StepIndicator
                                                step={step.step}
                                                label={step.label}
                                                isActive={step.isActive}
                                                isComplete={step.isComplete}
                                            />
                                        </div>
                                    </Tabs.Trigger>
                                    {index < steps.length - 1 && (
                                        <StepDivider isActive={index === 0 || (currentStep > index + 1)} />
                                    )}
                                </React.Fragment>
                            ))}
                        </Tabs.List>

                        {/* Content Section */}
                        <Tabs.Content value={`step-${currentStep}`} className="flex flex-1 flex-col space-y-2" style={{ opacity: 1 }}>
                            <h3 className="scroll-m-20 font-azbuka tracking-normal dark:text-white my-2 text-[22px] md:my-4 md:text-[28px] text-white duration-150 ease-in animate-in fade-in">
                                Describe Your Lyric Change
                            </h3>

                            {/* Song Image, Title, and Artist Display */}
                            {(songImage || songTitle || songArtist) && (
                                <div className="p-4 bg-primary/10 rounded-lg mb-4 flex flex-col sm:flex-row items-center gap-4">
                                    {songImage && (
                                        <div className="relative w-40 h-40 flex-shrink-0" id="song-image-container">
                                            <Image
                                                src={decodeURIComponent(songImage)}
                                                alt={songTitle || "Song Image"}
                                                layout="fill"
                                                objectFit="cover"
                                                className="rounded-lg"
                                                onError={(e) => {
                                                    // When error occurs, find and remove the parent container
                                                    const container = document.getElementById('song-image-container');
                                                    if (container) {
                                                        container.style.display = 'none';
                                                    }
                                                    console.error(`Failed to load image: '${songImage}'. Error: '${e}'.`);
                                                }}
                                            />
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center sm:items-start">
                                        {songTitle && (
                                            <h4 className="text-white font-azbuka text-lg">
                                                {songTitle}
                                            </h4>
                                        )}
                                        {songArtist && (
                                            <p className="text-white/80 font-roboto text-sm mt-1">
                                                by {songArtist}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex flex-row items-center gap-2 py-0">
                                <BackButton href="/" />
                                {!isError && (
                                    < button
                                        onClick={handleNextStep}
                                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/95 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 px-5 rounded-md ml-auto text-sm md:text-base h-10 md:h-12"
                                        type="button"
                                    >
                                        Change the Lyrics ${cost} <ChevronRight className="-mr-1 size-4 md:size-5" />
                                    </button>
                                )}
                            </div>

                            <Separator.Root
                                className="shrink-0 dark:bg-gray-100/5 h-[1.5px] w-full my-3 md:my-4 bg-primary/10"
                                orientation="horizontal"
                            />

                            {/* Loading state */}
                            {isLoading && (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                                </div>
                            )}

                            {/* Lyrics cost info */}
                            {!isLoading && (
                                <div
                                    className="relative w-full rounded-lg p-4 dark:border-gray-100/5 bg-primary/80 text-white/80"
                                    role="alert"
                                >
                                    <div className="flex flex-col gap-2">
                                        <div className="scroll-m-20 font-roboto font-normal tracking-wide dark:text-white text-inherit text-sm md:text-base md:leading-6">
                                            <span className="my-1.5 flex flex-row gap-1">
                                                <ListMusic className="-mt-0.5 mr-1 size-4 md:size-5 md:mt-0.5" />
                                                <span>
                                                    <strong>Pricing Summary</strong> <br />
                                                    <span>First-word Change: <strong>${BASE_COST}</strong></span> <br />
                                                    <span>Additional Changes: <strong>{Math.max(0, totalWordChanges - 1)} × ${ADDITIONAL_COST_PER_CHANGE} = ${Math.max(0, totalWordChanges - 1) * ADDITIONAL_COST_PER_CHANGE}</strong></span> <br />
                                                    <div className="text-base md:text-lg border-t border-white/20 mt-2 pt-2">
                                                        <span>
                                                            <strong>Total: ${cost}</strong> <span>({totalWordChanges} word{totalWordChanges !== 1 ? 's' : ''})</span>
                                                        </span>
                                                    </div>
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Lyrics editor */}
                            {!isLoading && (
                                <Form.Root className="flex flex-1 flex-col gap-4 pb-6" onSubmit={handleNextStep}>
                                    <div className="mt-2 overflow-y-auto">
                                        <div className="relative w-full overflow-auto">
                                            <table className="caption-bottom text-sm relative h-10 w-full text-clip rounded-md">
                                                <thead className="[&_tr]:border-b sticky top-0 z-50 h-10 w-full rounded-t-md border-b-2 bg-gray-50">
                                                    <tr className="border-b transition-colors data-[state=selected]:bg-muted">
                                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 w-5 text-sm md:text-base">#</th>
                                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 text-sm md:text-base">Original Lyrics</th>
                                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 w-10"><ArrowRight className="w-4 text-muted" /></th>
                                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 text-sm md:text-base">Modified Lyrics</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="[&_tr:last-child]:border-0 bg-white">
                                                    {lyrics.map((line) => {
                                                        return (
                                                            <tr key={line.id} className="border-b transition-colors data-[state=selected]:bg-muted">
                                                                <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 font-medium text-sm md:text-base text-muted">
                                                                    {line.id}
                                                                </td>
                                                                <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-sm md:text-base">
                                                                    {line.original}
                                                                </td>
                                                                <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                                                    <ArrowRight className="w-4 text-muted" />
                                                                </td>
                                                                <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-sm md:text-base">
                                                                    <div
                                                                        key={line.modified}
                                                                        contentEditable={true}
                                                                        onBlur={(e) => handleLyricChange(line.id, e.currentTarget.textContent || '')}
                                                                        suppressContentEditableWarning={true}
                                                                        dangerouslySetInnerHTML={{ __html: line.markedText || line.modified }}
                                                                        className="outline-none p-1 rounded hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            {formErrors.lyrics && (
                                                <Form.Message className="text-sm text-red-500 mt-1">
                                                    {formErrors.lyrics}
                                                </Form.Message>
                                            )}
                                        </div>
                                    </div>
                                    {/* Reset Button */}
                                    <button
                                        type="button"
                                        onClick={handleResetLyrics}
                                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-blue-200 text-blue-900 hover:text-blue-200 hover:bg-blue-900 hover:ring-blue-500/50 focus-visible:ring focus-visible:ring-blue-500/50 active:bg-blue-700 active:ring-0 px-5 rounded-t-none rounded-b-md text-sm md:text-base h-10 md:h-12 w-full -mt-4"
                                    >
                                        <Eraser className='w-4 h-4 opacity-85' /> Reset to Original Lyrics
                                    </button>

                                    {/* Replace Section */}
                                    <div className="mt-2 flex flex-col gap-2 w-full">
                                        <label className="flex scroll-m-20 tracking-normal dark:text-white font-semibold text-white text-sm md:text-base">
                                            Replace Words
                                        </label>
                                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                                            <input
                                                type="text"
                                                value={replaceTerm}
                                                onChange={(e) => setReplaceTerm(e.target.value)}
                                                placeholder="Word to replace..."
                                                className="flex w-full rounded-md border border-component-input bg-foundation px-3 py-2 ring-offset-foundation placeholder:text-muted focus-visible:outline-none focus-visible:ring focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-foundation-secondary text-sm md:text-base text-primary"
                                            />
                                            <input
                                                type="text"
                                                value={replaceWith}
                                                onChange={(e) => setReplaceWith(e.target.value)}
                                                placeholder="Replace with..."
                                                className="flex w-full rounded-md border border-component-input bg-foundation px-3 py-2 ring-offset-foundation placeholder:text-muted focus-visible:outline-none focus-visible:ring focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-foundation-secondary text-sm md:text-base text-primary"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleReplaceAll}
                                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/95 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 px-5 rounded-md text-sm md:text-base h-10 md:h-12 w-full sm:w-auto"
                                            >
                                                Replace All
                                            </button>
                                        </div>
                                    </div>

                                    {/* Special requests */}
                                    <Form.Field name="specialRequests" className="mt-2 flex flex-col gap-0.5 last:mb-0 relative flex-1">
                                        <label className="flex scroll-m-20 tracking-normal peer-disabled:cursor-not-allowed peer-disabled:text-gray-500 peer-disabled:opacity-50 dark:text-white font-semibold text-white text-sm md:text-base">
                                            Your Requests
                                        </label>
                                        <Form.Control asChild>
                                            <textarea
                                                className="flex min-h-[80px] w-full rounded-md border border-component-input bg-foundation px-3 py-2 ring-offset-foundation placeholder:text-muted focus-visible:outline-none focus-visible:ring focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-foundation-secondary text-sm md:text-base text-primary"
                                                rows={4}
                                                value={specialRequests}
                                                onChange={(e) => setSpecialRequests(e.target.value)}
                                                placeholder="Add any special requests here (e.g. special details & pronunciations, etc.) ..."
                                            />
                                        </Form.Control>
                                        {formErrors.specialRequests && (
                                            <Form.Message className="text-sm text-red-500 mt-1">
                                                {formErrors.specialRequests}
                                            </Form.Message>
                                        )}
                                    </Form.Field>
                                </Form.Root>
                            )}

                            {/* Tip Box */}
                            {!isLoading && (
                                <div className="mt-4 md:mt-6 flex flex-col sm:flex-row items-start gap-3 rounded-lg bg-[#4B5EAA]/20 p-3 md:p-4 shadow-md border-blue-500 border">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4B5EAA] text-lg flex-shrink-0">
                                        💡
                                    </div>
                                    <div className="flex flex-col space-y-1 flex-1">
                                        <p className="scroll-m-20 font-roboto tracking-wide dark:text-white text-sm md:text-base font-semibold text-white">
                                            Let us know about any important details to make your song perfect!
                                        </p>
                                        <p className="scroll-m-20 font-roboto font-normal tracking-wide dark:text-white text-xs md:text-sm text-white/80 leading-relaxed">
                                            For names or special words, provide phonetic spelling (e.g., Brisbane = Bris-bin, Naomi = Nay-oh-mee). <br />
                                            We&apos;ll use your notes to ensure everything is just right!
                                        </p>
                                    </div>
                                </div>
                            )}
                        </Tabs.Content>
                    </Tabs.Root>
                </section>
            </div>
        </main >
    );
}

// Main component that wraps the content with Suspense
export default function ChangeLyricsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        }>
            <ChangeLyricsPageContent />
        </Suspense>
    );
}
