"use client"; // Ensure this is a client component

import { useRouter } from "next/navigation"; // Use useRouter for programmatic navigation
import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
    href: string;
}

const BackButton: React.FC<BackButtonProps> = ({ href }) => {
    const router = useRouter();

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
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition duration-150 hover:ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-[1.5px] bg-white hover:bg-white/95 hover:ring-gray-200/65 focus-visible:ring focus-visible:ring-gray-200/65 active:ring-0 dark:hover:ring-gray-100/15 dark:focus-visible:ring-gray-100/15  px-5 rounded-md text-sm md:text-base h-10 md:h-12"
        >
            <ChevronLeft className="-ml-1 size-4 md:size-5" /> Back
        </button>
    );
};

export default BackButton;
