# Interaction Patterns for Tech Dashboards

## 1. RollingNumber Animation Component

A reusable component that animates numbers from 0 to the target value when KPI data loads.

```jsx
const RollingNumber = ({ value, prefix = '', suffix = '' }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = parseFloat(value) || 0;
        if (start === end) return;

        const totalFrame = 60;
        let currentFrame = 0;
        const step = (end - start) / totalFrame;

        const timer = setInterval(() => {
            currentFrame++;
            start += step;
            if (currentFrame >= totalFrame) {
                start = end;
                clearInterval(timer);
            }
            setDisplayValue(start);
        }, 16); // ~60fps

        return () => clearInterval(timer);
    }, [value]);

    return (
        <span className="value">
            {prefix}{displayValue.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}{suffix}
        </span>
    );
};

// Usage:
<RollingNumber value={coreMetrics.total_amount / 10000} suffix="万" />
<RollingNumber value={coreMetrics.gross_margin} suffix="%" />
```

## 2. Cross-Chart Click-to-Filter Linking

Allow clicking a bar/pie slice in one chart to filter all other charts on the page. Use a shared `currentFilter` state.

```jsx
const [currentFilter, setCurrentFilter] = useState(-1); // -1 = no filter

// Chart A (source): Toggle filter on click
const handleChartClick = (params) => {
    const clickedIndex = params.dataIndex;
    setCurrentFilter(prev => prev === clickedIndex ? -1 : clickedIndex);
};

// Chart B (target): Dim non-matching data
const getFilteredOption = () => ({
    series: [{
        data: allData.map((item, i) => ({
            value: item.value,
            itemStyle: {
                color: (currentFilter === -1 || currentFilter === i)
                    ? normalColor
                    : 'rgba(0,119,255,0.15)' // Dimmed
            }
        }))
    }]
});

// Reset button
{currentFilter !== -1 && (
    <div className="filter-alert" onClick={() => setCurrentFilter(-1)}>
        [ 解除锁定：<span>{ITEMS[currentFilter]}</span> ]
    </div>
)}

// Wire up events on ReactECharts
<ReactECharts
    option={getChartOption()}
    onEvents={{ click: handleChartClick }}
/>
```

## 3. Time Period Quick-Select Buttons

Provide preset time ranges as clickable buttons with a cyber-styled appearance.

```jsx
const TIME_OPTIONS = [
    { label: '双周', value: 'twoWeeks' },
    { label: '一个月', value: 'oneMonth' },
    { label: '三个月', value: 'threeMonths' },
    { label: '半年', value: 'halfYear' },
    { label: '一年', value: 'oneYear' },
    { label: '今年', value: 'thisYear' },
    { label: '自定义', value: 'custom' },
];

const [timeType, setTimeType] = useState('twoWeeks');
const [dateRange, setDateRange] = useState([dayjs().subtract(14, 'day'), dayjs()]);

const getDateRangeByType = (type) => {
    const now = dayjs();
    switch (type) {
        case 'twoWeeks': return [now.subtract(14, 'day'), now];
        case 'oneMonth': return [now.subtract(1, 'month'), now];
        case 'threeMonths': return [now.subtract(3, 'month'), now];
        case 'halfYear': return [now.subtract(6, 'month'), now];
        case 'oneYear': return [now.subtract(12, 'month'), now];
        case 'thisYear': return [now.startOf('year'), now];
        default: return dateRange;
    }
};

const handleTimeTypeChange = (value) => {
    setTimeType(value);
    if (value !== 'custom') setDateRange(getDateRangeByType(value));
};

// Render buttons
<div className="time-filter-buttons">
    {TIME_OPTIONS.map(opt => (
        <div
            key={opt.value}
            className={`time-btn ${timeType === opt.value ? 'active' : ''}`}
            onClick={() => handleTimeTypeChange(opt.value)}
        >
            {opt.label}
        </div>
    ))}
</div>

// CSS for time buttons (cyber style with clip-path)
// See css-guidelines.md → "Time Filter Buttons" section
```

## 4. Tab Navigation (Header Tabs)

Switch between different analysis views (Overview, SKU, Agent, Customer, etc.).

```jsx
const [activeTab, setActiveTab] = useState('overview');

// Header tabs
<div className="nav-tabs">
    {[
        { key: 'overview', icon: <DashboardOutlined />, label: '总览视角' },
        { key: 'sku', icon: <ShoppingOutlined />, label: 'SKU分析' },
        { key: 'agent', icon: <TeamOutlined />, label: '代理商分析' },
    ].map(tab => (
        <div
            key={tab.key}
            className={`nav-tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
        >
            <span>{tab.icon} {tab.label}</span>
        </div>
    ))}
</div>

// Content area — only render active tab, pass isActive prop
<div style={{ flex: 1, overflow: 'auto' }}>
    {activeTab === 'overview' && renderOverview()}
    {activeTab === 'sku' && (
        <SKUDashboard isActive={activeTab === 'sku'} dateRange={dateRange} />
    )}
</div>
```

## 5. Inner Tab Switching (Within a Card)

For switching views within a single panel (e.g., "By Type" vs "By Ranking").

```jsx
const [agentTab, setAgentTab] = useState(0);

<div className="cyber-chart-title">
    代理商分析
    <div style={{ marginLeft: 'auto', display: 'flex' }}>
        <button className={`tab-btn${agentTab === 0 ? ' active' : ''}`}
                onClick={() => setAgentTab(0)}>代理商类型</button>
        <button className={`tab-btn${agentTab === 1 ? ' active' : ''}`}
                onClick={() => setAgentTab(1)}>代理商排名</button>
    </div>
</div>

{agentTab === 0 && <ReactECharts option={getTypeOption()} />}
{agentTab === 1 && <ReactECharts option={getRankOption()} />}
```

**CSS for inner tab buttons:**
```css
.tab-btn {
    padding: 3px 12px;
    font-size: 12px;
    color: #a6c0fe;
    background: transparent;
    border: 1px solid rgba(0, 246, 255, 0.3);
    cursor: pointer;
    transition: all 0.3s;
}
.tab-btn.active {
    color: #00f6ff;
    background: rgba(0, 246, 255, 0.15);
    border-color: #00f6ff;
    box-shadow: 0 0 8px rgba(0, 246, 255, 0.3);
}
.tab-btn:hover { color: #00f6ff; }
```

## 6. Fullscreen Toggle

```jsx
const containerRef = useRef(null);
const [isFullscreen, setIsFullscreen] = useState(false);

const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
    } else {
        document.exitFullscreen();
        setIsFullscreen(false);
    }
};

// Listen for fullscreen changes
useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
}, []);

// IMPORTANT: Force chart re-render after fullscreen toggle
useEffect(() => {
    setChartKey(prev => prev + 1); // Force React key change
    window.dispatchEvent(new Event('resize'));
    // Multiple delayed resizes for cross-browser compatibility
    const timers = [50, 150, 300, 500].map(ms =>
        setTimeout(() => window.dispatchEvent(new Event('resize')), ms)
    );
    return () => timers.forEach(clearTimeout);
}, [isFullscreen]);
```

## 7. Auto-Rotating Map Highlights

Automatically cycle through provinces on a China map to draw attention.

```jsx
const [currentProvinceIndex, setCurrentProvinceIndex] = useState(0);
const mapChartRef = useRef(null);

// Auto-rotate every 3 seconds
useEffect(() => {
    if (!isMapLoaded || data.length === 0) return;
    const interval = setInterval(() => {
        setCurrentProvinceIndex(prev => (prev + 1) % data.length);
    }, 3000);
    return () => clearInterval(interval);
}, [isMapLoaded, data]);

// Apply highlight when index changes
useEffect(() => {
    const chart = mapChartRef.current?.getEchartsInstance();
    if (!chart || data.length === 0) return;

    chart.dispatchAction({ type: 'downplay', seriesIndex: 0 });

    const name = data[currentProvinceIndex]?.province;
    if (name) {
        chart.dispatchAction({ type: 'highlight', seriesIndex: 0, name });
        chart.dispatchAction({ type: 'showTip', seriesIndex: 0, name });
    }
}, [currentProvinceIndex, data]);
```

## 8. Dimension Switcher (Radio/Select for Chart Data)

Switch the data dimension of a chart without changing the chart type.

```jsx
const [breakdownDimension, setBreakdownDimension] = useState('sku_type');

<div className="tech-card-title">
    维度构成分析
    <Select
        value={breakdownDimension}
        onChange={setBreakdownDimension}
        size="small"
        dropdownClassName="dark-dropdown"
        style={{ width: 120, marginLeft: 'auto' }}
    >
        <Option value="sku_type">SKU类型</Option>
        <Option value="agent">代理商</Option>
        <Option value="industry">行业</Option>
    </Select>
</div>

// Only reload the specific chart data when dimension changes
useEffect(() => {
    loadDimensionBreakdown(); // Partial refresh, not full page reload
}, [breakdownDimension]);
```

## 9. Responsive Container with ResizeObserver

Ensure charts re-render correctly when the browser is resized or zoom level changes.

```jsx
useEffect(() => {
    let resizeObserver;
    if (containerRef.current) {
        resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => {
                window.dispatchEvent(new Event('resize'));
            });
        });
        resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver?.disconnect();
}, []);
```

## 10. Loading States

Use Ant Design's `Spin` component with centered layout for loading states.

```jsx
if (loading) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
        }}>
            <Spin size="large" />
        </div>
    );
}
```

For fade-in after load:
```css
.fade-in {
    animation: fadeIn 0.5s ease-in;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
```

## 11. Deterministic Pseudo-Random Data (For Stable Trends)

When generating mock data or demo charts, avoid using `Math.random()` directly, as it causes charts to wildly re-animate and jump around on every React re-render. Instead, use a deterministic sine-wave approach to ensure consistent mock data.

```javascript
// At the top of your file or inside a useMemo
let seed = 1;

// Function to generate data that looks random but stays exactly the same on re-renders
const getMockData = (count, min, max) => {
    return Array.from({ length: count }, () => {
        // Use Math.sin with a seed, scale the result (-1 to 1) to (0 to 1)
        const pseudoRandom = (Math.sin(seed++) + 1) / 2;
        return Math.floor(pseudoRandom * (max - min + 1)) + min;
    });
};

// Usage
const trendData = useMemo(() => getMockData(12, 100, 500), [timeFilter]);
```

## 12. Dual-Layer Pie Hover Interaction

When using a dual-layer pie chart (current period outer ring + previous period inner ring), add `mouseover`/`mouseout` events to temporarily override the center label with the hovered slice's data.

```jsx
const [centerLabel, setCenterLabel] = useState(null);

const onPieEvents = {
    mouseover: (params) => {
        if (params.seriesIndex === 0) { // Only for outer ring
            setCenterLabel({
                name: params.name,
                value: params.value,
                percent: params.percent
            });
        }
    },
    mouseout: () => setCenterLabel(null)
};

// In the pie option, use centerLabel to override the center rich text
const getPieOption = () => ({
    series: [{
        type: 'pie',
        radius: ['60%', '80%'],
        label: {
            show: true,
            position: 'center',
            formatter: centerLabel
                ? `{n|${centerLabel.name}}\n{v|${centerLabel.value}}\n{t|占比 ${centerLabel.percent?.toFixed(1)}%}`
                : `{n|总金额}\n{v|${totalAmount}}\n{t|环比 ▲ ${growthRate}%}`,
            rich: { /* ... same as before ... */ }
        },
        // ...data
    }]
});

<ReactECharts option={getPieOption()} onEvents={onPieEvents} />
```

## 13. Rich Query Filter Bar

Every dashboard must have a rich query bar, combining time filters with multiple dimension selectors (dropdowns).

```html
<!-- Vanilla HTML Example -->
<div class="filter-bar">
    <div class="filter-group">
        <span class="filter-label">数据视角:</span>
        <select class="cyber-select" onchange="fetchData()">
            <option value="all">全量大盘</option>
            <option value="top">头部客户</option>
        </select>
    </div>
    <div class="filter-group">
        <span class="filter-label">状态:</span>
        <select class="cyber-select" onchange="fetchData()">
            <option value="active">运行中</option>
            <option value="offline">已离线</option>
        </select>
    </div>
    <div class="time-filter">
        <!-- Time buttons here -->
    </div>
</div>
```

## 14. Central KPI Click Linkage & Visual Effects

Clicking central KPI cards must trigger an active state, a visual ripple effect, and load new data into surrounding trend charts using ECharts' `showLoading()`.

**CSS:**
```css
.kpi-item { cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden; }
.kpi-item:hover { transform: translateY(-5px) skewX(-5deg); box-shadow: 0 8px 25px rgba(0, 246, 255, 0.4); }
.kpi-item.active { background: linear-gradient(180deg, rgba(0,246,255,0.4) 0%, rgba(0,50,150,0.8) 100%); border-color: #00f6ff; }

.ripple {
    position: absolute; border-radius: 50%; background: rgba(0, 246, 255, 0.6);
    transform: scale(0); animation: ripple-anim 0.6s linear; pointer-events: none;
}
@keyframes ripple-anim { to { transform: scale(4); opacity: 0; } }
```

**JS:**
```javascript
function handleKpiClick(element, kpiType) {
    // 1. Visual Ripple Effect
    const circle = document.createElement('span');
    const rect = element.getBoundingClientRect();
    circle.style.width = circle.style.height = Math.max(rect.width, rect.height) + 'px';
    circle.style.left = (event.clientX - rect.left - rect.width/2) + 'px';
    circle.style.top = (event.clientY - rect.top - rect.height/2) + 'px';
    circle.classList.add('ripple');
    element.appendChild(circle);
    setTimeout(() => circle.remove(), 600);

    // 2. Toggle Active State
    document.querySelectorAll('.kpi-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    // 3. Trigger Linkage with Loading State
    trendChart.showLoading({ text: 'SYNCING...', color: '#00f6ff', textColor: '#00f6ff', maskColor: 'rgba(3, 10, 22, 0.8)' });
    
    setTimeout(() => {
        trendChart.hideLoading();
        // Generate new mock data based on kpiType
        trendChart.setOption({ series: [{ data: newMockData }] });
    }, 600);
}
```