// src/components/IframeHeightManager.tsx (Performance Optimized)
"use client";
import { useEffect, useRef, useCallback } from "react";

if (process.env.NEXT_PUBLIC_SHOP_ORIGINS == undefined) {
    throw new Error("Missing SHOP_ORIGINS environment variable");
}

const SHOP_ORIGINS = String(process.env.NEXT_PUBLIC_SHOP_ORIGINS).split(',');

// Optimized performance constants
const HEIGHT_THRESHOLD = 3; // Reduced threshold for smoother updates
const CRITICAL_HEIGHT_THRESHOLD = 10; // For critical changes that bypass debouncing
const DEBOUNCE_DELAY = 8; // Reduced for smoother experience (~120fps)
const MUTATION_DEBOUNCE_DELAY = 50; // Reduced mutation delay
const RESIZE_DEBOUNCE_DELAY = 8; // Separate resize delay

interface MessageData {
    type: string;
    height?: number;
    timestamp?: number;
    source?: string;
    forceUpdate?: boolean;
    previousHeight?: number;
    isReduction?: boolean;
    heightDiff?: number;
    isCritical?: boolean;
    [key: string]: unknown;
}

interface QueuedMessage {
    message: MessageData;
    timestamp: number;
}

export default function IframeHeightManager() {
    const lastHeightRef = useRef<number>(0);
    const lastSentHeightRef = useRef<number>(0);
    const observerRef = useRef<ResizeObserver | null>(null);
    const mutationObserverRef = useRef<MutationObserver | null>(null);
    const isInitializedRef = useRef<boolean>(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const mutationDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const resizeDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const isCalculatingRef = useRef<boolean>(false);
    const cachedHeightRef = useRef<number>(0);
    const lastCalculationTimeRef = useRef<number>(0);

    const isEmbeddedInShopify = useCallback(() => {
        if (typeof window === "undefined") return false;
        try {
            return window.parent !== window || window.top !== window;
        } catch {
            return true;
        }
    }, []);

    // Optimized height calculation with caching
    const getDocumentHeight = useCallback(() => {
        if (typeof window === "undefined" || typeof document === "undefined") {
            return 400;
        }

        if (document.readyState === "loading") {
            return cachedHeightRef.current || 400;
        }

        // Cache for 16ms to avoid redundant calculations
        const now = performance.now();
        if (now - lastCalculationTimeRef.current < 16 && cachedHeightRef.current > 0) {
            return cachedHeightRef.current;
        }

        const mainContent = document.getElementById("main-content");
        let height: number;

        if (mainContent) {
            // More accurate calculation for main content
            const rect = mainContent.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(mainContent);
            const marginTop = parseFloat(computedStyle.marginTop) || 0;
            const marginBottom = parseFloat(computedStyle.marginBottom) || 0;

            height = Math.max(
                mainContent.scrollHeight + marginTop + marginBottom + 100,
                rect.height + marginTop + marginBottom + 100,
                200
            );
        } else {
            const { body, documentElement: html } = document;
            height = Math.max(
                body.scrollHeight,
                html.scrollHeight,
                body.offsetHeight,
                html.offsetHeight,
                body.clientHeight,
                html.clientHeight,
                200
            );
        }

        cachedHeightRef.current = height;
        lastCalculationTimeRef.current = now;
        return height;
    }, []);

    // Batch multiple notifications to prevent spam
    const pendingNotificationsRef = useRef<Set<string>>(new Set());
    const notificationBatchTimerRef = useRef<NodeJS.Timeout | null>(null);

    const batchedNotifyToast = useCallback(() => {
        if (notificationBatchTimerRef.current) {
            clearTimeout(notificationBatchTimerRef.current);
        }

        notificationBatchTimerRef.current = setTimeout(() => {
            if (pendingNotificationsRef.current.size > 0) {
                window.dispatchEvent(new CustomEvent('iframe-height-changed', {
                    detail: {
                        height: getDocumentHeight(),
                        timestamp: performance.now(),
                        batchedEvents: Array.from(pendingNotificationsRef.current)
                    }
                }));
                pendingNotificationsRef.current.clear();
            }
        }, 8);
    }, [getDocumentHeight]);

    const notifyToastOfChanges = useCallback((eventType = 'height-change') => {
        pendingNotificationsRef.current.add(eventType);
        batchedNotifyToast();
    }, [batchedNotifyToast]);

    // Optimized message sending with connection pooling
    const messageQueueRef = useRef<Array<QueuedMessage>>([]);
    const isProcessingQueueRef = useRef<boolean>(false);

    const processMessageQueue = useCallback(() => {
        if (isProcessingQueueRef.current || messageQueueRef.current.length === 0) {
            return;
        }

        isProcessingQueueRef.current = true;

        // Process latest message only (drop duplicates)
        const latestMessage = messageQueueRef.current[messageQueueRef.current.length - 1];
        messageQueueRef.current = [];

        SHOP_ORIGINS.forEach((origin) => {
            try {
                window.parent.postMessage(latestMessage.message, origin);
            } catch {
                // Silent fail for performance
            }
        });

        isProcessingQueueRef.current = false;
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
        const isCritical = heightDiff > CRITICAL_HEIGHT_THRESHOLD;

        const message: MessageData = {
            type: "iframe-height",
            height,
            timestamp: performance.now(),
            source: "IframeHeightManager",
            forceUpdate: isReduction || isCritical,
            previousHeight,
            isReduction,
            heightDiff: height - previousHeight,
            isCritical
        };

        // Notify toast component
        notifyToastOfChanges('height-update');

        if (isCritical || isReduction) {
            // Send critical updates immediately
            SHOP_ORIGINS.forEach((origin) => {
                try {
                    window.parent.postMessage(message, origin);
                } catch {
                    // Silent fail
                }
            });
        } else {
            // Queue non-critical updates
            messageQueueRef.current.push({ message, timestamp: performance.now() });

            // Process queue on next frame
            requestAnimationFrame(processMessageQueue);
        }
    }, [notifyToastOfChanges, processMessageQueue]);

    // Ultra-optimized debounced height update
    const debouncedHeightUpdate = useCallback((force = false, source = 'unknown') => {
        if (!isEmbeddedInShopify()) return;

        // Prevent multiple simultaneous calculations
        if (isCalculatingRef.current && !force) {
            return;
        }

        // Cancel previous operations
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
        }
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        const executeUpdate = () => {
            if (isCalculatingRef.current && !force) return;

            isCalculatingRef.current = true;

            try {
                const height = getDocumentHeight();
                const heightDiff = Math.abs(height - lastHeightRef.current);

                // Only update if there's a meaningful change
                if (heightDiff >= HEIGHT_THRESHOLD || force) {
                    lastHeightRef.current = height;
                    sendHeightToParent(height, force);
                }
            } finally {
                isCalculatingRef.current = false;
            }
        };

        if (force || source === 'resize') {
            // Execute immediately for forced updates or resize
            rafIdRef.current = requestAnimationFrame(executeUpdate);
        } else {
            // Debounce for other updates
            debounceTimerRef.current = setTimeout(() => {
                rafIdRef.current = requestAnimationFrame(executeUpdate);
            }, DEBOUNCE_DELAY);
        }
    }, [isEmbeddedInShopify, getDocumentHeight, sendHeightToParent]);

    // Optimized mutation handling with intelligent filtering
    const throttledMutationUpdate = useCallback(() => {
        if (mutationDebounceTimerRef.current) {
            clearTimeout(mutationDebounceTimerRef.current);
        }

        mutationDebounceTimerRef.current = setTimeout(() => {
            debouncedHeightUpdate(false, 'mutation');
        }, MUTATION_DEBOUNCE_DELAY);
    }, [debouncedHeightUpdate]);

    // Optimized resize handling
    const throttledResizeUpdate = useCallback(() => {
        if (resizeDebounceTimerRef.current) {
            clearTimeout(resizeDebounceTimerRef.current);
        }

        resizeDebounceTimerRef.current = setTimeout(() => {
            debouncedHeightUpdate(true, 'resize');
        }, RESIZE_DEBOUNCE_DELAY);
    }, [debouncedHeightUpdate]);

    // Enhanced message handling with better performance
    useEffect(() => {
        const messageBuffer = new Map<string, MessageData>();
        let messageProcessTimer: NodeJS.Timeout | null = null;

        const handleParentMessage = (event: MessageEvent) => {
            const { data } = event;

            if (!data?.type) return;

            // Buffer messages to prevent spam
            if (data.type === 'parent-scroll-info' || data.type === 'parent-resize-info') {
                messageBuffer.set(data.type, data);

                if (messageProcessTimer) {
                    clearTimeout(messageProcessTimer);
                }

                messageProcessTimer = setTimeout(() => {
                    // Process buffered messages
                    messageBuffer.forEach((bufferedData) => {
                        window.dispatchEvent(new CustomEvent('parent-viewport-change', {
                            detail: bufferedData
                        }));
                    });
                    messageBuffer.clear();
                }, 8); // Process every ~120fps
            }

            if (data.type === 'request-scroll-updates') {
                try {
                    window.parent.postMessage({
                        type: 'iframe-ready-for-scroll-updates',
                        source: 'IframeHeightManager',
                        timestamp: performance.now()
                    }, '*');
                } catch {
                    // Silent fail
                }
            }
        };

        window.addEventListener('message', handleParentMessage);

        return () => {
            if (messageProcessTimer) {
                clearTimeout(messageProcessTimer);
            }
            window.removeEventListener('message', handleParentMessage);
        };
    }, []);

    // Send initial ready message (optimized)
    useEffect(() => {
        if (!isEmbeddedInShopify()) return;

        const sendReadyMessage = () => {
            try {
                window.parent.postMessage({
                    type: 'iframe-ready-for-scroll-updates',
                    source: 'IframeHeightManager',
                    timestamp: performance.now()
                }, '*');
            } catch {
                // Silent fail
            }
        };

        // Staggered ready messages
        const timeouts = [0, 50, 200].map(delay =>
            setTimeout(sendReadyMessage, delay)
        );

        return () => {
            timeouts.forEach(clearTimeout);
        };
    }, [isEmbeddedInShopify]);

    // Main initialization (heavily optimized)
    useEffect(() => {
        if (typeof window === "undefined" || isInitializedRef.current || !isEmbeddedInShopify()) {
            return;
        }

        isInitializedRef.current = true;

        // Optimized initial measurements
        const initialDelays = [0, 16, 100, 300];
        const timeoutIds = initialDelays.map((delay, index) =>
            setTimeout(() => debouncedHeightUpdate(index === 0, 'initial'), delay)
        );

        // Highly optimized ResizeObserver
        if (window.ResizeObserver && !observerRef.current) {
            observerRef.current = new ResizeObserver((entries) => {
                // Only process if we have meaningful entries
                let hasRelevantChange = false;

                for (const entry of entries) {
                    const { contentRect } = entry;
                    if (contentRect.height > 0) {
                        hasRelevantChange = true;
                        break;
                    }
                }

                if (hasRelevantChange) {
                    throttledResizeUpdate();
                }
            });

            const mainContent = document.getElementById("main-content");
            const targetElement = mainContent || document.body;

            if (targetElement) {
                observerRef.current.observe(targetElement);
            }
        }

        // Highly optimized MutationObserver
        if (!mutationObserverRef.current) {
            mutationObserverRef.current = new MutationObserver((mutations) => {
                let hasLayoutChange = false;

                for (const mutation of mutations) {
                    if (mutation.type === 'childList') {
                        // Check if added/removed nodes could affect layout
                        const relevantNodes = Array.from(mutation.addedNodes).concat(Array.from(mutation.removedNodes));
                        if (relevantNodes.some(node =>
                            node.nodeType === Node.ELEMENT_NODE &&
                            (node as HTMLElement).offsetHeight > 0
                        )) {
                            hasLayoutChange = true;
                            break;
                        }
                    } else if (mutation.type === 'attributes') {
                        const attr = mutation.attributeName;
                        if (attr === 'style' || attr === 'class' || attr === 'height' || attr === 'hidden') {
                            hasLayoutChange = true;
                            break;
                        }
                    }
                }

                if (hasLayoutChange) {
                    throttledMutationUpdate();
                }
            });

            mutationObserverRef.current.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["style", "class", "height", "hidden"],
                attributeOldValue: false,
                characterData: false,
            });
        }

        // Event listeners with optimized handlers
        const handleLoad = () => {
            setTimeout(() => debouncedHeightUpdate(true, 'load'), 16);
        };

        const handleDOMContentLoaded = () => {
            setTimeout(() => debouncedHeightUpdate(true, 'dom-ready'), 8);
        };

        // Passive scroll listener (minimal impact)
        const handleScroll = () => {
            notifyToastOfChanges('scroll');
        };

        window.addEventListener("resize", throttledResizeUpdate, { passive: true });
        window.addEventListener("load", handleLoad, { passive: true });
        document.addEventListener("DOMContentLoaded", handleDOMContentLoaded, { passive: true });
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            // Comprehensive cleanup
            timeoutIds.forEach(clearTimeout);
            [debounceTimerRef, mutationDebounceTimerRef, resizeDebounceTimerRef, notificationBatchTimerRef].forEach(ref => {
                if (ref.current) clearTimeout(ref.current);
            });
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
            if (mutationObserverRef.current) {
                mutationObserverRef.current.disconnect();
                mutationObserverRef.current = null;
            }

            window.removeEventListener("resize", throttledResizeUpdate);
            window.removeEventListener("load", handleLoad);
            window.removeEventListener("scroll", handleScroll);
            document.removeEventListener("DOMContentLoaded", handleDOMContentLoaded);
            isInitializedRef.current = false;
        };
    }, [debouncedHeightUpdate, throttledMutationUpdate, throttledResizeUpdate, isEmbeddedInShopify, notifyToastOfChanges]);

    return null;
}