import React from "react";

interface QueueCardWatermarkProps {
    domain: "dine" | "clinic" | "service_lines" | "zone" | "standard";
    className?: string;
}

/**
 * Minimal, clean architectural line-art watermark.
 * Solid stroke with intentional, minimal human craft.
 */
export default function QueueCardWatermark({ domain, className = "" }: QueueCardWatermarkProps) {
    if (domain === "dine") {
        return (
            <svg
                viewBox="0 0 160 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
                aria-hidden="true"
            >
                <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    {/* Round Table with 4 Chairs */}
                    <circle cx="60" cy="60" r="22" />
                    {/* 4 Chairs */}
                    <path d="M60 28C65 28 69 31 69 34V38H51V34C51 31 55 28 60 28Z" />
                    <path d="M60 92C65 92 69 89 69 86V82H51V86C51 89 55 92 60 92Z" />
                    <path d="M28 60C28 55 31 51 34 51H38V69H34C31 69 28 65 28 60Z" />
                    <path d="M92 60C92 55 89 51 86 51H82V69H86C89 69 92 65 92 60Z" />

                    {/* Rectangular Booth Table */}
                    <rect x="105" y="44" width="40" height="28" rx="4" />
                    <path d="M103 36H147" strokeWidth="2" />
                    <path d="M103 80H147" strokeWidth="2" />

                    {/* Floor boundary lines */}
                    <path d="M15 15H145V145H15V15Z" strokeDasharray="3 3" />

                    {/* Fork & Knife detail */}
                    <path d="M50 115V135M47 115V124C47 126 50 127 50 127M53 115V124C53 126 50 127 50 127" />
                    <path d="M62 115V135M59 115C59 120 65 122 65 125V135" />
                </g>
            </svg>
        );
    }

    if (domain === "clinic") {
        return (
            <svg
                viewBox="0 0 160 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
                aria-hidden="true"
            >
                <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    {/* Minimal Medical Cross */}
                    <path d="M68 32H92V56H116V80H92V104H68V80H44V56H68V32Z" />

                    {/* Stethoscope Loop */}
                    <path d="M96 90C96 112 114 122 124 112C132 104 126 88 112 88H96" />
                    <circle cx="96" cy="88" r="3.5" fill="currentColor" fillOpacity="0.2" />

                    {/* ECG Line */}
                    <path d="M25 125H55L60 115L67 135L74 108L81 130L86 122H135" strokeWidth="1.4" />

                    {/* Outer Frame */}
                    <rect x="15" y="15" width="130" height="130" rx="8" strokeDasharray="3 3" />
                </g>
            </svg>
        );
    }

    if (domain === "service_lines") {
        return (
            <svg
                viewBox="0 0 160 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
                aria-hidden="true"
            >
                <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    {/* Lanes Divider */}
                    <rect x="20" y="25" width="120" height="110" rx="8" strokeDasharray="3 3" />
                    <line x1="60" y1="25" x2="60" y2="135" strokeDasharray="2 3" />
                    <line x1="100" y1="25" x2="100" y2="135" strokeDasharray="2 3" />

                    {/* Counter Pods */}
                    <rect x="30" y="38" width="20" height="14" rx="2" />
                    <rect x="70" y="38" width="20" height="14" rx="2" />
                    <rect x="110" y="38" width="20" height="14" rx="2" />

                    {/* Queue Dots */}
                    <circle cx="40" cy="75" r="3" />
                    <circle cx="40" cy="95" r="3" />
                    <circle cx="40" cy="115" r="3" />

                    <circle cx="80" cy="75" r="3" />
                    <circle cx="80" cy="95" r="3" />

                    <circle cx="120" cy="75" r="3" />
                    <circle cx="120" cy="95" r="3" />
                    <circle cx="120" cy="115" r="3" />
                </g>
            </svg>
        );
    }

    if (domain === "zone") {
        return (
            <svg
                viewBox="0 0 160 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
                aria-hidden="true"
            >
                <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="80" cy="80" r="55" strokeDasharray="3 3" />
                    <circle cx="80" cy="80" r="35" />
                    <line x1="80" y1="15" x2="80" y2="145" strokeDasharray="1 4" />
                    <line x1="15" y1="80" x2="145" y2="80" strokeDasharray="1 4" />
                    <circle cx="68" cy="68" r="4" fill="currentColor" fillOpacity="0.2" />
                    <circle cx="92" cy="68" r="4" fill="currentColor" fillOpacity="0.2" />
                    <circle cx="80" cy="94" r="4" fill="currentColor" fillOpacity="0.2" />
                </g>
            </svg>
        );
    }

    // Default: Minimal Ticket / Boarding Stub
    return (
        <svg
            viewBox="0 0 160 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden="true"
        >
            <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                {/* Clean Ticket Outline with Perforated Notch */}
                <path d="M25 35H135V70C128 70 123 75 123 80C123 85 128 90 135 90V125H25V90C32 90 37 85 37 80C37 75 32 70 25 70V35Z" />
                <line x1="102" y1="36" x2="102" y2="124" strokeDasharray="2 3" />
                {/* Barcode Lines */}
                <line x1="110" y1="52" x2="110" y2="108" strokeWidth="1.5" />
                <line x1="115" y1="52" x2="115" y2="108" strokeWidth="0.8" />
                <line x1="119" y1="52" x2="119" y2="108" strokeWidth="1.8" />
                <line x1="124" y1="52" x2="124" y2="108" strokeWidth="1.0" />
                {/* Star / Token Badge */}
                <circle cx="60" cy="72" r="16" />
                <path d="M60 62L62 68H68L63 72L65 78L60 74L55 78L57 72L52 68H58L60 62Z" />
                {/* Metadata Lines */}
                <line x1="42" y1="100" x2="80" y2="100" strokeDasharray="3 2" />
                <line x1="42" y1="108" x2="72" y2="108" strokeDasharray="3 2" />
            </g>
        </svg>
    );
}
