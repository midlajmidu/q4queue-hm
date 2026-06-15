const fs = require('fs');

const p = '/Users/muzammil/Documents/q4queue/qrq/frontend/components/TopBar.tsx';
let content = fs.readFileSync(p, 'utf8');

const oldClock = `function LiveClock() {
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date());
        const interval = setInterval(() => setTime(new Date()), 1000); // update every second for precision
        return () => clearInterval(interval);
    }, []);

    if (!time) return <div className="hidden md:block w-[140px] h-[30px] animate-pulse bg-gray-100 dark:bg-white/5 rounded-lg" />;

    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/5 rounded-lg shadow-sm cursor-default transition-colors hover:bg-gray-100 dark:hover:bg-slate-800">
            <span className="text-[12px] font-bold text-gray-700 dark:text-gray-200 tracking-tight">{timeStr}</span>
            <div className="w-px h-3.5 bg-gray-300 dark:bg-slate-600" />
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{dateStr}</span>
        </div>
    );
}`;

const newClock = `function LiveClock() {
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date());
        const interval = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    if (!time) return <div className="hidden md:block w-[140px] h-[32px] animate-pulse bg-gray-100 dark:bg-white/5 rounded-full" />;

    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="hidden md:flex items-center gap-2.5 px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-white/10 rounded-full shadow-sm select-none">
            {/* Live Pulsing Dot */}
            <div className="relative flex h-2 w-2 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </div>
            
            <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-none">{timeStr}</span>
                <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-[1px]">{dateStr}</span>
            </div>
        </div>
    );
}`;

content = content.replace(oldClock, newClock);
fs.writeFileSync(p, content, 'utf8');
