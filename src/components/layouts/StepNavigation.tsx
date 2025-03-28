// src\components\layouts\StepNavigation.tsx
"use client";

import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Separator from '@radix-ui/react-separator';
import { Check } from 'lucide-react';

export type StepProps = {
    step: number;
    label: string;
    isActive: boolean;
    isComplete?: boolean;
};

const StepIndicator = ({ step, label, isActive, isComplete }: StepProps) => (
    <Tooltip.Provider>
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <div
                    className="flex flex-col items-center pointer-events-none" // Added pointer-events-none
                    style={{ opacity: 1, transform: 'translateY(2px)' }}
                >
                    <div
                        className={`inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-normal transition duration-150 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 size-6 rounded-full p-0 peer ${isComplete
                            ? "bg-primary/80 text-primary-foreground"
                            : isActive
                                ? "bg-primary/80 text-primary-foreground focus-visible:ring focus-visible:ring-primary/50"
                                : "bg-white/80 text-primary opacity-25 cursor-default"
                            }`}
                        aria-label={label}
                        aria-disabled={!isActive && !isComplete}
                    >
                        {isComplete ? <Check /> : step}
                    </div>
                    <p
                        className="scroll-m-20 font-roboto text-sm leading-normal tracking-wide dark:text-white mt-2 text-center font-semibold text-white peer-disabled:font-normal peer-disabled:opacity-10"
                        style={{ opacity: !isActive && !isComplete ? 0.2 : 0.95 }}
                    >
                        {label}
                    </p>
                </div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content
                    className="bg-black/90 text-white px-3 py-1.5 rounded text-sm"
                    sideOffset={5}
                >
                    {label}
                    <Tooltip.Arrow className="fill-black/90" />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    </Tooltip.Provider>
);

const StepDivider = ({ isActive }: { isActive: boolean }) => (
    <Separator.Root
        orientation="horizontal"
        className={`dark:bg-gray-100/5 w-full -mt-6 h-[1.75px] flex-1 duration-1000 animate-in fade-in ${isActive ? "bg-primary/30" : "bg-white/5"}`}
    />
);

export { StepIndicator, StepDivider };