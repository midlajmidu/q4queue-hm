import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outDir = "outputs/q4queue-cost-audit";
const outFile = `${outDir}/Q4Queue_Internal_Cost_Pricing_Simulator.xlsx`;
const wb = Workbook.create();

const navy = "#17324D";
const blue = "#0000FF";
const paleBlue = "#EAF2F8";
const paleTan = "#FFF2CC";
const paleGreen = "#E2F0D9";
const paleRed = "#FCE4D6";
const grey = "#667085";
const rupeeFmt = '₹#,##0;[Red](₹#,##0);-';
const rupee2Fmt = '₹0.00;[Red](₹0.00);-';
const pctFmt = "0.0%";
const intFmt = "#,##0";
const decFmt = "#,##0.0";

function title(sheet, text, subtitle, width) {
  sheet.showGridLines = false;
  sheet.getRange(`A1:${width}1`).format.borders = { bottom: { style: "thin", color: "#9AA4B2" } };
  sheet.getRange("A1").values = [[text]];
  sheet.getRange("A1").format.font = { bold: true, size: 16, color: navy };
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange(`A2:${width}2`).format.font = { italic: true, size: 10, color: grey };
}

function header(range) {
  range.format.fill = navy;
  range.format.font = { bold: true, color: "#FFFFFF" };
  range.format.horizontalAlignment = "center";
  range.format.verticalAlignment = "center";
  range.format.wrapText = true;
  range.format.borders = { preset: "all", style: "thin", color: "#FFFFFF" };
}

function section(sheet, row, text, width) {
  sheet.mergeCells(`A${row}:${width}${row}`);
  const r = sheet.getRange(`A${row}:${width}${row}`);
  r.values = [[text]];
  r.format.fill = paleBlue;
  r.format.font = { bold: true, color: navy };
  r.format.borders = { preset: "outside", style: "thin", color: "#B8C5D1" };
}

const pv = wb.worksheets.add("Production Validation");
pv.tabColor = "#C00000";
title(pv, "Known vs unknown production metrics", "Local observations are not production facts. Replace unknowns with provider invoices and production-server measurements before approving pricing.", "G");
pv.getRange("A5:G5").values = [["Metric", "Current value", "Source", "Confidence", "Production status", "How to verify", "Owner / evidence needed"]];
header(pv.getRange("A5:G5"));
const validationRows = [
  ["Production server cost", "Unknown; previous ₹4,560 is a benchmark", "No invoice in repository", "None", "UNKNOWN — NEEDS INPUT", "Export latest 3 host invoices and plan/spec page", "Founder / cloud billing admin"],
  ["CPU", "Configured container limits total 5.0 vCPU; host guide minimum 4 vCPU", "docker-compose.yml; production guide", "High for configuration", "PROVISIONAL — actual host/peak unknown", "Run collection script during peak and export provider CPU metrics for 30 days", "DevOps"],
  ["RAM", "Configured 2,432 MiB in root Compose; alternate production Compose 3,200 MiB", "Compose files", "High for configuration", "PROVISIONAL — actual host/peak unknown", "Run collection script during peak and export provider memory metrics for 30 days", "DevOps"],
  ["Disk", "Guide: 50 GB minimum / 100+ GB recommended; local PostgreSQL volume 49,988,834 bytes", "Production guide; local Docker measurement", "High local / none production", "UNKNOWN — NEEDS INPUT", "Capture df, Docker volume usage, database and backup directories on production", "DevOps"],
  ["Bandwidth", "Local container counters only; not a monthly production measure", "docker stats local snapshot", "None for production", "UNKNOWN — NEEDS INPUT", "Export provider/CDN monthly ingress and egress plus peak Mbps for 90 days", "Cloud billing admin"],
  ["PostgreSQL size", "Local DB 9,567,591 bytes; local data directory 49,988,834 bytes", "Read-only local PostgreSQL measurement", "High local / none production", "UNKNOWN — NEEDS INPUT", "Run pg_database_size and pg_total_relation_size on production", "DBA / DevOps"],
  ["Redis memory", "Local used 1.29 MiB; RSS 8.00 MiB; configured max 128 MiB", "redis-cli INFO memory on local stack", "High local / none production", "UNKNOWN — NEEDS INPUT", "Run Redis INFO memory/stats/clients at idle and peak on production", "DevOps"],
  ["Monthly tokens", "Local live DB 0; retained full dump has 32 tokens in 2026-06; latest branch backup has 6 in 2026-08 and 1 in 2026-09", "Local DB and retained backup metadata", "High for artifacts / low production relevance", "UNKNOWN — NEEDS INPUT", "Query production tokens grouped by billing month and organisation for 12 months", "Product / DBA"],
  ["Local idle runtime", "Backend 326.9 MiB; frontend 105.1 MiB; PostgreSQL 71.4 MiB; Redis 13.2 MiB; Nginx 13.5 MiB", "docker stats snapshot 2026-09-06", "High local only", "OBSERVED LOCALLY — NOT PRODUCTION", "Collect peak and p95 production samples; do not extrapolate idle snapshot", "DevOps"],
  ["Local backup footprint", "155 files; 242,110,835 bytes; 144 full dumps and 11 branch backups", "Workspace filesystem measurement", "High local only", "OBSERVED LOCALLY — NOT CURRENT PRODUCTION", "Measure production backup count/bytes, destination, retention and restore success", "DevOps"],
  ["WhatsApp delivered volume/rate", "Unknown", "No WABA invoice or Insights export", "None", "UNKNOWN — NEEDS INPUT", "Export 90 days by category/country/status and invoice amount", "Meta WABA admin"],
  ["Voice minutes/rate", "Unknown", "No Plivo invoice/usage export", "None", "UNKNOWN — NEEDS INPUT", "Export 90 days of billed minutes, legs, retries, number rental and taxes", "Plivo billing admin"],
  ["Peak API and WebSocket load", "Unknown", "No production APM/load-balancer history", "None", "UNKNOWN — NEEDS INPUT", "Collect RPS, p50/p95/p99 latency, errors, active sockets and bytes/event", "DevOps / Backend"],
];
pv.getRange(`A6:G${5 + validationRows.length}`).values = validationRows;
pv.getRange(`A6:G${5 + validationRows.length}`).format.wrapText = true;
pv.getRange(`A6:G${5 + validationRows.length}`).format.borders = { preset: "all", style: "thin", color: "#D9E1F2" };
pv.getRange(`E6:E${5 + validationRows.length}`).conditionalFormats.add("containsText", { text: "UNKNOWN", format: { fill: paleRed, font: { bold: true, color: "#9C0006" } } });
pv.getRange(`E6:E${5 + validationRows.length}`).conditionalFormats.add("containsText", { text: "OBSERVED", format: { fill: paleTan, font: { bold: true, color: "#7F6000" } } });
section(pv, 21, "Minimum evidence required before replacing provisional pricing", "G");
pv.getRange("A22:G26").values = [
  ["Evidence pack", "3 months host invoices", "30-day CPU/RAM/disk charts", "12-month token export", "90-day communication invoices", "Database/table sizes", "Peak-load test results"],
  ["Required fields", "Amount, tax, plan, region", "average, p95, peak", "organisation, month, status", "category, delivered, failed, rate", "table, indexes, backups", "RPS, sockets, p95/p99, errors"],
  ["Current state", "Missing", "Missing", "Missing", "Missing", "Missing", "Missing"],
  ["Pricing decision", "Do not finalize fixed allocation", "Do not publish capacity", "Do not finalize token allowance", "Do not absorb messages", "Do not finalize retention cost", "Do not promise SLA"],
  ["Next action", "Export billing CSV/PDF", "Export provider monitoring", "Run SQL in collection script", "Export Meta/Plivo CSV", "Run SQL/disk commands", "Run staged production-like test"],
];
header(pv.getRange("A22:G22"));
pv.getRange("A23:G26").format.wrapText = true;
pv.getRange("A23:G26").format.borders = { preset: "all", style: "thin", color: "#D9E1F2" };
pv.getRange("A:G").format.columnWidth = 25;
pv.getRange("A:A").format.columnWidth = 24;
pv.getRange("B:B").format.columnWidth = 34;
pv.getRange("C:C").format.columnWidth = 28;
pv.getRange("F:G").format.columnWidth = 38;
pv.getRange("A1:G28").format.font.name = "Arial";
pv.getRange("A1:G28").format.verticalAlignment = "center";
pv.freezePanes.freezeRows(5);

const a = wb.worksheets.add("Assumptions");
a.tabColor = "#D6B656";
title(a, "Q4Queue cost and pricing assumptions", "Blue values are editable. Labels state whether each input is verified, estimated, assumed, or unknown.", "F");
section(a, 5, "Core cost drivers", "F");
a.getRange("A6:F6").values = [["Input", "Value", "Unit", "Evidence label", "Basis", "Source ID"]];
header(a.getRange("A6:F6"));
const core = [
  ["USD to INR", 95, "₹ / USD", "PROVISIONAL — ASSUMPTION", "Rounded planning rate; update monthly", "S8"],
  ["Base server", 4560, "₹ / month", "PROVISIONAL — BENCHMARK", "$48 benchmark × ₹95; not actual invoice", "S4"],
  ["Email account", 650, "₹ / month", "VERIFIED FROM PROVIDER PRICING", "Google Workspace flexible list rate", "S6"],
  ["Domain allocation", 100, "₹ / month", "PROVISIONAL — ASSUMPTION", "Annual domain/12; registrar unknown", ""],
  ["Off-site backup allowance", 300, "₹ / month", "PROVISIONAL — ASSUMPTION", "Not implemented in current compose", "S7"],
  ["Meta utility message", 0.115, "₹ / delivered message", "PROVISIONAL — ESTIMATED", "Planning rate; verify current WABA India rate card", "S1"],
  ["Payment processing", 0.0236, "% revenue", "VERIFIED FROM PROVIDER PRICING", "2% fee plus 18% GST on fee", "S5"],
  ["Support/operations allowance", 0.08, "% revenue", "PROVISIONAL — ASSUMPTION", "COGS planning allowance", ""],
  ["Variable infra per 1,000 tokens", 7, "₹", "PROVISIONAL — ESTIMATED", "Compute, DB work and bandwidth within included transfer", ""],
  ["Live DB footprint per token", 10, "KB", "PROVISIONAL — ESTIMATED", "Token, audit, WhatsApp message and webhook rows/indexes", ""],
  ["Backup multiplier", 2.5, "x live DB", "PROVISIONAL — ASSUMPTION", "Compressed rolling logical dumps", ""],
  ["API requests per token lifecycle", 5, "requests", "PROVISIONAL — ESTIMATED", "Join, tracking, staff action and allocated dashboard traffic", ""],
  ["Bandwidth per token lifecycle", 1, "MB", "PROVISIONAL — ESTIMATED", "Snapshot fanout and page/API allocation", ""],
  ["WhatsApp messages per token", 1.6, "messages", "PROVISIONAL — ASSUMPTION", "60% join opt-in plus later alerts for active responders", ""],
  ["Target gross margin", 0.8, "%", "PROVISIONAL — ASSUMPTION", "SaaS planning target", ""],
  ["Base-cost allocation customers", 100, "organisations", "PROVISIONAL — ASSUMPTION", "Normalised unit economics denominator", ""],
];
a.getRange(`A7:F${6 + core.length}`).values = core;
a.getRange(`B7:B${6 + core.length}`).format.font = { color: blue };
a.getRange("B7:B22").format.numberFormat = [[decFmt],[rupeeFmt],[rupeeFmt],[rupeeFmt],[rupeeFmt],[rupee2Fmt],[pctFmt],[pctFmt],[rupeeFmt],[decFmt],[decFmt],[decFmt],[decFmt],[decFmt],[pctFmt],[intFmt]];

section(a, 26, "Plan design and average utilisation", "J");
a.getRange("A27:J27").values = [["Plan", "Price / month", "Token cap", "Average tokens", "Queues", "Branches", "Staff", "Sessions / month", "Included WhatsApp", "Evidence label"]];
header(a.getRange("A27:J27"));
const plans = [
  ["Starter", 999, 1000, 600, 3, 1, 3, 40, 100, "PROVISIONAL — RECOMMENDED"],
  ["Growth", 2499, 5000, 3000, 10, 3, 10, 120, 300, "PROVISIONAL — RECOMMENDED"],
  ["Business", 6999, 20000, 12000, 30, 10, 30, 400, 1000, "PROVISIONAL — RECOMMENDED"],
  ["Enterprise", 50000, 100000, 60000, 100, 25, 100, 1200, 5000, "PROVISIONAL — ESTIMATED"],
];
a.getRange("A28:J31").values = plans;
a.getRange("B28:I31").format.font = { color: blue };
a.getRange("B28:B31").format.numberFormat = [[rupeeFmt],[rupeeFmt],[rupeeFmt],[rupeeFmt]];
a.getRange("C28:I31").format.numberFormat = Array.from({length:4},()=>Array(7).fill(intFmt));

section(a, 34, "Scale simulator plan mix", "F");
a.getRange("A35:F35").values = [["Plan", "Mix", "Average monthly tokens", "Included WhatsApp", "Price", "Check"]];
header(a.getRange("A35:F35"));
a.getRange("A36:A39").values = plans.map(x=>[x[0]]);
a.getRange("B36:B39").values = [[0.60],[0.30],[0.09],[0.01]];
a.getRange("C36:E39").formulas = plans.map((_,i)=>[`=D${28+i}`,`=I${28+i}`,`=B${28+i}`]);
a.getRange("F36:F39").formulas = [["=IF(B36>=0,\"OK\",\"Invalid\")"],["=IF(B37>=0,\"OK\",\"Invalid\")"],["=IF(B38>=0,\"OK\",\"Invalid\")"],["=IF(B39>=0,\"OK\",\"Invalid\")"]];
a.getRange("A40:F40").values = [["Total / weighted average", null, null, null, null, null]];
a.getRange("B40").formulas = [["=SUM(B36:B39)"]];
a.getRange("C40").formulas = [["=SUMPRODUCT(B36:B39,C36:C39)"]];
a.getRange("D40").formulas = [["=SUMPRODUCT(B36:B39,D36:D39)"]];
a.getRange("E40").formulas = [["=SUMPRODUCT(B36:B39,E36:E39)"]];
a.getRange("F40").formulas = [["=IF(ABS(B40-1)<0.0001,\"PASS\",\"Mix must equal 100%\")"]];
a.getRange("B36:B39").format.font = { color: blue };
a.getRange("B36:B40").format.numberFormat = Array.from({length:5},()=>[pctFmt]);
a.getRange("C36:D40").format.numberFormat = Array.from({length:5},()=>[intFmt,intFmt]);
a.getRange("E36:E40").format.numberFormat = Array.from({length:5},()=>[rupeeFmt]);
a.getRange("A40:F40").format.font = { bold: true };
a.getRange("F40").conditionalFormats.add("containsText", { text: "PASS", format: { fill: paleGreen, font: { bold: true, color: "#276221" } } });
a.getRange("F40").conditionalFormats.add("notContainsText", { text: "PASS", format: { fill: paleRed, font: { bold: true, color: "#9C0006" } } });

section(a, 43, "Infrastructure step-cost assumptions", "D");
a.getRange("A44:D44").values = [["Organisations up to", "Monthly infra cost", "Architecture", "Evidence label"]];
header(a.getRange("A44:D44"));
const tiers = [
  [10,4560,"Current single-host benchmark","PROVISIONAL — ESTIMATED"],
  [50,4560,"Current single-host benchmark","PROVISIONAL — ESTIMATED"],
  [100,7980,"Larger single host","PROVISIONAL — ESTIMATED"],
  [500,22800,"Separate app/DB or several VMs","PROVISIONAL — ESTIMATED"],
  [1000,45600,"HA app tier plus managed/replicated DB","PROVISIONAL — ESTIMATED"],
  [5000,182400,"Horizontal app tier, HA DB/Redis, object storage","PROVISIONAL — ESTIMATED"],
  [10000,342000,"Larger HA regional platform","PROVISIONAL — ESTIMATED"],
];
a.getRange("A45:D51").values = tiers;
a.getRange("B45:B51").format.font = { color: blue };
a.getRange("B45:B51").format.numberFormat = Array.from({length:7},()=>[rupeeFmt]);
a.getRange("A1:J55").format.font.name = "Arial";
a.getRange("A1:J55").format.verticalAlignment = "center";
a.getRange("A:F").format.columnWidth = 22;
a.getRange("A:A").format.columnWidth = 28;
a.getRange("D:D").format.columnWidth = 30;
a.getRange("E:E").format.columnWidth = 44;
a.getRange("F:F").format.columnWidth = 14;
a.getRange("G:J").format.columnWidth = 16;
a.getRange("A1:J55").format.wrapText = true;
a.freezePanes.freezeRows(6);

const pe = wb.worksheets.add("Plan Economics");
title(pe, "Plan unit economics", "PROVISIONAL until the Production Validation sheet is completed. Communication overages are excluded from subscription revenue.", "M");
pe.getRange("A5:M5").values = [["Plan","Revenue","Avg tokens","Included WhatsApp","Fixed allocation","Variable infra","Communication","Support allowance","Payment fee","Total COGS","Gross profit","Gross margin","Required price at target GM"]];
header(pe.getRange("A5:M5"));
pe.getRange("A6:A9").values = plans.map(x=>[x[0]]);
for (let i=0;i<4;i++) {
  const r=6+i, ar=28+i;
  pe.getRange(`B${r}:M${r}`).formulas = [[
    `=Assumptions!B${ar}`, `=Assumptions!D${ar}`, `=Assumptions!I${ar}`,
    "=SUM(Assumptions!$B$8:$B$11)/Assumptions!$B$22",
    `=C${r}/1000*Assumptions!$B$15`, `=D${r}*Assumptions!$B$12`,
    `=B${r}*Assumptions!$B$14`, `=B${r}*Assumptions!$B$13`,
    `=SUM(E${r}:I${r})`, `=B${r}-J${r}`, `=K${r}/B${r}`,
    `=(E${r}+F${r}+G${r})/(1-Assumptions!$B$14-Assumptions!$B$13-Assumptions!$B$21)`
  ]];
}
pe.getRange("B6:B9").format.numberFormat = intFmt;
pe.getRange("C6:D9").format.numberFormat = intFmt;
pe.getRange("E6:K9").format.numberFormat = intFmt;
pe.getRange("L6:L9").format.numberFormat = Array.from({length:4},()=>[pctFmt]);
pe.getRange("M6:M9").format.numberFormat = intFmt;
pe.getRange("A11:M13").values = [["Interpretation",null,null,null,null,null,null,null,null,null,null,null,null],["Communication exposure","Included allowances are intentionally small. Sell additional WhatsApp, SMS and voice through prepaid wallets or customer-owned provider accounts.",null,null,null,null,null,null,null,null,null,null,null],["Margin warning","If Q4Queue absorbs all WhatsApp messages, a high-usage customer can cost several thousand rupees per month even while core infrastructure remains cheap.",null,null,null,null,null,null,null,null,null,null,null]];
pe.getRange("A11:M11").format.fill = paleBlue; pe.getRange("A11:M11").format.font = {bold:true,color:navy};
pe.mergeCells("B12:M12");
pe.mergeCells("B13:M13");
pe.getRange("A12:M13").format.wrapText = true;
pe.getRange("A:M").format.columnWidth = 22; pe.getRange("A:A").format.columnWidth = 24; pe.getRange("M:M").format.columnWidth = 27;
pe.getRange("A1:M14").format.font.name = "Arial"; pe.freezePanes.freezeRows(5);

const sc = wb.worksheets.add("Scale Simulator");
title(sc, "Customer scale simulator", "PROVISIONAL until production inputs are supplied. Change the plan mix and cost inputs on Assumptions.", "N");
sc.getRange("A5:N5").values = [["Organisations","Weighted ARPU","MRR","Tokens / month","API requests","Live DB GB added / month","Bandwidth GB","Infra cost","WhatsApp messages","Communication cost","Payment cost","Support allowance","Gross profit","Gross margin"]];
header(sc.getRange("A5:N5"));
sc.getRange("A6:A10").values = [[100],[500],[1000],[5000],[10000]];
for(let i=0;i<5;i++){
  const r=6+i;
  const infra=`IF(A${r}<=10,Assumptions!$B$45,IF(A${r}<=50,Assumptions!$B$46,IF(A${r}<=100,Assumptions!$B$47,IF(A${r}<=500,Assumptions!$B$48,IF(A${r}<=1000,Assumptions!$B$49,IF(A${r}<=5000,Assumptions!$B$50,Assumptions!$B$51))))))`;
  sc.getRange(`B${r}:N${r}`).formulas = [[
    "=Assumptions!$E$40", `=A${r}*B${r}`, `=A${r}*Assumptions!$C$40`, `=D${r}*Assumptions!$B$18`,
    `=D${r}*Assumptions!$B$16/1048576`, `=D${r}*Assumptions!$B$19/1024`, `=${infra}`,
    `=A${r}*Assumptions!$D$40`, `=I${r}*Assumptions!$B$12`, `=C${r}*Assumptions!$B$13`,
    `=C${r}*Assumptions!$B$14`, `=C${r}-SUM(H${r},J${r}:L${r})`, `=M${r}/C${r}`
  ]];
}
sc.getRange("A6:A10").format.font = {color:blue};
sc.getRange("A6:A10").format.numberFormat = intFmt;
sc.getRange("B6:C10").format.numberFormat = intFmt;
sc.getRange("D6:E10").format.numberFormat = intFmt;
sc.getRange("F6:G10").format.numberFormat = decFmt;
sc.getRange("H6:M10").format.numberFormat = intFmt;
sc.getRange("N6:N10").format.numberFormat = Array.from({length:5},()=>[pctFmt]);
sc.getRange("A:N").format.columnWidth = 21; sc.getRange("A:A").format.columnWidth = 22;
sc.getRange("A1:N12").format.font.name="Arial"; sc.freezePanes.freezeRows(5);

const vc = wb.worksheets.add("Volume Costs");
title(vc, "Cost per customer-token volume", "Variable-cost view. Fixed infrastructure and support allocations are excluded from this table.", "J");
vc.getRange("A5:J5").values = [["Tokens / month","API requests","DB reads","DB writes","Live DB GB","Stored GB incl. backups","Bandwidth GB","WhatsApp messages","WhatsApp cost","Total variable cost"]];
header(vc.getRange("A5:J5"));
vc.getRange("A6:A11").values = [[1000],[10000],[50000],[100000],[500000],[1000000]];
for(let i=0;i<6;i++){
 const r=6+i;
 vc.getRange(`B${r}:J${r}`).formulas = [[`=A${r}*Assumptions!$B$18`,`=A${r}*75`,`=A${r}*23`,`=A${r}*Assumptions!$B$16/1048576`,`=E${r}*(1+Assumptions!$B$17)`,`=A${r}*Assumptions!$B$19/1024`,`=A${r}*Assumptions!$B$20`,`=H${r}*Assumptions!$B$12`,`=A${r}/1000*Assumptions!$B$15+I${r}`]];
}
vc.getRange("A6:A11").format.font={color:blue};
vc.getRange("A6:D11").format.numberFormat=Array.from({length:6},()=>Array(4).fill(intFmt));
vc.getRange("E6:G11").format.numberFormat=Array.from({length:6},()=>Array(3).fill(decFmt));
vc.getRange("H6:H11").format.numberFormat=Array.from({length:6},()=>[intFmt]);
vc.getRange("I6:J11").format.numberFormat=intFmt;
vc.getRange("A:J").format.columnWidth=17; vc.getRange("A1:J13").format.font.name="Arial"; vc.freezePanes.freezeRows(5);

const be = wb.worksheets.add("Break Even");
title(be, "MRR customer-count matrix", "Counts round up to the next whole paying organisation. This is revenue targeting, before churn and tax.", "F");
be.getRange("A5:F5").values = [["ARPU","₹1 lakh MRR","₹5 lakh MRR","₹10 lakh MRR","₹25 lakh MRR","₹50 lakh MRR"]];
header(be.getRange("A5:F5"));
be.getRange("A6:A10").values=[[500],[1000],[2000],[5000],[10000]];
const targets=[100000,500000,1000000,2500000,5000000];
for(let i=0;i<5;i++){
 const r=6+i;
 be.getRange(`B${r}:F${r}`).formulas=[[...targets.map(t=>`=ROUNDUP(${t}/A${r},0)`)]];
}
be.getRange("A6:A10").format.font={color:blue}; be.getRange("A6:A10").format.numberFormat=Array.from({length:5},()=>[rupeeFmt]);
be.getRange("B6:F10").format.numberFormat=Array.from({length:5},()=>Array(5).fill(intFmt));
section(be,13,"Base infrastructure break-even", "F");
be.getRange("A14:C14").values=[["Plan","Contribution before base infra","Customers to cover ₹5,610 base cost"]]; header(be.getRange("A14:C14"));
be.getRange("A15:A18").values=plans.map(x=>[x[0]]);
for(let i=0;i<4;i++){const r=15+i, pr=6+i;be.getRange(`B${r}:C${r}`).formulas=[[`='Plan Economics'!B${pr}-'Plan Economics'!F${pr}-'Plan Economics'!G${pr}-'Plan Economics'!H${pr}-'Plan Economics'!I${pr}`,`=ROUNDUP(SUM(Assumptions!$B$8:$B$11)/B${r},0)`]];}
be.getRange("B15:B18").format.numberFormat=intFmt; be.getRange("C15:C18").format.numberFormat=intFmt;
be.getRange("A:F").format.columnWidth=19; be.getRange("A:A").format.columnWidth=22; be.getRange("A1:F20").format.font.name="Arial"; be.freezePanes.freezeRows(5);

const src = wb.worksheets.add("Sources");
title(src, "Sources and evidence map", "Provider prices accessed 2026-09-06. Code evidence refers to this Q4Queue workspace. Re-verify prices before launch.", "F");
src.getRange("A5:F5").values=[["ID","Item","Evidence label","Value used","Source","Notes"]]; header(src.getRange("A5:F5"));
src.getRange("A6:F13").values=[
 ["S1","WhatsApp pricing","ESTIMATED","₹0.115 utility planning rate","https://whatsappbusiness.com/products/platform-pricing/","Official page verifies delivered/category/market model; exact India WABA rate needs account verification"],
 ["S2","Plivo voice India","VERIFIED FROM PROVIDER PRICING","₹0.25 WebRTC + ₹0.38 domestic/min","https://www.plivo.com/voice/pricing/in/","Forwarded calls can bill both legs"],
 ["S3","Plivo SMS India","VERIFIED FROM PROVIDER PRICING","₹0.20 domestic listed; ILDO $0.08","https://www.plivo.com/sms/coverage/in/","SMS not implemented; account eligibility and DLT route need quote"],
 ["S4","Server benchmark","VERIFIED FROM PROVIDER PRICING","$48/month, 4 vCPU, 8 GiB","https://www.digitalocean.com/pricing/droplets","Benchmark only; actual host provider is unknown"],
 ["S5","Payment benchmark","VERIFIED FROM PROVIDER PRICING","2% + GST","https://razorpay.com/pricing/","Razorpay is not implemented; planning benchmark"],
 ["S6","Email benchmark","VERIFIED FROM PROVIDER PRICING","₹650 flexible / ₹540 annual","https://knowledge.workspace.google.com/admin/billing/compare-flexible-and-annual-fixed-term-payment-plans","Code uses Gmail SMTP credentials; exact account is unknown"],
 ["S7","Object storage benchmark","VERIFIED FROM PROVIDER PRICING","Provider/region dependent","https://cloud.google.com/storage/pricing","No object storage is implemented"],
 ["S8","FX planning rate","ASSUMPTION","₹95/USD","https://www.rbi.org.in/Scripts/BS_DisplayReferenceRate.aspx","Update from FBIL/RBI reference rate before budgeting"],
];
src.getRange("A6:F13").format.wrapText=true; src.getRange("A:F").format.columnWidth=22; src.getRange("B:B").format.columnWidth=26; src.getRange("C:C").format.columnWidth=28; src.getRange("E:E").format.columnWidth=55; src.getRange("F:F").format.columnWidth=44;
src.getRange("A1:F15").format.font.name="Arial"; src.freezePanes.freezeRows(5);

for (const sheet of [a,pe,sc,vc,be,src]) {
  const used=sheet.getUsedRange();
  used.format.verticalAlignment="center";
}

await fs.mkdir(outDir,{recursive:true});
const out=await SpreadsheetFile.exportXlsx(wb);
await out.save(outFile);

console.log((await wb.inspect({kind:"table",range:"Plan Economics!A1:M10",include:"values,formulas",tableMaxRows:12,tableMaxCols:14})).ndjson);
console.log((await wb.inspect({kind:"table",range:"Scale Simulator!A1:N10",include:"values,formulas",tableMaxRows:12,tableMaxCols:15})).ndjson);
console.log((await wb.inspect({kind:"table",range:"Production Validation!A1:G26",include:"values,formulas",tableMaxRows:28,tableMaxCols:8})).ndjson);
console.log((await wb.inspect({kind:"match",searchTerm:"#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",options:{useRegex:true,maxResults:300},summary:"final formula error scan"})).ndjson);
for (const [name,range] of [["Production Validation","A1:G26"],["Assumptions","A1:J51"],["Plan Economics","A1:M13"],["Scale Simulator","A1:N10"],["Volume Costs","A1:J11"],["Break Even","A1:F18"],["Sources","A1:F13"]]) {
 const blob=await wb.render({sheetName:name,range,scale:1});
 await fs.writeFile(`${outDir}/preview_${name.replaceAll(" ","_")}.png`,new Uint8Array(await blob.arrayBuffer()));
}
console.log(outFile);
