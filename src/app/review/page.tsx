// src/app/review/page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, PackageCheck } from 'lucide-react';
import React from "react";
import { toast } from "sonner";
import { getDistinctChangedWords } from '../change-lyrics/utils';

type ProductOption = {
    id: string;
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    isSelected: boolean;
    type: "delivery" | "addon";
};

export type LyricLine = {
    id: number;
    original: string;
    modified: string;
    markedText?: string;
    wordChanges: unknown[];
};

function OrderReviewPageContent() {
    const router = useRouter();
    const [songTitle, setSongTitle] = useState("");
    const [songArtist, setSongArtist] = useState("");
    const [songUrl, setSongUrl] = useState("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [lyricsData, setLyricsData] = useState<LyricLine[]>([]);
    const [cost, setCost] = useState(0);
    const [specialRequests, setSpecialRequests] = useState("");
    const [productOptions, setProductOptions] = useState<ProductOption[]>([
        { id: "delivery-standard", title: "Standard Delivery", description: "2–7 business days", price: 0, isSelected: true, type: "delivery" },
        { id: "delivery-rush", title: "Rush Delivery", description: "1 business day", price: 15, originalPrice: 20, isSelected: false, type: "delivery" },
    ]);

    const lyrics = useMemo(() => lyricsData.filter(line => line.original !== line.modified), [lyricsData]);
    const distinctChangedWords = useMemo(() => getDistinctChangedWords(lyricsData), [lyricsData]);

    useEffect(() => {
        try {
            setSongTitle(localStorage.getItem("songTitle") || "");
            setSongArtist(localStorage.getItem("songArtist") || "");
            setSongUrl(localStorage.getItem("songUrl") || "");
            setLyricsData(JSON.parse(localStorage.getItem("lyrics") || "[]"));
            setCost(parseFloat(localStorage.getItem("cost") || "0"));
            setSpecialRequests(localStorage.getItem("specialRequests") || "");
        } catch (error) {
            console.error("Error loading from localStorage:", error);
            toast.error("Failed to load order data");
        }
    }, []);

    const toggleProductSelection = (productId: string) => {
        setProductOptions(prev => prev.map(p => {
            if (p.type === "delivery") return { ...p, isSelected: p.id === productId };
            return p;
        }));
    };

    const calculateTotal = (): number => {
        const deliveryCost = productOptions.filter(p => p.isSelected).reduce((sum, p) => sum + p.price, 0);
        return cost + deliveryCost;
    };

    const handleCheckout = async () => {
        setIsLoading(true);

        if (distinctChangedWords.length < 1) {
            toast.error("No changes detected", { description: "Modify at least one word before checking out." });
            setIsLoading(false); return;
        }
        if (!songTitle && !songArtist && !songUrl) {
            toast.error("Missing song info", { description: "Go back and select a song." });
            setIsLoading(false); return;
        }
        const wordCount = specialRequests ? specialRequests.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
        if (specialRequests && wordCount > 100) {
            toast.error("Special requests too long", { description: `Max 100 words (${wordCount} used).` });
            setIsLoading(false); return;
        }

        try {
            const sessionId = localStorage.getItem("sessionId") || Math.random().toString(36).substring(2, 15);
            localStorage.setItem("sessionId", sessionId);
            const deliveryType = productOptions.find(p => p.isSelected && p.type === "delivery")?.id === "delivery-rush" ? "rush" : "standard";
            const lyricsChanges = lyrics.filter(l => l.modified !== l.original).map(l => ({ id: l.id, original: l.original, modified: l.modified }));

            const orderData = {
                sessionId, price: calculateTotal(), numWordChanged: distinctChangedWords.length,
                wordChanged: distinctChangedWords, songName: songTitle || undefined,
                artist: songArtist || undefined, songUrl: songUrl || undefined,
                deliveryType, lyrics: lyricsChanges, specialRequests,
            };

            const response = await fetch("/api/shopify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orderData) });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    try {
                        if (window.top && window.top !== window) window.top.location.href = result.data.invoiceUrl;
                        else window.parent.location.href = result.data.invoiceUrl;
                    } catch { window.location.href = result.data.invoiceUrl; }
                    return;
                } else {
                    toast.error("Checkout error", { description: result.userMessage || "Failed to create order" });
                    throw new Error(result.userMessage);
                }
            } else {
                const errorText = await response.text();
                toast.error("Server error", { description: errorText });
                throw new Error(`${response.status}`);
            }
        } catch (error) {
            console.error("Checkout error:", error);
            toast.error("Checkout failed", { description: error instanceof Error ? error.message : String(error) });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#f0ede8] font-sans">

            {/* Non-sticky step badge */}
            <div className="flex justify-center pt-10 pb-2">
                <span className="text-sm font-bold tracking-[0.18em] uppercase text-[#8b1a1a] border border-[#8b1a1a]/25 rounded-full px-5 py-2 bg-[#8b1a1a]/5">
                    Step 3 of 3
                </span>
            </div>

            {/* Sticky total bar */}
            <div className="sticky top-0 z-50 bg-[#f0ede8]/95 backdrop-blur-md border-b border-black/6">
                <div className="mx-auto max-w-5xl px-6 md:px-12 lg:px-20 h-16 flex items-center justify-center gap-3">
                    <p className="text-base font-semibold text-black/50">
                        {distinctChangedWords.length} {distinctChangedWords.length === 1 ? 'word' : 'words'} changed
                    </p>
                    <div className="w-px h-4 bg-black/10" />
                    <p className="text-base font-bold text-[#8b1a1a]">US${calculateTotal().toFixed(2)}</p>
                </div>
            </div>

            <div className="mx-auto max-w-5xl px-6 md:px-12 lg:px-20 pt-6 pb-14 flex flex-col gap-8 items-center">

                {/* Heading + song info */}
                <div className="w-full text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-black tracking-tight">Review your order</h1>
                    {(songTitle || songArtist) && (
                        <div className="flex items-center justify-center gap-3 mt-5 p-4 bg-white rounded-2xl border border-black/8 shadow-sm">
                            <div>
                                {songTitle && <p className="text-lg font-semibold text-black">{songTitle}</p>}
                                {songArtist && <p className="text-base text-black/45">{songArtist}</p>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-6 w-full">

                    {/* Lyric changes */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold tracking-[0.18em] uppercase text-[#8b1a1a]/70">
                                Lyric Changes
                            </p>
                            <span className="text-sm font-semibold text-black/40">
                                {distinctChangedWords.length} {distinctChangedWords.length === 1 ? 'word' : 'words'} modified
                            </span>
                        </div>

                        {lyrics.length > 0 ? (
                            <div className="bg-white rounded-2xl border border-black/8 shadow-sm overflow-hidden">
                                {/* Changed words summary */}
                                {distinctChangedWords.length > 0 && (
                                    <div className="px-6 py-4 border-b border-black/5 bg-[#8b1a1a]/3">
                                        <p className="text-sm text-black/50 font-medium">
                                            Modified words: <span className="text-[#8b1a1a] font-semibold">{distinctChangedWords.join(', ')}</span>
                                        </p>
                                    </div>
                                )}
                                {/* Lines table */}
                                <div className="divide-y divide-black/5">
                                    {lyrics.filter(l => l.modified !== l.original).map(line => (
                                        <div key={line.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-start gap-3">
                                            <span className="text-xs font-bold text-black/25 w-12 flex-shrink-0 pt-0.5">#{line.id}</span>
                                            <div className="flex-1 flex flex-col sm:flex-row gap-3 sm:gap-6">
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold tracking-wide uppercase text-black/30 mb-1">Original</p>
                                                    <p className="text-base text-black/60 leading-snug">{line.original}</p>
                                                </div>
                                                <div className="hidden sm:flex items-center text-black/20">→</div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold tracking-wide uppercase text-[#8b1a1a]/50 mb-1">Modified</p>
                                                    <p className="text-base text-black leading-snug font-medium"
                                                        dangerouslySetInnerHTML={{ __html: line.markedText || line.modified }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-black/8 px-6 py-8 text-center">
                                <p className="text-base text-black/40">No lyric changes detected. Go back and modify some lyrics.</p>
                            </div>
                        )}
                    </div>

                    {/* Special requests */}
                    {specialRequests && (
                        <div className="flex flex-col gap-3">
                            <p className="text-sm font-bold tracking-[0.18em] uppercase text-[#8b1a1a]/70">Special Requests</p>
                            <div className="bg-white rounded-2xl border border-black/8 shadow-sm px-6 py-4">
                                <p className="text-base text-black/70 leading-relaxed">{specialRequests}</p>
                            </div>
                        </div>
                    )}

                    {/* Delivery options */}
                    <div className="flex flex-col gap-3">
                        <p className="text-sm font-bold tracking-[0.18em] uppercase text-[#8b1a1a]/70">Delivery</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            {productOptions.filter(p => p.type === "delivery").map(product => (
                                <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => toggleProductSelection(product.id)}
                                    className={`flex-1 text-left p-5 rounded-2xl border-2 transition-all ${
                                        product.isSelected
                                            ? 'border-[#8b1a1a] bg-[#8b1a1a]/4'
                                            : 'border-black/8 bg-white hover:border-black/20'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className={`text-base font-semibold mb-0.5 ${product.isSelected ? 'text-[#8b1a1a]' : 'text-black'}`}>
                                                {product.title}
                                            </p>
                                            <p className="text-sm text-black/45">{product.description}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            {product.price === 0 ? (
                                                <p className="text-base font-bold text-black/40">Free</p>
                                            ) : (
                                                <div>
                                                    <p className="text-base font-bold text-black">+US${product.price.toFixed(2)}</p>
                                                    {product.originalPrice && (
                                                        <p className="text-sm text-black/30 line-through">US${product.originalPrice.toFixed(2)}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {product.isSelected && (
                                        <div className="mt-3 flex items-center gap-1.5">
                                            <div className="size-4 rounded-full bg-[#8b1a1a] flex items-center justify-center">
                                                <Check className="size-2.5 text-white" strokeWidth={3} />
                                            </div>
                                            <span className="text-xs font-semibold text-[#8b1a1a]">Selected</span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* Fixed bottom bar */}
            <div className="fixed bottom-0 left-0 right-0 pointer-events-none">
                <div className="mx-auto max-w-5xl px-6 md:px-12 lg:px-20 pb-8 pt-4 bg-gradient-to-t from-[#f0ede8] via-[#f0ede8]/95 to-transparent flex flex-col gap-2 pointer-events-auto">
                    <div className="flex gap-3">
                        <a href="/change-lyrics"
                            className="h-14 px-6 rounded-2xl border border-black/12 bg-[#f0ede8] text-base font-semibold text-black/50 hover:text-black hover:border-black/25 transition-all flex items-center justify-center">
                            ← Back
                        </a>
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={handleCheckout}
                            className="flex-1 h-14 rounded-2xl bg-[#8b1a1a] text-white text-lg font-semibold hover:bg-[#7a1616] disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-md"
                        >
                            {isLoading ? 'Processing…' : <>
                                <PackageCheck className="size-5" />
                                Checkout — <span className="font-bold">US${calculateTotal().toFixed(2)}</span>
                                <ChevronRight className="size-4" />
                            </>}
                        </button>
                    </div>
                </div>
            </div>

            <div className="h-28" />
        </main>
    );
}

export default function ReviewPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen bg-[#f0ede8]">
                <div className="w-8 h-8 border-2 border-black/10 border-t-black/50 rounded-full animate-spin" />
            </div>
        }>
            <OrderReviewPageContent />
        </Suspense>
    );
}
