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
function calculateWordChanges(original: string, modified: string): WordChange[] {
    // Normalize texts but preserve punctuation and special characters
    // Only normalize whitespace and line breaks
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
    const originalWords = normalizedOriginal.split(' ').filter(word => word.length > 0);
    const modifiedWords = normalizedModified.split(' ').filter(word => word.length > 0);

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
                newIndex: modPos > 0 ? modPos - 1 : 0,
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
    const songId = searchParams.get('id');
    const songTitle = searchParams.get('title');
    const songArtist = searchParams.get('artist');
    const songImage = searchParams.get('image');
    const songUrl = searchParams.get('url');
    const isManualEntry = searchParams.get('manualEntry') === 'true';
    const router = useRouter();

    // State definitions
    const [currentStep, setCurrentStep] = useState(2);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [originalLyricsText, setOriginalLyricsText] = useState<string>('');
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
    const totalWordChanges = useMemo(() =>
        lyrics.reduce(
            (sum, line) => sum + line.wordChanges.filter(w => w.hasChanged).length,
            0
        ),
        [lyrics]
    );

    // Calculate cost
    const [cost, setCost] = useState(BASE_COST);

    // Update cost whenever word changes are modified
    useEffect(() => {
        const additionalChanges = Math.max(0, totalWordChanges - 1); // First change is free
        setCost(BASE_COST + additionalChanges * ADDITIONAL_COST_PER_CHANGE);
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

        // Skip API fetch for manual entry or if title/artist are missing
        if (isManualEntry || !songTitle || !songArtist) return;

        // Now we check both conditions - songId and required data
        if (songId) {
            fetchLyricsByTitleAndArtist(songTitle, songArtist);
        }

        return () => {
            isMounted = false;
        };
    }, [songTitle, songArtist, songId, isManualEntry]); // Added songId to dependency array

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

    // Text normalization utility
    // const normalizeText = (text: string) => {
    //     return text
    //         .replace(/[\n\r]+/g, ' ')
    //         .trim()
    //         .replace(/\s+/g, ' ');
    // };

    // Strip HTML and ⌧ symbols
    const stripHtmlAndSymbols = (text: string) => {
        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        // Get plain text content
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        // Remove ⌧ symbols and trailing newlines
        return plainText.replace(/⌧/g, '').replace(/[\n\r]+$/g, '');
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

                // We'll always compare against the original text, not previously modified
                const wordChanges = calculateWordChanges(line.original, sanitizedNewText);

                // Prepare to mark up the text with changes
                // We'll rebuild the entire marked text directly
                let markedText = '';

                // Split the modified text
                const modifiedWords = sanitizedNewText.split(' ').filter(word => word.length > 0);

                // Create a separate array to mark up including deletions
                const result: Array<{ text: string, isDeleted: boolean, isChanged: boolean }> = [];

                // First add all modified words
                modifiedWords.forEach((word) => {
                    result.push({
                        text: word,
                        isDeleted: false,
                        isChanged: false
                    });
                });

                // Process additions and changes - mark words that were changed
                wordChanges.forEach(change => {
                    if (change.hasChanged && change.newWord && change.newIndex >= 0 && change.newIndex < result.length) {
                        result[change.newIndex].isChanged = true;
                    }
                });

                // Process deletions - add deletion markers at appropriate positions
                const deletions = wordChanges.filter(change =>
                    change.hasChanged && !change.newWord && change.originalWord
                );

                // Group deletions by the position they occur after
                const deletionGroups = new Map<number, string[]>();

                deletions.forEach(deletion => {
                    // Find the best position in the result array to insert this deletion
                    let position = deletion.newIndex;

                    // Make sure it's a valid position
                    position = Math.max(0, Math.min(position, result.length));

                    // Add to the deletion group
                    if (!deletionGroups.has(position)) {
                        deletionGroups.set(position, []);
                    }
                    deletionGroups.get(position)?.push(deletion.originalWord);
                });

                // Insert the deletion markers
                Array.from(deletionGroups.entries())
                    .sort((a, b) => b[0] - a[0]) // Process in reverse order
                    .forEach(([position, deletedWords]) => {
                        // Create a unique set of deleted words
                        const uniqueDeletedWords = Array.from(new Set(deletedWords));
                        const count = uniqueDeletedWords.length;

                        // Create the deletion marker
                        let tooltip = '';
                        if (count > 1) {
                            tooltip = ` title="${uniqueDeletedWords.join(', ')}"`;
                        }

                        // Create and insert deletion marker
                        result.splice(position, 0, {
                            text: `<span class="text-red-600"${tooltip}>⌧${count > 1 ? ` (${count})` : ''}</span>`,
                            isDeleted: true,
                            isChanged: false
                        });
                    });

                // Build the final marked text
                markedText = result.map(item => {
                    if (item.isDeleted) {
                        // Already contains markup
                        return item.text;
                    } else if (item.isChanged) {
                        // Mark changed word in red
                        return `<span class="text-red-600">${item.text}</span>`;
                    } else {
                        // Unchanged word
                        return item.text;
                    }
                }).join(' ');

                return {
                    ...line,
                    modified: sanitizedNewText,
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
                const newModified = line.modified.replaceAll(replaceTerm, replaceWith);
                const wordChanges = calculateWordChanges(line.original, newModified);
                const modifiedWords = newModified.split(' ').filter(word => word.length > 0);
                const markedWords = [...modifiedWords];
                const markedPositions = new Set<number>();
                wordChanges.forEach(change => {
                    if (change.hasChanged && change.newIndex >= 0 && !markedPositions.has(change.newIndex)) {
                        if (change.newWord) {
                            markedWords[change.newIndex] = `<span class="text-red-600">${change.newWord}</span>`;
                            markedPositions.add(change.newIndex);
                        }
                    }
                });
                const markedText = markedWords.join(' ');
                return {
                    ...line,
                    modified: newModified,
                    markedText,
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

        setFormErrors(errors);
        return isValid;
    };


    const handleNextStep = async (e: React.FormEvent) => {
        e.preventDefault();
        const hasChanges = lyrics.some((line) => line.modified !== line.original);
        if (!hasChanges) {
            toast.error('No changes made', {
                description: 'Please modify at least one lyric before proceeding.',
            });
            return;
        }

        if (!validateForm()) {
            const firstError = Object.values(formErrors)[0];
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
        { step: 2, label: "Change The Lyrics", isActive: currentStep === 2, isComplete: currentStep > 2 },
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
                                <button
                                    onClick={handleNextStep}
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/95 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 px-5 rounded-md ml-auto text-sm md:text-base h-10 md:h-12"
                                    type="button"
                                >
                                    Change the Lyrics ${cost} <ChevronRight className="-mr-1 size-4 md:size-5" />
                                </button>
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
                                                    <span>Base Fee (First Change): <strong>${BASE_COST}</strong></span> <br />
                                                    <span>Additional Changes: <strong>{Math.max(0, totalWordChanges - 1)} × ${ADDITIONAL_COST_PER_CHANGE} = ${Math.max(0, totalWordChanges - 1) * ADDITIONAL_COST_PER_CHANGE}</strong></span> <br />
                                                    <div className="text-base md:text-lg border-t border-white/20 mt-2 pt-2">
                                                        <span>
                                                            <strong>Total: ${cost}</strong>
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
                                                        // const hasChanges = line.wordChanges.some(w => w.hasChanged);
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
                                                                        contentEditable={true}
                                                                        onBlur={(e) => handleLyricChange(line.id, e.currentTarget.textContent || '')}
                                                                        suppressContentEditableWarning={true}
                                                                        dangerouslySetInnerHTML={{ __html: line.markedText || line.modified }}
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
        </main>
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
