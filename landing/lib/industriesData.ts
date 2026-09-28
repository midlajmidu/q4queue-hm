import type { IndustryData } from "@/components/landing/IndustryDetailTemplate";

export const industriesMap: Record<string, IndustryData> = {
  banking: {
    slug: "banking",
    name: "Banking & Finance",
    title: "Bank Queue Management System",
    tagline: "BANKING SHOULDN'T BE A WAITING GAME.",
    description:
      "Reduce wait times, increase counter efficiency, and boost customer satisfaction with Q4Queue's intelligent bank queue management system.",
    image: "/images/solution-banking-advisory.jpg",
    imageAlt: "Bank queue management teller counter and financial advisor",
    stats: [
      { value: "80%", label: "Less Wait Times" },
      { value: "74%", label: "Increased Customer Satisfaction" },
      { value: "15+", label: "Core Enterprise Features" },
      { value: "30%", label: "Cost Savings on Traditional Kiosks" },
    ],
    whyDifferentTitle: "A Queue Management Revolution for Banks",
    whyDifferentText:
      "Q4Queue isn't just another bank queue system. We offer unmatched customization, data-driven optimization, and seamless mobile integration to transform your bank's queuing experience.",
    cards: [
      {
        title: "Unmatched Customization",
        description:
          "Unlike generic systems, Q4Queue tailors specifically to your branch needs. We adapt to prioritize complex wealth transactions, integrate with core banking software, and cater to diverse client demographics.",
        iconName: "sliders",
      },
      {
        title: "Data-Driven Branch Optimization",
        description:
          "Provide real-time data insights that empower you to optimize branch operations. Analyze peak hours, identify teller bottlenecks, and make informed staffing allocations.",
        iconName: "analytics",
      },
    ],
    features: [
      {
        title: "Appointment Scheduling",
        description:
          "Allow customers to schedule financial advisory appointments for specific times, reducing waiting times for walk-ins.",
        iconName: "calendar",
      },
      {
        title: "Priority Queuing",
        description:
          "Implement a priority queuing system for VIP account holders, seniors, or clients requiring specialized advisory desks.",
        iconName: "layers",
      },
      {
        title: "Reporting & Analytics",
        description:
          "Generate detailed reports on branch counter metrics, handle duration, and customer throughput to optimize operational strategies.",
        iconName: "analytics",
      },
      {
        title: "Kiosk Integration",
        description:
          "Integrate self-service lobby kiosks with Q4Queue to enhance customer check-in capabilities without dedicated staff.",
        iconName: "building",
      },
      {
        title: "Digital Signage Feeds",
        description:
          "Display live queue status on lobby Smart TVs to keep waiting visitors informed about current ticket calls.",
        iconName: "tv",
      },
      {
        title: "Real-time Notifications",
        description:
          "Automated WhatsApp and SMS alerts keep bank visitors updated on their approaching turn so they can wait comfortably.",
        iconName: "bell",
      },
      {
        title: "Virtual Queueing",
        description:
          "Allow customers to scan a QR code at entrance or remotely join the queue from their mobile browser.",
        iconName: "smartphone",
      },
      {
        title: "Occupancy Limiter",
        description:
          "Maintain safe and manageable lobby queue lengths within designated branch limits during peak hours.",
        iconName: "shield",
      },
    ],
  },

  healthcare: {
    slug: "healthcare",
    name: "Healthcare & Clinics",
    title: "Healthcare & Patient Queue Management System",
    tagline: "PATIENT CARE STARTS IN THE WAITING ROOM.",
    description:
      "Eliminate crowded clinic waiting rooms, streamline triage dispatching, and provide real-time status updates for waiting patients.",
    image: "/images/solution-healthcare-clinical.jpg",
    imageAlt: "Modern healthcare clinic triage and reception area",
    stats: [
      { value: "65%", label: "Reduction in Lobby Overcrowding" },
      { value: "88%", label: "Higher Patient Satisfaction (CSAT)" },
      { value: "100%", label: "HIPAA Compliant Token Identification" },
      { value: "40%", label: "Faster Emergency Triage Dispatch" },
    ],
    whyDifferentTitle: "Calm, Safe & Efficient Patient Check-in",
    whyDifferentText:
      "Transform frantic clinic waiting rooms into calm, organized environments where patients can wait safely in their cars or outdoors.",
    cards: [
      {
        title: "Clinical Priority Triage",
        description:
          "Intelligently prioritize emergency patients, elderly visitors, and specialized lab work over routine check-ins.",
        iconName: "stethoscope",
      },
      {
        title: "HIPAA Token Anonymity",
        description:
          "Protect patient privacy on public lobby screens by utilizing encrypted ticket IDs instead of announcing full names.",
        iconName: "shield",
      },
    ],
    features: [
      {
        title: "Appointment & Walk-in Sync",
        description:
          "Seamlessly blend pre-scheduled patient appointments with walk-in urgent care visitors in a single queue.",
        iconName: "calendar",
      },
      {
        title: "Emergency Triage Override",
        description:
          "Allow triage nurses to instantly bump critical patients to the front of the queue with one click.",
        iconName: "layers",
      },
      {
        title: "Patient Wait Analytics",
        description:
          "Track consultation durations, doctor handle times, and lab turnaround speeds to eliminate clinical delays.",
        iconName: "analytics",
      },
      {
        title: "Self Check-in Kiosks",
        description:
          "Provide touchless lobby QR scan or kiosk check-in so patients register in under 5 seconds.",
        iconName: "smartphone",
      },
      {
        title: "Lobby Status Displays",
        description:
          "Broadcast active patient call numbers and estimated wait times on wall-mounted TV monitors.",
        iconName: "tv",
      },
      {
        title: "Automated SMS & Call Alerts",
        description:
          "Send automated SMS or browser alerts when the doctor is ready, allowing patients to wait outside.",
        iconName: "bell",
      },
      {
        title: "Multi-Department Routing",
        description:
          "Transfer patients effortlessly between registration, radiology, blood lab, and pharmacy desks.",
        iconName: "building",
      },
      {
        title: "Staff Workload Balancer",
        description:
          "Equally distribute patient volume across active consultation rooms and nursing desks.",
        iconName: "sliders",
      },
    ],
  },

  retail: {
    slug: "retail",
    name: "Retail & Flagships",
    title: "Retail & Boutique Queue Management System",
    tagline: "DON'T LET WAITING LINES DERAIL IN-STORE SALES.",
    description:
      "Transform long lines into active browsing time. Let shoppers join virtual queues for fitting rooms, styling suites, or pickup desks.",
    image: "/images/solution-queue-retail.jpg",
    imageAlt: "Luxury retail flagship store with personal styling desk",
    stats: [
      { value: "+28%", label: "Increase in In-Store Browsing Sales" },
      { value: "92%", label: "Customer Retained During Peak Hours" },
      { value: "3x", label: "Faster Fitting Room Turnover" },
      { value: "4.9/5", label: "Shopper Experience Rating" },
    ],
    whyDifferentTitle: "Turn Waiting Shoppers Into Active Buyers",
    whyDifferentText:
      "When customers are free from physical lines, they continue exploring your store shelves, increasing average basket size.",
    cards: [
      {
        title: "Fitting Room & Styling Queue",
        description:
          "Manage busy fitting room queues effortlessly. Notify shoppers via WhatsApp when their dressing room or stylist is ready.",
        iconName: "shopping-bag",
      },
      {
        title: "Bespoke VIP Clienteling",
        description:
          "Route high-value clients automatically to dedicated personal shoppers and private consultation suites.",
        iconName: "users",
      },
    ],
    features: [
      {
        title: "Click-and-Collect Pickup",
        description:
          "Express QR queueing for online order pickup counters to ensure sub-2-minute handoffs.",
        iconName: "zap",
      },
      {
        title: "Virtual Fitting Room Queue",
        description:
          "Shoppers scan a QR code outside fitting rooms and continue shopping until alerted.",
        iconName: "smartphone",
      },
      {
        title: "Stylist Match Analytics",
        description:
          "Measure average styling session lengths and associate efficiency during peak weekend sales.",
        iconName: "analytics",
      },
      {
        title: "Luxury Lobby Displays",
        description:
          "Sleek digital signage integrated into store decor showing queue updates without disrupting brand aesthetics.",
        iconName: "tv",
      },
      {
        title: "Instant SMS / WhatsApp Alerts",
        description:
          "Send personalized alerts when the customer's dedicated desk or room is open.",
        iconName: "bell",
      },
      {
        title: "Multi-Floor Counter Routing",
        description:
          "Guide shoppers to alternative counters or floors with shorter wait times.",
        iconName: "layers",
      },
      {
        title: "VIP Priority Fast-Track",
        description:
          "Prioritize loyalty members and VIP shoppers for fast-track service desks.",
        iconName: "sliders",
      },
      {
        title: "Store Foot Traffic Analytics",
        description:
          "Track walk-in hourly curves, wait duration drop-offs, and associate performance.",
        iconName: "analytics",
      },
    ],
  },

  entertainment: {
    slug: "entertainment",
    name: "Entertainment & Leisure",
    title: "Entertainment Arena & Arcade Queue System",
    tagline: "KEEP THE FUN GOING. ELIMINATE LINE DRAMA.",
    description:
      "Power high-capacity bowling alleys, arcade arenas, VR centers, and theme parks with zero-latency virtual queueing.",
    image: "/images/amoeba-venue-spotlight.jpg",
    imageAlt: "Amoeba entertainment center arcade and bowling arena",
    stats: [
      { value: "2.8M+", label: "Guests Queued & Served" },
      { value: "-45%", label: "Reduction in Rush Walkaways" },
      { value: "45+", label: "Venues & Arenas Powered" },
      { value: "+32%", label: "F&B Arcade Revenue Boost" },
    ],
    whyDifferentTitle: "Maximum Fun, Zero Standing in Line",
    whyDifferentText:
      "When guests don't have to stand in crowded physical lines for bowling lanes or rides, they spend more time eating, drinking, and gaming.",
    cards: [
      {
        title: "Lane & Attraction Turnover Sync",
        description:
          "Sync lane managers directly with pit tablets so guests get notified the exact second a lane or arena is sanitized and open.",
        iconName: "gamepad",
      },
      {
        title: "F&B Revenue Multiplier",
        description:
          "Unlocking visitors from line constraints drives immediate food, beverage, and arcade card top-up spend.",
        iconName: "utensils",
      },
    ],
    features: [
      {
        title: "Self-Service Lane Kiosks",
        description:
          "Guests book bowling or VR sessions at lobby touchscreen kiosks or via QR scan.",
        iconName: "building",
      },
      {
        title: "WhatsApp & SMS Callouts",
        description:
          "Send instant alerts with a 5-minute arrival window so guests return promptly to their assigned lane.",
        iconName: "bell",
      },
      {
        title: "Smart TV Lobby Boards",
        description:
          "Vibrant TV screen matrices displaying party names, lane numbers, and loud chime announcements.",
        iconName: "tv",
      },
      {
        title: "Multi-Attraction Triage",
        description:
          "Allow visitors to queue for bowling, laser tag, and VR experiences simultaneously.",
        iconName: "layers",
      },
      {
        title: "Group Party Queueing",
        description:
          "Manage large birthday parties and corporate groups with party size tagging and shoe desk sync.",
        iconName: "users",
      },
      {
        title: "Surge Rush Analytics",
        description:
          "Analyze weekend peak hour curves and lane turnover speeds to optimize venue staffing.",
        iconName: "analytics",
      },
      {
        title: "TOTP Anti-Screenshot QR",
        description:
          "Dynamic rotating QR tokens ensure physical venue presence and eliminate ticket trading.",
        iconName: "shield",
      },
      {
        title: "Staff Operator Console",
        description:
          "Pit managers call, bump, or extend lane sessions from a single mobile tablet interface.",
        iconName: "sliders",
      },
    ],
  },

  government: {
    slug: "government",
    name: "Civic & Government",
    title: "Government & Municipal Queue Management System",
    tagline: "EFFICIENT PUBLIC SERVICES FOR EVERY CITIZEN.",
    description:
      "Streamline high-volume municipal halls, passport offices, permit desks, and civic centers with automated citizen dispatch.",
    image: "/images/solution-government-civic.jpg",
    imageAlt: "Civic service government hall with digital queue screens",
    stats: [
      { value: "10k+", label: "Daily Citizen Volume Handled" },
      { value: "< 2 min", label: "Avg Self Check-in Speed" },
      { value: "100%", label: "Audit Log & Compliance Tracking" },
      { value: "-50%", label: "Counter Waiting Congestion" },
    ],
    whyDifferentTitle: "Modernizing Public Service Operations",
    whyDifferentText:
      "Provide citizens with a dignified, transparent queuing experience while offering supervisors complete real-time auditability.",
    cards: [
      {
        title: "Multi-Department Triage",
        description:
          "Route citizens seamlessly across licensing, land records, tax collection, and permit validation counters.",
        iconName: "landmark",
      },
      {
        title: "Complete Audit & Accountability",
        description:
          "Track citizen transaction times per window officer with immutable log records for municipal oversight.",
        iconName: "shield",
      },
    ],
    features: [
      {
        title: "Civic Hall TV Signage",
        description:
          "High-visibility TV displays broadcasting ticket numbers, counter windows, and audio voice synthesis.",
        iconName: "tv",
      },
      {
        title: "Citizens Virtual Queueing",
        description:
          "Citizens scan QR codes at the entrance to receive live wait position alerts on their phone browser.",
        iconName: "smartphone",
      },
      {
        title: "Window Staff Calling Console",
        description:
          "One-click window terminal interface to call next ticket, transfer, or place on hold.",
        iconName: "sliders",
      },
      {
        title: "Senior & Disability Priority",
        description:
          "Automated priority dispatching for senior citizens and individuals requiring accessible assistance.",
        iconName: "layers",
      },
      {
        title: "Appointment Booking Integration",
        description:
          "Sync online appointment slots with walk-in citizen queues at municipal service counters.",
        iconName: "calendar",
      },
      {
        title: "Department Throughput Reports",
        description:
          "Export daily, weekly, and monthly municipal efficiency reports for executive council reviews.",
        iconName: "analytics",
      },
      {
        title: "Multi-Language UI Support",
        description:
          "Support regional language translations on kiosks, TV displays, and mobile visitor screens.",
        iconName: "building",
      },
      {
        title: "Multi-Branch Municipal Hub",
        description:
          "Manage regional civic offices across cities from a single master administrative dashboard.",
        iconName: "shield",
      },
    ],
  },

  restaurants: {
    slug: "restaurants",
    name: "Restaurants & Hospitality",
    title: "Restaurant & Table Waitlist Queue System",
    tagline: "NO MORE PHYSICAL HOSTESS STAND CONGESTION.",
    description:
      "Manage dining waitlists, table turnover, and guest callouts with automated WhatsApp notifications and host stand control.",
    image: "/images/solution-hybrid-hospitality.jpg",
    imageAlt: "Busy dining room and restaurant hostess table waitlist",
    stats: [
      { value: "0", label: "Hostess Stand Crowding" },
      { value: "95%", label: "Guest Table Claim Rate" },
      { value: "-40%", label: "Table Idle Seating Gap" },
      { value: "+22%", label: "Bar & Appetizer Revenue" },
    ],
    whyDifferentTitle: "Delight Diners From The Moment They Arrive",
    whyDifferentText:
      "Let guests enjoy a drink at the bar or walk nearby while hostesses manage table waitlists effortlessly from a tablet.",
    cards: [
      {
        title: "Table Size Smart Routing",
        description:
          "Filter waitlists automatically by party size (2-top, 4-top, booth, outdoor) to seat guests faster.",
        iconName: "utensils",
      },
      {
        title: "WhatsApp 2-Way Confirmation",
        description:
          "Guests receive a WhatsApp message when their table is ready and can reply '1' to confirm or '2' to cancel.",
        iconName: "bell",
      },
    ],
    features: [
      {
        title: "QR Code Self Waitlist",
        description:
          "Diners scan a hostess QR stand to join the waitlist without waiting for a staff member.",
        iconName: "smartphone",
      },
      {
        title: "Live Wait Status Page",
        description:
          "Real-time countdown showing table prep status and live position ranking for waiting guests.",
        iconName: "clock",
      },
      {
        title: "Hostess Tablet Dashboard",
        description:
          "Intuitive seating layout interface to manage floor plans, party sizes, and open tables.",
        iconName: "sliders",
      },
      {
        title: "Bar Spend Booster",
        description:
          "Guests spend waiting time at the bar instead of standing in doorway bottlenecks.",
        iconName: "utensils",
      },
      {
        title: "Peak Rush Analytics",
        description:
          "Track table turn speeds, average dining duration, and walkaway rates across shifts.",
        iconName: "analytics",
      },
      {
        title: "SMS & WhatsApp Reminders",
        description:
          "Instant automated text notifications with a 5-minute table claim timer.",
        iconName: "bell",
      },
      {
        title: "VIP Party Tagging",
        description:
          "Tag regular diners, VIP guests, or special anniversary celebrations for priority seating.",
        iconName: "users",
      },
      {
        title: "Multi-Location Control",
        description:
          "Manage waitlists across restaurant chains and franchise locations centrally.",
        iconName: "building",
      },
    ],
  },
};
