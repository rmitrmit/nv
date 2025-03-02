// src\app\modify\page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Delete, ClipboardPenLine } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Form from '@radix-ui/react-form';
import * as Separator from '@radix-ui/react-separator';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Tooltip from '@radix-ui/react-tooltip';
import SignInToSaveButton from "@/components/SignInToSaveButton";

type StepProps = {
    step: number;
    label: string;
    isActive: boolean;
    isComplete?: boolean;
};

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

export default function ModifyLyricsPage() {
    const searchParams = useSearchParams();

    const songId = searchParams.get('id');
    const songTitle = searchParams.get('title');
    const songArtist = searchParams.get('artist');

    const songUrl = searchParams.get('url');
    const isManualEntry = searchParams.get('manualEntry') === 'true';

    const [lyrics, setLyrics] = useState<string>('');
    const [originalLyrics, setOriginalLyrics] = useState<string>('');
    const [placeholder, setPlaceholder] = useState<string>('Change it from a breakup song to a graduation celebration about my nephew, Thomas...');
    const [currentStep, setCurrentStep] = useState(2);

    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Rotating placeholder text
    useEffect(() => {
        const placeholders = [
            'Change it from a breakup song to a graduation celebration about my nephew, Thomas...',
            'Turn this into a birthday song for my mom who loves gardening...',
            'Change it to be about our family\'s move to California and new adventures...'
        ];

        let currentIndex = 0;
        const intervalId = setInterval(() => {
            currentIndex = (currentIndex + 1) % placeholders.length;
            setPlaceholder(placeholders[currentIndex]);
        }, 2000);

        return () => clearInterval(intervalId);
    }, []);

    // Check for manually entered lyrics from localStorage
    useEffect(() => {
        if (isManualEntry) {
            try {
                const storedLyrics = localStorage.getItem('manualEntryLyrics');
                if (storedLyrics) {
                    setLyrics(storedLyrics);
                    setOriginalLyrics(storedLyrics);
                    // Clear localStorage after retrieving to avoid old data persisting
                    localStorage.removeItem('manualEntryLyrics');
                }
            } catch (error) {
                console.error('Error retrieving lyrics from localStorage:', error);
            }
        }
    }, [isManualEntry]);



    // Fetch lyrics from API if songId is available
    useEffect(() => {
        if (songId) {
            setIsLoading(true);
            fetch(`/api/genius/lyrics?id=${songId}`)
                .then(response => response.json())
                .then(data => {
                    setIsLoading(false);
                    if (data.lyrics) {
                        setLyrics(data.lyrics);
                        setOriginalLyrics(data.lyrics);
                    } else {
                        console.error('Lyrics not found');
                    }
                })
                .catch(error => {
                    setIsLoading(false);
                    console.error('Error fetching lyrics:', error);
                });

        } else if (songUrl && !isManualEntry) {
            // If we have a songUrl but no songId and it's not a manual entry,
            // fetch lyrics from the URL
            setIsLoading(true);
            fetch(`/api/genius/lyrics-by-url?url=${encodeURIComponent(songUrl)}`)
                .then(response => response.json())
                .then(data => {
                    setIsLoading(false);
                    if (data.lyrics) {
                        setLyrics(data.lyrics);
                        setOriginalLyrics(data.lyrics);
                    } else {
                        console.error('Lyrics not found from URL');
                    }
                })
                .catch(error => {
                    setIsLoading(false);
                    console.error('Error fetching lyrics from URL:', error);
                });
        }
    }, [songId, songUrl, isManualEntry]);


    const handleClearLyrics = () => {
        setLyrics('');
    };

    const handlePasteOriginal = () => {
        console.log("Restoring Lyrics:", originalLyrics);
        setLyrics(originalLyrics);
    };

    const handleNextStep = () => {
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const steps = [
        { step: 1, label: "Original", isActive: currentStep === 1, isComplete: true },
        { step: 2, label: "Your Ideas", isActive: currentStep === 2, isComplete: false },
        { step: 3, label: "Review", isActive: currentStep === 3, isComplete: false },
        { step: 4, label: "Add-Ons", isActive: currentStep === 4, isComplete: false }
    ];

    return (
        <main className="min-h-0 w-full">
            <div className="w-full" style={{ minHeight: '100%' }}>
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
                                <Link href="/" className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-[1.5px] bg-white hover:text-black hover:ring-gray-200/65 focus-visible:ring focus-visible:ring-gray-200/65 active:bg-gray-200 active:ring-0 dark:border-gray-100/25 dark:text-white dark:hover:bg-gray-100/15 dark:hover:text-white dark:hover:ring-gray-100/15 dark:focus-visible:ring-gray-100/15 dark:active:bg-gray-100/25 px-5 rounded-md text-sm md:text-base h-10 md:h-12">
                                    <ChevronLeft className="-ml-1 size-4 md:size-5" /> Back
                                </Link>
                                <button
                                    onClick={handleNextStep}
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 px-5 rounded-md ml-auto text-sm md:text-base h-10 md:h-12"
                                    type="button"
                                >
                                    Next <ChevronRight className="-mr-1 size-4 md:size-5" />
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

                            {/* Instructions and Buttons */}
                            {!isLoading && (
                                <div className="flex w-full flex-col sm:flex-row items-start gap-3 sm:items-center">
                                    <p className="scroll-m-20 font-roboto font-normal tracking-wide dark:text-white text-sm md:text-base text-white flex-1">
                                        Please describe your ideas for our AI writer OR paste the original lyrics and modify them.
                                    </p>
                                    <ToggleGroup.Root type="single" className="flex gap-2 w-full sm:w-auto">
                                        {lyrics === '' && (
                                            <ToggleGroup.Item value="paste" onClick={handlePasteOriginal} className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 px-4 rounded-md w-full sm:w-auto text-sm md:text-base h-10 md:h-12 bg-indigo-600 text-white hover:bg-indigo-700">
                                                <ClipboardPenLine className="size-4 md:size-5" /> Paste Original
                                            </ToggleGroup.Item>
                                        )}
                                        {lyrics !== '' && (
                                            <ToggleGroup.Item value="clear" onClick={handleClearLyrics} className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:ring-destructive/50 focus-visible:ring focus-visible:ring-destructive/50 active:bg-destructive/75 active:ring-0 px-4 rounded-md w-full sm:w-auto text-sm md:text-base h-10 md:h-12">
                                                <Delete className="size-4 md:size-5" /> Clear Lyrics
                                            </ToggleGroup.Item>
                                        )}
                                    </ToggleGroup.Root>
                                </div>
                            )}

                            {/* Lyrics Textarea with Form */}
                            {!isLoading && (
                                <Form.Root className="flex flex-1 flex-col gap-4">
                                    <Form.Field name="lyrics" className="mb-3.5 flex flex-col gap-0.5 last:mb-0 relative flex-1">
                                        <Form.Control asChild>
                                            <textarea
                                                className="flex rounded-md border border-component-input bg-foundation px-3 py-2 ring-offset-foundation placeholder:text-muted focus-visible:outline-none focus-visible:ring focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-foundation-secondary dark:text-white text-sm md:text-base text-primary min-h-[200px] md:min-h-[300px] resize-y w-full"
                                                placeholder={placeholder}
                                                rows={18}
                                                value={lyrics}
                                                onChange={(e) => setLyrics(e.target.value)}
                                            />
                                        </Form.Control>
                                    </Form.Field>
                                </Form.Root>
                            )}

                            {/* Tip Box */}
                            {!isLoading && (
                                <div className="mt-4 md:mt-6 flex flex-col sm:flex-row items-start gap-3 rounded-lg bg-[#4B5EAA]/20 p-3 md:p-4">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4B5EAA] text-lg flex-shrink-0">
                                        💡
                                    </div>
                                    <div className="flex flex-col space-y-1 flex-1">
                                        <p className="scroll-m-20 font-roboto tracking-wide dark:text-white text-sm md:text-base font-semibold text-white">
                                            Tip: Want to save time and money?
                                        </p>
                                        <p className="scroll-m-20 font-roboto font-normal tracking-wide dark:text-white text-xs md:text-sm text-white/80 leading-relaxed">
                                            Tell the AI how many words to change! You can ask to modify less than 60 or less than 100 words instead of rewriting the whole song. You can always edit the lyrics later if needed.
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