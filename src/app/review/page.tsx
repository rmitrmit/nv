// src\app\review\page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, ShoppingCart } from 'lucide-react';
import React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Separator from "@radix-ui/react-separator";
import SignInToSaveButton from "@/components/SignInToSaveButton";
import { Toaster, toast } from "sonner";
import { StepIndicator, StepDivider, type StepProps } from "@/components/layouts/StepNavigation";
import BackButton from "@/components/BackButton";
import Image from "next/image";

// src/app/review/page.tsx

// Type definitions
type ProductOption = {
    id: string;
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    isSelected: boolean;
    type: "delivery" | "addon";
};

interface WordChange {
    originalWord: string;
    newWord: string;
    originalIndex: number;
    newIndex: number;
    hasChanged: boolean;
    isTransformation?: boolean;
    isDeletion?: boolean;
    isAddition?: boolean;
    isSubstitution?: boolean;
    isExplicitDeletion?: boolean;
}

export type LyricLine = {
    id: number;
    original: string;
    modified: string;
    markedText?: string;
    wordChanges: WordChange[];
};

function mergeAdjacentWordChanges(changes: WordChange[]): WordChange[] {
    if (!changes || changes.length === 0) return changes;
    const merged: WordChange[] = [];
    let i = 0;
    while (i < changes.length) {
        const current = changes[i];
        // Only merge adjacent deletion changes if they are not both explicitly generated.
        if (current.isDeletion && i < changes.length - 1) {
            const next = changes[i + 1];
            if (next.isDeletion && next.originalIndex === current.originalIndex + 1) {
                // If both changes come from an explicit deletion branch, do NOT merge them.
                if (current.isExplicitDeletion && next.isExplicitDeletion) {
                    merged.push(current);
                    i++; // Increment one by one so that explicit deletions remain separate.
                    continue;
                }
                // Otherwise, merge adjacent deletion changes.
                const mergedChange: WordChange = {
                    originalWord: current.originalWord + ' ' + next.originalWord,
                    newWord: current.newWord + ' ' + next.newWord,
                    originalIndex: current.originalIndex,
                    newIndex: current.newIndex,
                    hasChanged: true,
                    isDeletion: true,
                    isAddition: false,
                    isSubstitution: false,
                };
                merged.push(mergedChange);
                i += 2; // Skip the next item that was merged.
                continue;
            }
        }
        merged.push(current);
        i++;
    }
    return merged;
}

function containsCJK(text: string): boolean {
    return /[\u3000-\u303F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(text);
}

function OrderReviewPageContent() {
    const router = useRouter();
    const [songTitle, setSongTitle] = useState("");
    const [songArtist, setSongArtist] = useState("");
    const [songImage, setSongImage] = useState("");
    const [songUrl, setSongUrl] = useState("");
    const [currentStep, setCurrentStep] = useState(3);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [lyricsData, setLyricsData] = useState<LyricLine[]>([]);
    const [cost, setCost] = useState(0);
    const [specialRequests, setSpecialRequests] = useState("");
    const [productOptions, setProductOptions] = useState<ProductOption[]>([
        {
            id: "delivery-standard",
            title: "Standard Delivery",
            description: "2-7 business days",
            price: 0,
            isSelected: true,
            type: "delivery",
        },
        {
            id: "delivery-rush",
            title: "Rush Delivery",
            description: "1 business day",
            price: 15,
            originalPrice: 20,
            isSelected: false,
            type: "delivery",
        },
    ]);

    // Memoize processed lyrics from lyricsData.
    const lyrics = useMemo(() => {
        return lyricsData
            .map(line => {
                const countedPositions = new Set<number>();
                const filteredChanges = line.wordChanges.filter(change => {
                    if (!change.hasChanged) return false;
                    const originalWithoutPunctuation = (change.originalWord || '').replace(/[.,()[\]{}:;!?-]+/g, '');
                    const newWithoutPunctuation = (change.newWord || '').replace(/[.,()[\]{}:;!?-]+/g, '');
                    const isPunctuationChangeOnly =
                        originalWithoutPunctuation.toLowerCase() === newWithoutPunctuation.toLowerCase() &&
                        originalWithoutPunctuation.length > 0;
                    if (isPunctuationChangeOnly) return false;
                    if (change.originalWord) {
                        if (countedPositions.has(change.originalIndex)) return false;
                        countedPositions.add(change.originalIndex);
                    }
                    return true;
                });
                return { ...line, wordChanges: filteredChanges };
            })
            .filter(line => line.wordChanges.length > 0);
    }, [lyricsData]);

    // Compute distinct changed words
    const distinctChangedWords = useMemo(() => {
        // Helper function to normalize a word:
        // It removes punctuation (and the deletion marker "🗙") from the start and end, then converts to lowercase.
        const normalizeWord = (word: string): string => {
            return word
                .replace(/^[.,!?;:"'\[\]{}\(\)\-—_🗙]+|[.,!?;:"'\[\]{}\(\)\-—_]+$/g, "")
                .toLowerCase();
        };

        // Two sets: one for words added (or substituted) and one for words that only appear in deletion.
        const additions = new Set<string>();
        const deletions = new Set<string>();

        lyrics.forEach(line => {
            // Use merged changes for non-CJK; otherwise, use as-is.
            const changes = containsCJK(line.original)
                ? line.wordChanges
                : mergeAdjacentWordChanges(line.wordChanges);

            changes.forEach(change => {
                if (change.hasChanged) {
                    if (change.isSubstitution || change.isAddition) {
                        // Record addition/substitution words in a normalized way (without any prefix).
                        const newNorm = normalizeWord(change.newWord);
                        if (newNorm) {
                            additions.add(newNorm);
                        }
                    } else if (change.isDeletion) {
                        // Record deletions as normalized words.
                        const originalNorm = normalizeWord(change.originalWord);
                        if (originalNorm) {
                            deletions.add(originalNorm);
                        }
                    } else {
                        // Default fallback: treat as addition.
                        const fallbackNorm = normalizeWord(change.newWord);
                        if (fallbackNorm) {
                            additions.add(fallbackNorm);
                        }
                    }
                }
            });
        });

        // For deletions, if a word is found in the additions set,
        // that means the same word was added elsewhere, so we do not want to use the deletion marker.
        // We only want the "added" version (i.e. without the 🗙 prefix).
        const finalDeletions = new Set<string>();
        deletions.forEach(word => {
            if (!additions.has(word)) {
                finalDeletions.add(word);
            }
        });

        // Combine the results: words from additions, and for words that appear only as deletion,
        // prepend the "🗙" marker.
        const result = new Set<string>([...additions]);
        finalDeletions.forEach(word => {
            result.add(`🗙${word}`);
        });

        return Array.from(result);
    }, [lyrics]); // Dependencies: Only depend on lyrics

    // Load data from localStorage
    useEffect(() => {
        try {
            setSongTitle(localStorage.getItem("songTitle") || "");
            setSongArtist(localStorage.getItem("songArtist") || "");
            const storedImage = localStorage.getItem("songImage") || "";
            setSongImage(storedImage ? decodeURIComponent(storedImage) : "");
            setSongUrl(localStorage.getItem("songUrl") || "");
            const storedLyrics = JSON.parse(localStorage.getItem("lyrics") || "[]");
            const storedCost = parseFloat(localStorage.getItem("cost") || "0");
            const storedSpecialRequests = localStorage.getItem("specialRequests") || "";

            setLyricsData(storedLyrics); // ✅ Fixed the incorrect function name
            setCost(storedCost);
            setSpecialRequests(storedSpecialRequests);
        } catch (error) {
            console.error("Error loading from localStorage:", error);
            toast.error("Failed to load order data");
        }
    }, []);


    const toggleProductSelection = (productId: string) => {
        setProductOptions((prevOptions) => {
            const updatedOptions = [...prevOptions];
            const productIndex = updatedOptions.findIndex((p) => p.id === productId);
            if (productIndex === -1) return prevOptions;

            const product = updatedOptions[productIndex];
            if (product.type === "delivery") {
                updatedOptions.forEach((p, i) => {
                    if (p.type === "delivery") {
                        updatedOptions[i] = { ...p, isSelected: false };
                    }
                });
            }

            updatedOptions[productIndex] = { ...product, isSelected: !product.isSelected };
            return updatedOptions;
        });
    };

    const calculateTotal = (): number => {
        const deliveryCost = productOptions
            .filter((product) => product.isSelected)
            .reduce((total, product) => total + product.price, 0);
        return cost + deliveryCost;
    };

    const handleCheckout = async () => {
        setIsLoading(true);

        if (distinctChangedWords.length < 1) {
            toast.error("No significant changes detected", {
                description: "You must modify at least one word to proceed with checkout.",
            });
            setIsLoading(false);
            return;
        }

        if (lyrics.filter(line => line.modified !== line.original).length === 0) {
            toast.error("No lyrics changes detected", {
                description: "You need to modify at least one line of lyrics to place an order.",
            });
            setIsLoading(false);
            return;
        }

        if (!songTitle && !songArtist && !songUrl) {
            toast.error("Missing song information", {
                description: "Please go back and select a song before checkout.",
            });
            setIsLoading(false);
            return;
        }

        // Add special requests validation
        const MAX_WORDS = 100;
        const countWords = (text: string): number => {
            return text ? text.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
        };
        const specialRequestsWordCount = specialRequests ? countWords(specialRequests) : 0;

        if (specialRequests && specialRequestsWordCount > MAX_WORDS) {
            toast.error("Special Request is too long", {
                description: `Please limit your 'Special Request' to ${MAX_WORDS} words (currently ${specialRequestsWordCount} words).`,
            });
            setIsLoading(false);
            return;
        }

        try {
            const sessionId = localStorage.getItem("sessionId") || Math.random().toString(36).substring(2, 15);
            localStorage.setItem("sessionId", sessionId);

            const deliveryType = productOptions.find((p) => p.isSelected && p.type === "delivery")?.id === "delivery-rush" ? "rush" : "standard";

            const lyricsChanges = lyrics
                .filter(line => line.modified !== line.original)
                .map(line => ({
                    id: line.id,
                    original: line.original,
                    modified: line.modified,
                }));

            const orderData = {
                sessionId,
                price: calculateTotal(),
                numWordChanged: distinctChangedWords.length,
                wordChanged: distinctChangedWords,
                songName: songTitle || undefined,
                artist: songArtist || undefined,
                songImage: songImage || undefined,
                songUrl: songUrl || undefined,
                deliveryType,
                lyrics: lyricsChanges,
                specialRequests: specialRequests
            };

            const response = await fetch("/api/shopify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(orderData),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    try {
                        if (window.top && window.top !== window) {
                            window.top.location.href = result.data.invoiceUrl;
                        } else {
                            window.parent.location.href = result.data.invoiceUrl;
                        }
                    } catch {
                        window.location.href = result.data.invoiceUrl;
                    }
                    return;
                } else {
                    const userMessage = result.userMessage || "Failed to create order";
                    toast.error("Checkout error", { description: userMessage });
                    throw new Error(userMessage);
                }
            } else {
                const errorText = await response.text();
                const errorMessage = `Error ${response.status}: ${response.statusText}`;
                toast.error("Server error", { description: errorText || errorMessage });
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error("Checkout error:", error);
            toast.error("Checkout failed", {
                description: `There was a problem processing your order: ${error instanceof Error ? error.message : String(error)}`,
            });
        } finally {
            setIsLoading(false);
        }
    };


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
                            fontSize: "1.15rem",
                        },
                    }}
                />
                <section className="mx-auto w-full max-w-[1280px] flex flex-col space-y-4 px-6 sm:px-12 md:px-16 lg:px-32 xl:px-40 2xl:px-52">
                    <nav className="w-full bg-transparent px-4 pb-4">
                        <div className="container mx-auto flex justify-end">
                            <SignInToSaveButton />
                        </div>
                    </nav>

                    <Tabs.Root
                        value={`step-${currentStep}`}
                        className="flex flex-col space-y-4 md:space-y-6"
                        onValueChange={(value) => {
                            const step = parseInt(value.split("-")[1]);
                            if (step <= currentStep) {
                                setCurrentStep(step);
                                if (step === 2) router.push("/change-lyrics");
                                if (step === 1) router.push("/");
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
                                        <StepDivider isActive={index === 0 || currentStep > index + 1} />
                                    )}
                                </React.Fragment>
                            ))}
                        </Tabs.List>

                        <Tabs.Content value={`step-${currentStep}`} className="flex flex-1 flex-col space-y-2" style={{ opacity: 1 }}>
                            <h3 className="scroll-m-20 font-azbuka tracking-normal dark:text-white my-2 text-[22px] md:my-4 md:text-[28px] text-white duration-150 ease-in animate-in fade-in">
                                Review Your Order
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

                            <div className="flex flex-row items-center gap-2 py-0">
                                <BackButton href="/change-lyrics" />
                                <button
                                    onClick={handleCheckout}
                                    disabled={isLoading}
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/95 hover:ring-primary/50 focus-visible:ring focus-visible:ring-primary/50 active:bg-primary/75 active:ring-0 px-5 rounded-md ml-auto text-sm md:text-base h-10 md:h-12"
                                    type="button"
                                >
                                    {isLoading ? "Processing..." : "Checkout"} <ChevronRight className="-mr-1 size-4 md:size-5" />
                                </button>
                            </div>

                            <Separator.Root
                                className="shrink-0 dark:bg-gray-100/5 h-[1.5px] w-full my-3 md:my-4 bg-primary/10"
                                orientation="horizontal"
                            />
                            {/* Total Cost */}
                            <div className="text-foundation-foreground fixed bottom-0 left-0 right-0 w-full rounded-none border border-blue-300/50 bg-primary md:relative md:rounded-md md:bg-primary/80 mb-8 text-left text-white">
                                <div className="p-4 flex">
                                    <ShoppingCart className="w-6 h-6 text-white mr-3 ml-1" />
                                    <p className="font-medium text-white md:block">
                                        Total: <span className="font-bold text-xl">US${calculateTotal().toFixed(2)}</span>
                                    </p>
                                </div>
                            </div>

                            {isLoading && (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                                </div>
                            )}

                            {/* {!isLoading && (
                                <div className="relative w-full rounded-lg p-4 dark:border-gray-100/5 bg-primary/80 text-white/80" role="alert">
                                    <div className="flex flex-row gap-2 text-sm md:text-base md:items-center">
                                        <TicketPercent />
                                        <strong>You can add discount codes at checkout.</strong>
                                    </div>
                                </div>
                            )} */}

                            {!isLoading && (
                                <div className="flex flex-col space-y-2 overflow-y-auto md:h-auto lg:h-full">
                                    {/* Display Lyrics Summary */}
                                    <div className="space-y-2 my-4">
                                        <div className="pb-8 pt-4 px-4 bg-white">
                                            <h4 className="text-lg font-medium text-blue-800">Lyrics Changes ({distinctChangedWords.length} word{distinctChangedWords.length > 1 ? 's' : ''})</h4>
                                            {distinctChangedWords.length > 0 && (<p>&quot;{
                                                distinctChangedWords.map((word, index) => (
                                                    <span key={index} className='inline-block mr-1'>{word} {index != distinctChangedWords.length - 1 ? ', ' : ''}</span>
                                                ))
                                            }&quot;</p>)}
                                            {lyrics.filter(line => line.modified !== line.original).length > 0 ? (
                                                <div className="overflow-x-auto mt-2">
                                                    <table className="min-w-full border border-gray-200">
                                                        <thead className="bg-gray-100">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-sm font-medium text-primary border-b">Line #</th>
                                                                <th className="px-4 py-2 text-left text-sm font-medium text-primary border-b">Original</th>
                                                                <th className="px-4 py-2 text-left text-sm font-medium text-primary border-b">Modified</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {lyrics
                                                                .filter((line) => line.modified !== line.original)
                                                                .map((line) => (
                                                                    <tr key={line.id} className="odd:bg-white even:bg-gray-50">
                                                                        <td className="px-4 py-2 text-gray-500 font-mono border-b">{line.id}</td>
                                                                        <td className="px-4 py-2 text-gray-600 border-b">{line.original}</td>
                                                                        <td
                                                                            className="px-4 py-2 border-b"
                                                                            dangerouslySetInnerHTML={{
                                                                                __html: line.markedText || line.modified,
                                                                            }}
                                                                        />
                                                                    </tr>
                                                                ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-red-500 mt-2">No lyrics have been changed yet. Please go back to modify lyrics before checkout.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Special Requests */}
                                    {specialRequests && (
                                        <div className="p-4 my-8 bg-white rounded-lg">
                                            <h4 className="text-lg font-medium text-blue-800">Special Requests</h4>
                                            <p className="text-sm text-gray-600">{specialRequests}</p>
                                        </div>
                                    )}


                                    {/* Delivery Options */}
                                    <div className="space-y-2" style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
                                        {productOptions
                                            .filter((product) => product.type === "delivery")
                                            .map((product) => (
                                                <label
                                                    key={product.id}
                                                    className={`mb-1 scroll-m-20 text-sm font-normal leading-normal tracking-normal peer-disabled:cursor-not-allowed peer-disabled:text-gray-500 peer-disabled:opacity-50 dark:text-white flex cursor-pointer items-center justify-between rounded-lg ${product.isSelected ? "border-2 border-primary" : "border"} bg-white p-4 hover:border-primary`}
                                                >
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
                                                                <span data-state="checked" className="flex items-center justify-center text-current" style={{ pointerEvents: "none" }}>
                                                                    <Check className="size-5" />
                                                                </span>
                                                            )}
                                                        </button>
                                                        <div className="ml-1 space-y-0.5">
                                                            <span className="relative -top-0.5 font-medium text-blue-800 text-lg">{product.title}</span>
                                                            <p className="text-sm text-gray-500">{product.description}</p>
                                                        </div>
                                                    </div>
                                                    {product.originalPrice !== undefined && (
                                                        <div className="flex gap-2 md:items-center">
                                                            <span className="font-bold text-gray-700">+US${product.price.toFixed(2)}</span>

                                                            <span className="font-bold text-gray-400 line-through">
                                                                US${product.originalPrice?.toFixed(2) ?? "0.00"}
                                                            </span>
                                                        </div>
                                                    )}

                                                </label>
                                            ))}
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

export default function ReviewPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
            }
        >
            <OrderReviewPageContent />
        </Suspense>
    );
}