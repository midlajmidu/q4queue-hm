import React from "react";

interface TableIconProps {
    className?: string;
}

/**
 * 2-Seater Table & Chairs Vector Illustration
 * Matches the Linear/Toast POS design aesthetic from the UI mockup.
 */
export function Table2SeaterIcon({ className = "w-16 h-12" }: TableIconProps) {
    return (
        <svg
            viewBox="0 0 64 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Left Chair */}
            <g className="transition-transform duration-200">
                {/* Backrest */}
                <rect
                    x="8"
                    y="11"
                    width="6"
                    height="16"
                    rx="3"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                {/* Seat Cushion */}
                <path
                    d="M13 22H21C21.5523 22 22 22.4477 22 23V25.5C22 26.0523 21.5523 26.5 21 26.5H13"
                    className="fill-indigo-200 dark:fill-indigo-900/90 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
                {/* Chair Legs */}
                <path
                    d="M11 27L9.5 37M18 26.5L16.5 37"
                    className="stroke-slate-700 dark:stroke-indigo-400"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
            </g>

            {/* Right Chair */}
            <g className="transition-transform duration-200">
                {/* Backrest */}
                <rect
                    x="50"
                    y="11"
                    width="6"
                    height="16"
                    rx="3"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                {/* Seat Cushion */}
                <path
                    d="M51 22H43C42.4477 22 42 22.4477 42 23V25.5C42 26.0523 42.4477 26.5 43 26.5H51"
                    className="fill-indigo-200 dark:fill-indigo-900/90 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
                {/* Chair Legs */}
                <path
                    d="M53 27L54.5 37M46 26.5L47.5 37"
                    className="stroke-slate-700 dark:stroke-indigo-400"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
            </g>

            {/* Table (Center) */}
            <g>
                {/* Table Legs / Pedestal */}
                <path
                    d="M26 23.5V34M38 23.5V34"
                    className="stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <path
                    d="M23 35H41"
                    className="stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                {/* Tabletop Surface */}
                <rect
                    x="18"
                    y="17"
                    width="28"
                    height="6.5"
                    rx="2"
                    className="fill-slate-50 dark:fill-slate-800 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                {/* Subtle top edge bevel highlight */}
                <line
                    x1="20"
                    y1="19"
                    x2="44"
                    y2="19"
                    className="stroke-indigo-200 dark:stroke-indigo-600/40"
                    strokeWidth="1"
                    strokeLinecap="round"
                />
            </g>
        </svg>
    );
}

/**
 * 4-Seater Table & Chairs Vector Illustration
 * Matches the Linear/Toast POS design aesthetic from the UI mockup.
 */
export function Table4SeaterIcon({ className = "w-16 h-12" }: TableIconProps) {
    return (
        <svg
            viewBox="0 0 64 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* 2 Chairs in the Background (Behind Table) */}
            <g className="transition-transform duration-200">
                {/* Left-Back Chair Backrest */}
                <rect
                    x="22"
                    y="6"
                    width="8.5"
                    height="14"
                    rx="2.5"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                {/* Right-Back Chair Backrest */}
                <rect
                    x="33.5"
                    y="6"
                    width="8.5"
                    height="14"
                    rx="2.5"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
            </g>

            {/* Left Chair */}
            <g className="transition-transform duration-200">
                <rect
                    x="7"
                    y="12"
                    width="5.5"
                    height="15"
                    rx="2.5"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                <path
                    d="M12 22H19C19.5 22 20 22.4 20 23V25.5C20 26 19.5 26.5 19 26.5H12"
                    className="fill-indigo-200 dark:fill-indigo-900/90 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
                <path
                    d="M9.5 27L8 37M16.5 26.5L15 37"
                    className="stroke-slate-700 dark:stroke-indigo-400"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
            </g>

            {/* Right Chair */}
            <g className="transition-transform duration-200">
                <rect
                    x="51.5"
                    y="12"
                    width="5.5"
                    height="15"
                    rx="2.5"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                <path
                    d="M52 22H45C44.5 22 44 22.4 44 23V25.5C44 26 44.5 26.5 45 26.5H52"
                    className="fill-indigo-200 dark:fill-indigo-900/90 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
                <path
                    d="M54.5 27L56 37M47.5 26.5L49 37"
                    className="stroke-slate-700 dark:stroke-indigo-400"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
            </g>

            {/* Table (Center) */}
            <g>
                <path
                    d="M24 23.5V34M40 23.5V34"
                    className="stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <path
                    d="M20 35H44"
                    className="stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                {/* Tabletop Surface */}
                <rect
                    x="15"
                    y="17"
                    width="34"
                    height="6.5"
                    rx="2"
                    className="fill-slate-50 dark:fill-slate-800 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                {/* Bevel highlight */}
                <line
                    x1="17"
                    y1="19"
                    x2="47"
                    y2="19"
                    className="stroke-indigo-200 dark:stroke-indigo-600/40"
                    strokeWidth="1"
                    strokeLinecap="round"
                />
            </g>
        </svg>
    );
}

/**
 * 6-Seater Table & Chairs Vector Illustration
 * Matches the Linear/Toast POS design aesthetic from the UI mockup.
 */
export function Table6SeaterIcon({ className = "w-16 h-12" }: TableIconProps) {
    return (
        <svg
            viewBox="0 0 64 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* 3 Chairs in the Background */}
            <g className="transition-transform duration-200">
                <rect
                    x="18"
                    y="6"
                    width="7.5"
                    height="14"
                    rx="2"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                <rect
                    x="28.2"
                    y="6"
                    width="7.5"
                    height="14"
                    rx="2"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                <rect
                    x="38.5"
                    y="6"
                    width="7.5"
                    height="14"
                    rx="2"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
            </g>

            {/* Left Chair */}
            <g className="transition-transform duration-200">
                <rect
                    x="5"
                    y="12"
                    width="5"
                    height="15"
                    rx="2.5"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                <path
                    d="M10 22H16C16.5 22 17 22.4 17 23V25.5C17 26 16.5 26.5 16 26.5H10"
                    className="fill-indigo-200 dark:fill-indigo-900/90 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
                <path
                    d="M7.5 27L6 37M13.5 26.5L12 37"
                    className="stroke-slate-700 dark:stroke-indigo-400"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
            </g>

            {/* Right Chair */}
            <g className="transition-transform duration-200">
                <rect
                    x="54"
                    y="12"
                    width="5"
                    height="15"
                    rx="2.5"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                <path
                    d="M54 22H48C47.5 22 47 22.4 47 23V25.5C47 26 47.5 26.5 48 26.5H54"
                    className="fill-indigo-200 dark:fill-indigo-900/90 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
                <path
                    d="M56.5 27L58 37M50.5 26.5L52 37"
                    className="stroke-slate-700 dark:stroke-indigo-400"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
            </g>

            {/* Table (Center) */}
            <g>
                <path
                    d="M22 23.5V34M42 23.5V34"
                    className="stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <path
                    d="M18 35H46"
                    className="stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                {/* Tabletop Surface */}
                <rect
                    x="13"
                    y="17"
                    width="38"
                    height="6.5"
                    rx="2"
                    className="fill-slate-50 dark:fill-slate-800 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                {/* Bevel highlight */}
                <line
                    x1="15"
                    y1="19"
                    x2="49"
                    y2="19"
                    className="stroke-indigo-200 dark:stroke-indigo-600/40"
                    strokeWidth="1"
                    strokeLinecap="round"
                />
            </g>

            {/* Front Chair hint (Center bottom) */}
            <g>
                <path
                    d="M28.5 25.5H35.5C36 25.5 36.5 26 36.5 26.5V28C36.5 28.5 36 29 35.5 29H28.5C28 29 27.5 28.5 27.5 28V26.5C27.5 26 28 25.5 28.5 25.5Z"
                    className="fill-indigo-200 dark:fill-indigo-900/90 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.2"
                />
                <path
                    d="M29 29L28 35M35 29L36 35"
                    className="stroke-slate-700 dark:stroke-indigo-400"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                />
            </g>
        </svg>
    );
}

/**
 * 8-Seater / Banquet Table & Chairs Vector Illustration
 * Matches the Linear/Toast POS design aesthetic from the UI mockup.
 */
export function Table8SeaterIcon({ className = "w-16 h-12" }: TableIconProps) {
    return (
        <svg
            viewBox="0 0 64 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* 4 Chairs in the Background */}
            <g className="transition-transform duration-200">
                <rect
                    x="15"
                    y="6"
                    width="6.5"
                    height="14"
                    rx="2"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                <rect
                    x="23.5"
                    y="6"
                    width="6.5"
                    height="14"
                    rx="2"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                <rect
                    x="32"
                    y="6"
                    width="6.5"
                    height="14"
                    rx="2"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                <rect
                    x="40.5"
                    y="6"
                    width="6.5"
                    height="14"
                    rx="2"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
            </g>

            {/* Left Chair */}
            <g className="transition-transform duration-200">
                <rect
                    x="3.5"
                    y="12"
                    width="5"
                    height="15"
                    rx="2.5"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                <path
                    d="M8.5 22H14.5C15 22 15.5 22.4 15.5 23V25.5C15.5 26 15 26.5 14.5 26.5H8.5"
                    className="fill-indigo-200 dark:fill-indigo-900/90 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
                <path
                    d="M6 27L4.5 37M12 26.5L10.5 37"
                    className="stroke-slate-700 dark:stroke-indigo-400"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
            </g>

            {/* Right Chair */}
            <g className="transition-transform duration-200">
                <rect
                    x="55.5"
                    y="12"
                    width="5"
                    height="15"
                    rx="2.5"
                    className="fill-indigo-100 dark:fill-indigo-950/80 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                <path
                    d="M55.5 22H49.5C49 22 48.5 22.4 48.5 23V25.5C48.5 26 49 26.5 49.5 26.5H55.5"
                    className="fill-indigo-200 dark:fill-indigo-900/90 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
                <path
                    d="M58 27L59.5 37M52 26.5L53.5 37"
                    className="stroke-slate-700 dark:stroke-indigo-400"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
            </g>

            {/* Table (Center Extended) */}
            <g>
                <path
                    d="M20 23.5V34M44 23.5V34"
                    className="stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <path
                    d="M16 35H48"
                    className="stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                {/* Tabletop Surface */}
                <rect
                    x="11"
                    y="17"
                    width="42"
                    height="6.5"
                    rx="2"
                    className="fill-slate-50 dark:fill-slate-800 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.5"
                />
                {/* Bevel highlight */}
                <line
                    x1="13"
                    y1="19"
                    x2="51"
                    y2="19"
                    className="stroke-indigo-200 dark:stroke-indigo-600/40"
                    strokeWidth="1"
                    strokeLinecap="round"
                />
            </g>

            {/* 2 Front Chairs hints */}
            <g>
                <path
                    d="M22 25.5H28C28.5 25.5 29 26 29 26.5V28C29 28.5 28.5 29 28 29H22C21.5 29 21 28.5 21 28V26.5C21 26 21.5 25.5 22 25.5Z"
                    className="fill-indigo-200 dark:fill-indigo-900/90 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.2"
                />
                <path
                    d="M22.5 29L21.5 35M27.5 29L28.5 35"
                    className="stroke-slate-700 dark:stroke-indigo-400"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                />

                <path
                    d="M36 25.5H42C42.5 25.5 43 26 43 26.5V28C43 28.5 42.5 29 42 29H36C35.5 29 35 28.5 35 28V26.5C35 26 35.5 25.5 36 25.5Z"
                    className="fill-indigo-200 dark:fill-indigo-900/90 stroke-slate-700 dark:stroke-indigo-300"
                    strokeWidth="1.2"
                />
                <path
                    d="M36.5 29L35.5 35M41.5 29L42.5 35"
                    className="stroke-slate-700 dark:stroke-indigo-400"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                />
            </g>
        </svg>
    );
}
