"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ListMusic, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Form from '@radix-ui/react-form';
import * as Separator from '@radix-ui/react-separator';
import * as Tooltip from '@radix-ui/react-tooltip';
import SignInToSaveButton from "@/components/SignInToSaveButton";
import { Toaster, toast } from 'sonner';

// Type definitions
type StepProps = {
    step: number;
    label: string;
    isActive: boolean;
    isComplete?: boolean;
};

type WordChange = {
    originalWord: string;
    newWord: string;
    originalIndex: number;
    newIndex: number; // Add this property
    hasChanged: boolean;
};

type LyricLine = {
    id: number;
    original: string;
    modified: string;
    markedText?: string; // Optional, since it may not always be present
    wordChanges: WordChange[];
};

// Step navigation components
const StepIndicator = ({ step, label, isActive, isComplete }: StepProps) => (
    <Tooltip.Provider>
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <div className="flex flex-col items-center" style={{ opacity: 1, transform: 'translateY(2px)' }}>
                    <button
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 size-6 rounded-full p-0 active:scale-90 peer font-roboto disabled:bg-white/80 disabled:text-primary disabled:opacity-10"
                        type="button"
                        role="tab"
                        disabled={!isActive && !isComplete}
                    >
                        {isComplete ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                                <path d="M20 6 9 17l-5-5"></path>
                            </svg>
                        ) : (
                            step
                        )}
                    </button>
                    <p className="scroll-m-20 font-roboto text-sm leading-normal tracking-wide dark:text-white mt-2 text-center font-semibold text-white peer-disabled:font-normal peer-disabled:opacity-10">
                        {label}
                    </p>
                </div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content
                    className="bg-black/90 text-white px-3 py-1.5 rounded text-sm"
                    sideOffset={5}
                >
                    {label}
                    <Tooltip.Arrow className="fill-black/90" />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    </Tooltip.Provider>
);

const StepDivider = ({ isActive }: { isActive: boolean }) => (
    <Separator.Root
        orientation="horizontal"
        className={`dark:bg-gray-100/5 w-full -mt-6 h-[1.75px] flex-1 duration-1000 animate-in fade-in ${isActive ? "bg-primary/30" : "bg-white/5"}`}
    />
);

// Utility functions
function calculateWordChanges(original: string, modified: string): WordChange[] {
    // Helper function to remove punctuation for comparison
    const sanitize = (word: string) => word.replace(/[^\w\d]/g, '').toLowerCase();

    // Normalize whitespace and split into words
    const originalWords = original.match(/\S+/g) || [];
    const modifiedWords = modified.match(/\S+/g) || [];

    // Use LCS on sanitized words
    const sanitizedOriginalWords = originalWords.map(sanitize);
    const sanitizedModifiedWords = modifiedWords.map(sanitize);
    const lcs = findLongestCommonSubsequence(sanitizedOriginalWords, sanitizedModifiedWords);

    // Create mapping of changes
    const wordChanges: WordChange[] = [];
    let origIndex = 0;
    let modIndex = 0;
    let lcsIndex = 0;

    while (origIndex < originalWords.length || modIndex < modifiedWords.length) {
        const originalWord = originalWords[origIndex] || '';
        const newWord = modifiedWords[modIndex] || '';

        const sanitizedOrig = sanitizedOriginalWords[origIndex] || '';
        const sanitizedNew = sanitizedModifiedWords[modIndex] || '';

        if (lcsIndex < lcs.length && sanitizedOrig === lcs[lcsIndex] && sanitizedNew === lcs[lcsIndex]) {
            wordChanges.push({ originalWord, newWord, originalIndex: origIndex, newIndex: modIndex, hasChanged: false });
            origIndex++;
            modIndex++;
            lcsIndex++;
        } else if (modIndex < modifiedWords.length && (lcsIndex >= lcs.length || sanitizedNew !== lcs[lcsIndex])) {
            wordChanges.push({ originalWord: '', newWord, originalIndex: -1, newIndex: modIndex, hasChanged: true });
            modIndex++;
        } else if (origIndex < originalWords.length && (lcsIndex >= lcs.length || sanitizedOrig !== lcs[lcsIndex])) {
            wordChanges.push({ originalWord, newWord: '', originalIndex: origIndex, newIndex: -1, hasChanged: true });
            origIndex++;
        }
    }

    // **Step 2: Remove punctuation-only changes**
    wordChanges.forEach(change => {
        if (change.hasChanged && sanitize(change.originalWord) === sanitize(change.newWord)) {
            change.hasChanged = false; // Mark it as unchanged
        }
    });

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
    // Split by newlines and filter out empty lines
    const lines = text.split('\n')
        .filter(line => line.trim().length > 0)
        .map((line, index) => ({
            id: index,
            text: line,
            original: line,
            modified: line,
            wordChanges: [], // Process words as needed
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
    const [originalLyricsText, setOriginalLyricsText] = useState<string>('');
    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [specialRequests, setSpecialRequests] = useState('');
    const [formValues, setFormValues] = useState({
        songUrl: songUrl || '',
        lyrics: '',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Calculate total word changes and cost
    const totalWordChanges = lyrics.reduce(
        (sum, line) => sum + line.wordChanges.filter(w => w.hasChanged).length,
        0
    );
    const [cost, setCost] = useState(35); // Start with base cost of $35

    // Update cost whenever word changes are modified
    useEffect(() => {
        const baseCost = 35;
        const additionalCost = totalWordChanges * 5;
        setCost(baseCost + additionalCost);
    }, [totalWordChanges]);

    // Check for manually entered lyrics from localStorage
    useEffect(() => {
        if (isManualEntry) {
            try {
                const storedLyrics = localStorage.getItem('manualEntryLyrics');
                if (storedLyrics) {
                    setOriginalLyricsText(storedLyrics);
                    setLyrics(generateLyricsData(storedLyrics));
                    setFormValues(prev => ({ ...prev, lyrics: storedLyrics }));
                    // Clear localStorage after retrieving
                    localStorage.removeItem('manualEntryLyrics');
                } else {
                    // Handle case when localStorage is empty but isManualEntry is true
                    setFormErrors(prev => ({ ...prev, general: 'No lyrics found. Please try again.' }));
                }
            } catch (error) {
                console.error('Error retrieving lyrics from localStorage:', error);
                setFormErrors(prev => ({ ...prev, general: 'Error loading lyrics. Please try again.' }));
            }
        }
    }, [isManualEntry]);

    // Fetch lyrics from API if songId is available
    useEffect(() => {
        let isMounted = true; // For cleanup

        const fetchLyrics = async () => {
            if (!songId && !songUrl && !isManualEntry) {
                router.push('/');
                return;
            }

            if (songId) {
                setIsLoading(true);
                try {
                    const response = await fetch(`/api/genius/lyrics?id=${songId}`);
                    const data = await response.json();

                    if (!isMounted) return;

                    setIsLoading(false);
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

                    setIsLoading(false);
                    setFormErrors(prev => ({ ...prev, general: 'Error loading lyrics' }));
                    console.error('Error fetching lyrics:', error);
                }
            } else if (songUrl && !isManualEntry) {
                // If we have a songUrl but no songId and it's not a manual entry,
                // fetch lyrics from the URL
                setIsLoading(true);
                try {
                    const response = await fetch(`/api/genius/lyrics-by-url?url=${encodeURIComponent(songUrl)}`);
                    const data = await response.json();

                    if (!isMounted) return;

                    setIsLoading(false);
                    if (data.lyrics) {
                        setOriginalLyricsText(data.lyrics);
                        setLyrics(generateLyricsData(data.lyrics));
                        setFormValues(prev => ({ ...prev, lyrics: data.lyrics }));
                    } else {
                        setFormErrors(prev => ({ ...prev, general: 'Lyrics not found from URL' }));
                        console.error('Lyrics not found from URL');
                    }
                } catch (error) {
                    if (!isMounted) return;

                    setIsLoading(false);
                    setFormErrors(prev => ({ ...prev, general: 'Error fetching lyrics' }));
                    console.error('Error fetching lyrics from URL:', error);
                }
            }
        };

        fetchLyrics();

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [songId, songUrl, isManualEntry, router]);

    function handleLyricChange(id: number, newText: string) {
        setLyrics(prevLyrics => {
            const updatedLyrics = prevLyrics.map(line => {
                if (line.id === id) {
                    // Normalize whitespace to avoid counting duplicate spaces as words
                    const normalizedText = newText.replace(/\s+/g, ' ').trim();
                    const wordChanges = calculateWordChanges(line.original, normalizedText);

                    // Create a marked-up version of the modified text
                    // We'll use an array-based approach for precise highlighting
                    const modifiedWords = normalizedText.split(' ').filter(word => word.length > 0);
                    const markedWords = [...modifiedWords];

                    // Track which positions have been marked as changed
                    const markedPositions = new Set<number>();

                    // Only mark words that were actually added or changed
                    wordChanges.forEach(change => {
                        if (change.hasChanged && change.newIndex !== undefined && change.newIndex >= 0) {
                            if (change.newWord && !markedPositions.has(change.newIndex)) {
                                markedWords[change.newIndex] =
                                    `<span class="text-red-600">${change.newWord}</span>`;
                                markedPositions.add(change.newIndex);
                            }
                        }
                    });

                    // Handle deletions
                    const deletions = wordChanges.filter(
                        change => change.hasChanged && change.newWord === '' && change.originalWord !== ''
                    );

                    // Group deletions by position to avoid multiple deletion markers at the same spot
                    const deletionPositions = new Map<number, number>();
                    deletions.forEach(deletion => {
                        // Find appropriate insertion point
                        let insertPos = 0;
                        // Count words that precede this deletion in original
                        for (const change of wordChanges) {
                            if (change.originalIndex !== undefined &&
                                change.originalIndex < (deletion.originalIndex ?? 0) &&
                                change.newIndex !== undefined && change.newIndex >= 0) {
                                insertPos = Math.max(insertPos, change.newIndex + 1);
                            }
                        }

                        // Increment count for this position
                        deletionPositions.set(
                            insertPos,
                            (deletionPositions.get(insertPos) || 0) + 1
                        );
                    });

                    // Insert deletion markers
                    Array.from(deletionPositions.entries())
                        .sort((a, b) => b[0] - a[0]) // Process from end to avoid shifting indices
                        .forEach(([position, count]) => {
                            const deleteSymbol = `<span class="text-red-600">⌧${count > 1 ? ` (${count})` : ''}</span>`;
                            if (position <= markedWords.length) {
                                markedWords.splice(position, 0, deleteSymbol);
                            } else {
                                // If position is beyond the end, append to the end
                                markedWords.push(deleteSymbol);
                            }
                        });

                    const markedText = markedWords.join(' ');

                    return {
                        ...line,
                        modified: normalizedText,
                        markedText,
                        wordChanges
                    };
                }
                return line;
            });

            // Update the formValues with the latest lyrics
            const lyricsText = updatedLyrics.map(line => line.modified).join('\n');
            setFormValues(prev => ({ ...prev, lyrics: lyricsText }));

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Check if at least one lyric has been modified
        const hasChanges = lyrics.some((line) => line.modified !== line.original);

        if (!hasChanges) {
            toast.error('No changes made', {
                description: 'Please modify at least one lyric before proceeding.',
            });
            return;
        }

        if (validateForm()) {
            // Store lyrics in localStorage to avoid URL length limitations
            localStorage.setItem('manualEntryLyrics', formValues.lyrics);

            // Navigate to the checkout step
            router.push(`/review`);
        } else {
            // Show toast with the first error
            const firstError = Object.values(formErrors)[0];
            toast.error('Invalid input', {
                description: firstError || 'Please fix the errors in the form',
            });
        }
    };

    const handleNextStep = () => {
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
            handleSubmit(new Event('submit') as unknown as React.FormEvent);
        }
    };

    // Define step data
    const steps = [
        { step: 1, label: "Choose A Song", isActive: currentStep === 1, isComplete: true },
        { step: 2, label: "Change The Lyrics", isActive: currentStep === 2, isComplete: false },
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
                        <Tabs.List className="flex items-center gap-2">
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
                                <Link href="/" className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-[1.5px] bg-white hover:bg-white/95 hover:ring-gray-200/65 focus-visible:ring focus-visible:ring-gray-200/65 active:bg-gray-200 active:ring-0  dark:hover:ring-gray-100/15 dark:focus-visible:ring-gray-100/15 dark:active:bg-gray-100/25 px-5 rounded-md text-sm md:text-base h-10 md:h-12">
                                    <ChevronLeft className="-ml-1 size-4 md:size-5" /> Back
                                </Link>
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
                                <div className="relative w-full rounded-lg p-4 dark:border-gray-100/5 bg-primary/80 text-white/80" role="alert">
                                    <div className="flex flex-col gap-2">
                                        <p className="scroll-m-20 font-roboto font-normal tracking-wide dark:text-white text-inherit text-sm md:text-base md:leading-6">
                                            <span className="my-1.5 flex flex-row gap-1">
                                                <ListMusic className="-mt-0.5 mr-1 size-4 md:size-5 md:mt-0.5" />
                                                <span>
                                                    <strong>Total Word Changes: {totalWordChanges}</strong> <br />
                                                    Base pricing: <strong>$35</strong> (starting from first word) <br />
                                                    With every word changed: <strong>+$5 / word</strong>
                                                </span>
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Lyrics editor */}
                            {!isLoading && (
                                <Form.Root className="flex flex-1 flex-col gap-4 pb-6" onSubmit={handleSubmit}>
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
