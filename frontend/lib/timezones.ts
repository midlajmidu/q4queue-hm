/**
 * Curated list of important IANA timezones with human-readable labels.
 * Used in the branch settings timezone selector.
 */
export interface TimezoneOption {
  value: string;
  label: string;
  abbr: string;
}

export const TIMEZONES: TimezoneOption[] = [
  // South Asia
  { value: "Asia/Kolkata",        abbr: "IST",   label: "IST — India Standard Time (UTC+5:30)" },
  { value: "Asia/Colombo",        abbr: "SLST",  label: "SLST — Sri Lanka Standard Time (UTC+5:30)" },
  { value: "Asia/Dhaka",          abbr: "BST",   label: "BST — Bangladesh Standard Time (UTC+6)" },
  { value: "Asia/Kathmandu",      abbr: "NPT",   label: "NPT — Nepal Time (UTC+5:45)" },
  { value: "Asia/Karachi",        abbr: "PKT",   label: "PKT — Pakistan Standard Time (UTC+5)" },

  // Middle East & Gulf
  { value: "Asia/Dubai",          abbr: "GST",   label: "GST — Gulf Standard Time (UTC+4)" },
  { value: "Asia/Riyadh",         abbr: "AST",   label: "AST — Arabia Standard Time (UTC+3)" },
  { value: "Asia/Kuwait",         abbr: "AST",   label: "AST — Kuwait (UTC+3)" },
  { value: "Asia/Qatar",          abbr: "AST",   label: "AST — Qatar (UTC+3)" },
  { value: "Asia/Muscat",         abbr: "GST",   label: "GST — Oman (UTC+4)" },
  { value: "Asia/Bahrain",        abbr: "AST",   label: "AST — Bahrain (UTC+3)" },
  { value: "Asia/Jerusalem",      abbr: "IST",   label: "IST — Israel Standard Time (UTC+2/+3)" },
  { value: "Asia/Beirut",         abbr: "EET",   label: "EET — Lebanon (UTC+2/+3)" },

  // Southeast & East Asia
  { value: "Asia/Singapore",      abbr: "SGT",   label: "SGT — Singapore Time (UTC+8)" },
  { value: "Asia/Kuala_Lumpur",   abbr: "MYT",   label: "MYT — Malaysia Time (UTC+8)" },
  { value: "Asia/Bangkok",        abbr: "ICT",   label: "ICT — Indochina Time (UTC+7)" },
  { value: "Asia/Jakarta",        abbr: "WIB",   label: "WIB — Western Indonesia (UTC+7)" },
  { value: "Asia/Ho_Chi_Minh",    abbr: "ICT",   label: "ICT — Vietnam (UTC+7)" },
  { value: "Asia/Manila",         abbr: "PHT",   label: "PHT — Philippine Time (UTC+8)" },
  { value: "Asia/Shanghai",       abbr: "CST",   label: "CST — China Standard Time (UTC+8)" },
  { value: "Asia/Hong_Kong",      abbr: "HKT",   label: "HKT — Hong Kong Time (UTC+8)" },
  { value: "Asia/Tokyo",          abbr: "JST",   label: "JST — Japan Standard Time (UTC+9)" },
  { value: "Asia/Seoul",          abbr: "KST",   label: "KST — Korea Standard Time (UTC+9)" },

  // Europe
  { value: "Europe/London",       abbr: "GMT",   label: "GMT/BST — London (UTC+0/+1)" },
  { value: "Europe/Paris",        abbr: "CET",   label: "CET/CEST — Central Europe (UTC+1/+2)" },
  { value: "Europe/Berlin",       abbr: "CET",   label: "CET — Germany (UTC+1/+2)" },
  { value: "Europe/Madrid",       abbr: "CET",   label: "CET — Spain (UTC+1/+2)" },
  { value: "Europe/Amsterdam",    abbr: "CET",   label: "CET — Netherlands (UTC+1/+2)" },
  { value: "Europe/Moscow",       abbr: "MSK",   label: "MSK — Moscow Standard Time (UTC+3)" },
  { value: "Europe/Istanbul",     abbr: "TRT",   label: "TRT — Turkey Time (UTC+3)" },
  { value: "Europe/Athens",       abbr: "EET",   label: "EET — Eastern Europe (UTC+2/+3)" },

  // Africa
  { value: "Africa/Nairobi",      abbr: "EAT",   label: "EAT — East Africa Time (UTC+3)" },
  { value: "Africa/Cairo",        abbr: "EET",   label: "EET — Egypt (UTC+2/+3)" },
  { value: "Africa/Lagos",        abbr: "WAT",   label: "WAT — West Africa Time (UTC+1)" },
  { value: "Africa/Johannesburg", abbr: "SAST",  label: "SAST — South Africa (UTC+2)" },

  // Americas
  { value: "America/New_York",    abbr: "EST",   label: "EST/EDT — Eastern US & Canada (UTC-5/-4)" },
  { value: "America/Chicago",     abbr: "CST",   label: "CST/CDT — Central US (UTC-6/-5)" },
  { value: "America/Denver",      abbr: "MST",   label: "MST/MDT — Mountain US (UTC-7/-6)" },
  { value: "America/Los_Angeles", abbr: "PST",   label: "PST/PDT — Pacific US (UTC-8/-7)" },
  { value: "America/Toronto",     abbr: "EST",   label: "EST — Toronto, Canada (UTC-5/-4)" },
  { value: "America/Vancouver",   abbr: "PST",   label: "PST — Vancouver, Canada (UTC-8/-7)" },
  { value: "America/Sao_Paulo",   abbr: "BRT",   label: "BRT — Brazil Time (UTC-3)" },
  { value: "America/Mexico_City", abbr: "CST",   label: "CST — Mexico City (UTC-6/-5)" },
  { value: "America/Buenos_Aires",abbr: "ART",   label: "ART — Argentina (UTC-3)" },

  // Pacific & Oceania
  { value: "Australia/Sydney",    abbr: "AEST",  label: "AEST/AEDT — Sydney, Melbourne (UTC+10/+11)" },
  { value: "Australia/Perth",     abbr: "AWST",  label: "AWST — Perth (UTC+8)" },
  { value: "Australia/Brisbane",  abbr: "AEST",  label: "AEST — Brisbane (UTC+10)" },
  { value: "Pacific/Auckland",    abbr: "NZST",  label: "NZST — New Zealand (UTC+12/+13)" },

  // UTC
  { value: "UTC",                 abbr: "UTC",   label: "UTC — Coordinated Universal Time (UTC+0)" },
];

/** Look up the abbreviation for a given IANA tz value. */
export function tzAbbr(tz: string): string {
  return TIMEZONES.find(t => t.value === tz)?.abbr ?? tz;
}
