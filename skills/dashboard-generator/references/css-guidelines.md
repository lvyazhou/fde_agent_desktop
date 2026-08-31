# CSS Guidelines for Tech/Cyber Dashboards

## Core Variables & Backgrounds

Always start with a dark foundation for the main wrapper.

```css
.cyber-dashboard-wrapper {
    background-color: #030a16; /* or #030814 */
    color: #fff;
    font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
    /* Basic gradient background */
    background-image:
        radial-gradient(circle at center, #0a1f3d 0%, #030a16 100%),
        linear-gradient(rgba(11, 20, 40, 0.9), rgba(11, 20, 40, 0.9));
}
```

## Grid & Layout

Use CSS Grid for the main layout to handle varying screen sizes easily.

```css
.cyber-container {
    display: grid;
    /* Example: Left column, wider center, right column */
    grid-template-columns: 1fr 1.6fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 15px;
    padding: 15px;
    height: 100%;
}
```

## Tech Card Containers

Individual panels or charts should sit inside stylized cards.

```css
.tech-card {
    position: relative;
    background: linear-gradient(135deg, rgba(6, 30, 93, 0.6) 0%, rgba(2, 10, 26, 0.8) 100%);
    border: 1px solid rgba(0, 246, 255, 0.15);
    box-shadow:
        inset 0 0 40px rgba(0, 140, 255, 0.15),
        0 0 15px rgba(0, 246, 255, 0.05);
    backdrop-filter: blur(8px);
    padding: 10px;
    display: flex;
    flex-direction: column;
    /* Optional: Cut corners */
    clip-path: polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px));
}

/* Corner accents */
.tech-card::before {
    content: ''; position: absolute; top: 0; left: 20px; width: 40px; height: 2px; 
    background: #00f6ff; box-shadow: 0 0 10px #00f6ff;
}
.tech-card::after {
    content: ''; position: absolute; bottom: 0; right: 20px; width: 40px; height: 2px; 
    background: #00f6ff; box-shadow: 0 0 10px #00f6ff;
}

/* Card Title */
.tech-card-title {
    color: #fff;
    font-size: 16px;
    font-weight: bold;
    padding-left: 12px;
    margin-bottom: 10px;
    background: linear-gradient(90deg, rgba(0, 246, 255, 0.3) 0%, transparent 100%);
    line-height: 32px;
    border-left: 4px solid #00f6ff;
    flex-shrink: 0;
    display: flex;
    align-items: center;
}
```

## Common Animations

Add these keyframes for dynamic tech effects.

```css
/* Blinking dot for active status */
@keyframes cyberBlink { 
    0%, 100% { opacity: 1; box-shadow: 0 0 8px #00f6ff; } 
    50% { opacity: 0.3; box-shadow: 0 0 2px #00f6ff; } 
}
.blink-dot {
    display: inline-block; width: 6px; height: 6px; background: #00f6ff; 
    border-radius: 50%; margin-right: 6px; animation: cyberBlink 1.5s infinite;
}

/* Sweeping light effect (useful for KPI cards or headers) */
@keyframes cyberSweep { 
    0% { left: -100%; } 
    50% { left: 200%; } 
    100% { left: 200%; } 
}
```

## KPI Displays

```css
.kpi-item {
    background: linear-gradient(180deg, rgba(0,246,255,0.15) 0%, rgba(0,50,150,0.5) 100%);
    border: 1px solid rgba(0, 246, 255, 0.4);
    border-top: 3px solid #00f6ff;
    padding: 15px 10px;
    text-align: center;
    box-shadow: 0 5px 15px rgba(0, 246, 255, 0.2);
    /* Skew effect */
    transform: skewX(-5deg);
}
.kpi-item .label { 
    color: #00f6ff; font-size: 12px; transform: skewX(5deg); 
}
.kpi-item .value {
    color: #fff; font-size: 28px; font-family: 'Impact', sans-serif;
    text-shadow: 0 0 10px #00f6ff; transform: skewX(5deg);
}
.kpi-item .trend {
    font-size: 12px;
    margin-top: 5px;
    transform: skewX(5deg);
}
.trend.up { color: #ff4757; text-shadow: 0 0 5px #ff4757; }
.trend.down { color: #2ed573; text-shadow: 0 0 5px #2ed573; }
```

## Ant Design Overrides

If using Antd components (DatePicker, Select), override their styles to fit the dark theme. Ensure these are scoped to your dashboard wrapper so they don't break the rest of the app.

```css
.cyber-dashboard-wrapper .ant-picker,
.cyber-dashboard-wrapper .ant-select-selector,
.cyber-dashboard-wrapper .ant-btn {
    background-color: rgba(4, 20, 50, 0.8) !important;
    border-color: rgba(0, 246, 255, 0.4) !important;
    color: #00f6ff !important;
}

.cyber-dashboard-wrapper .ant-picker-input > input,
.cyber-dashboard-wrapper .ant-select-selection-item {
    color: #fff !important;
}

/* Specific drop-down fixes usually require global classes if Antd attaches dropdowns to body, but try to use getPopupContainer */
.dark-dropdown {
    background-color: rgba(4, 20, 50, 0.95) !important;
    border: 1px solid #00f6ff !important;
}
.dark-dropdown .ant-select-item {
    color: #fff !important;
}
.dark-dropdown .ant-select-item-option-selected {
    background-color: rgba(0, 246, 255, 0.2) !important;
}
```

## Tech Card Variant: Corner Border Accents (No clip-path)

An alternative to `clip-path` cut corners. Uses `::before` / `::after` to create glowing corner "L" shapes. This approach preserves the full rectangular boundary and works better with scrollable content.

```css
.tech-card-bordered {
    position: relative;
    background: rgba(6, 30, 93, 0.4);
    border: 1px solid rgba(0, 246, 255, 0.2);
    padding: 15px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.3) inset;
}

/* Top-left corner accent */
.tech-card-bordered::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 10px;
    height: 10px;
    border-color: #00f6ff;
    border-style: solid;
    border-width: 2px 0 0 2px; /* Top and Left borders only */
    transition: all 0.5s;
}

/* Bottom-right corner accent */
.tech-card-bordered::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 10px;
    height: 10px;
    border-color: #00f6ff;
    border-style: solid;
    border-width: 0 2px 2px 0; /* Bottom and Right borders only */
    transition: all 0.5s;
}

/* Hover: Expand corner accents */
.tech-card-bordered:hover::before,
.tech-card-bordered:hover::after {
    width: 20px;
    height: 20px;
    box-shadow: 0 0 8px rgba(0, 246, 255, 0.5);
}
```

## CRT Scan Lines Overlay

Creates a retro CRT monitor scan line effect over the entire dashboard. Apply to the main wrapper using `::after`. **Always set `pointer-events: none`** to keep elements below interactive.

```css
.cyber-dashboard-wrapper::after {
    content: '';
    display: block;
    position: absolute;
    top: 0; left: 0; bottom: 0; right: 0;
    background:
        linear-gradient(
            rgba(18, 16, 16, 0) 50%,
            rgba(0, 0, 0, 0.25) 50%
        ),
        linear-gradient(
            90deg,
            rgba(255, 0, 0, 0.06),
            rgba(0, 255, 0, 0.02),
            rgba(0, 0, 255, 0.06)
        );
    background-size: 100% 2px, 3px 100%;
    z-index: 999;
    pointer-events: none;
    opacity: 0.3; /* Subtle effect, increase for stronger CRT look */
}
```

## Perspective Grid Background

Creates a 3D-perspective grid pattern that gives depth to the background. Apply to the main wrapper using `::before`.

```css
.cyber-dashboard-wrapper::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background:
        linear-gradient(rgba(0, 246, 255, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 246, 255, 0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    z-index: 0;
    pointer-events: none;
    transform: perspective(1000px) rotateX(10deg) scale(1.2);
    transform-origin: top center;
    opacity: 0.6;
}
```

## Progress Bar (Cyber Style)

Used in target panels and countdown cards. Thin, glowing, with gradient fill.

```css
/* Outer track */
.progress-bar-track {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
    position: relative;
}

/* Inner fill — Cyan variant */
.progress-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #0077ff, #00f6ff);
    box-shadow: 0 0 10px #00f6ff;
    transition: width 0.6s ease;
    border-radius: 3px;
}

/* Inner fill — Warning/Red variant */
.progress-bar-fill.warning {
    background: linear-gradient(90deg, #ffaa00, #ff4757);
    box-shadow: 0 0 10px #ff4757;
}
```

**Usage in JSX:**
```jsx
<div className="progress-bar-track">
    <div
        className="progress-bar-fill"
        style={{ width: `${progressPercent}%` }}
    />
</div>
```

## Skewed Tab Navigation Bar

The main page tab navigation with a cyber slanted style.

```css
.nav-tab-item {
    padding: 8px 30px;
    cursor: pointer;
    color: #a6c0fe;
    font-size: 16px;
    border: 1px solid transparent;
    transition: all 0.3s;
    background: rgba(0, 0, 0, 0.2);
    margin: 0 5px;
    transform: skewX(-20deg); /* The slant */
}

/* Undo skew for text so it reads normally */
.nav-tab-item span {
    display: block;
    transform: skewX(20deg);
}

.nav-tab-item:hover,
.nav-tab-item.active {
    color: #00f6ff;
    border-color: #00f6ff;
    background: rgba(0, 246, 255, 0.1);
    box-shadow: 0 0 10px rgba(0, 246, 255, 0.2) inset;
}
```

## Time Filter Buttons (clip-path variant)

```css
.time-btn {
    background: rgba(0, 119, 255, 0.2);
    border: 1px solid #00f6ff;
    color: #00f6ff;
    padding: 4px 10px;
    font-size: 14px;
    cursor: pointer;
    clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
    transition: all 0.3s;
    font-weight: bold;
    outline: none;
}

.time-btn:hover {
    background: rgba(0, 246, 255, 0.3);
    box-shadow: 0 0 10px #00f6ff;
}

.time-btn.active {
    background: #00f6ff;
    color: #030a16;
    box-shadow: 0 0 15px #00f6ff;
}
```

## Overlay Corner Panels (for Center Ring)

Floating panels placed in the corners of a central visualization (like a map or large pie chart).

```css
.corner-panel {
    position: absolute;
    width: 240px;
    background: linear-gradient(135deg, rgba(6, 30, 93, 0.8) 0%, rgba(2, 10, 26, 0.9) 100%);
    border: 1px solid rgba(0, 246, 255, 0.3);
    padding: 10px;
    z-index: 20;
    backdrop-filter: blur(10px);
    box-shadow: 0 0 15px rgba(0, 246, 255, 0.1);
    display: flex;
    flex-direction: column;
}

.corner-panel.bottom-left {
    bottom: 10px;
    left: 10px;
    border-left: 3px solid #00f6ff;
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%);
}

.corner-panel.bottom-right {
    bottom: 10px;
    right: 10px;
    border-right: 3px solid #b37feb; /* Purple for AI/Insights */
    border-color: rgba(179, 127, 235, 0.3);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 15px 100%, 0 calc(100% - 15px));
}

.cp-title {
    font-size: 13px;
    color: #00f6ff;
    margin-bottom: 8px;
    font-weight: bold;
    border-bottom: 1px dashed rgba(0, 246, 255, 0.3);
    padding-bottom: 4px;
}
```

## AI Insight Panels

Elements focused on AI analysis use a distinct purple/magenta theme (`#b37feb` / `#722ed1`) to stand out from the standard cyan.

```css
.ai-title {
    color: #b37feb;
    border-bottom-color: rgba(179, 127, 235, 0.3);
    display: flex;
    align-items: center;
    gap: 6px;
}

.ai-pulse-ring {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #b37feb;
    box-shadow: 0 0 8px #b37feb;
    animation: aiPulse 2s infinite;
}

@keyframes aiPulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(179, 127, 235, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(179, 127, 235, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(179, 127, 235, 0); }
}

.ai-row .hl {
    color: #fff;
    font-weight: bold;
    text-shadow: 0 0 5px #b37feb;
}
```

## Responsive Breakpoints

```css
/* Large screens (1920x1080+) */
@media screen and (min-width: 1920px), (min-height: 1080px) {
    .cyber-container { gap: 30px; }
    .tech-card-title { font-size: 20px; line-height: 40px; }
    .kpi-item .value { font-size: 36px; }
}

/* Compact screens (< 800px height) */
@media screen and (max-height: 800px) {
    .cyber-container { gap: 10px; }
    .tech-card { padding: 10px; }
    .tech-card-title { font-size: 14px; line-height: 24px; }
    .kpi-item .value { font-size: 20px; }
}
```