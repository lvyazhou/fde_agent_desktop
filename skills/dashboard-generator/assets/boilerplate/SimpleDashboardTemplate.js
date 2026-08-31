import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import './SimpleDashboardTemplate.css';

// ============================================================================
// Simple/Minimalist Theme React Dashboard Template
// 简约风格 - 无霓虹、圆角、干净的图表配色、轻量级阴影
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
        const duration = 1200;
        const finalValue = typeof value === 'number' ? value : parseFloat(value.toString().replace(/,/g, ''));

        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Ease out quart
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            setDisplayValue(Math.floor(easeProgress * finalValue));
            
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
        <div className={`simple-kpi-item ${isActive ? 'active' : ''}`} onClick={handleClick}>
            {ripple && (
                <span className="simple-ripple" style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }} />
            )}
            <div className="simple-kpi-label">{label}</div>
            <div className="simple-kpi-value">
                {formattedValue}
                {unit && <span className="simple-kpi-unit">{unit}</span>}
            </div>
            {trend && (
                <div className={`simple-kpi-trend ${isUp ? 'simple-trend-up' : 'simple-trend-down'}`}>
                    <span>{isUp ? '▲' : '▼'} {trendValue}%</span>
                    <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '4px' }}>同比</span>
                </div>
            )}
        </div>
    );
};

// Custom Select Component for Simple Theme
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
        <div className={`simple-custom-select-wrapper ${open ? 'open' : ''} ${className}`} ref={wrapperRef}>
            <div className="simple-custom-select-trigger" onClick={() => setOpen(!open)}>
                <span>{selected ? selected.label : '请选择'}</span>
                <div className="arrow">▼</div>
            </div>
            <div className="simple-custom-options">
                {options.map(opt => (
                    <span
                        key={opt.value}
                        className={`simple-custom-option ${opt.value === value ? 'selected' : ''}`}
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

const SimpleDashboardTemplate = () => {
    const containerRef = useRef(null);
    const [timeFilter, setTimeFilter] = useState('本月');
    const [dimFilter, setDimFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('active');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // UI States
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
        setTimeout(() => setIsSyncing(false), 600);
    };

    const handleTabSwitch = (cardKey, tabIndex) => {
        setCardTabs(prev => ({ ...prev, [cardKey]: tabIndex }));
    };

    // --- 3. ECharts Options (简约柔和配色) ---

    // 基础颜色: 蓝, 绿, 橙, 紫, 红
    const colorPalette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

    const getCommonOptions = () => ({
        backgroundColor: 'transparent',
        textStyle: { fontFamily: 'Segoe UI, Roboto, Microsoft YaHei, sans-serif', color: '#94a3b8' },
        color: colorPalette,
        tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            borderColor: 'rgba(148, 163, 184, 0.2)',
            textStyle: { color: '#f8fafc' },
            padding: [8, 12],
            borderRadius: 8,
            axisPointer: { type: 'line', lineStyle: { color: 'rgba(148, 163, 184, 0.2)', type: 'dashed' } }
        },
        grid: { top: 40, right: 20, bottom: 25, left: 45, containLabel: true }
    });

    // Line Trend Chart
    const lineChartOption = {
        ...getCommonOptions(),
        tooltip: { trigger: 'axis' },
        xAxis: {
            type: 'category',
            data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
            axisLabel: { color: '#94a3b8', margin: 12 },
            axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.2)' } },
            axisTick: { show: false }
        },
        yAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)', type: 'dashed' } },
            axisLabel: { color: '#94a3b8' }
        },
        series: isSyncing ? [] : [{
            name: '数据值',
            type: 'line',
            smooth: 0.4,
            symbol: 'circle',
            symbolSize: 8,
            data: activeKpi === 0 ? [120, 132, 101, 134, 190, 230, 210] : [60, 80, 50, 90, 110, 140, 130],
            itemStyle: { color: '#3b82f6', borderWidth: 2, borderColor: '#0f172a' },
            lineStyle: { width: 3 },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                    { offset: 1, color: 'rgba(59, 130, 246, 0)' }
                ])
            }
        }]
    };

    // Horizontal Bar (Rank)
    const rankChartOption = {
        ...getCommonOptions(),
        grid: { top: 15, right: 35, bottom: 15, left: 15, containLabel: true },
        xAxis: { type: 'value', show: false },
        yAxis: { 
            type: 'category', 
            data: ['产品E', '产品D', '产品C', '产品B', '产品A'], 
            axisLine: { show: false }, 
            axisTick: { show: false }, 
            axisLabel: { color: '#94a3b8' } 
        },
        series: [{ 
            type: 'bar', 
            data: [150, 200, 350, 600, 800], 
            itemStyle: { color: '#3b82f6', borderRadius: [0, 4, 4, 0] }, 
            barWidth: '16px',
            label: { show: true, position: 'right', color: '#f8fafc', fontWeight: 500 } 
        }]
    };

    // Radar Chart
    const radarChartOption = {
        ...getCommonOptions(),
        grid: { top: 30, right: 20, bottom: 20, left: 20, containLabel: true },
        radar: {
            indicator: [{ name: '技术', max: 100 }, { name: '服务', max: 100 }, { name: '安全', max: 100 }, { name: '管理', max: 100 }, { name: '运营', max: 100 }],
            splitNumber: 4,
            axisName: { color: '#94a3b8' },
            splitLine: { lineStyle: { color: ['rgba(148, 163, 184, 0.1)', 'rgba(148, 163, 184, 0.15)', 'rgba(148, 163, 184, 0.2)', 'rgba(148, 163, 184, 0.3)'] } },
            splitArea: { show: true, areaStyle: { color: ['rgba(30,41,59,0.5)', 'transparent'] } },
            axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.2)' } }
        },
        series: [{
            type: 'radar',
            data: [{
                value: [80, 90, 85, 70, 75], 
                name: '当前表现',
                areaStyle: { color: 'rgba(16, 185, 129, 0.2)' },
                lineStyle: { color: '#10b981', width: 2 },
                itemStyle: { color: '#10b981' }
            }]
        }]
    };

    // Stacked Bar Chart
    const stackedBarOption = {
        ...getCommonOptions(),
        grid: { top: 35, right: 20, bottom: 20, left: 20, containLabel: true },
        legend: { top: 0, right: 0, textStyle: { color: '#94a3b8' }, icon: 'circle', itemWidth: 8 },
        xAxis: { 
            type: 'category', 
            data: ['W1', 'W2', 'W3', 'W4'], 
            axisLabel: { color: '#94a3b8' }, 
            axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.2)' } },
            axisTick: { show: false }
        },
        yAxis: { 
            type: 'value', 
            splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)', type: 'dashed' } }, 
            axisLabel: { color: '#94a3b8' } 
        },
        series: [
            { name: 'A类', type: 'bar', stack: 'total', itemStyle: { color: '#3b82f6', borderRadius: [0,0,0,0] }, barWidth: '35%', data: [120, 132, 101, 134] },
            { name: 'B类', type: 'bar', stack: 'total', itemStyle: { color: '#8b5cf6', borderRadius: [4,4,0,0] }, barWidth: '35%', data: [220, 182, 191, 234] }
        ]
    };

    // Clean Donut Pie Chart
    const pieChartOption = {
        ...getCommonOptions(),
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { bottom: '5%', left: 'center', textStyle: { color: '#94a3b8' }, icon: 'circle', itemWidth: 8 },
        series: [{
            name: '分布', type: 'pie', radius: ['45%', '65%'], center: ['50%', '45%'],
            itemStyle: { borderRadius: 6, borderColor: '#0f172a', borderWidth: 3 },
            label: { show: false },
            data: [
                { value: 1048, name: '分类A' },
                { value: 735, name: '分类B' },
                { value: 580, name: '分类C' },
                { value: 300, name: '分类D' }
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
        <div className="simple-dashboard-container" ref={containerRef}>
            {/* Header */}
            <div className="simple-header">
                <div className="simple-header-title">Data Analytics Platform</div>
                <div className="simple-filter-bar">
                    <div className="simple-filter-group">
                        <span className="simple-filter-label">维度</span>
                        <CustomSelect options={dimOptions} value={dimFilter} onChange={setDimFilter} />
                    </div>
                    <div className="simple-filter-group">
                        <span className="simple-filter-label">状态</span>
                        <CustomSelect options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
                    </div>
                    <div className="simple-time-filter">
                        {['上周', '本周', '本月', '全年'].map(tf => (
                            <button key={tf} className={`simple-time-btn ${timeFilter === tf ? 'active' : ''}`} onClick={() => setTimeFilter(tf)}>
                                {tf}
                            </button>
                        ))}
                    </div>
                    <button className="simple-fullscreen-btn" onClick={toggleFullscreen} title={isFullscreen ? '退出全屏' : '全屏展示'}>
                        {isFullscreen ? '退出全屏' : '全屏'}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="simple-dashboard-content">

                {/* KPI Row */}
                <div className="simple-kpi-row">
                    <RollingNumber label="总营业收入" value={5680} unit="万" trend="up" trendValue={12.5} isActive={activeKpi === 0} onClick={() => handleKpiClick(0)} />
                    <RollingNumber label="有效订单数" value={845} unit="笔" trend="up" trendValue={8.3} isActive={activeKpi === 1} onClick={() => handleKpiClick(1)} />
                    <RollingNumber label="新增客户量" value={320} unit="家" trend="down" trendValue={2.1} isActive={activeKpi === 2} onClick={() => handleKpiClick(2)} />
                    <RollingNumber label="服务覆盖率" value={92.5} unit="%" trend="up" trendValue={5.0} isActive={activeKpi === 3} onClick={() => handleKpiClick(3)} />
                </div>

                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="simple-card">
                        <div className="simple-card-title">
                            <span>趋势走向</span>
                            <div className="simple-chart-tabs">
                                <button className={`simple-tab-btn ${cardTabs.trend === 0 ? 'active' : ''}`} onClick={() => handleTabSwitch('trend', 0)}>日</button>
                                <button className={`simple-tab-btn ${cardTabs.trend === 1 ? 'active' : ''}`} onClick={() => handleTabSwitch('trend', 1)}>周</button>
                            </div>
                        </div>
                        <div className="simple-chart-wrapper">
                            <ReactECharts option={lineChartOption} showLoading={isSyncing} loadingOption={{ text: 'Loading...', color: '#3b82f6', textColor: '#3b82f6', maskColor: 'rgba(15, 23, 42, 0.7)' }} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                    <div className="simple-card">
                        <div className="simple-card-title">
                            <span>结构分布</span>
                            <div className="simple-chart-tabs">
                                <button className={`simple-tab-btn ${cardTabs.dist === 0 ? 'active' : ''}`} onClick={() => handleTabSwitch('dist', 0)}>类型</button>
                                <button className={`simple-tab-btn ${cardTabs.dist === 1 ? 'active' : ''}`} onClick={() => handleTabSwitch('dist', 1)}>区域</button>
                            </div>
                        </div>
                        <div className="simple-chart-wrapper">
                            <ReactECharts option={stackedBarOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                </div>

                {/* Center Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="simple-card simple-center-card" style={{ flex: 1.5 }}>
                        <div className="simple-card-title">核心业务占比</div>
                        <div className="simple-chart-wrapper">
                            <ReactECharts option={pieChartOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                    <div className="simple-card" style={{ flex: 1 }}>
                        <div className="simple-card-title">联动指标对比</div>
                        <div className="simple-chart-wrapper">
                            <ReactECharts option={lineChartOption} showLoading={isSyncing} loadingOption={{ text: 'Syncing...', color: '#3b82f6', textColor: '#3b82f6', maskColor: 'rgba(15, 23, 42, 0.7)' }} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="simple-card">
                        <div className="simple-card-title">
                            <span>贡献排名</span>
                            <div className="simple-chart-tabs">
                                <button className={`simple-tab-btn ${cardTabs.rank === 0 ? 'active' : ''}`} onClick={() => handleTabSwitch('rank', 0)}>金额</button>
                                <button className={`simple-tab-btn ${cardTabs.rank === 1 ? 'active' : ''}`} onClick={() => handleTabSwitch('rank', 1)}>数量</button>
                            </div>
                        </div>
                        <div className="simple-chart-wrapper">
                            <ReactECharts option={rankChartOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                    <div className="simple-card">
                        <div className="simple-card-title">
                            <span>能力雷达</span>
                        </div>
                        <div className="simple-chart-wrapper">
                            <ReactECharts option={radarChartOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SimpleDashboardTemplate;
