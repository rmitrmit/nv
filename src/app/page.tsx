// src\app\page.tsx
"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Search, X, Link, ChevronRight, Upload, FileText, ShoppingCart, TextSelect } from 'lucide-react';
import React from "react";
import { useRouter } from 'next/navigation';
import * as Tabs from '@radix-ui/react-tabs';
import * as Form from '@radix-ui/react-form';
import { toast } from 'sonner';
// import SignInToSaveButton from "@/components/SignInToSaveButton";
import { StepIndicator, StepDivider, StepProps } from '@/components/layouts/StepNavigation';

// Types
type ManualEntryFields = {
    songUrl: string;
    lyrics: string;
}


export type CheckoutData = {
    title: string;
    artist: string;
    image?: string;
    url: string;
    changedWords: string[];
    modifiedLyrics: string;
    originalLyrics: string;
    lineChanges?: Array<{
        lineNumber: number;
        original: string;
        modified: string;
    }>; // Add line changes for accurate reconstruction
    specialRequests: string;
    deliveryPreference: string;
    totalCost: string;
    generatedOn: string;
}

interface Song {
    id: string;
    title: string;
    artist: string;
    image: string;
    url: string;
}

interface SearchResultsProps {
    results: Song[];
    isLoading: boolean;
    onSelect: (song: Song) => void;
}


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
                <span className="my-1.5 flex flex-row items-start gap-2">
                    <TextSelect className="mt-1 size-4 md:size-5 flex-shrink-0" strokeWidth={2.15} />
                    <span className="flex-1">
                        <strong>Manual Entry:</strong> Paste a song URL and add lyrics from any source
                    </span>
                </span>
                <span className="flex flex-row items-start gap-2">
                    <ShoppingCart className="mt-1 size-4 md:size-5 flex-shrink-0" strokeWidth={2.15} />
                    <span className="flex-1">
                        <strong>Load Checkout:</strong> Upload a previous checkout file
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
const SearchResults = ({ results, isLoading, onSelect }: SearchResultsProps) => {
    if (results.length === 0 && !isLoading) {
        return null;
    }

    return (
        <div className="relative overflow-hidden flex-1 w-full rounded-md border bg-white max-h-[calc(100vh-20rem)] md:max-h-[calc(100vh-22rem)] overflow-y-auto -mt-3 shadow-xl">
            <div className="min-w-full">
                {results.map((song: Song) => (
                    <div key={song.id} className="relative cursor-pointer p-3 md:p-4 hover:bg-gray-200/20 transition-colors outline-1 border-spacing-0 -mb-1 border-b-2" onClick={() => onSelect(song)}>
                        <div className="flex items-center gap-3">
                            <Image src={song.image} alt={song.title} width={48} height={48} className="w-12 h-12 rounded-md" />
                            <div className="pr-12">
                                <h5 className="font-azbuka text-sm md:text-base text-primary truncate">
                                    {song.title}
                                </h5>
                                <p className="font-roboto text-xs md:text-sm text-muted truncate">
                                    {song.artist}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const SearchPanel = () => {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<Song[]>([]);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [isButtonLoading, setIsButtonLoading] = useState(false);

    // Function to search the Genius API
    const searchGenius = async (query: string) => {
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
                description: `${error}. Please try again later`,
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
        router.push(`/change-lyrics?id=${selectedSong.id}&title=${encodeURIComponent(selectedSong.title)}&artist=${encodeURIComponent(selectedSong.artist)}&image=${encodeURIComponent(selectedSong.image)}&url=${encodeURIComponent(selectedSong.url)}`);
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
                                dark:bg-foundation-secondary dark:placeholder:text-muted/75
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
                <div className="p-4 bg-primary/10 rounded-lg flex gap-3 items-center">
                    <div className="relative w-40 h-40 md:w-32 md:h-32">
                        <Image
                            src={selectedSong.image}
                            alt={selectedSong.title}
                            // layout="fill"
                            // objectFit="cover"
                            // width="240"
                            // height="240"
                            fill
                            className="rounded-md object-cover"
                            priority // Loads the image faster
                        />
                    </div>
                    <div>
                        <h3 className="text-lg text-white font-azbuka tracking-normal">
                            {selectedSong.title}
                        </h3>
                        <p className="text-sm text-white/80 font-roboto tracking-wide">
                            by {selectedSong.artist}
                        </p>
                    </div>
                </div>
            ) : (
                <EmptyState />
            )}
            {isLoading && (
                <div className="py-24"></div>
            )}

            {selectedSong && (
                <div className="flex flex-row py-4">
                    <button
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal 
        transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none 
        disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none 
        [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground 
        hover:bg-primary/90 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 
        active:bg-primary/75 active:ring-0 h-10 md:h-12 px-5 rounded-md ml-auto text-sm md:text-base shadow"
                        type="submit"
                        disabled={isButtonLoading}
                        onClick={(e) => {
                            e.preventDefault(); // Prevent default form submission if needed
                            setIsButtonLoading(true);
                            handleNext()
                        }}
                    >
                        {isButtonLoading ? "Processing..." : "Next"}
                        {!isButtonLoading && <ChevronRight className="-mr-1" />}
                    </button>
                </div>
            )}
        </div>
    );
};

// Also update the ManualEntryPanel component:
const ManualEntryPanel = () => {
    const router = useRouter();
    const [isButtonLoading, setIsButtonLoading] = useState(false);
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

    // In ManualEntryPanel
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsButtonLoading(true);

        if (validateForm()) {
            localStorage.setItem('manualEntryLyrics', formValues.lyrics);
            // Add a slight delay to ensure localStorage is written
            setTimeout(() => {
                router.push(`/change-lyrics?url=${encodeURIComponent(formValues.songUrl)}&manualEntry=true`);
            }, 50); // 50ms delay
        } else {
            // Show toast for the first error
            const firstErrorField = Object.keys(formErrors)[0];
            const firstError = formErrors[firstErrorField];

            if (firstError) {
                toast.error('Please check your input', {
                    description: firstError,
                });
            }

            setIsButtonLoading(false);
        }
    };

    return (
        <div className="py-6 mt-4 flex flex-1 flex-col gap-4">
            <Form.Root className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <p className="scroll-m-20 font-roboto font-normal tracking-wide text-sm md:text-base text-white">
                    Please add the URL of the original song. <a className="font-semibold text-white underline" href="https://youtube.com/" target="_blank" rel="noopener noreferrer">Search YouTube</a> or use a cloud storage link.
                </p>

                <Form.Field className="mb-3.5 flex flex-col gap-0.5 last:mb-0 relative" name="songUrl">
                    <div className="relative">
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 size-4 md:size-5 text-gray-400" />
                        <Form.Control asChild>
                            <input
                                className={`flex w-full rounded-md border ${formErrors.songUrl ? 'border-red-600 border-2' : 'border-component-input'} bg-foundation px-3 py-1 
                                    shadow-sm shadow-black/10 transition-colors file:mr-1.5 file:mt-1.5 file:cursor-pointer 
                                    file:border-0 file:bg-transparent file:p-0 file:text-sm file:font-medium 
                                    file:text-foundation-foreground placeholder:text-muted focus-visible:outline-none 
                                    focus-visible:ring focus-visible:ring-secondary/50 disabled:cursor-not-allowed 
                                    disabled:opacity-50 dark:bg-foundation-secondary 
                                    dark:placeholder:text-muted/75 h-10 md:h-12 pl-10 text-sm md:text-base text-primary`}
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
                    Please add the lyrics from the original song. <a className="font-semibold text-white underline" href="https://www.azlyrics.com/" target="_blank" rel="noopener noreferrer">Search on AZLyrics</a>
                </p>

                <Form.Field className="mb-3.5 flex flex-col gap-0.5 last:mb-0 relative" name="lyrics">
                    <Form.Control asChild>
                        <textarea
                            className={`flex w-full rounded-md border ${formErrors.lyrics ? 'border-red-600 border-2' : 'border-component-input'} bg-foundation px-3 py-2 
                                ring-offset-foundation placeholder:text-muted focus-visible:outline-none 
                                focus-visible:ring focus-visible:ring-primary/50 disabled:cursor-not-allowed 
                                disabled:opacity-50 dark:bg-foundation-secondary text-sm 
                                md:text-base text-primary min-h-[200px] md:min-h-[300px] resize-y`}
                            placeholder="Paste the original lyrics here..."
                            rows={15}
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
                            disabled={isButtonLoading}
                        >
                            {isButtonLoading ? "Processing..." : "Next"}
                            {!isButtonLoading && <ChevronRight className="-mr-1" />}
                        </button>
                    </Form.Submit>
                </div>
            </Form.Root>
        </div>
    );
};

// A snippet from src/app/page.tsx
const LoadCheckoutPanel = () => {
    const router = useRouter();
    const [isButtonLoading, setIsButtonLoading] = useState(false);
    const [, setUploadedFile] = useState<File | null>(null);
    const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
    const [parseError, setParseError] = useState<string>('');

    const parseCheckoutFile = (content: string): CheckoutData | null => {
        try {
            const titleMatch = content.match(/Title:\s*(.+)/);
            const artistMatch = content.match(/Artist:\s*(.+)/);
            const imageMatch = content.match(/Image URL:\s*(.+)/);
            const urlMatch = content.match(/URL:\s*(.+)/);
            const changedWordsMatch = content.match(/Changed Words:\s*(.+)/);
            const specialRequestsMatch = content.match(/SPECIAL REQUESTS:\s*([\s\S]*?)(?=\s*\nEND-OF-FILE|$)/);

            const lineChangesMatch = content.match(/LINE-BY-LINE CHANGES:\s*([\s\S]*?)(?=\n\nORIGINAL LYRICS:|$)/);
            let lineChanges: Array<{ lineNumber: number, original: string, modified: string }> = [];
            if (lineChangesMatch) {
                const changesText = lineChangesMatch[1].trim();
                const changeLines = changesText.split('\n').filter(line => line.trim());
                lineChanges = changeLines.map(line => {
                    const match = line.match(/Line (\d+):\s*"([^"]*?)"\s*->\s*"([^"]*?)"/);
                    if (match) {
                        return {
                            lineNumber: parseInt(match[1]) - 1,
                            original: match[2],
                            modified: match[3]
                        };
                    }
                    return null;
                }).filter(Boolean) as Array<{ lineNumber: number, original: string, modified: string }>;
            }

            const modifiedLyricsStart = content.indexOf('MODIFIED LYRICS:');
            const specialRequestsStart = content.indexOf('SPECIAL REQUESTS:');
            let modifiedLyrics = '';
            if (modifiedLyricsStart !== -1 && specialRequestsStart !== -1) {
                modifiedLyrics = content.substring(modifiedLyricsStart + 17, specialRequestsStart).trim();
            }

            const originalLyricsStart = content.indexOf('ORIGINAL LYRICS:');
            const modifiedLyricsMarker = content.indexOf('MODIFIED LYRICS:');
            let originalLyrics = '';
            if (originalLyricsStart !== -1 && modifiedLyricsMarker !== -1) {
                originalLyrics = content.substring(originalLyricsStart + 16, modifiedLyricsMarker).trim();
            }

            const result: CheckoutData = {
                title: titleMatch?.[1]?.trim() || '',
                artist: artistMatch?.[1]?.trim() || '',
                url: urlMatch?.[1]?.trim() || '',
                image: imageMatch?.[1]?.trim() || '',
                changedWords: changedWordsMatch?.[1]?.split(',').map(w => w.trim()).filter(w => w.length > 0) || [], // Added filter to remove empty strings
                modifiedLyrics: modifiedLyrics.replace(/\n\s+/g, '\n').trim(), // Clean up extra whitespace in modified lyrics
                originalLyrics: originalLyrics.replace(/\n\s+/g, '\n').trim(), // Clean up extra whitespace in original lyrics
                lineChanges,
                specialRequests: specialRequestsMatch?.[1]?.trim() || 'None',
                deliveryPreference: '',
                totalCost: '',
                generatedOn: ''
            };

            return result;
        } catch (error) {
            console.error('Error parsing checkout file:', error);
            return null;
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadedFile(file);
        setParseError('');

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const parsed = parseCheckoutFile(content);

            if (parsed && parsed.title && parsed.artist) {
                setCheckoutData(parsed);
                console.log('Parsed checkout data:', parsed);
            } else {
                setParseError('Invalid checkout file format. Please upload a valid checkout progress file.');
                setCheckoutData(null);
            }
        };
        reader.readAsText(file);
    };

    const handleLoadCheckout = () => {
        if (!checkoutData) {
            toast.error('Invalid file', {
                description: 'Please upload a valid checkout file first',
            });
            return;
        }

        setIsButtonLoading(true);

        try {
            console.log('=== CHECKOUT LOADING DEBUG ===');
            console.log('Original checkoutData:', checkoutData);
            console.log('Changed words before storage:', checkoutData.changedWords);
            console.log('Modified lyrics preview:', checkoutData.modifiedLyrics.substring(0, 100) + '...');

            // Clean the checkout data before storing
            const cleanedCheckoutData = {
                ...checkoutData,
                changedWords: checkoutData.changedWords.map(w => w.trim()).filter(w => w.length > 0),
                modifiedLyrics: checkoutData.modifiedLyrics.trim(),
                originalLyrics: checkoutData.originalLyrics.trim()
            };

            console.log('Cleaned checkout data:', cleanedCheckoutData);

            localStorage.setItem('checkoutData', JSON.stringify(cleanedCheckoutData));

            // Verify storage immediately
            const storedData = localStorage.getItem('checkoutData');
            console.log('Verification - Data stored successfully:', !!storedData);
            if (storedData) {
                const parsed = JSON.parse(storedData);
                console.log('Verification - Parsed changed words:', parsed.changedWords);
            }

            const params = new URLSearchParams({
                title: checkoutData.title,
                artist: checkoutData.artist,
                url: checkoutData.url,
                loadCheckout: 'true',
                timestamp: Date.now().toString() // Add timestamp to force fresh load
            });

            if (checkoutData.image && checkoutData.image !== 'N/A') {
                params.set('image', checkoutData.image);
            }

            console.log('Navigation params:', params.toString());
            console.log('=== END CHECKOUT LOADING DEBUG ===');

            setTimeout(() => {
                router.push(`/change-lyrics?${params.toString()}`);
                setIsButtonLoading(false);
            }, 100); // Increased timeout slightly
        } catch (error) {
            console.error('Error loading checkout:', error);
            toast.error('Error loading checkout', {
                description: 'Failed to process checkout file. Please try again.',
            });
            setIsButtonLoading(false);
        }
    };
    return (
        <div className="py-6 mt-4 flex flex-1 flex-col gap-4 min-h-[22rem]">
            <p className="text-sm md:text-base text-white font-roboto font-normal tracking-wide">
                Upload your previous checkout file to continue where you left off.
            </p>

            <div className="flex flex-col gap-4">
                <label htmlFor="checkout-file" className="cursor-pointer">
                    <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-400 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-2 text-gray-500" />
                            <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">Click to upload</span> your checkout file
                            </p>
                            <p className="text-xs text-gray-500">TXT files only</p>
                        </div>
                    </div>
                    <input
                        id="checkout-file"
                        type="file"
                        accept=".txt"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                </label>

                {parseError && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {parseError}
                    </div>
                )}

                {checkoutData && (
                    <div className="p-4 bg-primary/10 rounded-lg">
                        {/* <h3 className="text-lg text-white font-azbuka tracking-normal mb-2">
                            Checkout Preview
                        </h3> */}

                        <div className="flex gap-3 items-center">
                            {/* Image section */}
                            {checkoutData.image && checkoutData.image !== 'N/A' ? (
                                <div className="relative w-40 h-40 md:w-32 md:h-32 flex-shrink-0">
                                    <Image
                                        src={checkoutData.image}
                                        alt={checkoutData.title}
                                        fill
                                        className="rounded-md object-cover"
                                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                            // Hide image on error
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-300 rounded-md flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-8 h-8 text-gray-500" />
                                </div>
                            )}

                            {/* Song details */}
                            <div className="flex-1 min-w-0">
                                <h4 className="text-lg text-white font-azbuka tracking-normal truncate">
                                    {checkoutData.title}
                                </h4>
                                <p className="text-sm text-white/80 text-muted font-roboto tracking-wide truncate">
                                    by {checkoutData.artist}
                                </p>
                                <p className="text-sm text-white/60 font-roboto mt-2">
                                    ({checkoutData.changedWords.length} word{checkoutData.changedWords.length > 1 ? 's' : ''} modified)
                                </p>
                                {checkoutData.generatedOn && (
                                    <p className="text-xs text-white/60 font-roboto">
                                        Generated: {checkoutData.generatedOn}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {checkoutData && (
                <div className="flex flex-row py-4">
                    <button
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal 
                            transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none 
                            disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none 
                            [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground 
                            hover:bg-primary/90 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 
                            active:bg-primary/75 active:ring-0 h-10 px-5 rounded-md ml-auto text-sm md:text-base"
                        type="button"
                        disabled={isButtonLoading}
                        onClick={handleLoadCheckout}
                    >
                        {isButtonLoading ? "Loading..." : "Next"}
                        {!isButtonLoading && <ChevronRight className="-mr-1" />}
                    </button>
                </div>
            )}
        </div>
    );
};

// Main component
export default function LyricChangerPage() {
    useEffect(() => {
        localStorage.clear();
    }, []); // Empty dependency array ensures this runs only once on mount

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [currentStep, setCurrentStep] = useState(1);

    const steps: StepProps[] = [
        { step: 1, label: "Choose A Song", isActive: currentStep === 1, isComplete: currentStep > 1 },
        { step: 2, label: "Change Lyrics", isActive: currentStep === 2, isComplete: currentStep > 2 },
        { step: 3, label: "Review Order", isActive: currentStep === 3, isComplete: false },
    ];

    return (
        <main className="min-h-0 w-full">
            <div className="w-full min-h-full">
                <section className="mx-auto w-full max-w-[1280px] flex flex-col space-y-4 px-6 sm:px-12 md:px-16 lg:px-32 xl:px-40 2xl:px-52">
                    {/* Header/Nav */}
                    <nav className="w-full bg-transparent px-4 pb-4">
                        {/* <div className="container mx-auto flex justify-end"> */}
                        {/* <SignInToSaveButton /> */}
                        {/* </div> */}
                    </nav>

                    {/* Step Indicators */}
                    <div className="flex flex-col space-y-4 md:space-y-6 pointer-events-none">
                        <section className="flex items-center gap-2">
                            {steps.map((step, index) => (
                                <React.Fragment key={step.step}>
                                    <StepIndicator
                                        step={step.step}
                                        label={step.label}
                                        isActive={currentStep === step.step}
                                        isComplete={currentStep > step.step}
                                    />
                                    {index < steps.length - 1 && (
                                        <StepDivider isActive={currentStep > index + 1} />
                                    )}
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
                                <Tabs.List className="h-12 my-2 -mb-3 flex w-full items-center justify-center text-muted-foreground bg-transparent">
                                    <div className="tab-container">
                                        <Tabs.Trigger
                                            value="search"
                                            className="tab-trigger inline-flex h-11 items-center justify-center px-3 py-1.5 
            font-medium focus-visible:outline-none disabled:pointer-events-none 
            disabled:opacity-50 text-xs md:text-sm whitespace-nowrap"
                                        >
                                            <Search className="mr-1.5 size-4 max-[380px]:hidden md:size-5 flex-shrink-0" />
                                            Quick Search
                                        </Tabs.Trigger>

                                        <Tabs.Trigger
                                            value="manual"
                                            className="tab-trigger inline-flex h-11 items-center justify-center px-3 py-1.5 
            font-medium focus-visible:outline-none disabled:pointer-events-none 
            disabled:opacity-50 text-xs md:text-sm whitespace-nowrap"
                                        >
                                            <TextSelect className="mr-1.5 size-4 max-[380px]:hidden md:size-5 flex-shrink-0" />
                                            Manual Entry
                                        </Tabs.Trigger>

                                        <Tabs.Trigger
                                            value="checkout"
                                            className="tab-trigger inline-flex h-11 items-center justify-center px-3 py-1.5 
            font-medium focus-visible:outline-none disabled:pointer-events-none 
            disabled:opacity-50 text-xs md:text-sm whitespace-nowrap"
                                        >
                                            <ShoppingCart className="mr-1.5 size-4 max-[380px]:hidden md:size-5 flex-shrink-0" />
                                            Load Checkout
                                        </Tabs.Trigger>
                                    </div>
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

                                <Tabs.Content
                                    value="checkout"
                                    className="ring-offset-foundation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 data-[state=inactive]:hidden"
                                >
                                    <LoadCheckoutPanel />
                                </Tabs.Content>
                            </Tabs.Root>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}