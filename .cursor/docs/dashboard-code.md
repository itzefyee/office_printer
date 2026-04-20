<!DOCTYPE html>

<html class="dark" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>OFFICE PRINTER 9K - INDUSTRIAL INTERFACE</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&amp;family=Inter:wght@300;400;600;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "tertiary-fixed": "#ffdad6",
                    "surface-container-highest": "#353534",
                    "surface": "#0a0a0a",
                    "surface-container-low": "#1c1b1b",
                    "on-error": "#690005",
                    "primary": "#ffd79b",
                    "on-secondary": "#00390a",
                    "primary-container": "#ffb300",
                    "on-secondary-container": "#89e284",
                    "on-error-container": "#ffdad6",
                    "on-surface": "#e5e2e1",
                    "surface-bright": "#393939",
                    "secondary-container": "#006619",
                    "on-secondary-fixed": "#002204",
                    "inverse-surface": "#e5e2e1",
                    "on-background": "#e5e2e1",
                    "on-tertiary-fixed-variant": "#930010",
                    "on-tertiary-fixed": "#410003",
                    "on-primary-fixed-variant": "#604100",
                    "surface-container": "#201f1f",
                    "secondary": "#82db7e",
                    "on-tertiary": "#680008",
                    "surface-container-high": "#2a2a2a",
                    "surface-variant": "#353534",
                    "surface-dim": "#131313",
                    "on-primary-container": "#6b4900",
                    "on-primary-fixed": "#281900",
                    "on-primary": "#432c00",
                    "surface-tint": "#ffba38",
                    "tertiary": "#ffd3cf",
                    "inverse-primary": "#7e5700",
                    "background": "#131313",
                    "inverse-on-surface": "#313030",
                    "on-surface-variant": "#d6c4ac",
                    "on-tertiary-container": "#a30013",
                    "error": "#ffb4ab",
                    "outline": "#9e8e78",
                    "tertiary-container": "#ffaca4",
                    "primary-fixed": "#ffdeac",
                    "outline-variant": "#514532",
                    "secondary-fixed": "#9df898",
                    "tertiary-fixed-dim": "#ffb3ac",
                    "secondary-fixed-dim": "#82db7e",
                    "primary-fixed-dim": "#ffba38",
                    "error-container": "#93000a",
                    "surface-container-lowest": "#0e0e0e",
                    "on-secondary-fixed-variant": "#005312"
            },
            "borderRadius": {
                    "DEFAULT": "0px",
                    "lg": "0px",
                    "xl": "0px",
                    "full": "9999px"
            },
            "fontFamily": {
                    "headline": ["Space Grotesk"],
                    "body": ["Inter"],
                    "label": ["Space Grotesk"]
            }
          },
        },
      }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
        }
        .scanline {
            background: linear-gradient(to bottom, transparent 50%, rgba(255, 215, 155, 0.03) 50%);
            background-size: 100% 4px;
        }
        .blueprint-grid {
            background-image: radial-gradient(circle, #514532 0.5px, transparent 0.5px);
            background-size: 24px 24px;
        }
        .glass-panel {
            background: rgba(19, 19, 19, 0.65);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(158, 142, 120, 0.15);
        }
    </style>
</head>
<body class="bg-surface text-on-surface font-body overflow-hidden h-screen flex flex-col select-none relative">
<!-- FULL SCREEN SCHEMATIC BACKGROUND -->
<div class="fixed inset-0 z-0 bg-[#0a0a0a]">
<img alt="printer internals" class="w-full h-full object-cover mix-blend-luminosity opacity-40" data-alt="Technical blueprint wireframe of an industrial laser printer showing gears, rollers, and internal machinery with glowing red laser lines highlighting a jam" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDDn1NWGAXv7vQQK4ppdOHLYA1a-Deq3TBNa_AxEDQ9vPWz8mnLGescsFMv3EPqZtIzJtkRQUZeUZCRr14PbqpCtk_U28OFW-yIGX4uO0kHbN2WbMNM4PS9wvPOnyUDfeGsY95B1E_5W6qCT78A8JKsKMNCKydhJLs02i5gYxpOx7M5PVHAaEiCz8jvn7-LSiqo5oEMg31cNa_2SZbrKRM3ZWeGhPcN1pK4By5R-y5-uqXl5f3BoGn243GROqX1dVEk4rp2R-R6As"/>
<div class="absolute inset-0 blueprint-grid opacity-30 pointer-events-none"></div>
<div class="absolute inset-0 scanline pointer-events-none opacity-40"></div>
<!-- INTEGRATED SCHEMATIC OVERLAYS -->
<div class="absolute inset-0 flex items-center justify-center">
<!-- JAM DETECTED OVERLAY -->
<div class="bg-error/10 backdrop-blur-md border border-error/50 p-10 flex flex-col items-center gap-2 transform -translate-y-12">
<span class="material-symbols-outlined text-6xl text-error">warning</span>
<span class="font-headline font-black text-4xl text-error tracking-[0.3em]">JAM_DETECTED</span>
<span class="font-body text-sm text-error font-bold uppercase tracking-widest">SECTOR: FUSER_UNIT_INNER_TRAY</span>
</div>
<!-- RED PATH OVERLAY -->
<div class="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">
<div class="w-2/3 h-1 bg-gradient-to-r from-transparent via-error to-transparent animate-pulse shadow-[0_0_30px_rgba(255,180,171,0.8)]"></div>
</div>
<!-- CALLOUTS INTEGRATED INTO BACKGROUND -->
<div class="absolute top-[30%] left-[35%] flex items-center">
<div class="w-12 h-px bg-primary/40"></div>
<div class="bg-primary/10 border border-primary/40 px-2 py-1 text-[10px] font-headline text-primary">FUSER_UNIT</div>
</div>
<div class="absolute bottom-[35%] right-[40%] flex items-center">
<div class="w-16 h-px bg-primary/40"></div>
<div class="bg-primary/10 border border-primary/40 px-2 py-1 text-[10px] font-headline text-primary">FEED_TRAY_1</div>
</div>
<div class="absolute top-1/2 right-[30%] flex flex-col items-center gap-2">
<span class="material-symbols-outlined text-secondary animate-bounce">arrow_downward</span>
<div class="bg-secondary/10 border border-secondary/40 px-2 py-1 text-[10px] font-headline text-secondary">OUTPUT_PATH</div>
</div>
</div>
</div>
<!-- FLOATING TOP BAR -->
<header class="relative z-50 flex justify-between items-center w-full px-6 py-4 bg-gradient-to-b from-[#131313]/90 to-transparent">
<div class="flex items-center gap-8">
<span class="text-xl font-bold text-[#ffd79b] tracking-widest font-headline">OFFICE PRINTER 9K</span>
<div class="flex gap-6 font-['Space_Grotesk'] tracking-tighter uppercase text-[10px] text-[#ffd79b]">
<div class="flex flex-col"><span class="opacity-50">SYS_TIME</span><span>09:42:11</span></div>
<div class="flex flex-col"><span class="opacity-50">QUEUE</span><span>14/100</span></div>
<div class="flex flex-col"><span class="opacity-50">PROG</span><span>32%</span></div>
</div>
</div>
<div class="absolute left-1/2 -translate-x-1/2 flex items-center gap-4 bg-error/20 border border-error/50 px-6 py-2 backdrop-blur-sm">
<span class="material-symbols-outlined text-error animate-pulse">report</span>
<span class="font-headline font-bold text-error text-sm tracking-[0.2em] uppercase">ALERT: CRITICAL_STRESS</span>
</div>
<div class="flex gap-3">
<button class="text-[#ffd79b]/60 hover:text-primary transition-colors material-symbols-outlined">schedule</button>
<button class="text-[#ffd79b]/60 hover:text-primary transition-colors material-symbols-outlined">reorder</button>
<button class="text-[#ffd79b]/60 hover:text-primary transition-colors material-symbols-outlined">pending_actions</button>
</div>
</header>
<main class="flex-1 flex overflow-hidden relative p-6 gap-6 z-10">
<!-- FLOATING LEFT PANEL -->
<aside class="w-80 flex flex-col gap-6">
<div class="glass-panel p-6 flex flex-col gap-4">
<div class="flex flex-col gap-1">
<span class="font-headline text-[10px] text-primary uppercase font-bold tracking-[0.2em]">INCOMING_BUFFER</span>
<div class="h-px w-full bg-outline-variant/30"></div>
</div>
<div class="bg-surface-container-lowest/40 border border-outline-variant/20 p-4 flex flex-col gap-4">
<div class="flex justify-between items-start">
<span class="bg-error text-on-error font-headline font-black px-2 py-0.5 text-[10px] uppercase">URGENT</span>
<span class="text-on-surface-variant font-mono text-[10px]">ID: RX-9921</span>
</div>
<div class="flex flex-col gap-2">
<h2 class="font-headline font-bold text-primary text-sm leading-tight uppercase">Print 200 double-sided color pages</h2>
<p class="text-xs italic text-on-surface-variant font-body">"The office believes this is your fault."</p>
</div>
<div class="border-t border-outline-variant/20 pt-4 flex flex-col gap-1">
<div class="flex justify-between text-[10px] font-headline text-on-surface-variant uppercase">
<span>Risk Level</span>
<span class="text-error font-bold">HIGH</span>
</div>
<div class="w-full h-1 bg-surface-container-highest/50">
<div class="w-[85%] h-full bg-error"></div>
</div>
</div>
</div>
</div>
<div class="glass-panel p-4 mt-auto">
<span class="font-headline text-[10px] text-primary uppercase font-bold mb-2 block tracking-widest">LOG_STREAM</span>
<div class="space-y-1 font-mono text-[10px] text-secondary opacity-80 h-32 overflow-hidden">
<p>&gt; INITIATING ACTUATOR...</p>
<p>&gt; VOLTAGE STABLE @ 220V</p>
<p>&gt; SPOOLING DATA_PACK_04</p>
<p class="text-error">&gt; WARNING: PAPER_SKEW_DETECTED</p>
<p class="text-error">&gt; FUSER_TEMP: 215°C (CRITICAL)</p>
<p>&gt; CALIBRATING OPTICS...</p>
</div>
</div>
</aside>
<!-- CENTER HUD OVERLAYS (Integrated with back) -->
<section class="flex-1 flex flex-col relative pointer-events-none">
<div class="mt-4 flex flex-col gap-1">
<span class="text-[10px] font-headline font-bold text-primary/70 tracking-widest uppercase">DIAGNOSTIC_MODE</span>
<span class="text-3xl font-headline font-black text-on-surface tracking-tighter">LIVE_SCHEMATIC_V.4</span>
</div>
<div class="absolute top-4 right-0 flex gap-6">
<div class="flex flex-col items-end">
<span class="text-[9px] font-headline text-on-surface-variant uppercase tracking-widest">PAPER_POS</span>
<span class="text-base font-mono text-secondary">SECTOR_G4</span>
</div>
<div class="flex flex-col items-end">
<span class="text-[9px] font-headline text-on-surface-variant uppercase tracking-widest">FUSER_ACT</span>
<span class="text-base font-mono text-error">ENGAGED</span>
</div>
</div>
<!-- LOWER HUD METERS -->
<div class="mt-auto mb-12 flex gap-12 w-full px-4 pointer-events-auto">
<div class="flex-1 space-y-2 glass-panel p-4">
<span class="text-[10px] font-headline text-on-surface-variant font-bold uppercase tracking-widest">ROLLER_VELOCITY</span>
<div class="flex gap-1 h-3">
<div class="flex-1 bg-secondary shadow-[0_0_10px_rgba(130,219,126,0.3)]"></div>
<div class="flex-1 bg-secondary shadow-[0_0_10px_rgba(130,219,126,0.3)]"></div>
<div class="flex-1 bg-secondary shadow-[0_0_10px_rgba(130,219,126,0.3)]"></div>
<div class="flex-1 bg-secondary shadow-[0_0_10px_rgba(130,219,126,0.3)]"></div>
<div class="flex-1 bg-secondary/20"></div>
<div class="flex-1 bg-secondary/20"></div>
</div>
</div>
<div class="flex-1 space-y-2 glass-panel p-4">
<span class="text-[10px] font-headline text-on-surface-variant font-bold uppercase tracking-widest">THERMAL_LOAD</span>
<div class="flex gap-1 h-3">
<div class="flex-1 bg-error shadow-[0_0_10px_rgba(255,180,171,0.3)]"></div>
<div class="flex-1 bg-error shadow-[0_0_10px_rgba(255,180,171,0.3)]"></div>
<div class="flex-1 bg-error shadow-[0_0_10px_rgba(255,180,171,0.3)]"></div>
<div class="flex-1 bg-error shadow-[0_0_10px_rgba(255,180,171,0.3)]"></div>
<div class="flex-1 bg-error shadow-[0_0_10px_rgba(255,180,171,0.3)]"></div>
<div class="flex-1 bg-error shadow-[0_0_10px_rgba(255,180,171,0.3)]"></div>
</div>
</div>
</div>
</section>
<!-- FLOATING RIGHT PANEL -->
<aside class="w-72 flex flex-col gap-6">
<div class="glass-panel p-5 space-y-5 flex-1 overflow-y-auto">
<div class="flex flex-col gap-1 mb-2">
<span class="text-[#ffd79b] font-black font-headline text-xs tracking-widest uppercase">DIAGNOSTICS</span>
<span class="font-['Inter'] text-[10px] uppercase font-bold text-on-surface-variant opacity-50 tracking-[0.2em]">SYSTEM_VITAL_METERS</span>
</div>
<!-- METERS -->
<div class="space-y-5">
<!-- Heat -->
<div class="flex flex-col gap-1.5">
<div class="flex justify-between font-['Inter'] text-[10px] uppercase font-bold">
<span class="text-[#ffd79b]">Heat</span>
<span class="text-error">HIGH</span>
</div>
<div class="h-4 w-full bg-black/40 border border-outline-variant/30 flex items-center p-0.5">
<div class="h-full w-[92%] bg-error/80 shadow-[0_0_10px_rgba(255,180,171,0.3)]"></div>
</div>
</div>
<!-- Toner -->
<div class="flex flex-col gap-1.5">
<div class="flex justify-between font-['Inter'] text-[10px] uppercase font-bold">
<span class="text-[#ffd79b]">Toner</span>
<span class="text-error">LOW</span>
</div>
<div class="h-4 w-full bg-black/40 border border-outline-variant/30 flex items-center p-0.5">
<div class="h-full w-[8%] bg-error shadow-[0_0_10px_rgba(255,180,171,0.3)]"></div>
</div>
</div>
<!-- Paper Path -->
<div class="flex flex-col gap-1.5">
<div class="flex justify-between font-['Inter'] text-[10px] uppercase font-bold text-[#ffd79b]">
<span>Paper Path</span>
<span class="animate-pulse text-error">FAULT</span>
</div>
<div class="h-4 w-full bg-black/40 border border-outline-variant/30 flex gap-0.5 p-0.5">
<div class="flex-1 bg-error"></div>
<div class="flex-1 bg-error"></div>
<div class="flex-1 bg-surface-container-highest/30"></div>
<div class="flex-1 bg-surface-container-highest/30"></div>
</div>
</div>
<!-- Memory -->
<div class="flex flex-col gap-1.5">
<div class="flex justify-between font-['Inter'] text-[10px] uppercase font-bold">
<span class="text-[#ffd79b]">Memory</span>
<span class="text-error">OVERLOAD</span>
</div>
<div class="h-4 w-full bg-black/40 border border-outline-variant/30 flex items-center p-0.5">
<div class="h-full w-[98%] bg-error/80"></div>
</div>
</div>
<!-- Dignity -->
<div class="flex flex-col gap-1.5">
<div class="flex justify-between font-['Inter'] text-[10px] uppercase font-bold">
<span class="text-[#ffd79b]">Dignity</span>
<span class="text-primary-container">COLLAPSING</span>
</div>
<div class="h-4 w-full bg-black/40 border border-outline-variant/30 flex items-center p-0.5">
<div class="h-full w-[25%] bg-primary-container/80"></div>
</div>
</div>
<!-- Blame -->
<div class="flex flex-col gap-1.5">
<div class="flex justify-between font-['Inter'] text-[10px] uppercase font-bold">
<span class="text-[#ffd79b]">Blame</span>
<span class="text-error">EXTREME</span>
</div>
<div class="h-4 w-full bg-black/40 border border-outline-variant/30 flex items-center p-0.5">
<div class="h-full w-full bg-gradient-to-r from-error/50 to-error"></div>
</div>
</div>
</div>
</div>
<div class="glass-panel p-4 mt-auto">
<span class="text-[9px] font-headline text-on-surface-variant font-bold block mb-2 tracking-widest">SYSTEM_ID_TOKEN</span>
<img alt="barcode scanner" class="w-full h-12 object-cover grayscale brightness-75 contrast-125" data-alt="Monochrome grainy scan of a 1D industrial barcode on a weathered metal surface with red scanning laser line" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBROpk75XlPBYEqwc__xHIp2dx38MO2WyDRpSSQtbB1iw6hVkFFaTllaK4Cf5dbe308i7nwKT6TziWI4BHrSoCQfsgJvgxZGLVGKC2I5FfRXy-XYEIbh5YuTr-ZlcUimQ1HsjDxWKFliRoydVX9z25HEd1wAuSmiGny_pVoB_tAtvyGHLh5icJwa8jzurFBfH9t1XpCIoCMtK02PuEsDLZHQnjc3mDAhwPLIr50INQQEj72VBK5cXKMl1sFfzYR2CVNyS27WDizPwY"/>
<span class="text-[10px] font-mono mt-2 block text-primary/60">S/N: 0092-B-PR9K</span>
</div>
</aside>
</main>
<!-- FLOATING BOTTOM ACTION BAR -->
<footer class="relative z-50 w-full h-20 flex justify-center items-end pb-4 px-12 gap-4">
<div class="flex w-full max-w-5xl h-14 bg-[#131313]/80 backdrop-blur-md border border-outline-variant/20 overflow-hidden shadow-2xl">
<button class="flex-1 text-[#ffd79b] flex flex-col items-center justify-center hover:bg-white/5 transition-all active:bg-white/10 group border-r border-outline-variant/10">
<span class="material-symbols-outlined text-xl mb-0.5">check_circle</span>
<span class="font-['Space_Grotesk'] font-bold uppercase tracking-[0.2em] text-[10px]">Comply</span>
</button>
<button class="flex-1 text-[#ffd79b] flex flex-col items-center justify-center hover:bg-white/5 transition-all active:bg-white/10 group border-r border-outline-variant/10">
<span class="material-symbols-outlined text-xl mb-0.5">pause_circle</span>
<span class="font-['Space_Grotesk'] font-bold uppercase tracking-[0.2em] text-[10px]">Stall</span>
</button>
<button class="flex-[1.5] bg-[#ffd79b] text-[#432c00] flex flex-col items-center justify-center transition-all hover:brightness-110 active:scale-[0.98] group">
<span class="material-symbols-outlined text-xl mb-0.5" style="font-variation-settings: 'FILL' 1;">warning</span>
<span class="font-['Space_Grotesk'] font-bold uppercase tracking-[0.2em] text-[10px]">Fake Error</span>
</button>
<button class="flex-1 text-[#ffd79b] flex flex-col items-center justify-center hover:bg-white/5 transition-all active:bg-white/10 group">
<span class="material-symbols-outlined text-xl mb-0.5">alt_route</span>
<span class="font-['Space_Grotesk'] font-bold uppercase tracking-[0.2em] text-[10px]">Redirect</span>
</button>
</div>
</footer>
</body></html>