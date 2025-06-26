// src/components/ViewportToaster.tsx (Performance Optimized)
'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Toaster } from 'sonner';

interface ParentViewportInfo {
    type: 'parent-scroll-info' | 'parent-resize-info';
    scrollTop: number;
    scrollLeft: number;
    viewportHeight: number;
    viewportWidth: number;
    iframeTop: number;
    iframeLeft: number;
    iframeHeight: number;
    iframeWidth: number;
    timestamp: number;
}

const POSITION_UPDATE_THRESHOLD = 10; // Only update position if change is >10px
const DEBOUNCE_DELAY = 8; // Reduced debounce for smoother updates
const POSITION_CACHE_DURATION = 8; // Cache position at 120fps

export default function ViewportToaster() {
    const [isInIframe, setIsInIframe] = useState(false);
    const [parentViewport, setParentViewport] = useState<ParentViewportInfo | null>(null);
    const [toasterOffset, setToasterOffset] = useState(16);

    // Performance optimization refs
    const lastPositionUpdateRef = useRef<number>(0);
    const cachedPositionRef = useRef<number>(16);
    const positionDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const lastViewportDataRef = useRef<ParentViewportInfo | null>(null);
    const isCalculatingPositionRef = useRef<boolean>(false);

    // Memoized iframe check
    const checkIframe = useCallback(() => {
        try {
            return window.self !== window.top;
        } catch {
            return true;
        }
    }, []);

    useEffect(() => {
        const inIframe = checkIframe();
        setIsInIframe(inIframe);

        // Single message to request scroll updates
        if (inIframe) {
            try {
                window.parent.postMessage({
                    type: 'request-scroll-updates',
                    source: 'ViewportToaster',
                    timestamp: performance.now()
                }, '*');
            } catch {
                // Silent fail
            }
        }
    }, [checkIframe]);

    // Optimized position calculation with caching
    const calculateToasterPosition = useCallback((viewportData: ParentViewportInfo): number => {
        // Return cached position if data hasn't changed significantly
        const now = performance.now();
        if (
            lastViewportDataRef.current &&
            now - lastPositionUpdateRef.current < POSITION_CACHE_DURATION &&
            Math.abs(viewportData.iframeTop - lastViewportDataRef.current.iframeTop) < POSITION_UPDATE_THRESHOLD &&
            Math.abs(viewportData.scrollTop - lastViewportDataRef.current.scrollTop) < POSITION_UPDATE_THRESHOLD
        ) {
            return cachedPositionRef.current;
        }

        const { viewportHeight, iframeTop, iframeHeight } = viewportData;

        // Calculate visible portion of iframe
        const visibleTop = Math.max(0, -iframeTop);
        const visibleBottom = Math.min(iframeHeight, viewportHeight - iframeTop);

        let newPosition: number;

        if (visibleBottom <= 0 || visibleTop >= iframeHeight) {
            // Iframe is completely out of view
            newPosition = 16;
        } else {
            // Calculate center of visible portion
            const visibleHeight = visibleBottom - visibleTop;
            const centerOfVisible = visibleTop + (visibleHeight / 2);

            // Constraints for position
            const minOffset = 16;
            const maxOffset = Math.max(minOffset, iframeHeight - 120);

            newPosition = Math.max(minOffset, Math.min(maxOffset, centerOfVisible - 60));
        }

        // Cache the calculation
        cachedPositionRef.current = newPosition;
        lastPositionUpdateRef.current = now;
        lastViewportDataRef.current = viewportData;

        return newPosition;
    }, []);

    // Debounced position update
    const updateToasterPosition = useCallback((viewportData: ParentViewportInfo) => {
        if (isCalculatingPositionRef.current) return;

        if (positionDebounceRef.current) {
            clearTimeout(positionDebounceRef.current);
        }

        positionDebounceRef.current = setTimeout(() => {
            if (isCalculatingPositionRef.current) return;

            isCalculatingPositionRef.current = true;

            try {
                const newOffset = calculateToasterPosition(viewportData);

                // Only update if position changed significantly
                if (Math.abs(newOffset - toasterOffset) >= POSITION_UPDATE_THRESHOLD) {
                    setToasterOffset(newOffset);
                    setParentViewport(viewportData);
                }
            } finally {
                isCalculatingPositionRef.current = false;
            }
        }, DEBOUNCE_DELAY);
    }, [calculateToasterPosition, toasterOffset]);

    // Optimized message handling with buffering
    useEffect(() => {
        if (!isInIframe) return;

        let messageBuffer: ParentViewportInfo | null = null;
        let bufferTimer: NodeJS.Timeout | null = null;

        const processBufferedMessage = () => {
            if (messageBuffer) {
                updateToasterPosition(messageBuffer);
                messageBuffer = null;
            }
        };

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'parent-scroll-info' || event.data?.type === 'parent-resize-info') {
                const viewportData = event.data as ParentViewportInfo;

                // Buffer messages to prevent excessive updates
                messageBuffer = viewportData;

                if (bufferTimer) {
                    clearTimeout(bufferTimer);
                }

                bufferTimer = setTimeout(processBufferedMessage, DEBOUNCE_DELAY);
            }
        };

        window.addEventListener('message', handleMessage, { passive: true });

        return () => {
            window.removeEventListener('message', handleMessage);
            if (bufferTimer) {
                clearTimeout(bufferTimer);
            }
        };
    }, [isInIframe, updateToasterPosition]);

    // Optimized custom event handling
    useEffect(() => {
        if (!isInIframe) return;

        const handleParentViewportChange = (event: CustomEvent<ParentViewportInfo>) => {
            updateToasterPosition(event.detail);
        };

        const handleIframeHeightChange = () => {
            // Only recalculate if we have recent viewport data
            if (parentViewport && performance.now() - lastPositionUpdateRef.current < 1000) {
                updateToasterPosition(parentViewport);
            }
        };

        window.addEventListener('parent-viewport-change', handleParentViewportChange as EventListener, { passive: true });
        window.addEventListener('iframe-height-changed', handleIframeHeightChange as EventListener, { passive: true });

        return () => {
            window.removeEventListener('parent-viewport-change', handleParentViewportChange as EventListener);
            window.removeEventListener('iframe-height-changed', handleIframeHeightChange as EventListener);
        };
    }, [isInIframe, parentViewport, updateToasterPosition]);

    // Memoized CSS styles to prevent unnecessary re-renders
    const toasterStyles = useMemo(() => {
        if (!isInIframe) return '';

        return `
            [data-sonner-toaster] {
                position: fixed !important;
                top: ${toasterOffset}px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                z-index: 9999 !important;
                transition: top 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
        `;
    }, [isInIframe, toasterOffset]);

    // Optimized style injection
    useEffect(() => {
        if (!isInIframe) return;

        let styleElement = document.getElementById('iframe-toaster-fix') as HTMLStyleElement;

        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'iframe-toaster-fix';
            document.head.appendChild(styleElement);
        }

        // Only update if content changed
        if (styleElement.textContent !== toasterStyles) {
            styleElement.textContent = toasterStyles;
        }

        return () => {
            // Don't remove style element on every re-render, only on unmount
            const existingStyle = document.getElementById('iframe-toaster-fix');
            if (existingStyle) {
                existingStyle.remove();
            }
        };
    }, [isInIframe, toasterStyles]);

    // Memoized toast options to prevent re-renders
    const toastOptions = useMemo(() => ({
        style: {
            padding: "16px",
            color: "oklch(0.396 0.141 25.723)",
            backgroundColor: "oklch(0.971 0.013 17.38)",
            fontSize: "1.15rem",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
        },
        duration: 4000,
    }), []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (positionDebounceRef.current) {
                clearTimeout(positionDebounceRef.current);
            }
        };
    }, []);

    return (
        <Toaster
            position="top-center"
            // expand={true}
            richColors
            // closeButton
            toastOptions={toastOptions}
        />
    );
}