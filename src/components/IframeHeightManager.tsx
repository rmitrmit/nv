// src/components/IframeHeightManager.tsx
"use client";
import { useEffect, useRef, useCallback } from "react";

if (process.env.NEXT_PUBLIC_SHOP_ORIGINS == undefined) {
    throw new Error("Missing SHOP_ORIGINS environment variable");
}

const SHOP_ORIGINS = String(process.env.NEXT_PUBLIC_SHOP_ORIGINS).split(',');

// Performance constants
const HEIGHT_THRESHOLD = 5; // Only send updates if height changes by more than 5px
const DEBOUNCE_DELAY = 16; // ~60fps
const MUTATION_DEBOUNCE_DELAY = 100; // Longer delay for mutations

export default function IframeHeightManager() {
    const lastHeightRef = useRef<number>(0);
    const lastSentHeightRef = useRef<number>(0);
    const observerRef = useRef<ResizeObserver | null>(null);
    const mutationObserverRef = useRef<MutationObserver | null>(null);
    const isInitializedRef = useRef<boolean>(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const mutationDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const rafIdRef = useRef<number | null>(null);

    const isEmbeddedInShopify = useCallback(() => {
        if (typeof window === "undefined") return false;
        try {
            return window.parent !== window || window.top !== window;
        } catch (error) {
            console.error(`Error checking iframe status: ${error}`);
            return true;
        }
    }, []);

    const getDocumentHeight = useCallback(() => {
        if (typeof window === "undefined" || typeof document === "undefined") {
            return 400;
        }

        if (document.readyState === "loading") {
            return 400;
        }

        const mainContent = document.getElementById("main-content");
        if (mainContent) {
            return mainContent.scrollHeight + 150; // add 150px padding
        }

        const { body, documentElement: html } = document;

        // Optimized height calculation - check most reliable sources first
        return Math.max(
            body.scrollHeight,
            html.scrollHeight,
            body.offsetHeight,
            html.offsetHeight,
            200
        );
    }, []);

    const sendHeightToParent = useCallback((height: number, force = false) => {
        if (typeof window === "undefined") return;

        const previousHeight = lastSentHeightRef.current;
        const heightDiff = Math.abs(height - previousHeight);

        // Skip if height change is too small and not forced
        if (!force && heightDiff < HEIGHT_THRESHOLD) {
            return;
        }

        lastSentHeightRef.current = height;
        const isReduction = height < previousHeight;

        const message = {
            type: "iframe-height",
            height,
            timestamp: Date.now(),
            source: "IframeHeightManager",
            forceUpdate: isReduction,
            previousHeight,
            isReduction,
            heightDiff: height - previousHeight,
        };

        // Send immediately for reductions, slight delay for expansions to allow settling
        const delay = isReduction ? 0 : 8;

        setTimeout(() => {
            SHOP_ORIGINS.forEach((origin) => {
                try {
                    window.parent.postMessage(message, origin);
                } catch (error) {
                    // Silent fail for better performance
                }
            });
        }, delay);
    }, []);

    const debouncedHeightUpdate = useCallback((force = false) => {
        if (!isEmbeddedInShopify()) return;

        // Cancel previous RAF and timer
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
        }
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        rafIdRef.current = requestAnimationFrame(() => {
            const height = getDocumentHeight();

            // Cache height to avoid redundant calculations
            if (height === lastHeightRef.current && !force) {
                return;
            }

            lastHeightRef.current = height;
            sendHeightToParent(height, force);
        });
    }, [isEmbeddedInShopify, getDocumentHeight, sendHeightToParent]);

    const throttledMutationUpdate = useCallback(() => {
        if (mutationDebounceTimerRef.current) {
            clearTimeout(mutationDebounceTimerRef.current);
        }

        mutationDebounceTimerRef.current = setTimeout(() => {
            debouncedHeightUpdate();
        }, MUTATION_DEBOUNCE_DELAY);
    }, [debouncedHeightUpdate]);

    useEffect(() => {
        if (typeof window === "undefined" || isInitializedRef.current || !isEmbeddedInShopify()) {
            return;
        }

        isInitializedRef.current = true;

        // Staggered initial measurements with exponential backoff
        const initialDelays = [0, 16, 50, 150, 400, 1000];
        const timeoutIds = initialDelays.map((delay, index) =>
            setTimeout(() => debouncedHeightUpdate(index === 0), delay)
        );

        // Optimized ResizeObserver
        if (window.ResizeObserver && !observerRef.current) {
            observerRef.current = new ResizeObserver((entries) => {
                // Only process if entries actually changed
                if (entries.length > 0) {
                    debouncedHeightUpdate();
                }
            });

            const mainContent = document.getElementById("main-content");
            if (mainContent) {
                observerRef.current.observe(mainContent);
            }
            // Observe body only if main-content doesn't exist
            else if (document.body) {
                observerRef.current.observe(document.body);
            }
        }

        // Optimized MutationObserver with more specific filtering
        if (!mutationObserverRef.current) {
            mutationObserverRef.current = new MutationObserver((mutations) => {
                // Filter out irrelevant mutations
                const relevantMutation = mutations.some(mutation => {
                    if (mutation.type === 'childList') return true;
                    if (mutation.type === 'attributes') {
                        const attr = mutation.attributeName;
                        return attr === 'style' || attr === 'class' || attr === 'height' || attr === 'hidden';
                    }
                    return false;
                });

                if (relevantMutation) {
                    throttledMutationUpdate();
                }
            });

            mutationObserverRef.current.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["style", "class", "height", "hidden"],
                attributeOldValue: false, // Don't store old values for better performance
                characterData: false, // Don't observe text changes
            });
        }

        // Throttled resize handler
        const handleResize = () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(debouncedHeightUpdate, DEBOUNCE_DELAY);
        };

        const handleLoad = () => {
            setTimeout(() => debouncedHeightUpdate(true), 50);
        };

        const handleDOMContentLoaded = () => {
            setTimeout(() => debouncedHeightUpdate(true), 16);
        };

        window.addEventListener("resize", handleResize, { passive: true });
        window.addEventListener("load", handleLoad);
        document.addEventListener("DOMContentLoaded", handleDOMContentLoaded);

        return () => {
            // Cleanup
            timeoutIds.forEach(clearTimeout);
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            if (mutationDebounceTimerRef.current) clearTimeout(mutationDebounceTimerRef.current);
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
            if (mutationObserverRef.current) {
                mutationObserverRef.current.disconnect();
                mutationObserverRef.current = null;
            }

            window.removeEventListener("resize", handleResize);
            window.removeEventListener("load", handleLoad);
            document.removeEventListener("DOMContentLoaded", handleDOMContentLoaded);
            isInitializedRef.current = false;
        };
    }, [debouncedHeightUpdate, throttledMutationUpdate, isEmbeddedInShopify]);

    return null;
}