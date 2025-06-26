// src\app\change-lyrics\page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from "next/link";
import { ChevronRight, ListMusic, ArrowRight, Eraser, ExternalLink, ArrowLeft, AudioLines } from 'lucide-react';
import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Form from '@radix-ui/react-form';
import * as Separator from '@radix-ui/react-separator';
// import SignInToSaveButton from "@/components/SignInToSaveButton";
import { toast } from 'sonner';
import { StepIndicator, StepDivider, type StepProps } from '@/components/layouts/StepNavigation';
import BackButton from '@/components/BackButton';
import Image from 'next/image';
import { handleReplaceAll, handleResetLyrics, handleLyricChange, handleResetLine, LyricLine, getDistinctChangedWords, generateLyricsData, CheckoutData, reconstructLyricsFromCheckout } from './utils';
import { ExternalLyricsResponse } from '../api/lyrics/route';

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
    const [loadingButton, setLoadingButton] = useState<'sample' | 'review' | null>(null);
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
    const [distinctChangedWords, setDistinctChangedWords] = useState<string[]>([]);
    const [, setHasFetchedLyrics] = useState(false);

    // Add a more comprehensive tracking state for API calls
    const [fetchState, setFetchState] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
    const fetchInProgressRef = useRef(false);
    const hasInitializedRef = useRef(false);
    const [isStateRestored, setIsStateRestored] = useState(false);


    const calculateCost = (wordChanges: number): number => {
        if (wordChanges <= 0) return 0;
        if (wordChanges <= 3) return 45;
        if (wordChanges <= 10) return 85;
        if (wordChanges <= 20) return 125;
        return 165;
    };

    // Updated totalWordChanges calculation
    const totalWordChanges = useMemo(() => {
        const dcw: string[] = getDistinctChangedWords(lyrics);
        setDistinctChangedWords(dcw);
        return dcw.length;
    }, [lyrics]);

    // Calculate cost
    const [cost, setCost] = useState(0);

    // Restore song details from localStorage if not in URL params
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
        setCost(calculateCost(totalWordChanges));
        setIsError(false);
    }, [totalWordChanges]);

    // State Restoration - This runs FIRST and takes priority
    useEffect(() => {
        if (isStateRestored) return; // Prevent multiple restorations

        try {
            const savedStep = localStorage.getItem('currentStep');
            if (savedStep) setCurrentStep(parseInt(savedStep, 10));

            const savedLyrics = localStorage.getItem('lyrics');
            const savedFormValues = localStorage.getItem('formValues');
            const savedRequests = localStorage.getItem('specialRequests');
            const savedCost = localStorage.getItem('cost');

            // If we have saved lyrics, restore the complete state
            if (savedLyrics) {
                const parsedLyrics = JSON.parse(savedLyrics);
                setLyrics(parsedLyrics);
                setFetchState('success'); // Mark as completed to prevent API fetch
                setHasFetchedLyrics(true);
                // console.log('Restored saved lyrics from localStorage');
            }

            if (savedFormValues) {
                const parsedFormValues = JSON.parse(savedFormValues);
                setFormValues(parsedFormValues);
                // Also set original lyrics text from form values
                if (parsedFormValues.lyrics) {
                    setOriginalLyricsText(parsedFormValues.lyrics);
                }
            }

            if (savedRequests) setSpecialRequests(savedRequests);
            if (savedCost) setCost(parseFloat(savedCost));

            setIsStateRestored(true);
            // console.log('State restoration completed');
        } catch (error) {
            console.error('Error restoring state from localStorage:', error);
            toast.error('Failed to restore previous changes');
            setIsStateRestored(true); // Mark as restored even on error to prevent retry
        }
    }, [isStateRestored]); // Run only once on mount

    // 1. Handle checkout data loading (separate from API fetching)
    useEffect(() => {
        if (!isStateRestored) return; // Wait for state restoration to complete

        const loadCheckout = searchParams.get('loadCheckout') === 'true';

        if (!loadCheckout) return;

        // console.log('=== LOADING CHECKOUT DATA ===');

        try {
            const checkoutDataStr = localStorage.getItem('checkoutData');

            if (checkoutDataStr) {
                const parsedCheckoutData: CheckoutData = JSON.parse(checkoutDataStr);
                // console.log('Parsed checkout data:', parsedCheckoutData);

                // Store a flag to indicate we're in checkout mode
                localStorage.setItem('isCheckoutMode', 'true');

                // Set song details from checkout data
                if (!songTitle) setSongTitle(parsedCheckoutData.title);
                if (!songArtist) setSongArtist(parsedCheckoutData.artist);
                if (!songUrl) setSongUrl(parsedCheckoutData.url);
                if (!songImage && parsedCheckoutData.image) setSongImage(parsedCheckoutData.image);
                setSpecialRequests(parsedCheckoutData.specialRequests === 'None' ? '' : parsedCheckoutData.specialRequests);

                // Process checkout data immediately
                setOriginalLyricsText(parsedCheckoutData.originalLyrics || '');
                const reconstructedLyrics = reconstructLyricsFromCheckout(parsedCheckoutData.originalLyrics || '', parsedCheckoutData);

                setLyrics(reconstructedLyrics);
                setFormValues(prev => ({ ...prev, lyrics: parsedCheckoutData.originalLyrics || '' }));
                setFetchState('success'); // Mark as completed
                setHasFetchedLyrics(true);

                // Clean up
                localStorage.removeItem('checkoutData');
                setIsLoading(false);

                // console.log('=== CHECKOUT DATA PROCESSED SUCCESSFULLY ===');
            } else {
                setFormErrors(prev => ({
                    ...prev,
                    general: 'No checkout data found. Please try uploading the file again.'
                }));
                setIsLoading(false);
                setFetchState('error');
            }
        } catch (error) {
            console.error('Error loading checkout data:', error);
            setFormErrors(prev => ({
                ...prev,
                general: 'Error loading checkout data. Please try again.'
            }));
            setIsLoading(false);
            setFetchState('error');
        }
    }, [searchParams, songTitle, songArtist, songUrl, songImage, isStateRestored]);

    // 2. Handle manual entry lyrics
    useEffect(() => {
        if (!isStateRestored) return; // Wait for state restoration to complete
        if (!isManualEntry) return;
        if (fetchState === 'success') return; // Skip if state was already restored

        try {
            const storedLyrics = localStorage.getItem('manualEntryLyrics');
            if (storedLyrics) {
                setOriginalLyricsText(storedLyrics);
                setLyrics(generateLyricsData(storedLyrics));
                setFormValues(prev => ({ ...prev, lyrics: storedLyrics }));
                setFetchState('success'); // Mark as completed
                setHasFetchedLyrics(true);
                // console.log('Manual entry lyrics set successfully');
            } else {
                setFormErrors(prev => ({
                    ...prev,
                    general: 'No lyrics found for manual entry. Please try again.'
                }));
                setFetchState('error');
            }
        } catch (error) {
            console.error('Error retrieving manual entry lyrics from localStorage:', error);
            setFormErrors(prev => ({
                ...prev,
                general: 'Error loading manual entry lyrics. Please try again.'
            }));
            setFetchState('error');
        } finally {
            setIsLoading(false);
        }
    }, [isManualEntry, isStateRestored, fetchState]);

    // 3. Simplified fetchLyricsByTitleAndArtist function
    const fetchLyricsByTitleAndArtist = useCallback(async (songTitle: string, songArtist: string) => {
        // Prevent multiple simultaneous requests
        if (fetchState === 'fetching' || fetchInProgressRef.current) {
            // console.log('Already fetching, skipping request');
            return;
        }

        fetchInProgressRef.current = true;
        setFetchState('fetching');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            setIsLoading(false);
            fetchInProgressRef.current = false;
            setFetchState('error');
            setFormErrors(prev => ({
                ...prev,
                general: 'Request timed out. Please try again.'
            }));
            toast.error('Request timed out', {
                description: 'The lyrics request took too long. Please try again.',
            });
        }, 20000);

        try {
            setIsLoading(true);

            const slug = songUrl
                ? songUrl.replace("https://genius.com/", "").replace(/\/$/, "")
                : "";
            const params = new URLSearchParams({
                title: songTitle,
                artist: songArtist,
                slug: slug,
            });

            // console.log('=== MAKING API REQUEST ===', { title: songTitle, artist: songArtist });
            const response = await fetch(`/api/lyrics?${params.toString()}`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 404) {
                    toast.error('Lyrics not found', {
                        description: 'The lyrics for this song could not be found. Please check the song details or try manual entry.',
                    });
                } else {
                    toast.error('Error fetching lyrics', {
                        description: `An error occurred: ${response.statusText}`,
                    });
                }
                setIsError(true);
                setFetchState('error');
                throw new Error(`API error: ${response.status}`);
            }

            const data: ExternalLyricsResponse = await response.json();

            if (data.lyrics) {
                setOriginalLyricsText(data.lyrics);
                setLyrics(generateLyricsData(data.lyrics));
                setFormValues(prev => ({ ...prev, lyrics: data.lyrics }));
                setHasFetchedLyrics(true);
                setFetchState('success');
                // console.log('=== API REQUEST SUCCESSFUL ===');
            } else {
                setFormErrors(prev => ({ ...prev, general: 'Lyrics not found' }));
                setFetchState('error');
            }
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error && error.name === 'AbortError') {
                setFetchState('idle');
                return;
            }

            setFormErrors(prev => ({
                ...prev,
                general: `Error loading lyrics: ${error instanceof Error ? error.message : 'Unknown error'}`
            }));
            setFetchState('error');
            console.error('Error fetching lyrics:', error);
        } finally {
            setIsLoading(false);
            fetchInProgressRef.current = false;
        }

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [fetchState, songUrl]);

    // 4. Single initialization effect to prevent duplicate API calls
    useEffect(() => {
        if (!isStateRestored) return; // Wait for state restoration to complete

        // Skip if already initialized
        if (hasInitializedRef.current) {
            return;
        }

        const loadCheckout = searchParams.get('loadCheckout') === 'true';
        const isCheckoutMode = localStorage.getItem('isCheckoutMode') === 'true';

        // Skip API fetch for these conditions
        if (isManualEntry || loadCheckout || isCheckoutMode || fetchState === 'success') {
            hasInitializedRef.current = true;
            return;
        }

        // Only fetch if we have both title and artist, and haven't fetched yet
        if (songTitle && songArtist && fetchState === 'idle') {
            // console.log('=== INITIALIZING LYRICS FETCH ===');
            hasInitializedRef.current = true;
            fetchLyricsByTitleAndArtist(songTitle, songArtist);
        }
    }, [songTitle, songArtist, isManualEntry, searchParams, fetchState, fetchLyricsByTitleAndArtist, isStateRestored]);

    // 5. Cleanup effect
    useEffect(() => {
        return () => {
            fetchInProgressRef.current = false;
        };
    }, []);

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

    const handleNextStep = async (e: React.FormEvent, path: string, buttonType: 'sample' | 'review' | null) => {
        setLoadingButton(buttonType); // Set which button is loading
        e.preventDefault();

        const hasChanges = lyrics.some((line) =>
            line.wordChanges && line.wordChanges.some(change => change.hasChanged)
        );
        if (!hasChanges) {
            toast.error('Unable to proceed: No changes were made.', {
                description: 'Please modify at least one lyric before proceeding.',
            });
            setLoadingButton(null); // Reset loading state
            return;
        }

        const { isValid, errors } = validateForm();

        if (!isValid) {
            if (errors.specialRequests) {
                toast.error('Special request too long', {
                    description: errors.specialRequests,
                });
                setLoadingButton(null); // Reset loading state
                return;
            }

            const firstError = Object.values(errors)[0];
            toast.error('Invalid input', {
                description: firstError || 'Please fix the errors in the form',
            });
            setLoadingButton(null); // Reset loading state
            return;
        }

        try {
            // Your existing localStorage and navigation logic...
            localStorage.setItem('lyrics', JSON.stringify(lyrics));
            localStorage.setItem('cost', cost.toString());
            localStorage.setItem('currentStep', (currentStep + 1).toString());
            localStorage.setItem('specialRequests', specialRequests);
            localStorage.setItem('formValues', JSON.stringify(formValues));
            localStorage.setItem('deliveryOption', 'Standard Delivery');

            if (songId) localStorage.setItem('songId', songId);
            if (songTitle) localStorage.setItem('songTitle', songTitle);
            if (songArtist) localStorage.setItem('songArtist', songArtist);
            if (songImage) localStorage.setItem('songImage', songImage);
            if (songUrl) localStorage.setItem('songUrl', songUrl);

            setCurrentStep(currentStep + 1);
            router.push(path);

        } catch (err) {
            console.error('Error during next step:', err);
            toast.error('Error', {
                description: 'Failed to save data. Please try again.',
            });
            setLoadingButton(null); // Reset loading state
        }
    };

    const replaceAllTimeoutRef = useRef<NodeJS.Timeout | null>(null);


    // Separate the core replace logic from event handling
    const executeReplaceAll = useCallback(() => {
        // Clear any existing timeout
        if (replaceAllTimeoutRef.current) {
            clearTimeout(replaceAllTimeoutRef.current);
        }

        // Debounce the call with a small delay
        replaceAllTimeoutRef.current = setTimeout(() => {
            // console.log('Executing Replace All...');
            handleReplaceAll(replaceTerm, replaceWith, setLyrics, setFormValues, toast);

            // Clear the input fields after the replace operation
            setReplaceTerm('');
            setReplaceWith('');
        }, 100);
        setIsLoading(false);
    }, [replaceTerm, replaceWith, setLyrics, setFormValues]);

    // Handle keyboard events
    const handleReplaceWithKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            executeReplaceAll();
        }
    }, [executeReplaceAll]);

    // Handle mouse events
    const handleReplaceAllClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        executeReplaceAll();
    }, [executeReplaceAll]);

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (replaceAllTimeoutRef.current) {
                clearTimeout(replaceAllTimeoutRef.current);
            }
        };
    }, []);

    // Define step data
    const steps: StepProps[] = [
        { step: 1, label: "Choose A Song", isActive: currentStep === 1, isComplete: currentStep > 1 },
        { step: 2, label: "Change Lyrics", isActive: currentStep === 2, isComplete: currentStep > 2 },
        { step: 3, label: "Review Order", isActive: currentStep === 3, isComplete: false },
    ];

    const NavigationBtn = () => (
        <div className="flex flex-row items-center gap-2 py-0">
            <BackButton href="/" />
            {!isError && (
                <div className="ml-auto flex items-center gap-2">
                    <button
                        disabled={loadingButton !== null} // Disable both buttons when either is loading
                        onClick={(e) => handleNextStep(e, '/review-sample', 'sample')}
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-primary bg-primary text-white opacity-80 hover:opacity-90 hover:ring-blue-900/50 focus-visible:ring focus-visible:ring-blue-900/50 active:opacity-90 active:ring-0 px-2 rounded-md text-sm md:text-base h-10 md:h-12 mr-1"
                    >
                        {loadingButton === 'sample' ? (
                            "Processing..."
                        ) : (
                            <>
                                <AudioLines className="-ml-1 size-4 md:size-5 -mt-[0.05rem]" />
                                View Sample
                            </>
                        )}
                    </button>
                    <button
                        onClick={(e) => handleNextStep(e, '/review', 'review')}
                        disabled={loadingButton !== null} // Disable both buttons when either is loading
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/95 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 px-5 rounded-md shadow text-sm md:text-base h-10 md:h-12"
                        type="button"
                    >
                        {loadingButton === 'review' ? (
                            "Processing..."
                        ) : (
                            <>
                                Review Order <span className="font-bold text-lg">US${cost}</span>
                                <ChevronRight className="-mr-1 size-4 md:size-5" />
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );

    // ... more code
    // A snippet from "src\app\change-lyrics\page.tsx"
    return (
        <main className="min-h-0 w-full">
            <div className="w-full min-h-full">
                <section className="mx-auto w-full max-w-[1280px] flex flex-col space-y-2 px-6 sm:px-12 md:px-16 lg:px-32 xl:px-40 2xl:px-52">
                    {/* Header/Nav */}
                    <nav className="w-full bg-transparent px-4 pb-4">
                        {/* <div className="container mx-auto flex justify-end"> */}
                        {/* <SignInToSaveButton /> */}
                        {/* </div> */}
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
                                <div className="p-4 bg-primary/10 rounded-lg flex flex-col sm:flex-row items-center gap-4" style={{ marginBottom: '0.75rem' }}>
                                    {songImage && (
                                        <div className="relative w-40 h-40 flex-shrink-0" id="song-image-container">
                                            <Image
                                                src={decodeURIComponent(songImage)}
                                                alt={songTitle || "Song Image"}
                                                // layout="fill"
                                                // objectFit="cover"
                                                // width="240"
                                                // height="240"
                                                fill
                                                priority
                                                className="rounded-lg"
                                                onError={(e) => {
                                                    const container = document.getElementById('song-image-container');
                                                    if (container) {
                                                        container.style.display = 'none';
                                                    }
                                                    console.error(`Failed to load image: '${songImage}'. Error: '${e}'.`);
                                                }}
                                            />
                                        </div>
                                    )
                                    }
                                    < div className="flex flex-col items-center sm:items-start">
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
                            <NavigationBtn />

                            <Separator.Root
                                className="shrink-0 dark:bg-gray-100/5 h-[1.5px] w-full my-3 md:my-4 bg-primary/10"
                                orientation="horizontal"
                                style={{ marginBottom: '0.25rem' }}
                            />

                            {/* Loading state */}
                            {isLoading && (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                                    <div className='bg-white p-6 rounded-md text-gray-700 mt-4'>
                                        <p>Loading the lyrics ...</p>
                                        <p>Please allow up to 10 seconds so we can fetch data from our server.</p>
                                    </div>
                                </div>
                            )}

                            {/* Lyrics cost info */}
                            {!isLoading && (
                                <div
                                    className="relative w-full rounded-lg p-5 bg-primary/80 text-white shadow-md"
                                    role="alert"
                                >
                                    <div className="flex flex-col gap-3">
                                        {/* Header */}
                                        <div className="flex items-center gap-2 border-b border-white/20 pb-3">
                                            <ListMusic className="size-5" />
                                            <h3 className="text-lg font-bold">Pricing Summary</h3>
                                        </div>

                                        {/* Current Order */}
                                        <div className="bg-blue-900/40 rounded-md p-3 mb-2">
                                            <p className="mb-2">
                                                Total Cost: <span className="text-lg font-bold">US${cost}</span>
                                            </p>

                                            <p>
                                                Lyrics Changes ({distinctChangedWords.length} word{distinctChangedWords.length > 1 ? 's' : ''})
                                            </p>
                                            {distinctChangedWords.length > 0 && (
                                                <p className=''>&quot;{distinctChangedWords.join(', ')}&quot;</p>
                                            )}
                                        </div>


                                        {/* Pricing Tiers */}
                                        <div>
                                            <h4 className="font-semibold mb-2">Pricing (based on distinct words, case-insensitive)</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                                                <div className={`flex flex-col p-3  ${totalWordChanges <= 3 ? 'bg-blue-800' : 'bg-blue-900/60  opacity-90'}`}>
                                                    <span className="text-sm text-white/90">1-3 words</span>
                                                    <span className="font-bold">US$45</span>
                                                </div>
                                                <div className={`flex flex-col p-3 ${totalWordChanges > 3 && totalWordChanges <= 10 ? 'bg-blue-800' : 'bg-blue-900/60  opacity-90'}`}>
                                                    <span className="text-sm text-white/90">4-10 words</span>
                                                    <span className="font-bold">US$85</span>
                                                </div>
                                                <div className={`flex flex-col p-3 ${totalWordChanges > 10 && totalWordChanges <= 20 ? 'bg-blue-800' : 'bg-blue-900/60  opacity-90'}`}>
                                                    <span className="text-sm text-white/90">11-20 words</span>
                                                    <span className="font-bold">US$125</span>
                                                </div>
                                                <div className={`flex flex-col p-3  ${totalWordChanges > 20 ? 'bg-blue-800' : 'bg-blue-900/60  opacity-90'}`}>
                                                    <span className="text-sm text-white/90">20+ words</span>
                                                    <span className="font-bold">US$165</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="mt-2 text-sm text-white/80">
                                            <a href="https://nicevois.com/pages/pricing" className="text-blue-200 hover:text-blue-50 w-fit hover:underline text-sm inline-block" target="_blank">
                                                Learn more about our pricing
                                                <ExternalLink className="w-3 h-3 ml-1 color-inherit inline" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Lyrics editor */}
                            {!isLoading && (
                                <Form.Root className="flex flex-1 flex-col gap-4 pt-2 pb-4" onSubmit={(e) => handleNextStep(e, '/review', null)}>
                                    <div className="mt-2 overflow-y-auto max-h-[85vh]">
                                        <div className="relative w-full overflow-visible">
                                            <table className="caption-bottom text-sm relative h-10 w-full text-clip">
                                                <thead className="shadow sticky top-0 z-50 h-10 w-full border-b border-b-gray-200 bg-gray-100" style={{ transform: 'translateZ(0)' }}>
                                                    <tr className="border-b transition-colors data-[state=selected]:bg-muted">
                                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 w-5 text-sm md:text-base">#</th>
                                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 text-sm md:text-base">Original Lyrics</th>
                                                        <th className="h-12 px-0 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 w-10"><ArrowRight className="w-4 text-muted" /></th>
                                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 text-sm md:text-base">Modified Lyrics</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="[&_tr:last-child]:border-0 bg-white">
                                                    {lyrics.map((line) => {
                                                        const isNonEditable = line.original.startsWith('[') && line.original.endsWith(']');

                                                        return (
                                                            <tr key={line.id} className="border-b transition-colors data-[state=selected]:bg-muted ">
                                                                <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 font-medium text-sm md:text-base text-muted">
                                                                    {line.id}
                                                                </td>
                                                                <td className="py-4 px-3 align-middle [&:has([role=checkbox])]:pr-0 text-sm md:text-base text-gray-900">
                                                                    {line.original.replace(/&amp;/g, '&')}
                                                                </td>
                                                                <td className="px-0 py-4 align-middle [&:has([role=checkbox])]:pr-0">
                                                                    <ArrowRight className="w-4 text-muted" />
                                                                </td>
                                                                <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-sm md:text-base">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        {isNonEditable ? (
                                                                            <div className="flex-1 p-2 rounded ring-1 ring-gray-100 bg-gray-100 text-gray-500 cursor-not-allowed">
                                                                                {line.original.replace(/&amp;/g, '&')}
                                                                            </div>
                                                                        ) : (
                                                                            <div
                                                                                key={line.modified}
                                                                                contentEditable={true}
                                                                                onBlur={(e) =>
                                                                                    handleLyricChange(
                                                                                        line.id,
                                                                                        e.currentTarget.textContent || '',
                                                                                        setLyrics,
                                                                                        setFormValues
                                                                                    )
                                                                                }
                                                                                suppressContentEditableWarning={true}
                                                                                dangerouslySetInnerHTML={{ __html: line.markedText || line.modified }}
                                                                                className="flex-1 outline-none p-2 rounded ring-1 ring-blue-100 hover:ring-2 focus:ring-2 focus:ring-blue-500/50"
                                                                            />
                                                                        )}
                                                                        {!isNonEditable && line.wordChanges.some((change) => change.hasChanged) && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleResetLine(line.id, setLyrics, setFormValues)
                                                                                }
                                                                                className="text-gray-400 hover:text-gray-600"
                                                                                title="Clear lyric changes"
                                                                            >
                                                                                <Eraser className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                    </div>
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
                                            {Array.isArray(lyrics) && lyrics.length === 0 && (
                                                <div className=" text-red-500 bg-white p-6 text-lg">
                                                    <h2 className="text-2xl font-bold">404 Not Found</h2>
                                                    <p className="mt-3">* 😔 Oops, we could not find the lyrics for this song in our database. </p>
                                                    <p className="mt-3"> * Please insert your lyrics manually using the &quot;Manual Entry&quot; tab on the previous page.</p>
                                                    <p className='mt-3'>
                                                        * We sincerely apologize for this inconvenience and we would appreciate if you could report this to us{' '}
                                                        <a href="https://nicevois.com/pages/contact" className="hover:underline text-blue-600" target="_blank">
                                                            here
                                                            <ExternalLink className="w-3 h-3 ml-1 color-inherit inline" />
                                                        </a>
                                                        . Thank you!
                                                    </p>
                                                    <div className="mt-6">
                                                        <Link href="/" className="inline-flex items-center text-blue-600 hover:underline">
                                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                                            Go back to previous page
                                                        </Link>
                                                    </div>
                                                </div>
                                            )}

                                        </div>
                                    </div>
                                    {/* Reset Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleResetLyrics(setLyrics, setFormValues, toast)}
                                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-blue-200 text-blue-900 hover:text-blue-200 hover:bg-blue-900 hover:ring-blue-500/50 focus-visible:ring focus-visible:ring-blue-500/50 active:bg-blue-700 active:ring-0 px-5 rounded-t-none rounded-b-md text-sm md:text-base h-10 md:h-12 w-full -mt-4 shadow"
                                    >
                                        <Eraser className="w-4 h-4 opacity-85" /> Reset all to original lyrics
                                    </button>


                                    {/* Replace Section */}
                                    <div className="mt-2 flex flex-col gap-2 w-full">
                                        <label className="flex scroll-m-20 tracking-normal dark:text-white font-semibold text-white text-sm md:text-base">
                                            Replace All Words (Case-insensitive)
                                        </label>
                                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                                            <input
                                                type="text"
                                                value={replaceTerm}
                                                onChange={(e) => setReplaceTerm(e.target.value)}
                                                placeholder="Word to replace..."
                                                className="flex w-full rounded-md border border-component-input bg-foundation px-3 py-2 ring-offset-foundation placeholder:text-muted focus-visible:outline-none focus-visible:ring focus-visible:ring-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-foundation-secondary text-sm md:text-base text-primary"
                                            />
                                            <input
                                                type="text"
                                                value={replaceWith}
                                                onChange={(e) => setReplaceWith(e.target.value)}
                                                onKeyDown={handleReplaceWithKeyDown}
                                                placeholder="Replace with..."
                                                className="flex w-full rounded-md border border-component-input bg-foundation px-3 py-2 ring-offset-foundation placeholder:text-muted focus-visible:outline-none focus-visible:ring focus-visible:ring-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-foundation-secondary text-sm md:text-base text-primary"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleReplaceAllClick}
                                                // onClick={() => handleReplaceAll(replaceTerm, replaceWith, setLyrics, setFormValues, toast)}
                                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/95 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 px-5 rounded-md text-sm md:text-base h-10 md:h-12 w-full sm:w-auto"
                                            >
                                                Replace All
                                            </button>
                                        </div>
                                    </div>

                                    {/* Special requests */}
                                    <Form.Field name="specialRequests" className="mt-1 flex flex-col gap-0.5 last:mb-0 relative flex-1">
                                        <label className="flex scroll-m-20 tracking-normal peer-disabled:cursor-not-allowed peer-disabled:text-gray-500 peer-disabled:opacity-50 dark:text-white font-semibold text-white text-sm md:text-base">
                                            Your Requests
                                        </label>
                                        <Form.Control asChild>
                                            <textarea
                                                className="flex min-h-[80px] w-full rounded-md border border-component-input bg-foundation px-3 py-2 ring-offset-foundation placeholder:text-muted focus-visible:outline-none focus-visible:ring focus-visible:ring-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-foundation-secondary text-sm md:text-base text-primary mt-1"
                                                rows={6}
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
                                <div className="flex flex-col sm:flex-row items-start gap-3 rounded-lg bg-[#4B5EAA]/20 p-3 md:p-4 shadow-md border-blue-500 border" style={{ marginTop: '0rem', marginBottom: '0.5rem' }}>
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
                            {/* Navigation Buttons */}
                            {!isLoading && (
                                <div className=''>
                                    <Separator.Root
                                        className="shrink-0 dark:bg-gray-100/5 h-[1.5px] w-full my-3 md:my-4 bg-primary/10"
                                        orientation="horizontal"
                                    />
                                    <NavigationBtn />
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