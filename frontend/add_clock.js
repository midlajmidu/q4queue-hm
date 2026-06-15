const fs = require('fs');

const p = '/Users/muzammil/Documents/q4queue/qrq/frontend/components/TopBar.tsx';
let content = fs.readFileSync(p, 'utf8');

const clockComponent = `
function LiveClock() {
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
}

export function TopBar`;

content = content.replace('export function TopBar', clockComponent);

const injectionPoint = `            {/* Right: Search, Notifs, Profile */}
            <div className="flex items-center gap-4">
                <ThemeToggle />`;

const injected = `            {/* Right: Clock, Theme, Notifs */}
            <div className="flex items-center gap-3 sm:gap-4">
                <LiveClock />
                <div className="w-px h-5 bg-gray-200 dark:bg-white/10 hidden md:block mx-1" />
                <ThemeToggle />`;

content = content.replace(injectionPoint, injected);

fs.writeFileSync(p, content, 'utf8');
