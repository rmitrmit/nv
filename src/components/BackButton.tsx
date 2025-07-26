// src/components/BackButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
    href: string;
    enableReloadProtection?: boolean;
}

const BackButton: React.FC<BackButtonProps> = ({
    href,
    enableReloadProtection = true
}) => {
    const router = useRouter();
    const isNavigatingRef = useRef(false);

    useEffect(() => {
        if (!enableReloadProtection) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Let PostHog do its thing first by not preventing immediately
            // Only prevent the actual browser dialog for reloads/close

            if (isNavigatingRef.current) {
                // This is our programmatic navigation - let it proceed
                return;
            }

            // This is likely a real reload/close - show the confirmation
            e.preventDefault();
            e.returnValue = "";
            return "";
        };

        // Add our handler with passive: false to ensure we can prevent default
        window.addEventListener("beforeunload", handleBeforeUnload, { passive: false });

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [enableReloadProtection]);

    const handleBackClick = () => {
        // Set flag before navigation
        isNavigatingRef.current = true;

        if (href === "/") {
            const shouldNavigate = window.confirm(
                "Are you sure you want to go back? All progress will be reset."
            );

            if (!shouldNavigate) {
                isNavigatingRef.current = false; // Reset flag
                return;
            }
        }

        // Navigate - this should not trigger beforeunload dialog
        router.push(href);

        // Reset flag after a short delay
        setTimeout(() => {
            isNavigatingRef.current = false;
        }, 100);
    };

    return (
        <button
            onClick={handleBackClick}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-[1.5px] bg-white/90 hover:bg-white hover:ring-gray-200/65 focus-visible:ring focus-visible:ring-gray-200/65 active:ring-0 dark:hover:ring-gray-100/15 dark:focus-visible:ring-gray-100/15  px-5 rounded-md text-sm md:text-base h-10 md:h-12"
        >
            <ChevronLeft className="-ml-1 size-4 md:size-5" /> Previous
        </button>
    );
};

export default BackButton;