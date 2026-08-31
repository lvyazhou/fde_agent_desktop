import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import './BusinessDashboardTemplate.css';

// ============================================================================
// Business/Corporate Theme React Dashboard Template
// 商务/企业风格 - 深蓝底 + 金色KPI + 青色边框 + 无重度霓虹
// ============================================================================

// --- 1. Sub-Components ---

const RollingNumber = ({ label, value, unit, trend, trendValue, isActive, onClick }) => {
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
            setDisplayValue(Math.floor(progress * finalValue));
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                setDisplayValue(finalValue);
            }
        };
        window.requestAnimationFrame(step);
    }, [value]);

    const formattedValue = displayValue.toLocaleString();
    const isUp = trend === 'up';

    return (
        <div className={`biz-kpi-item ${isActive ? 'active' : ''}`} onClick={handleClick}>
            {ripple && (
                <span className="biz-ripple" style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }} />
            )}
            <div className="biz-kpi-label">{label}</div>
            <div className="biz-kpi-value">
                {formattedValue}
                {unit && <span className="biz-kpi-unit">{unit}</span>}
            </div>
            {trend && (
                <div className={`biz-kpi-trend ${isUp ? 'biz-trend-up' : 'biz-trend-down'}`}>
                    同比 {isUp ? '▲' : '▼'} {trendValue}%
                </div>
            )}
        </div>
    );
};

// Custom Select Component (replaces native <select> for theme consistency)
const CustomSelect = ({ options, value, onChange, className = '' }) => {
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
        <div className={`biz-custom-select-wrapper ${open ? 'open' : ''} ${className}`} ref={wrapperRef}>
            <div className="biz-custom-select-trigger" onClick={() => setOpen(!open)}>
                <span>{selected ? selected.label : '请选择'}</span>
                <div className="arrow">▼</div>
            </div>
            <div className="biz-custom-options">
                {options.map(opt => (
                    <span
                        key={opt.value}
                        className={`biz-custom-option ${opt.value === value ? 'selected' : ''}`}
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

const BusinessDashboardTemplate = () => {
    const containerRef = useRef(null);
    const [timeFilter, setTimeFilter] = useState('双周');
    const [dimFilter, setDimFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('active');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // UI States for Interactive Requirements
    const [activeKpi, setActiveKpi] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [cardTabs, setCardTabs] = useState({ trend: 0, dist: 0, rank: 0, radar: 0 });

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

    // --- 3. ECharts Options (商务配色) ---

    const getCommonOptions = () => ({
        backgroundColor: 'transparent',
        textStyle: { fontFamily: 'Segoe UI, Roboto, Microsoft YaHei, sans-serif' },
        tooltip: {
            backgroundColor: 'rgba(3, 10, 22, 0.9)',
            borderColor: '#00f6ff',
            textStyle: { color: '#fff' },
            axisPointer: { type: 'cross', label: { backgroundColor: '#00f6ff', color: '#000' } }
        },
        grid: { top: 35, right: 15, bottom: 25, left: 45, containLabel: true }
    });

    // Line Trend Chart
    const lineChartOption = {
        ...getCommonOptions(),
        tooltip: { trigger: 'axis' },
        xAxis: {
            type: 'category',
            data: ['周一', '周二', '周三', '周四', '周五'],
            axisLabel: { color: '#a6c0fe' },
            axisLine: { lineStyle: { color: 'rgba(0,246,255,0.2)' } }
        },
        yAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } },
            axisLabel: { color: '#a6c0fe' }
        },
        series: isSyncing ? [] : [{
            type: 'line',
            smooth: true,
            data: activeKpi === 0 ? [120, 132, 101, 134, 90] : [60, 80, 50, 90, 110],
            itemStyle: { color: '#faad14' },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(250, 173, 20, 0.4)' },
                    { offset: 1, color: 'transparent' }
                ])
            }
        }]
    };

    // Horizontal Bar (Rank)
    const rankChartOption = {
        ...getCommonOptions(),
        grid: { top: 10, right: 30, bottom: 10, left: 10, containLabel: true },
        xAxis: { type: 'value', show: false },
        yAxis: { type: 'category', data: ['产品E', '产品D', '产品C', '产品B', '产品A'], axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#a6c0fe' } },
        series: [{ type: 'bar', data: [150, 200, 350, 600, 800], itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: 'transparent' }, { offset: 1, color: '#00f6ff' }]), borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', color: '#00f6ff' } }]
    };

    // Radar Chart
    const radarChartOption = {
        ...getCommonOptions(),
        grid: { top: 30, right: 20, bottom: 20, left: 20, containLabel: true },
        radar: {
            indicator: [{ name: '技术', max: 100 }, { name: '服务', max: 100 }, { name: '安全', max: 100 }, { name: '管理', max: 100 }, { name: '运营', max: 100 }],
            splitNumber: 4,
            axisName: { color: '#a6c0fe' },
            splitLine: { lineStyle: { color: ['rgba(0,246,255,0.08)', 'rgba(0,246,255,0.15)', 'rgba(0,246,255,0.25)', 'rgba(0,246,255,0.4)'] } },
            splitArea: { show: false },
            axisLine: { lineStyle: { color: 'rgba(0,246,255,0.3)' } }
        },
        series: [{
            type: 'radar',
            data: [{
                value: [80, 90, 85, 70, 75], name: '当前',
                areaStyle: { color: 'rgba(250, 173, 20, 0.3)' },
                lineStyle: { color: '#faad14' },
                itemStyle: { color: '#faad14' }
            }]
        }]
    };

    // Stacked Bar Chart
    const stackedBarOption = {
        ...getCommonOptions(),
        grid: { top: 30, right: 20, bottom: 20, left: 20, containLabel: true },
        xAxis: { type: 'category', data: ['W1', 'W2', 'W3', 'W4'], axisLabel: { color: '#a6c0fe' }, axisLine: { lineStyle: { color: 'rgba(0,246,255,0.2)' } } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' } }, axisLabel: { color: '#a6c0fe' } },
        series: [
            { name: 'A类', type: 'bar', stack: 'total', itemStyle: { color: '#00f6ff' }, barWidth: '40%', data: [120, 132, 101, 134] },
            { name: 'B类', type: 'bar', stack: 'total', itemStyle: { color: '#faad14' }, barWidth: '40%', data: [220, 182, 191, 234] }
        ]
    };

    // Donut Pie Chart
    const pieChartOption = {
        ...getCommonOptions(),
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        series: [{
            name: '分布', type: 'pie', radius: ['50%', '75%'], center: ['50%', '50%'],
            itemStyle: { borderRadius: 4, borderColor: '#030814', borderWidth: 2 },
            label: {
                show: true, position: 'center',
                formatter: `{n|核心指标}\n{v|85%}`,
                rich: {
                    n: { fontSize: 14, color: '#a6c0fe', padding: [0, 0, 5, 0] },
                    v: { fontSize: 36, fontWeight: 'bold', color: '#faad14', textShadow: '0 0 8px rgba(250,173,20,0.4)' }
                }
            },
            data: [
                { value: 1048, name: 'A', itemStyle: { color: '#00f6ff' } },
                { value: 735, name: 'B', itemStyle: { color: '#faad14' } },
                { value: 580, name: 'C', itemStyle: { color: '#b37feb' } },
                { value: 300, name: 'D', itemStyle: { color: '#2ed573' } }
            ]
        }]
    };

    // Dropdown options
    const dimOptions = [
        { value: 'all', label: '全部维度' },
        { value: 'core', label: '核心业务' },
        { value: 'sub', label: '子公司' }
    ];

    const statusOptions = [
        { value: 'active', label: '运行中' },
        { value: 'warning', label: '告警中' }
    ];

    return (
        <div className="biz-dashboard-container" ref={containerRef}>
            {/* Header */}
            <div className="biz-header">
                <div className="biz-header-title">BUSINESS ANALYTICS DASHBOARD</div>
                <div className="biz-filter-bar">
                    <div className="biz-filter-group">
                        <span className="biz-filter-label">维度:</span>
                        <CustomSelect options={dimOptions} value={dimFilter} onChange={setDimFilter} />
                    </div>
                    <div className="biz-filter-group">
                        <span className="biz-filter-label">状态:</span>
                        <CustomSelect options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
                    </div>
                    <div className="biz-time-filter">
                        {['双周', '本月', '半年', '一年'].map(tf => (
                            <button key={tf} className={`biz-time-btn ${timeFilter === tf ? 'active' : ''}`} onClick={() => setTimeFilter(tf)}>
                                {tf}
                            </button>
                        ))}
                    </div>
                    <button className="biz-fullscreen-btn" onClick={toggleFullscreen} title={isFullscreen ? '退出全屏' : '全屏展示'}>
                        {isFullscreen ? '⊡' : '⛶'}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="biz-dashboard-content">

                {/* KPI Row */}
                <div className="biz-kpi-row">
                    <RollingNumber label="总签单金额" value={5680} unit="万" trend="up" trendValue={12.5} isActive={activeKpi === 0} onClick={() => handleKpiClick(0)} />
                    <RollingNumber label="订单总量" value={845} unit="单" trend="up" trendValue={8.3} isActive={activeKpi === 1} onClick={() => handleKpiClick(1)} />
                    <RollingNumber label="覆盖客户" value={320} unit="家" trend="down" trendValue={2.1} isActive={activeKpi === 2} onClick={() => handleKpiClick(2)} />
                    <RollingNumber label="活跃代理" value={68} unit="家" trend="up" trendValue={5.0} isActive={activeKpi === 3} onClick={() => handleKpiClick(3)} />
                </div>

                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="biz-tech-card">
                        <div className="biz-card-title">
                            <span>趋势分析</span>
                            <div className="biz-chart-tabs">
                                <button className={`biz-tab-btn ${cardTabs.trend === 0 ? 'active' : ''}`} onClick={() => handleTabSwitch('trend', 0)}>按日</button>
                                <button className={`biz-tab-btn ${cardTabs.trend === 1 ? 'active' : ''}`} onClick={() => handleTabSwitch('trend', 1)}>按周</button>
                            </div>
                        </div>
                        <div className="biz-chart-wrapper">
                            <ReactECharts option={lineChartOption} showLoading={isSyncing} loadingOption={{ text: 'Loading...', color: '#faad14', textColor: '#faad14', maskColor: 'rgba(3, 10, 22, 0.8)' }} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                    <div className="biz-tech-card">
                        <div className="biz-card-title">
                            <span>分布占比</span>
                            <div className="biz-chart-tabs">
                                <button className={`biz-tab-btn ${cardTabs.dist === 0 ? 'active' : ''}`} onClick={() => handleTabSwitch('dist', 0)}>类型</button>
                                <button className={`biz-tab-btn ${cardTabs.dist === 1 ? 'active' : ''}`} onClick={() => handleTabSwitch('dist', 1)}>层级</button>
                            </div>
                        </div>
                        <div className="biz-chart-wrapper">
                            <ReactECharts option={stackedBarOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                </div>

                {/* Center Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="biz-tech-card biz-center-card" style={{ flex: 1.5 }}>
                        <div className="biz-card-title">核心转化中枢</div>
                        <div className="biz-chart-wrapper">
                            <ReactECharts option={pieChartOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                    <div className="biz-tech-card" style={{ flex: 1 }}>
                        <div className="biz-card-title">联动数据走势</div>
                        <div className="biz-chart-wrapper">
                            <ReactECharts option={lineChartOption} showLoading={isSyncing} loadingOption={{ text: 'Syncing...', color: '#faad14', textColor: '#faad14', maskColor: 'rgba(3, 10, 22, 0.8)' }} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="biz-tech-card">
                        <div className="biz-card-title">
                            <span>排名 TOP5</span>
                            <div className="biz-chart-tabs">
                                <button className={`biz-tab-btn ${cardTabs.rank === 0 ? 'active' : ''}`} onClick={() => handleTabSwitch('rank', 0)}>收入</button>
                                <button className={`biz-tab-btn ${cardTabs.rank === 1 ? 'active' : ''}`} onClick={() => handleTabSwitch('rank', 1)}>单量</button>
                            </div>
                        </div>
                        <div className="biz-chart-wrapper">
                            <ReactECharts option={rankChartOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                    <div className="biz-tech-card">
                        <div className="biz-card-title">
                            <span>雷达监测</span>
                            <div className="biz-chart-tabs">
                                <button className={`biz-tab-btn ${cardTabs.radar === 0 ? 'active' : ''}`} onClick={() => handleTabSwitch('radar', 0)}>综合</button>
                            </div>
                        </div>
                        <div className="biz-chart-wrapper">
                            <ReactECharts option={radarChartOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default BusinessDashboardTemplate;
