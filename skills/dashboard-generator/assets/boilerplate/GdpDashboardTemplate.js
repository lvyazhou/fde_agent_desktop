import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import './GdpDashboardTemplate.css';

// ============================================================================
// GDP / Regional Economy Analysis React Dashboard Template
// 政务/宏观经济风格 - 异形头部、四角装饰、大屏赛博科技、左中右经典布局
// ============================================================================

// --- 1. Sub-Components ---

const CoreKpiBox = ({ title, value, unit, trend, trendValue, isActive, onClick }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const [ripple, setRipple] = useState(null);

    const handleClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        setRipple({
            x: e.clientX - rect.left - size / 2,
            y: e.clientY - rect.top - size / 2,
            size
        });
        setTimeout(() => setRipple(null), 600);
        if (onClick) onClick();
    };

    useEffect(() => {
        let startTimestamp = null;
        const duration = 1500;
        const finalValue = typeof value === 'number' ? value : parseFloat(value.toString().replace(/,/g, ''));

        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            setDisplayValue(progress * finalValue);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                setDisplayValue(finalValue);
            }
        };
        window.requestAnimationFrame(step);
    }, [value]);

    const formattedValue = Number.isInteger(value) ? Math.floor(displayValue).toLocaleString() : displayValue.toFixed(1);
    const isUp = trend === 'up';

    return (
        <div className={`gdp-core-kpi-box ${isActive ? 'active' : ''}`} onClick={handleClick}>
            {ripple && (
                <span className="gdp-ripple" style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }} />
            )}
            <div className="gdp-kpi-title">{title}</div>
            <div className="gdp-kpi-value">
                {formattedValue}
                <span className="gdp-kpi-unit">{unit}</span>
            </div>
            {trend && (
                <div className={`gdp-kpi-trend ${isUp ? 'biz-trend-up' : 'biz-trend-down'}`} style={{ color: isUp ? '#52c41a' : '#ff4d4f' }}>
                    同比 {isUp ? '▲' : '▼'} {trendValue}%
                </div>
            )}
        </div>
    );
};

// Custom Select Component
const CustomSelect = ({ options, value, onChange }) => {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);
    const selected = options.find(o => o.value === value);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className={`gdp-custom-select-wrapper ${open ? 'open' : ''}`} ref={wrapperRef}>
            <div className="gdp-custom-select-trigger" onClick={() => setOpen(!open)}>
                <span>{selected ? selected.label : '请选择'}</span>
                <div className="arrow">▼</div>
            </div>
            <div className="gdp-custom-options">
                {options.map(opt => (
                    <span
                        key={opt.value}
                        className={`gdp-custom-option ${opt.value === value ? 'selected' : ''}`}
                        onClick={() => { onChange(opt.value); setOpen(false); }}
                    >
                        {opt.label}
                    </span>
                ))}
            </div>
        </div>
    );
};

// --- 2. Main Dashboard Component ---

const GdpDashboardTemplate = () => {
    const containerRef = useRef(null);
    const [yearFilter, setYearFilter] = useState('2024');
    const [quarterFilter, setQuarterFilter] = useState('Q4');
    const [regionFilter, setRegionFilter] = useState('all');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // UI States
    const [activeKpi, setActiveKpi] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [cardTabs, setCardTabs] = useState({ gdpTrend: 0, industry: 0, invest: 0, finance: 0 });

    // --- Fullscreen Toggle ---
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    useEffect(() => {
        const timers = [50, 150, 300, 500].map(ms =>
            setTimeout(() => window.dispatchEvent(new Event('resize')), ms)
        );
        return () => timers.forEach(clearTimeout);
    }, [isFullscreen]);

    // --- ResizeObserver ---
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

    // --- Interaction ---
    const handleKpiClick = (index) => {
        setActiveKpi(index);
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 800);
    };

    const handleTabSwitch = (cardKey, tabIndex) => {
        setCardTabs(prev => ({ ...prev, [cardKey]: tabIndex }));
    };

    // --- 3. ECharts Options (政务科技风配色) ---

    const getCommonOptions = () => ({
        backgroundColor: 'transparent',
        textStyle: { fontFamily: 'Microsoft YaHei, sans-serif' },
        tooltip: {
            backgroundColor: 'rgba(3, 10, 22, 0.9)',
            borderColor: '#00f6ff',
            textStyle: { color: '#fff' },
            axisPointer: { type: 'cross', label: { backgroundColor: '#00f6ff', color: '#000' } }
        },
        grid: { top: 35, right: 15, bottom: 25, left: 45, containLabel: true }
    });

    // GDP 增速趋势 (Line + Bar 双轴)
    const gdpTrendOption = {
        ...getCommonOptions(),
        tooltip: { trigger: 'axis' },
        legend: { data: ['GDP总量', 'GDP增速'], top: 5, textStyle: { color: '#a6c0fe' }, icon: 'rect', itemWidth: 12, itemHeight: 3 },
        xAxis: {
            type: 'category',
            data: ['2019', '2020', '2021', '2022', '2023', '2024'],
            axisLabel: { color: '#a6c0fe' },
            axisLine: { lineStyle: { color: 'rgba(0,246,255,0.3)' } }
        },
        yAxis: [
            { type: 'value', name: '亿元', nameTextStyle: { color: '#a6c0fe' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }, axisLabel: { color: '#a6c0fe' } },
            { type: 'value', name: '%', nameTextStyle: { color: '#a6c0fe' }, splitLine: { show: false }, axisLabel: { color: '#a6c0fe' } }
        ],
        series: isSyncing ? [] : [
            {
                name: 'GDP总量', type: 'bar', barWidth: '30%',
                data: [3200, 3100, 3500, 3400, 3700, 4050],
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#00f6ff' },
                        { offset: 1, color: 'rgba(0,246,255,0.1)' }
                    ]),
                    borderRadius: [4, 4, 0, 0]
                }
            },
            {
                name: 'GDP增速', type: 'line', yAxisIndex: 1, smooth: true,
                data: [6.1, -2.5, 8.1, 3.0, 5.2, 5.8],
                itemStyle: { color: '#faad14' },
                lineStyle: { width: 3 },
                symbol: 'circle', symbolSize: 8
            }
        ]
    };

    // 产业结构环形图
    const industryOption = {
        ...getCommonOptions(),
        tooltip: { trigger: 'item', formatter: '{b}: {c}亿 ({d}%)' },
        series: [{
            name: '产业结构', type: 'pie', radius: ['45%', '70%'], center: ['50%', '50%'],
            itemStyle: { borderRadius: 4, borderColor: '#030a16', borderWidth: 2 },
            label: { show: true, color: '#a6c0fe', formatter: '{b}\n{d}%' },
            data: [
                { value: 120, name: '第一产业', itemStyle: { color: '#52c41a' } },
                { value: 1580, name: '第二产业', itemStyle: { color: '#00f6ff' } },
                { value: 2350, name: '第三产业', itemStyle: { color: '#faad14' } }
            ]
        }]
    };

    // 固定资产投资趋势
    const investOption = {
        ...getCommonOptions(),
        tooltip: { trigger: 'axis' },
        xAxis: {
            type: 'category', data: ['Q1', 'Q2', 'Q3', 'Q4'],
            axisLabel: { color: '#a6c0fe' },
            axisLine: { lineStyle: { color: 'rgba(0,246,255,0.3)' } }
        },
        yAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
            axisLabel: { color: '#a6c0fe' }
        },
        series: [{
            name: '固定投资', type: 'line', smooth: true,
            data: [520, 680, 750, 890],
            itemStyle: { color: '#722ed1' },
            lineStyle: { width: 3 },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(114,46,209,0.4)' },
                    { offset: 1, color: 'transparent' }
                ])
            }
        }]
    };

    // 财政收支对比横向柱
    const financeOption = {
        ...getCommonOptions(),
        grid: { top: 10, right: 30, bottom: 15, left: 15, containLabel: true },
        xAxis: { type: 'value', show: false },
        yAxis: {
            type: 'category',
            data: ['一般公共预算收入', '一般公共预算支出', '税收收入', '非税收入', '民生支出'],
            axisLine: { show: false }, axisTick: { show: false },
            axisLabel: { color: '#a6c0fe', fontSize: 12 }
        },
        series: [{
            type: 'bar',
            data: [380, 420, 280, 100, 350],
            barWidth: '14px',
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: 'transparent' },
                    { offset: 1, color: '#00f6ff' }
                ]),
                borderRadius: [0, 3, 3, 0]
            },
            label: { show: true, position: 'right', color: '#00f6ff', formatter: '{c}亿' }
        }]
    };

    // Dropdown options
    const yearOptions = [
        { value: '2024', label: '2024年' },
        { value: '2023', label: '2023年' },
        { value: '2022', label: '2022年' }
    ];

    const quarterOptions = [
        { value: 'Q4', label: '第四季度' },
        { value: 'Q3', label: '第三季度' },
        { value: 'Q2', label: '第二季度' },
        { value: 'Q1', label: '第一季度' }
    ];

    const regionOptions = [
        { value: 'all', label: '全区' },
        { value: 'core', label: '核心城区' },
        { value: 'dev', label: '开发区' }
    ];

    return (
        <div className="gdp-dashboard-container" ref={containerRef}>
            {/* Header */}
            <div className="gdp-header">
                <div className="gdp-header-left" />
                <div className="gdp-header-title">区域经济运行分析驾驶舱</div>
                <div className="gdp-header-right">
                    <button className="gdp-time-btn" onClick={toggleFullscreen} style={{ borderColor: '#faad14', color: '#faad14' }}>
                        {isFullscreen ? '⊡ 退出' : '⛶ 全屏'}
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="gdp-filter-bar">
                <div className="gdp-filter-group">
                    <span className="gdp-filter-label">年度:</span>
                    <CustomSelect options={yearOptions} value={yearFilter} onChange={setYearFilter} />
                </div>
                <div className="gdp-filter-group">
                    <span className="gdp-filter-label">季度:</span>
                    <CustomSelect options={quarterOptions} value={quarterFilter} onChange={setQuarterFilter} />
                </div>
                <div className="gdp-filter-group">
                    <span className="gdp-filter-label">区域:</span>
                    <CustomSelect options={regionOptions} value={regionFilter} onChange={setRegionFilter} />
                </div>
                <div style={{ flex: 1 }} />
                <button className="gdp-time-btn" onClick={() => { setIsSyncing(true); setTimeout(() => setIsSyncing(false), 800); }}>
                    ↻ 查询刷新
                </button>
            </div>

            {/* Main Content */}
            <div className="gdp-dashboard-content">

                {/* Left Panel */}
                <div className="gdp-side-panel">
                    <div className="gdp-tech-card">
                        <div className="gdp-card-corners" />
                        <div className="gdp-card-header">
                            <span className="gdp-card-title">GDP增长趋势</span>
                            <div className="gdp-chart-tabs">
                                <button className={`gdp-tab-btn ${cardTabs.gdpTrend === 0 ? 'active' : ''}`} onClick={() => handleTabSwitch('gdpTrend', 0)}>年度</button>
                                <button className={`gdp-tab-btn ${cardTabs.gdpTrend === 1 ? 'active' : ''}`} onClick={() => handleTabSwitch('gdpTrend', 1)}>季度</button>
                            </div>
                        </div>
                        <div className="gdp-chart-wrapper">
                            <ReactECharts option={gdpTrendOption} showLoading={isSyncing} loadingOption={{ text: 'SYNCING...', color: '#00f6ff', textColor: '#00f6ff', maskColor: 'rgba(3, 10, 22, 0.8)' }} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                    <div className="gdp-tech-card">
                        <div className="gdp-card-corners" />
                        <div className="gdp-card-header">
                            <span className="gdp-card-title">产业结构分析</span>
                            <div className="gdp-chart-tabs">
                                <button className={`gdp-tab-btn ${cardTabs.industry === 0 ? 'active' : ''}`} onClick={() => handleTabSwitch('industry', 0)}>占比</button>
                                <button className={`gdp-tab-btn ${cardTabs.industry === 1 ? 'active' : ''}`} onClick={() => handleTabSwitch('industry', 1)}>增速</button>
                            </div>
                        </div>
                        <div className="gdp-chart-wrapper">
                            <ReactECharts option={industryOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                </div>

                {/* Center Panel */}
                <div className="gdp-center-panel">
                    {/* Core KPIs */}
                    <div className="gdp-core-kpi-row">
                        <CoreKpiBox title="地区生产总值" value={4050} unit="亿元" trend="up" trendValue={5.8} isActive={activeKpi === 0} onClick={() => handleKpiClick(0)} />
                        <CoreKpiBox title="规上工业增加值" value={1280} unit="亿元" trend="up" trendValue={7.2} isActive={activeKpi === 1} onClick={() => handleKpiClick(1)} />
                        <CoreKpiBox title="社消品零售总额" value={860} unit="亿元" trend="up" trendValue={4.5} isActive={activeKpi === 2} onClick={() => handleKpiClick(2)} />
                    </div>

                    {/* Center Main Chart (Map placeholder / big chart area) */}
                    <div className="gdp-tech-card" style={{ flex: 1 }}>
                        <div className="gdp-card-corners" />
                        <div className="gdp-card-header">
                            <span className="gdp-card-title" style={{ color: '#faad14' }}>📍 区域经济发展全景图 (中心视图)</span>
                        </div>
                        <div className="gdp-chart-wrapper">
                            {/* TODO: Replace with Map chart or core visualization */}
                            <ReactECharts option={gdpTrendOption} showLoading={isSyncing} loadingOption={{ text: '数据加载中...', color: '#faad14', textColor: '#faad14', maskColor: 'rgba(3, 10, 22, 0.8)' }} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="gdp-side-panel">
                    <div className="gdp-tech-card">
                        <div className="gdp-card-corners" />
                        <div className="gdp-card-header">
                            <span className="gdp-card-title">固定资产投资趋势</span>
                            <div className="gdp-chart-tabs">
                                <button className={`gdp-tab-btn ${cardTabs.invest === 0 ? 'active' : ''}`} onClick={() => handleTabSwitch('invest', 0)}>总量</button>
                                <button className={`gdp-tab-btn ${cardTabs.invest === 1 ? 'active' : ''}`} onClick={() => handleTabSwitch('invest', 1)}>增速</button>
                            </div>
                        </div>
                        <div className="gdp-chart-wrapper">
                            <ReactECharts option={investOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                    <div className="gdp-tech-card">
                        <div className="gdp-card-corners" />
                        <div className="gdp-card-header">
                            <span className="gdp-card-title">财政收支分析</span>
                            <div className="gdp-chart-tabs">
                                <button className={`gdp-tab-btn ${cardTabs.finance === 0 ? 'active' : ''}`} onClick={() => handleTabSwitch('finance', 0)}>收支</button>
                                <button className={`gdp-tab-btn ${cardTabs.finance === 1 ? 'active' : ''}`} onClick={() => handleTabSwitch('finance', 1)}>趋势</button>
                            </div>
                        </div>
                        <div className="gdp-chart-wrapper">
                            <ReactECharts option={financeOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default GdpDashboardTemplate;
