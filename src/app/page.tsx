// src\app\page.tsx
"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Search, Clock, X, Link, ChevronRight } from 'lucide-react';
import React from "react";
import { useRouter } from 'next/navigation';
import * as Tabs from '@radix-ui/react-tabs';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Form from '@radix-ui/react-form';
import { Toaster, toast } from 'sonner';
import SignInToSaveButton from "@/components/SignInToSaveButton";

// Types
type StepProps = {
    step: number;
    label: string;
    isActive: boolean;
};

type Song = {
    id: string;
    title: string;
    artist: string;
}

type ManualEntryFields = {
    songUrl: string;
    lyrics: string;
}

// Components
const StepIndicator = ({ step, label, isActive }: StepProps) => (
    <div className="flex flex-col items-center" style={{ opacity: 1, transform: 'translateY(2px)' }}>
        <button
            className="inline-flex items-center justify-center size-6 px-2 rounded-full
        bg-primary text-primary-foreground hover:bg-primary/90 hover:ring-primary/50
        disabled:bg-white/80 disabled:text-primary disabled:opacity-10
        text-sm font-normal transition duration-150 peer"
            disabled={!isActive}
            type="button"
            role="tab"
        >
            {step}
        </button>
        <p className="mt-2 text-center text-sm font-semibold text-white 
      font-roboto leading-normal tracking-wide
      peer-disabled:font-normal peer-disabled:opacity-10">
            {label}
        </p>
    </div>
);

const StepDivider = () => (
    <div
        role="none"
        className="w-full h-[1.75px] -mt-6 flex-1 bg-white/5 dark:bg-gray-100/5 
      duration-1000 animate-in fade-in"
    />
);

const InfoCard = () => (
    <div className="relative w-full rounded-lg p-4 bg-primary/80 text-white/80 text-sm md:text-base dark:border-gray-100/5" role="alert">
        <div className="flex flex-col gap-2">
            <p className="font-roboto text-sm font-normal leading-5 md:leading-6 tracking-wide text-inherit">
                Choose how you want to add your song: <br />
                <span className="my-1.5 flex flex-row items-start gap-2">
                    <Search className="mt-1 size-4 md:size-5 flex-shrink-0" strokeWidth={2.15} />
                    <span className="flex-1">
                        <strong>Quick Search:</strong> Search Genius database to automatically find and import lyrics
                    </span>
                </span>
                <span className="flex flex-row items-start gap-2">
                    <Clock className="mt-1 size-4 md:size-5 flex-shrink-0" strokeWidth={2.15} />
                    <span className="flex-1">
                        <strong>Manual Entry:</strong> Paste a song URL and add lyrics from any source
                    </span>
                </span>
            </p>
        </div>
    </div>
);

const EmptyState = () => (
    <div className="flex flex-col gap-5 md:gap-6 text-center max-w-md mx-auto mt-4">
        <Image
            src="/main.webp"
            alt="Lyric Changer Main Logo"
            width={250}
            height={250}
            className="mx-auto size-20 md:size-24"
            priority
        />
        <div>
            <h3 className="text-lg md:text-xl text-white font-azbuka tracking-normal">
                We await your Song Lyrics!
            </h3>
            <h5 className="text-sm md:text-base text-white font-roboto tracking-normal">
                Search for your song above.
            </h5>
        </div>
    </div>
);

// Loading indicator component
const LoadingIndicator = () => (
    <div className="absolute -right-5 top-1/2 -translate-y-1/2">
        <div className="loader-variant-equalizer text-primary scale-[0.45] rotate-180">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
        </div>
    </div>
);

// Search Results component
const SearchResults = ({ results, isLoading, onSelect }: {
    results: Song[],
    isLoading: boolean,
    onSelect: (song: Song) => void
}) => {
    if (results.length === 0 && !isLoading) {
        return null;
    }

    return (
        <ScrollArea.Root className="relative overflow-hidden flex-1 w-full rounded-md border bg-white max-h-[calc(100vh-20rem)] md:max-h-[calc(100vh-22rem)]">
            <ScrollArea.Viewport className="size-full rounded-[inherit]">
                <div>
                    {results.map((song, index) => (
                        <React.Fragment key={song.id}>
                            <div className="relative cursor-pointer p-3 md:p-4 dark:bg-gray-900 hover:bg-gray-200/20 transition-colors" onClick={() => onSelect(song)}>
                                <div className="pr-12">
                                    <h5 className="scroll-m-20 font-azbuka tracking-normal dark:text-white text-sm md:text-base text-primary truncate">
                                        {song.title}
                                    </h5>
                                    <p className="scroll-m-20 font-roboto font-normal tracking-wide dark:text-white text-xs md:text-sm text-muted truncate">
                                        {song.artist}
                                    </p>
                                </div>
                            </div>
                            {index < results.length - 1 && (
                                <div className="shrink-0 bg-gray-200 dark:bg-gray-100/5 h-[1.5px] w-full"></div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="flex select-none touch-none p-0.5 bg-black/5 transition-colors duration-150 ease-out hover:bg-black/10 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5">
                <ScrollArea.Thumb className="flex-1 bg-black/20 rounded-full relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
            </ScrollArea.Scrollbar>
            <ScrollArea.Corner className="bg-black/5" />
        </ScrollArea.Root>
    );
};

const SearchPanel = () => {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<Song[]>([]);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [showResults, setShowResults] = useState(false);

    // Function to search the Genius API
    const searchGenius = async (query: string) => {
        console.log("Searching for:", query);

        if (!query || !query.trim()) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        setIsLoading(true);
        setShowResults(true);

        try {
            const response = await fetch(`/api/genius?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch songs: ${response.status}`);
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error('Invalid API response format');
            }

            setSearchResults(data);
        } catch (error) {
            console.error("Error searching Genius API:", error);
            setSearchResults([]);
            // Show error toast
            toast.error('Error searching for songs', {
                description: 'Please try again later',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Debounce the search to avoid too many API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            searchGenius(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectSong = (song: Song) => {
        setSelectedSong(song);
        setShowResults(false);
    };

    const handleNext = () => {
        if (!selectedSong) {
            toast.error('Invalid selection', {
                description: 'Please select a song first',
            });
            return;
        }

        // Navigate to the "change-lyrics" page with query parameters
        router.push(`/change-lyrics?id=${selectedSong.id}&title=${encodeURIComponent(selectedSong.title)}&artist=${encodeURIComponent(selectedSong.artist)}`);
    };

    return (
        <div className="py-6 mt-4 flex flex-1 flex-col gap-4">
            <p className="text-sm md:text-base text-white font-roboto font-normal tracking-wide">
                Search for your song below. Once selected, it may take a few seconds to load the lyrics.
            </p>

            <Form.Root className="space-y-6">
                <Form.Field name="search">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 md:size-5 text-gray-400" />
                        <Form.Control asChild>
                            <input
                                className="flex w-full rounded-md border border-component-input
                                h-10 md:h-12 pl-10 pr-8 text-sm md:text-base text-primary
                                bg-foundation px-3 py-1 shadow-sm shadow-black/10 transition-colors text-gray-900
                                dark:bg-foundation-secondary dark:text-white dark:placeholder:text-muted/75
                                focus-visible:outline-none focus-visible:ring focus-visible:ring-secondary/50"
                                type="text"
                                placeholder="Search for a Song..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </Form.Control>
                        {isLoading && <LoadingIndicator />}
                        {searchQuery && !isLoading && (
                            <button
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                onClick={() => {
                                    setSearchQuery('');
                                    setShowResults(false);
                                }}
                                type="button"
                            >
                                <X className="size-4 md:size-5 text-gray-400" />
                            </button>
                        )}
                    </div>
                </Form.Field>
            </Form.Root>

            {showResults ? (
                <SearchResults
                    results={searchResults}
                    isLoading={isLoading}
                    onSelect={handleSelectSong}
                />
            ) : selectedSong ? (
                <div className="flex flex-col gap-3">
                    <div className="p-4 bg-primary/10 rounded-lg">
                        <h3 className="text-lg text-white font-azbuka tracking-normal">
                            {selectedSong.title}
                        </h3>
                        <p className="text-sm text-white/80 font-roboto tracking-wide">
                            {selectedSong.artist}
                        </p>
                    </div>
                </div>
            ) : (
                <EmptyState />
            )}

            {selectedSong && (
                <div className="flex flex-row py-4">
                    <button
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal 
                            transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none 
                            disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none 
                            [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground 
                            hover:bg-primary/90 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 
                            active:bg-primary/75 active:ring-0 h-10 px-5 rounded-md ml-auto text-sm md:text-base"
                        type="button"
                        onClick={handleNext}
                    >
                        Next
                        <ChevronRight className="-mr-1" />
                    </button>
                </div>
            )}
        </div>
    );
};

// Also update the ManualEntryPanel component:
const ManualEntryPanel = () => {
    const router = useRouter();
    const [formValues, setFormValues] = useState<ManualEntryFields>({
        songUrl: '',
        lyrics: ''
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormValues(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        let isValid = true;

        // Validate URL
        if (!formValues.songUrl.trim()) {
            errors.songUrl = 'A valid URL to the original song/ lyrics is required';
            isValid = false;
        } else if (!formValues.songUrl.startsWith('http')) {
            errors.songUrl = 'Please enter a valid URL to original song/ lyrics, starting with http:// or https://';
            isValid = false;
        }

        // Validate lyrics
        if (!formValues.lyrics.trim()) {
            errors.lyrics = 'Lyrics are required';
            isValid = false;
        } else if (formValues.lyrics.trim().length < 50) {
            errors.lyrics = 'Your lyrics is too short, at least 50 characters is required.';
            isValid = false;
        }

        setFormErrors(errors);
        return isValid;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            // Store lyrics in localStorage to avoid URL length limitations
            localStorage.setItem('manualEntryLyrics', formValues.lyrics);

            // Navigate to next step with just the URL and a flag
            router.push(`/change-lyrics?url=${encodeURIComponent(formValues.songUrl)}&manualEntry=true`);
        } else {
            // Show toast with first error
            const firstError = Object.values(formErrors)[0];
            toast.error('Invalid input', {
                description: firstError || 'Please fix the errors in the form',
            });
        }
    };

    return (
        <div className="py-6 mt-4 flex flex-1 flex-col gap-4">
            <Form.Root className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <p className="scroll-m-20 font-roboto font-normal tracking-wide dark:text-white text-sm md:text-base text-white">
                    Please add the URL of the original song. <a className="font-semibold text-white underline" href="https://youtube.com/" target="_blank">Search YouTube</a> or use a cloud storage link.
                </p>

                <Form.Field className="mb-3.5 flex flex-col gap-0.5 last:mb-0 relative" name="songUrl">
                    <div className="relative">
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 size-4 md:size-5 text-gray-400" />
                        <Form.Control asChild>
                            <input
                                className="flex w-full rounded-md border border-component-input bg-foundation px-3 py-1 
                                    shadow-sm shadow-black/10 transition-colors file:mr-1.5 file:mt-1.5 file:cursor-pointer 
                                    file:border-0 file:bg-transparent file:p-0 file:text-sm file:font-medium 
                                    file:text-foundation-foreground placeholder:text-muted focus-visible:outline-none 
                                    focus-visible:ring focus-visible:ring-secondary/50 disabled:cursor-not-allowed 
                                    disabled:opacity-50 dark:bg-foundation-secondary dark:text-white 
                                    dark:placeholder:text-muted/75 h-10 md:h-12 pl-10 text-sm md:text-base text-primary"
                                placeholder="https://..."
                                type="text"
                                name="songUrl"
                                value={formValues.songUrl}
                                onChange={handleInputChange}
                            />
                        </Form.Control>
                    </div>
                    {formErrors.songUrl && (
                        <Form.Message className="text-sm text-red-500 mt-1">
                            {formErrors.songUrl}
                        </Form.Message>
                    )}
                </Form.Field>

                <p className="scroll-m-20 font-roboto font-normal tracking-wide dark:text-white text-sm md:text-base text-white">
                    Please add the lyrics from the original song. <a className="font-semibold text-white underline" href="https://songmeanings.com/" target="_blank">Search for Lyrics</a>
                </p>

                <Form.Field className="mb-3.5 flex flex-col gap-0.5 last:mb-0 relative" name="lyrics">
                    <Form.Control asChild>
                        <textarea
                            className="flex w-full rounded-md border border-component-input bg-foundation px-3 py-2 
                                ring-offset-foundation placeholder:text-muted focus-visible:outline-none 
                                focus-visible:ring focus-visible:ring-primary/50 disabled:cursor-not-allowed 
                                disabled:opacity-50 dark:bg-foundation-secondary dark:text-white text-sm 
                                md:text-base text-primary min-h-[200px] md:min-h-[300px] resize-y"
                            placeholder="Paste the original lyrics here..."
                            rows={10}
                            name="lyrics"
                            value={formValues.lyrics}
                            onChange={handleInputChange}
                        />
                    </Form.Control>
                    {formErrors.lyrics && (
                        <Form.Message className="text-sm text-red-500 mt-1">
                            {formErrors.lyrics}
                        </Form.Message>
                    )}
                </Form.Field>

                <div className="flex flex-row py-4">
                    <Form.Submit asChild>
                        <button
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal 
                                transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none 
                                disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none 
                                [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground 
                                hover:bg-primary/90 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 
                                active:bg-primary/75 active:ring-0 h-10 px-5 rounded-md ml-auto text-sm md:text-base"
                            type="submit"
                        >
                            Next
                            <ChevronRight className="-mr-1" />
                        </button>
                    </Form.Submit>
                </div>
            </Form.Root>
        </div>
    );
};

// Finally, add the Toaster component to your main component:
export default function LyricChangerPage() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [currentStep, setCurrentStep] = useState(1);

    const steps = [
        { step: 1, label: "Choose A Song" },
        { step: 2, label: "Change The Lyrics" },
        { step: 3, label: "Review" },
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
                            backgroundColor: "oklch(0.971 0.013 17.38)"
                        },
                    }}
                />

                {/* Rest of your component remains the same */}
                <section className="mx-auto w-full max-w-[1280px] flex flex-col space-y-4 px-6 sm:px-12 md:px-16 lg:px-32 xl:px-40 2xl:px-52">
                    {/* Header/Nav */}
                    <nav className="w-full bg-transparent px-4 pb-4">
                        <div className="container mx-auto flex justify-end">
                            <SignInToSaveButton />
                        </div>
                    </nav>

                    {/* Step Indicators */}
                    <div className="flex flex-col space-y-4 md:space-y-6">
                        <section className="flex items-center gap-2">
                            {steps.map((step, index) => (
                                <React.Fragment key={step.step}>
                                    <StepIndicator
                                        step={step.step}
                                        label={step.label}
                                        isActive={currentStep === step.step}
                                    />
                                    {index < steps.length - 1 && <StepDivider key={`divider-${index}`} />}
                                </React.Fragment>
                            ))}
                        </section>
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-1 flex-col space-y-2">
                        <h3 className="my-2 md:my-4 text-[22px] md:text-[28px] text-white 
                        font-azbuka tracking-normal duration-1000 ease-in-out animate-in fade-in">
                            Add The Original Song
                        </h3>

                        <InfoCard />

                        {/* Tabs */}
                        <div className="flex-1">
                            <Tabs.Root defaultValue="search" className="flex flex-col flex-1">
                                <Tabs.List className="h-12 my-2 -mb-3 grid w-full grid-cols-2 gap-2 rounded-full p-0
                                    items-center justify-center text-muted-foreground bg-transparent
                                    dark:bg-foundation-secondary">
                                    <Tabs.Trigger
                                        value="search"
                                        className="inline-flex h-11 items-center justify-center rounded-full px-3 py-1.5 
                                            font-medium ring-offset-foundation transition-all focus-visible:outline-none 
                                            focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none 
                                            disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:font-semibold 
                                            data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-muted 
                                            bg-primary/10 text-xs md:text-sm text-white hover:bg-primary/15 hover:ring 
                                            hover:ring-secondary/20 data-[state=active]:hover:ring-primary/50 whitespace-nowrap"
                                    >
                                        <Search className="mr-1.5 size-4 max-[380px]:hidden md:size-5 flex-shrink-0" />
                                        Quick Search
                                    </Tabs.Trigger>
                                    <Tabs.Trigger
                                        value="manual"
                                        className="inline-flex h-11 items-center justify-center rounded-full px-3 py-1.5 
                                            font-medium ring-offset-foundation transition-all focus-visible:outline-none 
                                            focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none 
                                            disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:font-semibold 
                                            data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-muted 
                                            bg-primary/10 text-xs md:text-sm text-white hover:bg-primary/15 hover:ring 
                                            hover:ring-secondary/20 data-[state=active]:hover:ring-primary/50 whitespace-nowrap"
                                    >
                                        <Clock className="mr-1.5 size-4 max-[380px]:hidden md:size-5 flex-shrink-0" />
                                        Manual Entry
                                    </Tabs.Trigger>
                                </Tabs.List>

                                <Tabs.Content
                                    value="search"
                                    className="ring-offset-foundation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 data-[state=inactive]:hidden"
                                >
                                    <SearchPanel />
                                </Tabs.Content>

                                <Tabs.Content
                                    value="manual"
                                    className="ring-offset-foundation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 data-[state=inactive]:hidden"
                                >
                                    <ManualEntryPanel />
                                </Tabs.Content>
                            </Tabs.Root>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}