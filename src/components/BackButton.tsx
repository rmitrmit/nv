// src\components\BackButton.tsx
"use client"; // Ensure this is a client component

import { useRouter } from "next/navigation"; // Use useRouter for programmatic navigation
import { useEffect, useRef } from "react";
import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
    href: string;
    enableReloadProtection?: boolean; // Optional prop to control reload protection
    enableCheckoutDetection?: boolean; // New prop for performance
}

const BackButton: React.FC<BackButtonProps> = ({
    href,
    enableReloadProtection = true,
    enableCheckoutDetection = false // Only enable when needed
}) => {
    const router = useRouter();
    const isNavigatingToCheckoutRef = useRef(false);

    // Add beforeunload event listener for reload/URL change protection
    useEffect(() => {
        if (!enableReloadProtection) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Don't show warning if navigating to checkout
            if (isNavigatingToCheckoutRef.current) return;

            // Modern browsers ignore custom messages for security reasons
            // They show their own generic message like "Reload site? Changes you made may not be saved."
            e.preventDefault();
            e.returnValue = ""; // Empty string or any truthy value triggers the dialog
            return ""; // This return value is ignored by modern browsers
        };

        // Add the event listener
        window.addEventListener("beforeunload", handleBeforeUnload);
        // Only set up checkout detection if explicitly enabled
        if (!enableCheckoutDetection) {
            return () => {
                window.removeEventListener("beforeunload", handleBeforeUnload);
            };
        }

        // Checkout detection logic (only runs when enableCheckoutDetection is true)
        const originalAssign = window.location.assign;
        const originalReplace = window.location.replace;

        window.location.assign = function (url: string | URL) {
            const urlString = url.toString();
            if (urlString.includes('checkouts')) {
                isNavigatingToCheckoutRef.current = true;
            }
            return originalAssign.call(this, url);
        };

        window.location.replace = function (url: string | URL) {
            const urlString = url.toString();
            if (urlString.includes('checkouts')) {
                isNavigatingToCheckoutRef.current = true;
            }
            return originalReplace.call(this, url);
        };

        // Handle window.top/parent navigation for iframe context
        const setupTopWindowOverrides = () => {
            try {
                if (window.top && window.top !== window) {
                    const topLocation = window.top.location;

                    // Store original methods if they exist
                    const originalTopHref = Object.getOwnPropertyDescriptor(topLocation, 'href');

                    // Override href setter
                    Object.defineProperty(topLocation, 'href', {
                        set: function (url: string) {
                            if (url.includes('checkouts')) {
                                isNavigatingToCheckoutRef.current = true;
                            }
                            if (originalTopHref && originalTopHref.set) {
                                originalTopHref.set.call(this, url);
                            }
                        },
                        get: originalTopHref?.get || function () { return ''; },
                        configurable: true
                    });
                }

                if (window.parent && window.parent !== window) {
                    const parentLocation = window.parent.location;

                    const originalParentHref = Object.getOwnPropertyDescriptor(parentLocation, 'href');

                    Object.defineProperty(parentLocation, 'href', {
                        set: function (url: string) {
                            if (url.includes('checkouts')) {
                                isNavigatingToCheckoutRef.current = true;
                            }
                            if (originalParentHref && originalParentHref.set) {
                                originalParentHref.set.call(this, url);
                            }
                        },
                        get: originalParentHref?.get || function () { return ''; },
                        configurable: true
                    });
                }
            } catch {
                // Silent fail for cross-origin restrictions
            }
        };

        setupTopWindowOverrides();

        // Cleanup function to remove the event listener
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            // Restore original methods
            window.location.assign = originalAssign;
            window.location.replace = originalReplace;
        };
    }, [enableReloadProtection, enableCheckoutDetection]);

    const handleBackClick = () => {
        // Check if the href is "/" to show a reset warning
        if (href === "/") {
            const shouldNavigate = window.confirm(
                "Are you sure you want to go back? All progress will be reset."
            );

            if (!shouldNavigate) return;
        }
        // Navigate back without any warning if href is not "/"
        router.push(href);
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