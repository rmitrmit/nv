// src\app\change-lyrics\page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronRight, ListMusic, ArrowRight, Eraser, ExternalLink } from 'lucide-react';
import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Form from '@radix-ui/react-form';
import * as Separator from '@radix-ui/react-separator';
import SignInToSaveButton from "@/components/SignInToSaveButton";
import { Toaster, toast } from 'sonner';
import { StepIndicator, StepDivider, type StepProps } from '@/components/layouts/StepNavigation';
import BackButton from '@/components/BackButton';
import Image from 'next/image';
import { handleReplaceAll, handleResetLyrics, handleLyricChange, handleResetLine, LyricLine, getDistinctChangedWords, generateLyricsData } from './utils';


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
    const [distinctChangedWords, setDistinctChangedWords] = useState<string[]>([]);

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
            toast.error('Unable to proceed: No changes were made.', {
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
    const NavigationBtn = () => (
        <div className="flex flex-row items-center gap-2 py-0">
            <BackButton href="/" />
            {!isError && (
                <button
                    onClick={handleNextStep}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/95 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 px-5 rounded-md ml-auto text-sm md:text-base h-10 md:h-12"
                    type="button"
                >
                    {isLoading ? (
                        "Processing..."
                    ) : (
                        <>
                            Review Order <span className="font-bold text-lg">US${cost}</span>
                            <ChevronRight className="-mr-1 size-4 md:size-5" />
                        </>
                    )}

                </button>
            )}
        </div>
    );


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
                            <NavigationBtn />

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
                                            {distinctChangedWords.length > 0 && (<p className=''>&quot;{
                                                distinctChangedWords.map((word, index) => (
                                                    <span key={index} className='inline-block mr-1'>{word} {index != distinctChangedWords.length - 1 ? ', ' : ''}</span>
                                                ))
                                            }&quot;</p>)}
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
                                <Form.Root className="flex flex-1 flex-col gap-4 pb-6" onSubmit={handleNextStep}>
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
                                                        return (
                                                            <tr key={line.id} className="border-b transition-colors data-[state=selected]:bg-muted ">
                                                                <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 font-medium text-sm md:text-base text-muted">
                                                                    {line.id}
                                                                </td>
                                                                <td className="py-4 px-3 align-middle [&:has([role=checkbox])]:pr-0 text-sm md:text-base text-gray-900">
                                                                    {line.original}
                                                                </td>
                                                                <td className="px-0 py-4 align-middle [&:has([role=checkbox])]:pr-0">
                                                                    <ArrowRight className="w-4 text-muted" />
                                                                </td>
                                                                <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-sm md:text-base">
                                                                    <div className="flex items-center justify-between gap-2">
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
                                                                        {line.wordChanges.some((change) => change.hasChanged) && (
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
                                            Replace All Words (Case-insensitve)
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
                                                placeholder="Replace with..."
                                                className="flex w-full rounded-md border border-component-input bg-foundation px-3 py-2 ring-offset-foundation placeholder:text-muted focus-visible:outline-none focus-visible:ring focus-visible:ring-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-foundation-secondary text-sm md:text-base text-primary"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleReplaceAll(replaceTerm, replaceWith, setLyrics, setFormValues, toast)}
                                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/95 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 px-5 rounded-md text-sm md:text-base h-10 md:h-12 w-full sm:w-auto"
                                            >
                                                Replace All
                                            </button>
                                        </div>
                                    </div>

                                    {/* Special requests */}
                                    <Form.Field name="specialRequests" className="mt-4 flex flex-col gap-0.5 last:mb-0 relative flex-1">
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
                            {/* Navigation Buttons */}
                            {!isLoading && (
                                <>
                                    <Separator.Root
                                        className="shrink-0 dark:bg-gray-100/5 h-[1.5px] w-full mt-9 mb-3 md:my-4 bg-primary/10"
                                        orientation="horizontal"
                                    />
                                    <NavigationBtn />
                                </>
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
