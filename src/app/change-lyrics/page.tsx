// src/app/change-lyrics/page.tsx
"use client";

import { useState, useEffect, Suspense, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Info, ChevronRight, Eraser, RotateCcw } from 'lucide-react';
import React from 'react';
import LyricsEditor from '@/components/LyricsEditor';
import { toast } from 'sonner';
import { handleReplaceAll, LyricLine, getDistinctChangedWords, generateLyricsData, CheckoutData, reconstructLyricsFromCheckout } from './utils';
import { ExternalLyricsResponse } from '../api/lyrics/route';

function ChangeLyricsPageContent() {
    const searchParams = useSearchParams();
    const [songId, setSongId] = useState<string | null>(searchParams.get('id'));
    const [songTitle, setSongTitle] = useState<string | null>(searchParams.get('title'));
    const [songArtist, setSongArtist] = useState<string | null>(searchParams.get('artist'));
    const [songImage, setSongImage] = useState<string | null>(searchParams.get('image'));
    const [songUrl, setSongUrl] = useState<string | null>(searchParams.get('url'));
    const isManualEntry = searchParams.get('manualEntry') === 'true';
    const router = useRouter();

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingButton, setLoadingButton] = useState<'review' | null>(null);
    const [originalLyricsText, setOriginalLyricsText] = useState<string>('');
    const [isError, setIsError] = useState<boolean>(false);
    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [specialRequests, setSpecialRequests] = useState('');
    const [replaceTerm, setReplaceTerm] = useState('');
    const [replaceWith, setReplaceWith] = useState('');
    const [formValues, setFormValues] = useState({ songUrl: songUrl || '', lyrics: '' });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [, setDistinctChangedWords] = useState<string[]>([]);
    const [, setHasFetchedLyrics] = useState(false);
    const [fetchState, setFetchState] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');
    const fetchInProgressRef = useRef(false);
    const hasInitializedRef = useRef(false);
    const [isStateRestored, setIsStateRestored] = useState(false);
    const [cost, setCost] = useState(0);

    const calculateCost = (wordChanges: number): number => {
        if (wordChanges <= 0) return 0;
        if (wordChanges <= 3) return 45;
        if (wordChanges <= 10) return 85;
        if (wordChanges <= 20) return 125;
        return 165;
    };

    const totalWordChanges = useMemo(() => {
        const dcw = getDistinctChangedWords(lyrics);
        setDistinctChangedWords(dcw);
        return dcw.length;
    }, [lyrics]);

    useEffect(() => {
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
            } catch (error) { console.error(error); }
        }
    }, [songArtist, songId, songImage, songTitle]);

    useEffect(() => { setCost(calculateCost(totalWordChanges)); setIsError(false); }, [totalWordChanges]);

    useEffect(() => {
        if (isStateRestored) return;
        try {
            const savedLyrics = localStorage.getItem('lyrics');
            const savedFormValues = localStorage.getItem('formValues');
            const savedRequests = localStorage.getItem('specialRequests');
            const savedCost = localStorage.getItem('cost');
            if (savedLyrics) {
                const parsedLyrics = JSON.parse(savedLyrics);
                setLyrics(parsedLyrics);
                setFetchState('success');
                setHasFetchedLyrics(true);
                setHistory([localStorage.getItem('manualEntryLyrics') || parsedLyrics.map((l: LyricLine) => l.original).join('\n')]);
            }
            if (savedFormValues) {
                const parsedFormValues = JSON.parse(savedFormValues);
                setFormValues(parsedFormValues);
                const absoluteOriginal = localStorage.getItem('originalLyricsText');
                if (absoluteOriginal) setOriginalLyricsText(absoluteOriginal);
                else if (parsedFormValues.lyrics) setOriginalLyricsText(parsedFormValues.lyrics);
            }
            if (savedRequests) setSpecialRequests(savedRequests);
            if (savedCost) setCost(parseFloat(savedCost));
            setIsStateRestored(true);
        } catch (error) {
            console.error(error);
            toast.error('Failed to restore previous changes');
            setIsStateRestored(true);
        }
    }, [isStateRestored]);

    useEffect(() => {
        if (!isStateRestored) return;
        const loadCheckout = searchParams.get('loadCheckout') === 'true';
        if (!loadCheckout) return;
        try {
            const checkoutDataStr = localStorage.getItem('checkoutData');
            if (checkoutDataStr) {
                const parsedCheckoutData: CheckoutData = JSON.parse(checkoutDataStr);
                localStorage.setItem('isCheckoutMode', 'true');
                if (!songTitle) setSongTitle(parsedCheckoutData.title);
                if (!songArtist) setSongArtist(parsedCheckoutData.artist);
                if (!songUrl) setSongUrl(parsedCheckoutData.url);
                if (!songImage && parsedCheckoutData.image) setSongImage(parsedCheckoutData.image);
                setSpecialRequests(parsedCheckoutData.specialRequests === 'None' ? '' : parsedCheckoutData.specialRequests);
                setOriginalLyricsText(parsedCheckoutData.originalLyrics || '');
                setLyrics(reconstructLyricsFromCheckout(parsedCheckoutData.originalLyrics || '', parsedCheckoutData));
                setFormValues(prev => ({ ...prev, lyrics: parsedCheckoutData.originalLyrics || '' }));
                setFetchState('success');
                setHasFetchedLyrics(true);
                localStorage.removeItem('checkoutData');
                setIsLoading(false);
            } else {
                setFormErrors(prev => ({ ...prev, general: 'No checkout data found.' }));
                setIsLoading(false); setFetchState('error');
            }
        } catch (error) { console.error(error); setFetchState('error'); }
    }, [searchParams, songTitle, songArtist, songUrl, songImage, isStateRestored]);

    useEffect(() => {
        if (!isStateRestored || !isManualEntry || fetchState === 'success') return;
        try {
            const storedLyrics = localStorage.getItem('manualEntryLyrics');
            if (storedLyrics) {
                setOriginalLyricsText(storedLyrics);
                localStorage.setItem('originalLyricsText', storedLyrics);
                setLyrics(generateLyricsData(storedLyrics));
                setFormValues(prev => ({ ...prev, lyrics: storedLyrics }));
                setFetchState('success');
                setHasFetchedLyrics(true);
            } else {
                setFormErrors(prev => ({ ...prev, general: 'No lyrics found for manual entry.' }));
                setFetchState('error');
            }
        } catch (error) { console.error(error); setFetchState('error'); }
        finally { setIsLoading(false); }
    }, [isManualEntry, isStateRestored, fetchState]);

    const fetchLyricsByTitleAndArtist = useCallback(async (songTitle: string, songArtist: string) => {
        if (fetchState === 'fetching' || fetchInProgressRef.current) return;
        fetchInProgressRef.current = true;
        setFetchState('fetching');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort(); setIsLoading(false); fetchInProgressRef.current = false;
            setFetchState('error');
            toast.error('Request timed out. Please try again.');
        }, 20000);
        try {
            setIsLoading(true);
            const slug = songUrl ? songUrl.replace("https://genius.com/", "").replace(/\/$/, "") : "";
            const params = new URLSearchParams({ title: songTitle, artist: songArtist, slug });
            const response = await fetch(`/api/lyrics?${params.toString()}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) {
                toast.error(response.status === 404 ? 'Lyrics not found' : `Error: ${response.statusText}`);
                setIsError(true); setFetchState('error');
                throw new Error(`API error: ${response.status}`);
            }
            const data: ExternalLyricsResponse = await response.json();
            if (data.lyrics) {
                setOriginalLyricsText(data.lyrics);
                localStorage.setItem('originalLyricsText', data.lyrics);
                setLyrics(generateLyricsData(data.lyrics));
                setFormValues(prev => ({ ...prev, lyrics: data.lyrics }));
                setHasFetchedLyrics(true);
                setFetchState('success');
                setHistory([data.lyrics]);
            } else {
                setFormErrors(prev => ({ ...prev, general: 'Lyrics not found' }));
                setFetchState('error');
            }
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') { setFetchState('idle'); return; }
            setFormErrors(prev => ({ ...prev, general: `Error: ${error instanceof Error ? error.message : 'Unknown'}` }));
            setFetchState('error');
        } finally { setIsLoading(false); fetchInProgressRef.current = false; }
    }, [fetchState, songUrl]);

    useEffect(() => {
        if (!isStateRestored || hasInitializedRef.current) return;
        const loadCheckout = searchParams.get('loadCheckout') === 'true';
        const isCheckoutMode = localStorage.getItem('isCheckoutMode') === 'true';
        if (isManualEntry || loadCheckout || isCheckoutMode || fetchState === 'success') {
            hasInitializedRef.current = true; return;
        }
        if (songTitle && songArtist && fetchState === 'idle') {
            hasInitializedRef.current = true;
            fetchLyricsByTitleAndArtist(songTitle, songArtist);
        }
    }, [songTitle, songArtist, isManualEntry, searchParams, fetchState, fetchLyricsByTitleAndArtist, isStateRestored]);

    useEffect(() => { return () => { fetchInProgressRef.current = false; }; }, []);

    const validateForm = () => {
        const errors: Record<string, string> = {};
        let isValid = true;
        if (!formValues.lyrics.trim()) { errors.lyrics = 'Lyrics are required'; isValid = false; }
        else if (formValues.lyrics.trim().length < 50) { errors.lyrics = 'Too short — at least 50 characters.'; isValid = false; }
        const wordCount = specialRequests ? specialRequests.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
        if (specialRequests && wordCount > 100) { errors.specialRequests = `Too long — max 100 words (${wordCount} used).`; isValid = false; }
        setFormErrors(errors);
        return { isValid, errors };
    };

    const handleNextStep = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingButton('review');
        const hasChanges = lyrics.some(line => line.original !== line.modified);
        if (!hasChanges) {
            toast.error('No changes made yet', { description: 'Modify at least one lyric before continuing.' });
            setLoadingButton(null); return;
        }
        const { isValid, errors } = validateForm();
        if (!isValid) {
            toast.error('Please fix the errors', { description: Object.values(errors)[0] });
            setLoadingButton(null); return;
        }
        try {
            localStorage.setItem('lyrics', JSON.stringify(lyrics));
            localStorage.setItem('cost', cost.toString());
            localStorage.setItem('specialRequests', specialRequests);
            localStorage.setItem('formValues', JSON.stringify(formValues));
            localStorage.setItem('deliveryOption', 'Standard Delivery');
            if (songId) localStorage.setItem('songId', songId);
            if (songTitle) localStorage.setItem('songTitle', songTitle);
            if (songArtist) localStorage.setItem('songArtist', songArtist);
            if (songImage) localStorage.setItem('songImage', songImage);
            if (songUrl) localStorage.setItem('songUrl', songUrl);
            router.push('/review');
        } catch (err) {
            console.error(err);
            toast.error('Failed to save. Please try again.');
            setLoadingButton(null);
        }
    };

    const replaceAllTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const executeReplaceAll = useCallback(() => {
        if (replaceAllTimeoutRef.current) clearTimeout(replaceAllTimeoutRef.current);
        const cleanReplaceTerm = replaceTerm.trim();
        const cleanReplaceWith = replaceWith.trim();
        if (!cleanReplaceTerm) { toast.error('Enter a word to replace'); return; }
        replaceAllTimeoutRef.current = setTimeout(() => {
            handleReplaceAll(cleanReplaceTerm, cleanReplaceWith, setLyrics, setFormValues, toast);
            setReplaceTerm(''); setReplaceWith('');
        }, 100);
        setIsLoading(false);
    }, [replaceTerm, replaceWith]);

    const handleReplaceWithKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { e.preventDefault(); executeReplaceAll(); }
    }, [executeReplaceAll]);

    useEffect(() => { return () => { if (replaceAllTimeoutRef.current) clearTimeout(replaceAllTimeoutRef.current); }; }, []);

    const [history, setHistory] = useState<string[]>([]);
    const isInternalUpdate = useRef(false);

    useEffect(() => {
        if (isInternalUpdate.current) { isInternalUpdate.current = false; return; }
        const timeoutId = setTimeout(() => {
            setHistory(prev => {
                if (prev[prev.length - 1] === formValues.lyrics) return prev;
                return [...prev, formValues.lyrics].slice(-20);
            });
        }, 100);
        return () => clearTimeout(timeoutId);
    }, [formValues.lyrics]);

    const handleUndo = useCallback(() => {
        if (history.length <= 1) { toast.error("Already at original lyrics"); return; }
        const newHistory = [...history];
        newHistory.pop();
        const previousState = newHistory[newHistory.length - 1];
        isInternalUpdate.current = true;
        setFormValues(prev => ({ ...prev, lyrics: previousState }));
        setLyrics(prevLyrics => {
            const originalMap = new Map<string, LyricLine>();
            prevLyrics.forEach(line => originalMap.set(line.original, line));
            return previousState.split('\n').filter(l => l.trim().length > 0).map((lineText, i) => {
                const existing = originalMap.get(lineText) ?? prevLyrics[i];
                return { id: i + 1, original: existing?.original ?? lineText, modified: lineText, wordChanges: [] };
            });
        });
        setHistory(newHistory);
        toast.success("Reverted last change");
    }, [history]);

    return (
        <main className="h-screen overflow-y-auto bg-[#f0ede8]">

            {/* Non-sticky step badge */}
            {!isLoading && (
                <div className="flex justify-center pt-10 pb-2">
                    <span className="text-sm font-bold tracking-[0.18em] uppercase text-[#8b1a1a] border border-[#8b1a1a]/25 rounded-full px-5 py-2 bg-[#8b1a1a]/5">
                        Step 2 of 3
                    </span>
                </div>
            )}

            {/* Sticky word count + cost bar */}
            {!isLoading && (
                <div className="sticky top-0 z-50 bg-[#f0ede8]/95 backdrop-blur-md border-b border-black/6">
                    <div className="mx-auto max-w-5xl px-6 md:px-12 lg:px-20 h-16 flex items-center justify-center gap-3">
                        <div className="relative group flex items-center gap-3">
                            <p className="text-base font-semibold text-black/50">
                                {totalWordChanges} {totalWordChanges === 1 ? 'word' : 'words'} changed
                            </p>
                            <div className="w-px h-4 bg-black/10" />
                            <div className="flex items-center gap-1 cursor-help">
                                <p className="text-base font-bold text-[#8b1a1a]">US${cost}</p>
                                <Info className="size-4 text-[#8b1a1a]/50" />
                            </div>
                            {/* Pricing tooltip */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 p-4 bg-white border border-black/8 rounded-2xl shadow-xl opacity-0 translate-y-1 pointer-events-none transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 z-50 text-left">
                                <p className="text-sm font-bold text-black mb-3">Pricing tiers</p>
                                <ul className="space-y-1.5 text-sm text-black/60">
                                    {[['1–3 words', '45', totalWordChanges <= 3 && totalWordChanges > 0],
                                      ['4–10 words', '85', totalWordChanges > 3 && totalWordChanges <= 10],
                                      ['11–20 words', '125', totalWordChanges > 10 && totalWordChanges <= 20],
                                      ['20+ words', '165', totalWordChanges > 20]
                                    ].map(([label, price, active]) => (
                                        <li key={label as string} className={`flex justify-between px-2 py-1 rounded-lg ${active ? 'bg-[#8b1a1a]/8 text-[#8b1a1a] font-semibold' : ''}`}>
                                            <span>{label as string}</span><span>US${price as string}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mx-auto max-w-5xl px-6 md:px-12 lg:px-20 pt-6 pb-14 flex flex-col gap-10 items-center">

                {/* Page heading + song info */}
                <div className="w-full text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-black tracking-tight mb-2">Edit your lyrics</h1>
                    {(songTitle || songArtist) && (
                        <div className="flex items-center gap-3 mt-5 p-4 bg-white rounded-2xl border border-black/8 shadow-sm justify-center">
                            <div className="flex-1 min-w-0">
                                {songTitle && <p className="text-lg font-semibold text-black truncate">{songTitle}</p>}
                                {songArtist && <p className="text-base text-black/45 truncate">{songArtist}</p>}
                            </div>
                            {totalWordChanges > 0 && (
                                <div className="flex-shrink-0 px-3 py-1.5 rounded-full bg-[#8b1a1a]/10 border border-[#8b1a1a]/20">
                                    <p className="text-sm font-bold text-[#8b1a1a]">{totalWordChanges} {totalWordChanges === 1 ? 'word' : 'words'} changed</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-8 h-8 border-2 border-black/10 border-t-black/50 rounded-full animate-spin" />
                        <p className="text-base text-black/40">Fetching lyrics, this may take a moment…</p>
                    </div>
                )}

                {/* Editor */}
                {!isLoading && (
                    <div className="flex flex-col gap-6 w-full">

                        {/* Lyrics editor */}
                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-bold tracking-[0.18em] uppercase text-[#8b1a1a]/70">Lyrics</label>
                            <LyricsEditor
                                value={formValues.lyrics}
                                originalValue={originalLyricsText}
                                className="min-h-[520px] w-full rounded-2xl border border-black/10 bg-white px-6 py-5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/5 text-lg text-black leading-relaxed whitespace-pre-wrap overflow-y-auto shadow-sm text-center"
                                onChange={(newText) => {
                                    setFormValues(prev => ({ ...prev, lyrics: newText }));
                                    setLyrics(prevLyrics => {
                                        const originalMap = new Map<string, LyricLine>();
                                        prevLyrics.forEach(line => originalMap.set(line.original, line));
                                        return newText.split('\n').filter(l => l.trim().length > 0).map((lineText, i) => {
                                            const existing = originalMap.get(lineText) ?? prevLyrics[i];
                                            return { id: i + 1, original: existing?.original ?? lineText, modified: lineText, wordChanges: [] };
                                        });
                                    });
                                }}
                                onKeyDown={(e) => {
                                    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
                                }}
                            />


                        </div>

                        {/* Replace all */}
                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-bold tracking-[0.18em] uppercase text-[#8b1a1a]/70">Find & Replace</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input type="text" value={replaceTerm} onChange={e => setReplaceTerm(e.target.value)}
                                    placeholder="Word to replace…"
                                    className="flex-1 h-14 px-5 rounded-2xl border border-black/10 bg-white text-base text-black placeholder:text-black/25 focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-black/20 transition-all" />
                                <input type="text" value={replaceWith} onChange={e => setReplaceWith(e.target.value)}
                                    onKeyDown={handleReplaceWithKeyDown}
                                    placeholder="Replace with…"
                                    className="flex-1 h-14 px-5 rounded-2xl border border-black/10 bg-white text-base text-black placeholder:text-black/25 focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-black/20 transition-all" />
                                <button type="button" onClick={executeReplaceAll}
                                    className="h-14 px-7 rounded-2xl bg-[#8b1a1a] text-white text-base font-semibold hover:bg-[#7a1616] transition-colors whitespace-nowrap">
                                    Replace all
                                </button>
                            </div>
                        </div>

                        {/* Special requests */}
                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-bold tracking-[0.18em] uppercase text-[#8b1a1a]/70">Special Requests</label>
                            <textarea
                                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base text-black placeholder:text-black/25 focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-black/20 transition-all resize-none"
                                rows={5}
                                value={specialRequests}
                                onChange={e => setSpecialRequests(e.target.value)}
                                placeholder="Any special details — pronunciation notes, names, context, etc."
                            />
                            {formErrors.specialRequests && <p className="text-xs text-red-500">{formErrors.specialRequests}</p>}
                            <p className="text-sm text-black/30">
                                For names or unusual words, include phonetic spelling (e.g. Brisbane = Bris-bin).
                            </p>
                        </div>

                    </div>
                )}
            </div>

            {/* Fixed bottom bar — undo/reset + nav */}
            {!isLoading && !isError && (
                <div className="fixed bottom-0 left-0 right-0 pointer-events-none">
                    <div className="mx-auto max-w-5xl px-6 md:px-12 lg:px-20 pb-8 pt-4 bg-gradient-to-t from-[#f0ede8] via-[#f0ede8]/95 to-transparent flex flex-col gap-2 pointer-events-auto">
                        {/* Undo / Reset row */}
                        <div className="flex gap-2">
                            <button type="button" onClick={handleUndo} disabled={history.length <= 1}
                                className="flex-1 h-12 rounded-2xl border border-black/12 bg-white/80 backdrop-blur-sm text-base font-medium text-black/50 hover:text-black hover:border-black/20 disabled:opacity-25 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-sm">
                                <RotateCcw className="size-4" /> Undo
                            </button>
                            <button type="button"
                                onClick={() => {
                                    setFormValues(prev => ({ ...prev, lyrics: originalLyricsText }));
                                    setLyrics(generateLyricsData(originalLyricsText));
                                    toast.success("Reset to original lyrics");
                                }}
                                className="flex-1 h-12 rounded-2xl border border-black/12 bg-white/80 backdrop-blur-sm text-base font-medium text-black/50 hover:text-black hover:border-black/20 transition-all flex items-center justify-center gap-2 shadow-sm">
                                <Eraser className="size-4" /> Reset all
                            </button>
                        </div>
                        {/* Back + Review */}
                        <div className="flex gap-3">
                            <Link href="/"
                                className="h-14 px-6 rounded-2xl border border-black/12 bg-[#f0ede8] text-base font-semibold text-black/50 hover:text-black hover:border-black/25 transition-all flex items-center justify-center">
                                ← Back
                            </Link>
                            <button
                                type="button"
                                disabled={loadingButton !== null}
                                onClick={handleNextStep}
                                className="flex-1 h-14 rounded-2xl bg-[#8b1a1a] text-white text-lg font-semibold hover:bg-[#7a1616] disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 shadow-md"
                            >
                                {loadingButton === 'review' ? 'Processing…' : <>Review Order — <span className="font-bold">US${cost}</span> <ChevronRight className="size-4" /></>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Spacer for fixed button */}
            <div className="h-36" />
        </main>
    );
}

export default function ChangeLyricsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen bg-[#f0ede8]">
                <div className="w-8 h-8 border-2 border-black/10 border-t-black/50 rounded-full animate-spin" />
            </div>
        }>
            <ChangeLyricsPageContent />
        </Suspense>
    );
}
