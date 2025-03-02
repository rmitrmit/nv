"use client";

import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
// import * as Separator from '@radix-ui/react-separator';

export type StepProps = {
    step: number;
    label: string;
    isActive: boolean;
    isComplete?: boolean;
    onClick?: () => void;
};

const StepIndicator = ({ step, label, isActive }: StepProps) => (
    <div className="flex flex-col items-center" style={{ opacity: 1, transform: 'translateY(2px)' }}>
        <button
            className="inline-flex items-center justify-center size-6 px-2 rounded-full
        bg-primary text-primary-foreground hover:bg-primary/90 hover:ring-primary/50
        disabled:bg-white/80 disabled:text-primary disabled:opacity-10
        text-sm font-normal transition duration-150 peer"
            disabled={!isActive}
            type="button"
            role="tab"
        >
            {step}
        </button>
        <p className="mt-2 text-center text-sm font-semibold text-white 
      font-roboto leading-normal tracking-wide
      peer-disabled:font-normal peer-disabled:opacity-10">
            {label}
        </p>
    </div>
);

const StepDivider = () => (
    <div
        role="none"
        className="w-full h-[1.75px] -mt-6 flex-1 bg-white/5 dark:bg-gray-100/5 
      duration-1000 animate-in fade-in"
    />
);

export interface StepsConfig {
    step: number;
    label: string;
    isActive: boolean;
    isComplete: boolean;
}

export interface StepIndicatorsProps {
    steps: StepsConfig[];
    currentStep: number;
    onStepChange?: (step: number) => void;
}

export const StepIndicators: React.FC<StepIndicatorsProps> = ({
    steps,
    currentStep,
    onStepChange
}) => {
    const handleStepClick = (stepNumber: number) => {
        if (onStepChange && stepNumber <= currentStep) {
            onStepChange(stepNumber);
        }
    };

    return (
        < div className="flex flex-col space-y-4 md:space-y-6" >
            <section className="flex items-center gap-2">
                {steps.map((step, index) => (
                    <React.Fragment key={step.step}>
                        <StepIndicator
                            step={step.step}
                            label={step.label}
                            isActive={currentStep === step.step}
                        />
                        {index < steps.length - 1 && <StepDivider />}
                    </React.Fragment>
                ))}
            </section>
        </ div>
    );
};

export default StepIndicators;