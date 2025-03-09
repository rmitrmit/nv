"use client";

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronRight, ListMusic, ArrowRight } from 'lucide-react';
import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Form from '@radix-ui/react-form';
import * as Separator from '@radix-ui/react-separator';
import SignInToSaveButton from "@/components/SignInToSaveButton";
import { Toaster, toast } from 'sonner';
import { StepIndicator, StepDivider, type StepProps } from '@/components/layouts/StepNavigation';
import BackButton from '@/components/BackButton';

// src/app/change-lyrics/page.tsx
// Type definitions
type WordChange = {
    originalWord: string;
    newWord: string;
    originalIndex: number;
    newIndex: number;
    hasChanged: boolean;
};

type LyricLine = {
    id: number;
    original: string;
    modified: string;
    markedText?: string;
    wordChanges: WordChange[];
};

// Utility functions
function calculateWordChanges(original: string, modified: string): WordChange[] {
    const stripNonAlphanumeric = (text: string) => text.replace(/[^a-zA-Z0-9\s]/g, '');

    const normalizeText = (text: string) => {
        return stripNonAlphanumeric(text)
            .replace(/[\n\r]+/g, '')
            .trim()
            .replace(/\s+/g, ' ');
    };

    const normalizedOriginal = normalizeText(original);
    const normalizedModified = normalizeText(modified);

    if (normalizedOriginal === normalizedModified) {
        return [];
    }

    const originalWords = normalizedOriginal.split(' ').filter(word => word.length > 0);
    const modifiedWords = normalizedModified.split(' ').filter(word => word.length > 0);

    if (originalWords.length === 0 && modifiedWords.length === 0) {
        return [];
    }

    const lcs = findLongestCommonSubsequence(originalWords, modifiedWords);

    const wordChanges: WordChange[] = [];
    let origIndex = 0;
    let modIndex = 0;
    let lcsIndex = 0;

    while (origIndex < originalWords.length || modIndex < modifiedWords.length) {
        const originalWord = originalWords[origIndex] || '';
        const newWord = modifiedWords[modIndex] || '';

        if (lcsIndex < lcs.length && originalWord === lcs[lcsIndex] && newWord === lcs[lcsIndex]) {
            // Unchanged word
            wordChanges.push({
                originalWord,
                newWord,
                originalIndex: origIndex,
                newIndex: modIndex,
                hasChanged: false
            });
            origIndex++;
            modIndex++;
            lcsIndex++;
        } else if (originalWord && newWord && originalWord !== newWord &&
            (origIndex === originalWords.length - 1 || modIndex === modifiedWords.length - 1 ||
                (origIndex + 1 < originalWords.length && modIndex + 1 < modifiedWords.length &&
                    originalWords[origIndex + 1] === modifiedWords[modIndex + 1]))) {
            // Replacement: words differ, and either at the end or next words match
            wordChanges.push({
                originalWord,
                newWord,
                originalIndex: origIndex,
                newIndex: modIndex,
                hasChanged: true
            });
            origIndex++;
            modIndex++;
        } else if (!originalWord || (modIndex < modifiedWords.length && (lcsIndex >= lcs.length || newWord !== lcs[lcsIndex]))) {
            // Addition
            if (newWord.trim().length > 0) {
                wordChanges.push({
                    originalWord: '',
                    newWord,
                    originalIndex: -1,
                    newIndex: modIndex,
                    hasChanged: true
                });
            }
            modIndex++;
        } else if (!newWord || (origIndex < originalWords.length && (lcsIndex >= lcs.length || originalWord !== lcs[lcsIndex]))) {
            // Deletion
            if (originalWord.trim().length > 0) {
                wordChanges.push({
                    originalWord,
                    newWord: '',
                    originalIndex: origIndex,
                    newIndex: -1,
                    hasChanged: true
                });
            }
            origIndex++;
        }
    }

    return wordChanges;
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
    const songUrl = searchParams.get('url');
    const isManualEntry = searchParams.get('manualEntry') === 'true';
    const router = useRouter();

    // State definitions
    const [currentStep, setCurrentStep] = useState(2);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [error, setError] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [originalLyricsText, setOriginalLyricsText] = useState<string>('');
    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [specialRequests, setSpecialRequests] = useState('');
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

    // Check for manually entered lyrics from localStorage
    useEffect(() => {
        if (!isManualEntry) return;

        try {
            const storedLyrics = localStorage.getItem('manualEntryLyrics');
            if (storedLyrics) {
                setOriginalLyricsText(storedLyrics);
                setLyrics(generateLyricsData(storedLyrics));
                setFormValues(prev => ({ ...prev, lyrics: storedLyrics }));
                // Clear localStorage after retrieving
                localStorage.removeItem('manualEntryLyrics');
            } else {
                setFormErrors(prev => ({
                    ...prev,
                    general: 'No lyrics found. Please try again.'
                }));
            }
        } catch (error) {
            console.error('Error retrieving lyrics from localStorage:', error);
            setFormErrors(prev => ({
                ...prev,
                general: 'Error loading lyrics. Please try again.'
            }));
        }
    }, [isManualEntry]);

    // Fetch lyrics from API if songId is available
    useEffect(() => {
        // if (!songId && !isManualEntry) {
        //     router.push('/');
        //     return;
        // }

        let isMounted = true; // For cleanup

        const fetchLyricsById = async (id: string) => {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/genius/lyrics?id=${id}`);

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                const data = await response.json();

                if (!isMounted) return;

                if (data.lyrics) {
                    setOriginalLyricsText(data.lyrics);
                    setLyrics(generateLyricsData(data.lyrics));
                    setFormValues(prev => ({ ...prev, lyrics: data.lyrics }));
                } else {
                    setFormErrors(prev => ({ ...prev, general: 'Lyrics not found' }));
                    console.error('Lyrics not found');
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

        if (isManualEntry) {
            setIsLoading(false);
            return;
        }

        if (songId) {
            fetchLyricsById(songId);
        }

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [songId, isManualEntry, router]);

    useEffect(() => {
        try {
            const savedStep = parseInt(localStorage.getItem('currentStep') || '2', 10);
            setCurrentStep(savedStep);

            const savedLyrics = JSON.parse(localStorage.getItem('lyrics') || '[]');
            setLyrics(savedLyrics);

            const savedRequests = localStorage.getItem('specialRequests') || '';
            setSpecialRequests(savedRequests);

            const savedFormValues = JSON.parse(localStorage.getItem('formValues') || '{}');
            setFormValues(savedFormValues);

            const savedCost = parseFloat(localStorage.getItem('cost') || '35');
            setCost(savedCost);

            // Optionally load deliveryOption if needed, though it’s set in review
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const savedDelivery = localStorage.getItem('deliveryOption') || 'Standard Delivery';
            // You could use this if you add delivery options to change-lyrics later
        } catch (error) {
            console.error('Error restoring state from localStorage:', error);
            toast.error('Failed to restore previous changes');
        }
    }, []);

    // Text normalization utility
    const normalizeText = (text: string) => {
        return text
            .replace(/[\n\r]+/g, '')
            .trim()
            .replace(/\s+/g, ' ');
    };

    // Strip HTML and ⌧ symbols
    const stripHtmlAndSymbols = (text: string) => {
        const div = document.createElement('div');
        div.innerHTML = text;
        const plainText = div.textContent || div.innerText || '';
        return plainText.replace(/⌧/g, '').replace(/[\n\r]+$/g, '');
    };

    function handleLyricChange(id: number, newText: string) {
        setLyrics(prevLyrics => {
            const updatedLyrics = prevLyrics.map(line => {
                if (line.id !== id) return line;

                const sanitizedNewText = stripHtmlAndSymbols(newText);
                const normalizedOriginal = normalizeText(line.original);
                const normalizedText = normalizeText(sanitizedNewText || '');
                const normalizedModified = normalizeText(line.modified);

                // If no meaningful change since last modified, preserve state
                if (normalizedText === normalizedModified) {
                    return line;
                }

                const wordChanges = calculateWordChanges(normalizedOriginal, normalizedText);

                const modifiedWords = normalizedText.split(' ').filter(word => word.length > 0);
                const markedWords = [...modifiedWords];
                const markedPositions = new Set<number>();

                // Handle additions and replacements
                wordChanges.forEach(change => {
                    if (change.hasChanged && change.newIndex >= 0 && !markedPositions.has(change.newIndex)) {
                        if (change.newWord) {
                            markedWords[change.newIndex] = `<span class="text-red-600">${change.newWord}</span>`;
                            markedPositions.add(change.newIndex);
                        }
                    }
                });

                // Handle deletions
                const deletions = wordChanges.filter(
                    change => change.hasChanged && change.newWord === '' && change.originalWord !== ''
                );
                const deletionPositions = new Map<number, number>();

                deletions.forEach(deletion => {
                    let insertPos = 0;
                    for (const change of wordChanges) {
                        if (change.originalIndex < (deletion.originalIndex ?? 0) && change.newIndex >= 0) {
                            insertPos = Math.max(insertPos, change.newIndex + 1);
                        }
                    }
                    deletionPositions.set(
                        insertPos,
                        (deletionPositions.get(insertPos) || 0) + 1
                    );
                });

                Array.from(deletionPositions.entries())
                    .sort((a, b) => b[0] - a[0])
                    .forEach(([position, count]) => {
                        const deleteSymbol = `<span class="text-red-600">⌧${count > 1 ? ` (${count})` : ''}</span>`;
                        if (position <= markedWords.length) {
                            markedWords.splice(position, 0, deleteSymbol);
                        } else {
                            markedWords.push(deleteSymbol);
                        }
                    });

                const markedText = markedWords.join(' ');

                return {
                    ...line,
                    modified: normalizedText, // Store plain text without ⌧
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

        console.log("handleNextStep triggered, currentStep:", currentStep);

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
            console.log("Storing data in localStorage...");

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
            if (songUrl) localStorage.setItem('songUrl', songUrl);

            console.log("Navigating to /review, new currentStep:", currentStep + 1);
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

                            {/* Song Title and Artist display */}
                            {(songTitle || songArtist) && (
                                <div className="p-3 bg-primary/10 rounded-lg mb-2">
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
