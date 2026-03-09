// src/app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import React from "react";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export type CheckoutData = {
    title: string; artist: string; image?: string; url: string;
    changedWords: string[]; modifiedLyrics: string; originalLyrics: string;
    lineChanges?: Array<{ lineNumber: number; original: string; modified: string; }>;
    specialRequests: string; deliveryPreference: string; totalCost: string; generatedOn: string;
}

interface Song { id: string; title: string; artist: string; image: string; url: string; }

const FAVORITE_SONGS: Song[] = [
    { id: 'fav-0', title: "Let's Go", artist: 'Jaden Bojsen, David Guetta & Sami Brielle', image: '', url: 'https://genius.com/Jaden-bojsen-david-guetta-and-sami-brielle-lets-go-lyrics' },
    { id: 'fav-1', title: "Gangsta's Paradise", artist: 'Coolio', image: 'https://images.genius.com/679deb5bb69326714e6975d71fcb4eff.600x597x1.png', url: 'https://genius.com/Coolio-gangstas-paradise-lyrics' },
    { id: 'fav-2', title: 'Bohemian Rhapsody', artist: 'Queen', image: 'https://images.genius.com/4afdd1c5de6f40a3908cb618bf3a77e9.1000x1000x1.png', url: 'https://genius.com/Queen-bohemian-rhapsody-lyrics' },
    { id: 'fav-3', title: 'Shape of You', artist: 'Ed Sheeran', image: 'https://images.genius.com/dc6172e8a26c3e9e6e88fcde7c37148c.1000x1000x1.png', url: 'https://genius.com/Ed-sheeran-shape-of-you-lyrics' },
];

export default function LyricChangerPage() {
    useEffect(() => { localStorage.clear(); }, []);

    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<Song[]>([]);
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [isButtonLoading, setIsButtonLoading] = useState(false);

    const searchGenius = async (query: string) => {
        if (!query.trim()) { setSearchResults([]); setShowResults(false); return; }
        setIsLoading(true); setShowResults(true);
        try {
            const res = await fetch(`/api/genius?q=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json();
            if (!Array.isArray(data)) throw new Error('bad response');
            setSearchResults(data);
        } catch (e) {
            setSearchResults([]);
            toast.error('Search failed', { description: `${e}` });
        } finally { setIsLoading(false); }
    };

    useEffect(() => {
        const t = setTimeout(() => searchGenius(searchQuery), 500);
        return () => clearTimeout(t);
    }, [searchQuery]);

    const handleSelectSong = (song: Song) => {
        setSelectedSong(song); setShowResults(false); setSearchQuery('');
    };

    const handleNext = () => {
        if (!selectedSong) { toast.error('Pick a song first'); return; }
        setIsButtonLoading(true);
        router.push(`/change-lyrics?id=${selectedSong.id}&title=${encodeURIComponent(selectedSong.title)}&artist=${encodeURIComponent(selectedSong.artist)}&image=${encodeURIComponent(selectedSong.image)}&url=${encodeURIComponent(selectedSong.url)}`);
    };

    return (
        <main className="h-screen overflow-y-auto bg-[#f0ede8] flex flex-col items-center px-6 md:px-16 lg:px-24 font-sans">

            {/* Step label */}
            <div className="mt-14 mb-12">
                <span className="text-sm font-bold tracking-[0.18em] uppercase text-[#8b1a1a] border border-[#8b1a1a]/25 rounded-full px-5 py-2 bg-[#8b1a1a]/5">
                    Step 1 of 3
                </span>
            </div>

            {/* Heading */}
            <div className="w-full max-w-3xl text-center mb-12">
                <h1 className="text-3xl md:text-4xl font-bold text-black tracking-tight leading-tight">
                    Choose a song
                </h1>
                <p className="mt-3 text-lg text-black/50">
                    Pick the song you&apos;d like to personalise.
                </p>
            </div>

            {/* Content */}
            <div className="w-full max-w-3xl flex flex-col gap-6">

                {/* Search — hide once song picked */}
                {!selectedSong && (
                    <div className="flex flex-col gap-3">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[#8b1a1a]/40" />
                            <input
                                className="w-full h-16 pl-12 pr-10 rounded-2xl bg-white border border-black/10 text-black placeholder:text-black/30 text-lg outline-none focus:border-black/20 transition-all shadow-sm"
                                type="text" placeholder="Search by artist or song title…"
                                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            />
                            {isLoading && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 size-4 border-2 border-black/15 border-t-black/50 rounded-full animate-spin" />
                            )}
                            {searchQuery && !isLoading && (
                                <button className="absolute right-4 top-1/2 -translate-y-1/2" onClick={() => { setSearchQuery(''); setShowResults(false); }} type="button">
                                    <X className="size-4 text-black/30 hover:text-black/60 transition-colors" />
                                </button>
                            )}
                        </div>

                        {showResults && searchResults.length > 0 && (
                            <div className="rounded-2xl bg-white border border-black/8 overflow-hidden shadow-lg max-h-72 overflow-y-auto">
                                {searchResults.map(song => (
                                    <button key={song.id} type="button" onClick={() => handleSelectSong(song)}
                                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-black/3 transition-colors border-b border-black/4 last:border-0 text-left">
                                        <div className="min-w-0">
                                            <p className="text-lg font-semibold text-black truncate">{song.title}</p>
                                            <p className="text-sm text-black/40 truncate">{song.artist}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Most requested */}
                        <div className="mt-4 p-5 rounded-2xl bg-[#8b1a1a]/4 border border-[#8b1a1a]/10">
                            <p className="text-sm font-bold tracking-[0.18em] uppercase text-[#8b1a1a] mb-4">Most Requested</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {FAVORITE_SONGS.map(song => (
                                    <button key={song.id} type="button" onClick={() => handleSelectSong(song)}
                                        className="text-left w-full px-5 py-4 rounded-2xl bg-white border border-black/8 hover:border-[#8b1a1a]/30 hover:shadow-sm transition-all group">
                                        <p className="text-base font-semibold text-black/80 group-hover:text-[#8b1a1a] transition-colors">{song.title}</p>
                                        <p className="text-xs text-black/35 mt-0.5">{song.artist}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Selected song */}
                {selectedSong && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-[#8b1a1a]/20 shadow-sm" style={{boxShadow: "0 0 0 4px rgba(139,26,26,0.04)"}}>
                            <div className="flex-1 min-w-0">
                                <p className="text-lg font-semibold text-black truncate">{selectedSong.title}</p>
                                <p className="text-base text-black/45 truncate">{selectedSong.artist}</p>
                            </div>
                            <button type="button" onClick={() => setSelectedSong(null)} className="p-2 rounded-xl hover:bg-black/5 transition-colors">
                                <X className="size-4 text-black/35" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom fixed Next button */}
            <div className="fixed bottom-0 left-0 right-0 flex justify-center px-5 pb-8 pt-4 bg-gradient-to-t from-[#f0ede8] via-[#f0ede8]/90 to-transparent">
                <button
                    type="button"
                    disabled={!selectedSong || isButtonLoading}
                    onClick={handleNext}
                    className="w-full max-w-3xl h-16 rounded-2xl bg-[#8b1a1a] text-white text-lg font-semibold disabled:opacity-25 disabled: hover:bg-[#7a1616] transition-all shadow-lg"
                >
                    {isButtonLoading ? 'Loading…' : 'Next'}
                </button>
            </div>

            {/* Spacer so content isn't hidden behind fixed button */}
            
                    <div className="h-28" />
        </main>
    );
}
