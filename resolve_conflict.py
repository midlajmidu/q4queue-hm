import sys
import re

with open("frontend/app/track/[trackingId]/page.tsx", "r") as f:
    content = f.read()

# We need to replace the entire conflict block from <<<<<<< HEAD to >>>>>>> ...
head_content = """    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isInteracting, setIsInteracting] = useState(false);
    const interactTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleInteraction = useCallback(() => {
        setIsInteracting(true);
        if (interactTimeoutRef.current) clearTimeout(interactTimeoutRef.current);
        interactTimeoutRef.current = setTimeout(() => {
            setIsInteracting(false);
        }, 1500);
    }, []);

    const isDragging = useRef(false);
    const startX = useRef(0);
    const initialScrollLeft = useRef(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        if (scrollContainerRef.current) {
            startX.current = e.pageX - scrollContainerRef.current.offsetLeft;
            initialScrollLeft.current = scrollContainerRef.current.scrollLeft;
        }
        handleInteraction();
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX.current) * 2;
        scrollContainerRef.current.scrollLeft = initialScrollLeft.current - walk;
        handleInteraction();
    };

    const handleMouseUpOrLeave = () => {
        isDragging.current = false;
    };

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el || isInteracting || activeServingTokens.length <= 3) return;

        let animationFrameId: number;
        const speed = 0.5; // pixels per frame
        let currentScroll = el.scrollLeft;

        const scroll = () => {
            currentScroll += speed;
            if (currentScroll >= el.scrollWidth / 2) {
                currentScroll -= (el.scrollWidth / 2);
            }
            if (el) {
                el.scrollLeft = currentScroll;
            }
            animationFrameId = requestAnimationFrame(scroll);
        };
        animationFrameId = requestAnimationFrame(scroll);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isInteracting, activeServingTokens.length]);

    const bgGradient = isMyTurn 
        ? "from-emerald-900 via-emerald-800 to-teal-900" 
        : isNext 
            ? "from-indigo-900 via-purple-900 to-slate-900"
            : "from-[#0f172a] via-[#1e1b4b] to-[#020617]";

    const cardGlass = "bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]";

    // Approximate progress ring calculation (max 100 people for full circle visual)
    const progressDashoffset = isMyTurn ? 0 : Math.max(0, 289 - (289 * (1 - Math.min(peopleAhead, 20) / 20)));

    return (
        <main className={`min-h-screen flex flex-col p-4 sm:p-6 transition-colors duration-700 bg-gradient-to-br ${bgGradient} text-white relative`}>
            {/* Absolute positioning for ConnectionBadge */}
            <div className="absolute top-4 right-4 z-50">
                <ConnectionBadge status={queueClosed ? "disconnected" : wsStatus} />
            </div>

            <div className="flex-1 w-full max-w-md mx-auto flex flex-col justify-center relative pb-24">
                
                {/* Header (Logo + Queue Name) */}
                <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    {fullLogoUrl && (
                        <div className="flex justify-center mb-4">
                            <img src={fullLogoUrl} alt="Logo" className="h-16 object-contain drop-shadow-2xl bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20" />
                        </div>
                    )}
                    <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md">{queueName}</h1>
                    <p className="text-white/70 text-sm font-semibold uppercase tracking-widest mt-1">
                        {queueClosed ? "Currently Closed" : "Live Token Tracking"}
                    </p>

                    {activeServingTokens.length === 0 ? (
                        <div className="mt-4 text-6xl font-black tabular-nums tracking-tight py-4 bg-white/10 rounded-xl border border-white/20" aria-live="polite" aria-atomic="true" aria-label="No one is currently serving">
                            —
                        </div>
                    ) : activeServingTokens.length === 1 ? (
                        <div className="mt-4 text-6xl font-black tabular-nums tracking-tight py-4 bg-white/10 rounded-xl border border-white/20" aria-live="polite" aria-atomic="true" aria-label={`Currently serving token ${prefix}${activeServingTokens[0].token_number}`}>
                            {prefix}{activeServingTokens[0].token_number}
                        </div>
                    ) : activeServingTokens.length <= 3 ? (
                        <div className="mt-4 py-3 bg-white/10 rounded-xl border border-white/20 px-4" aria-live="polite" aria-atomic="true" aria-label={`Currently serving tokens: ${activeServingTokens.map(t => `${prefix}${t.token_number}`).join(', ')}`}>
                            <div className="flex justify-center gap-3">
                                {activeServingTokens.map((t) => (
                                    <div key={t.id} className="bg-white/25 backdrop-blur-sm rounded-lg px-4 py-2 flex flex-col items-center min-w-[70px] shrink-0">
                                        <span className="text-3xl font-black tabular-nums tracking-tight leading-none text-white">{prefix}{t.token_number}</span>
                                        {t.assigned_line != null && (
                                            <span className="text-[10px] font-bold text-white/90 mt-1">Line {t.assigned_line}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 overflow-hidden w-full relative py-2 bg-white/10 rounded-xl border border-white/20" aria-live="polite" aria-atomic="true" aria-label={`Currently serving tokens: ${activeServingTokens.map(t => `${prefix}${t.token_number}`).join(', ')}`}>
                            <style>{`
                                .hide-scroll::-webkit-scrollbar { display: none; }
                            `}</style>
                            <div 
                                ref={scrollContainerRef}
                                className="flex flex-nowrap items-center gap-4 px-4 overflow-x-auto whitespace-nowrap hide-scroll cursor-grab active:cursor-grabbing select-none"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                onTouchStart={handleInteraction}
                                onTouchMove={handleInteraction}
                                onWheel={handleInteraction}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUpOrLeave}
                                onMouseLeave={handleMouseUpOrLeave}
                            >
                                {(activeServingTokens.length > 3 ? [...activeServingTokens, ...activeServingTokens] : activeServingTokens).map((t, idx) => (
                                    <div key={`${t.id}-${idx}`} className="bg-white/25 backdrop-blur-sm rounded-lg px-4 py-2 flex flex-col items-center min-w-[80px] shrink-0">
                                        <span className="text-3xl font-black tabular-nums tracking-tight leading-none text-white">{prefix}{t.token_number}</span>
                                        {t.assigned_line != null && (
                                            <span className="text-[10px] font-bold text-white/90 mt-1">Line {t.assigned_line}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-3 flex justify-center gap-6 text-xs text-blue-200">
                        <span>Waiting: <strong className="text-white">{displayWaitingCount}</strong></span>
                    </div>"""

# Find the conflict block
pattern = re.compile(r'<<<<<<< HEAD\n.*?\n=======\n.*?\n>>>>>>> [a-f0-9]+\n', re.DOTALL)
new_content = pattern.sub(head_content, content)

with open("frontend/app/track/[trackingId]/page.tsx", "w") as f:
    f.write(new_content)

print("Conflict resolved.")
