---
name: dashboard-generator
description: Generate cyber/tech style business analysis dashboards using React, ECharts and Ant Design. Use this when the user asks to generate, build, or create a data dashboard, analysis screen, large screen display (大屏), or data visualization panel based on business requirements.
---

# Dashboard Generator Skill

This skill provides comprehensive templates, guidelines, and reusable patterns for creating high-quality, tech-themed React dashboards using Ant Design and ECharts. It captures the full design system of a production "Business Analysis Center" (经营分析驾驶舱).

## When to Use

- Creating a new business data dashboard or analytics panel
- Building a large-screen data visualization (大屏/驾驶舱)
- Implementing a cyber/tech-themed UI with ECharts charts
- Adding interactive filtering, cross-chart linking, or drill-down to dashboards
- Generating standalone single-file HTML dashboards for AI Agents or external embed

## Tech Stack & Output Modes

This skill supports two distinct output formats depending on the user's needs:

### Mode 1: React Project (Default)
Used when building directly inside the frontend source code.
| Dependency | Purpose |
|---|---|
| `react` | UI framework |
| `echarts` + `echarts-for-react` | Chart rendering (via `ReactECharts`) |
| `antd` | UI components |
| `dayjs` | Date manipulation |
| `axios` | API calls |

### Mode 2: Vanilla HTML (For AI Agents)
Used when the user requests an HTML file, standalone dashboard, or specifically mentions AI Agents (智能体).
- **Single HTML File**: Contains all CSS and JS inline.
- **Vanilla JS**: No React, no build tools required.
- **ECharts via CDN**: Fetched directly from `https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js`.
- **Vanilla DOM Manipulation**: Native `document.getElementById`, `window.addEventListener('resize')`.

## Core Design Principles & Themes

1. **Four Visual Themes**:
   - **Default Cyber (赛博朋克)**: Dark backgrounds (`#030814` / `#030a16`), glowing cyan accents (`#00f6ff`), CRT scanlines, grid overlays.
   - **Business/Corporate (商务风格)**: Dark blue (`#0f172a`), professional gold (`#faad14`), clean UI, no heavy neon.
   - **Minimalist (简约风格)**: Slate background (`#0f172a`), flat blue accents (`#3b82f6`), rounded corners, no tech borders.
   - **GDP/Government (宏观经济)**: Deep blue UI, SVG trapezoid headers, specific layout for macro-economic analysis.
2. **Layout Patterns**: Use CSS Grid or Flexbox for multi-column layouts. Common patterns include:
   - **3-Column**: Left panels + Center (KPIs + Map/Core) + Right panels (most common for full-page dashboards)
   - **Vertical Stack**: Top KPI cards → Middle charts → Bottom detail tables (for sub-pages/tabs)
   - **Tab-based**: Header with tab navigation switching between different analysis views
3. **ECharts Integration**: Always use `echarts-for-react` (`ReactECharts`) or vanilla `echarts`. Charts MUST be responsive, use transparent backgrounds, and use the dark theme tooltip styling.
4. **UI Components & Overrides**: Antd components (or native `<select>`/custom dropdowns) MUST be overridden with scoped CSS to match the selected theme. Use prefix classes (e.g., `.biz-`, `.simple-`, `.gdp-`) to avoid collisions.
5. **Mandatory Interactive Features (四大核心交互)**: ALL generated dashboards MUST explicitly implement these 4 features:
   - **① Fullscreen Display (全屏展示)**: A functional full-screen toggle button positioned in the header or filter bar.
   - **② Rich Query Conditions (丰富的查询条件)**: A dedicated filter bar (not just time filters) containing multiple dimensions like dropdowns, radio buttons, and status selectors.
   - **③ Visual Click Linkage (可视化点击联动)**: Clicking on visualization elements—*ESPECIALLY central KPIs and core map/ring charts*—MUST trigger dynamic data updates, loading states (`showLoading()`), and data syncing in surrounding trend charts. Include hover/click ripple CSS effects for immediate visual feedback.
   - **④ Card Dimension Tags (卡片多维度标签)**: Every chart card/panel MUST include internal category tags/tabs (e.g., "By Type" / "By Value") in its header to allow switching between multi-dimensional statistical views.

## Bundled Resources

### Reference Files

- [references/css-guidelines.md](references/css-guidelines.md): Core CSS patterns — dark backgrounds, grid overlays, CRT scan lines, tech cards (two variants), KPI displays, progress bars, animations, Antd dark overrides, custom scrollbars.
- [references/echarts-templates.md](references/echarts-templates.md): Pre-styled ECharts configs — Bar, Horizontal Bar, Line, Pie/Donut, Stacked Bar, Scatter/Bubble, Nightingale Rose, Dual-axis (Bar+Line), Heatmap, China Map.
- [references/interaction-patterns.md](references/interaction-patterns.md): Interactive patterns — cross-chart click-to-filter linking, time period quick-select buttons, tab navigation, fullscreen toggle, RollingNumber animation, auto-rotating map highlights.
- [references/table-styles.md](references/table-styles.md): Custom dark table styling — bordered tables, rank badges (gold/silver/bronze), mini tables, hover effects, Antd Pagination dark overrides.

### Assets

#### Boilerplate

**React Component Templates (Mode 1):**
- `assets/boilerplate/DashboardTemplate.js` & `DashboardTemplate.css`: **Default Cyber theme** React boilerplate. Dark backgrounds, neon cyan accents, CRT scanlines, grid overlays, full RollingNumber + CustomSelect + 3-column layout.
- `assets/boilerplate/BusinessDashboardTemplate.js` & `BusinessDashboardTemplate.css`: **Business/Corporate theme** React boilerplate. Dark blue/gold palette (`#faad14` accent), clean professional UI without heavy neon. **MANDATORY**: Use when user mentions "商务" or "Corporate".
- `assets/boilerplate/SimpleDashboardTemplate.js` & `SimpleDashboardTemplate.css`: **Minimalist theme** React boilerplate. Slate background (`#0f172a`), rounded corners, flat blue accents (`#3b82f6`), no scanlines or grid overlays. **MANDATORY**: Use when user mentions "简约" or "简单".
- `assets/boilerplate/GdpDashboardTemplate.js` & `GdpDashboardTemplate.css`: **Government/GDP analysis theme** React boilerplate. Deep blue UI, SVG trapezoid header, dedicated filter bar row, CoreKpiBox component, macro-economic chart presets. **MANDATORY**: Use when user mentions "GDP", "区域经济", "经济分析", or "宏观经济".

**Vanilla HTML Templates (Mode 2):**
- `assets/boilerplate/vanilla-html-dashboard.html`: Default cyber theme standalone HTML dashboard boilerplate.
- `assets/boilerplate/business-html-dashboard.html`: Business/Corporate theme standalone HTML dashboard boilerplate (cleaner UI, no neon, professional colors).
- `assets/boilerplate/simple-html-dashboard.html`: Minimalist dashboard boilerplate. **MANDATORY**: Use this template first if user mentions "简约" or "简单".
- `assets/boilerplate/gdp-html-dashboard.html`: GDP/Regional Economy analysis dashboard boilerplate. **MANDATORY**: Use this template first if user mentions "GDP", "区域经济", "经济分析", or "宏观经济".
#### Examples
- `assets/examples/ServicePackageAnalysisDashboard.js` (along with `ServicePackageCyber.css` and `ServicePackageCyberUtils.js`): A complete, production-ready React component example demonstrating multi-tab navigation, custom hooks, dimension switching, and rich ECharts visualizations.
- `assets/examples/service_package_dashboard_cyber.html`: A comprehensive, standalone Vanilla HTML dashboard example featuring intricate layouts, animations, ECharts integration via CDN, and a polished dark cyber theme perfect for AI agent outputs.
- `assets/examples/gold_stock_analysis_dashboard.html`: A high-end Business/Corporate style (商务风格) dashboard example, focusing on clean layouts, professional gold/blue color schemes, and subtle animations without heavy neon effects.

## Workflow (The "One-Prompt Generation" Standard)

When a user provides a single prompt (e.g., "Generate a Sales Dashboard"), you MUST follow these steps to deliver a fully functional, highly-polished result:

1. **Determine Output Format & Style**: Decide if the user needs a React component (default) or a standalone HTML file. Analyze the prompt keywords to pick one of the 4 themes (Cyber/Business/Simple/GDP).
2. **Auto-Design the Business Logic**: If the user doesn't specify details, INVENT them.
   - Create 4 meaningful Central KPIs based on the domain (e.g., Sales -> Revenue, Orders, Customers, Agents).
   - Design 4-5 meaningful chart dimensions (e.g., Trend over time, Regional Map/Bar, Funnel/Radar, Ranking).
   - Define realistic, domain-specific options for the Rich Query Filter Bar.
3. **Setup Structure**:
   - **For React**: Use the appropriate React boilerplate based on requested style: `DashboardTemplate` (default cyber), `BusinessDashboardTemplate` (商务/Corporate), `SimpleDashboardTemplate` (简约/简单), or `GdpDashboardTemplate` (GDP/宏观经济). **Best Practice**: Extract chart option builders and mock data constants into a separate `*Utils.js` file.
   - **For HTML**: Use the appropriate HTML boilerplate based on requested style: `vanilla-html-dashboard.html` (default cyber), `business-html-dashboard.html` (商务/Corporate), `simple-html-dashboard.html` (简约/简单), or `gdp-html-dashboard.html` (GDP/宏观经济). Ensure all CSS/JS stays inline.
4. **Implement Layout & Styles**: Ensure CSS Grid is used. Apply the specific CSS class prefixes (`biz-`, `simple-`, `gdp-`) to avoid collisions.
5. **Build Charts & Tabs**: Implement ECharts options. Reference `references/echarts-templates.md` for pre-styled configs.
   - **Mandatory**: Every chart MUST have internal `.chart-tabs`. Ensure JS logic is present to switch data upon tab click.
6. **Implement Global Linkage**:
   - Changing dropdowns in the Filter Bar MUST trigger a global `showLoading()` on all charts.
   - Clicking Central KPIs MUST show the ripple effect, set the KPI to active, and trigger `showLoading()` on the main trend chart before loading new data.
7. **Self-Correction Check**: Before returning the code, verify: Is the fullscreen button working? Are ECharts resizing properly? Are fonts visible? Is there a clear place in the code marked `// TODO: Replace with Real API Call`?

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| Primary Cyan | `#00f6ff` | Borders, accents, primary data, glow effects |
| Deep Blue BG | `#030a16` / `#030814` | Page background |
| Card BG | `rgba(6, 30, 93, 0.4~0.6)` | Card/panel backgrounds |
| Text Primary | `#fff` | Titles, values |
| Text Secondary | `#a6c0fe` | Labels, axis text, secondary info |
| Success Green | `#52c41a` / `#2ed573` | Positive trends, success states |
| Warning Orange | `#faad14` / `#ffaa00` | Warnings, secondary highlights |
| Danger Red | `#f5222d` / `#ff4d4f` | Negative trends, alerts |
| Purple Accent | `#722ed1` / `#b37feb` | Secondary data series, AI/special elements |
| Blue Link | `#1890ff` | Links, tertiary data |