"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, TicketPercent } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';
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
    hasChanged: boolean;
    originalWord: string;
    newWord?: string; // Optional, for cases like deletions
    originalIndex?: number; // Optional, useful for inserting deletion symbols
};

type LyricLine = {
    id: number;
    original: string;
    modified: string;
    markedText?: string; // Optional, since it may not always be present
    wordChanges: WordChange[];
};

type ProductOption = {
    id: string;
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    isSelected: boolean;
    type: 'delivery' | 'addon';
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

function ReviewPageContent() {
    // Get URL parameters
    const searchParams = useSearchParams();
    const songId = searchParams.get('id');
    const songTitle = searchParams.get('title');
    const songArtist = searchParams.get('artist');
    const songUrl = searchParams.get('url');
    const isManualEntry = searchParams.get('manualEntry') === 'true';

    // State definitions
    const [currentStep, setCurrentStep] = useState(3);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const lyrics: LyricLine[] = [];
    const [formValues, setFormValues] = useState({
        songUrl: songUrl || '',
        lyrics: '',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Product options with security improvements
    const [productOptions, setProductOptions] = useState<ProductOption[]>([
        // Delivery options
        {
            id: "gid://shopify/ProductVariant/50091649270053",
            title: "Standard Delivery",
            description: "5 business days",
            price: 149.95,
            originalPrice: 60.0,
            isSelected: true,
            type: 'delivery'
        },
        {
            id: "gid://shopify/ProductVariant/50091649302821",
            title: "Rush Delivery",
            description: "Rush - 1 business day",
            price: 199.95,
            originalPrice: 60.0,
            isSelected: false,
            type: 'delivery'
        },
    ]);

    // Load product data from the server
    useEffect(() => {
        // Fetch product data from API instead of relying on URL parameters
        const fetchProductData = async () => {
            setIsLoading(true);
            try {
                // In a real implementation, you'd fetch this data from your server
                // const response = await fetch('/api/products');
                // const data = await response.json();
                // setProductOptions(data.products);

                // For now, we're using the initial state
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to fetch product data:', error);
                toast.error('Failed to load product options');
                setIsLoading(false);
            }
        };

        // Load the lyrics information from localStorage or API
        const loadLyrics = async () => {
            try {
                if (isManualEntry) {
                    const savedLyrics = localStorage.getItem('manualEntryLyrics');
                    if (savedLyrics) {
                        // Process the lyrics
                        setFormValues(prev => ({ ...prev, lyrics: savedLyrics }));

                        // For a real implementation, you would parse the lyrics into lines here
                        // const parsedLines = parseLyrics(savedLyrics);
                        // setLyrics(parsedLines);
                    }
                } else if (songId) {
                    // Fetch lyrics data from your API for non-manual entries
                    // const response = await fetch(`/api/songs/${songId}`);
                    // const data = await response.json();
                    // setLyrics(data.lyrics);
                    // setOriginalLyricsText(data.originalText);
                }
            } catch (error) {
                console.error('Failed to load lyrics:', error);
                toast.error('Failed to load lyrics data');
            }
        };

        fetchProductData();
        loadLyrics();
    }, [songId, isManualEntry]);

    // Toggle product selection
    const toggleProductSelection = (productId: string) => {
        setProductOptions(prevOptions => {
            const updatedOptions = [...prevOptions];
            const productIndex = updatedOptions.findIndex(p => p.id === productId);

            if (productIndex === -1) return prevOptions;

            const product = updatedOptions[productIndex];

            // If it's a delivery option, deselect all other delivery options first
            if (product.type === 'delivery') {
                updatedOptions.forEach((p, i) => {
                    if (p.type === 'delivery') {
                        updatedOptions[i] = { ...p, isSelected: false };
                    }
                });
            }

            // Toggle the selected product
            updatedOptions[productIndex] = {
                ...product,
                isSelected: !product.isSelected
            };

            return updatedOptions;
        });
    };

    // Calculate total price
    const calculateTotal = (): number => {
        return productOptions
            .filter(product => product.isSelected)
            .reduce((total, product) => total + product.price, 0);
    };

    const validateForm = () => {
        const errors: Record<string, string> = {};
        // eslint-disable-next-line prefer-const
        let isValid = true;

        setFormErrors(errors);
        return isValid;
    };

    // Check if any lyric has been modified
    const hasLyricChanges = (): boolean => {
        return lyrics.some((line) => line.modified !== line.original);
    };

    // Prepare cart items for Shopify checkout
    const prepareCartItems = () => {
        return productOptions
            .filter(product => product.isSelected)
            .map(product => ({
                id: product.id,
                quantity: 1
            }));
    };

    // Handle form submission and checkout
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if at least one lyric has been modified
        if (!hasLyricChanges() && lyrics.length > 0) {
            toast.error('No changes made', {
                description: 'Please modify at least one lyric before proceeding.',
            });
            return;
        }

        if (validateForm()) {
            setIsLoading(true);

            try {
                // Store lyrics data securely in your database or session
                // Instead of just putting it in localStorage which is insecure
                const lyricsData = {
                    songId,
                    songTitle,
                    songArtist,
                    songUrl: formValues.songUrl,
                    lyrics: lyrics.length > 0 ? lyrics : formValues.lyrics,
                    cartItems: prepareCartItems()
                };

                // Make a request to your server to create a secure checkout session
                const response = await fetch('/api/create-checkout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(lyricsData),
                });

                if (!response.ok) {
                    throw new Error('Failed to create checkout session');
                }

                const { checkoutUrl } = await response.json();

                // Redirect to the Shopify checkout page
                window.location.href = checkoutUrl;

            } catch (error) {
                console.error('Checkout error:', error);
                toast.error('Checkout failed', {
                    description: 'There was a problem processing your order. Please try again.',
                });
                setIsLoading(false);
            }
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
        { step: 2, label: "Change The Lyrics", isActive: currentStep === 2, isComplete: true },
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
                                Select Delivery Options
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
                                {/* Go back with all the state data */}
                                <Link href="/change-lyrics" className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-[1.5px] bg-white hover:bg-white/95 hover:ring-gray-200/65 focus-visible:ring focus-visible:ring-gray-200/65 active:bg-gray-200 active:ring-0  dark:hover:ring-gray-100/15 dark:focus-visible:ring-gray-100/15 dark:active:bg-gray-100/25 px-5 rounded-md text-sm md:text-base h-10 md:h-12">
                                    <ChevronLeft className="-ml-1 size-4 md:size-5" /> Back
                                </Link>
                                <button
                                    onClick={handleNextStep}
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/95 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 px-5 rounded-md ml-auto text-sm md:text-base h-10 md:h-12"
                                    type="button"
                                >
                                    Checkout <ChevronRight className="-mr-1 size-4 md:size-5" />
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
                                    <div className="flex flex-row gap-2 text-sm md:text-base md:items-center">
                                        <TicketPercent />
                                        <strong>You can add discount codes at checkout.</strong>
                                    </div>
                                </div>
                            )}

                            {/* Lyrics editor */}
                            {!isLoading && (
                                <div className="flex flex-col space-y-2 overflow-y-auto md:h-auto lg:h-full">
                                    <div className="space-y-2 my-6">
                                        {/* Delivery Options */}
                                        {productOptions
                                            .filter(product => product.type === 'delivery')
                                            .map((product) => (
                                                <label key={product.id} className={`mb-1 scroll-m-20 text-sm font-normal leading-normal tracking-normal peer-disabled:cursor-not-allowed peer-disabled:text-gray-500 peer-disabled:opacity-50 dark:text-white flex cursor-pointer items-center justify-between rounded-lg ${product.isSelected ? 'border-2 border-primary' : 'border'} bg-white p-4 hover:border-primary`}>
                                                    <div className="flex items-start gap-2 pr-2">
                                                        <button
                                                            type="button"
                                                            role="checkbox"
                                                            aria-checked={product.isSelected}
                                                            data-state={product.isSelected ? "checked" : "unchecked"}
                                                            value="on"
                                                            className="peer size-5 shrink-0 rounded-md border border-component-input bg-foundation shadow-md shadow-black/10 focus-visible:outline-none focus-visible:ring focus-visible:ring-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-foundation disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-foundation-secondary"
                                                            id={product.id}
                                                            onClick={() => toggleProductSelection(product.id)}
                                                        >
                                                            {product.isSelected && (
                                                                <span data-state="checked" className="flex items-center justify-center text-current" style={{ pointerEvents: 'none' }}>
                                                                    <Check className="size-5" />
                                                                </span>
                                                            )}
                                                        </button>
                                                        <div className="ml-1 space-y-0.5">
                                                            <span className="relative -top-0.5 font-medium text-blue-800 text-lg">{product.title}</span>
                                                            <p className="text-sm text-gray-500">{product.description}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 md:items-center">
                                                        <span className="font-bold">+${product.price.toFixed(2)}</span>
                                                        {product.originalPrice && (
                                                            <span className="font-bold text-gray-400 line-through">${product.originalPrice.toFixed(2)}</span>
                                                        )}
                                                    </div>
                                                </label>
                                            ))}
                                    </div>

                                    {/* Total Price */}
                                    <div className="text-foundation-foreground fixed bottom-0 left-0 right-0 w-full rounded-none border-t bg-primary md:relative md:rounded-md md:bg-primary/80">
                                        <div className="flex items-center justify-between p-4">
                                            <span className="font-medium text-white md:block">
                                                Total: <span className="font-bold">${calculateTotal().toFixed(2)}</span>
                                            </span>
                                            <button
                                                className="inline-flex items-center justify-center gap-2 font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 h-10 px-5 text-base rounded-md ml-auto whitespace-nowrap md:hidden"
                                                type="button"
                                                onClick={handleNextStep}
                                            >
                                                Checkout <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right ml-1 h-5 w-5"><path d="m9 18 6-6-6-6"></path></svg>
                                            </button>
                                        </div>
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
export default function ReviewPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        }>
            <ReviewPageContent />
        </Suspense>
    );
}