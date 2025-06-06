"use client";
import { useEffect, useRef, useCallback } from "react";

const SHOP_ORIGINS = String(process.env.SHOP_ORIGINS).split(',');

if (SHOP_ORIGINS.length < 1) {
    throw new Error("Missing SHOP_ORIGINS environment variable");
}

export default function IframeHeightManager() {
    const lastHeightRef = useRef<number>(0);
    const observerRef = useRef<ResizeObserver | null>(null);
    const mutationObserverRef = useRef<MutationObserver | null>(null);
    const isInitializedRef = useRef<boolean>(false);

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
        const heights = [
            body.scrollHeight,
            body.offsetHeight,
            body.clientHeight,
            html.scrollHeight,
            html.offsetHeight,
            html.clientHeight,
            window.innerHeight,
        ].filter((h) => h > 0);

        return Math.max(...heights, 200);
    }, []);

    const sendHeightToParent = useCallback((height: number) => {
        if (typeof window === "undefined") return;

        const previousHeight = lastHeightRef.current;
        const isReduction = height < previousHeight;
        const diff = height - previousHeight;

        lastHeightRef.current = height;

        const message = {
            type: "iframe-height",
            height,
            timestamp: Date.now(),
            source: "IframeHeightManager",
            forceUpdate: isReduction,
            previousHeight,
            isReduction,
            heightDiff: diff,
        };

        const sendMessage = () => {
            SHOP_ORIGINS.forEach((origin, index) => {
                try {
                    window.parent.postMessage(message, origin);
                } catch (error) {
                    console.warn(`Failed to send message to #${index}:`, error);
                }
            });
            // Optionally remove this wildcard for better security
            // window.parent.postMessage(message, "*");
        };

        setTimeout(sendMessage, isReduction ? 0 : 16);
    }, []);

    const calculateAndSendHeight = useCallback(() => {
        if (!isEmbeddedInShopify()) return;
        requestAnimationFrame(() => {
            setTimeout(() => {
                const height = getDocumentHeight();
                sendHeightToParent(height);
            }, 100); // 100ms delay
        });
    }, [isEmbeddedInShopify, getDocumentHeight, sendHeightToParent]);

    useEffect(() => {
        if (typeof window === "undefined" || isInitializedRef.current || !isEmbeddedInShopify()) return;

        isInitializedRef.current = true;

        const initialDelays = [0, 50, 100, 200, 300, 500, 1000];
        const timeoutIds = initialDelays.map((delay) => setTimeout(calculateAndSendHeight, delay));

        if (window.ResizeObserver && !observerRef.current) {
            observerRef.current = new ResizeObserver(() => {
                calculateAndSendHeight();
            });
            const mainContent = document.getElementById("main-content");
            if (mainContent) observerRef.current.observe(mainContent);
            if (document.body) observerRef.current.observe(document.body);
        }

        if (!mutationObserverRef.current) {
            mutationObserverRef.current = new MutationObserver(() => {
                calculateAndSendHeight();
            });
            mutationObserverRef.current.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["style", "class", "height", "width", "hidden"],
            });
        }

        const handleResize = () => calculateAndSendHeight();
        const handleLoad = () => setTimeout(calculateAndSendHeight, 100);
        const handleDOMContentLoaded = () => setTimeout(calculateAndSendHeight, 50);

        window.addEventListener("resize", handleResize);
        window.addEventListener("load", handleLoad);
        document.addEventListener("DOMContentLoaded", handleDOMContentLoaded);

        return () => {
            timeoutIds.forEach((id) => clearTimeout(id));
            if (observerRef.current) observerRef.current.disconnect();
            if (mutationObserverRef.current) mutationObserverRef.current.disconnect();
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("load", handleLoad);
            document.removeEventListener("DOMContentLoaded", handleDOMContentLoaded);
            isInitializedRef.current = false;
        };
    }, [calculateAndSendHeight, isEmbeddedInShopify, getDocumentHeight]);

    return null;
}