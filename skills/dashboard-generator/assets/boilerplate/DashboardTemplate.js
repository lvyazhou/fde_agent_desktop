import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts'; // For complex styling like LinearGradient
import './DashboardTemplate.css';

// ============================================================================
// BEST PRACTICE: For production dashboards, extract chart option builders and
// data constants into a separate *Utils.js file to keep this component clean.
// Example: import { buildLineOption, buildRankOption, MOCK_DATA } from './DashboardTemplateUtils';
// See assets/examples/ServicePackageCyberUtils.js for a full reference.
// ============================================================================

// --- 1. Sub-Components ---

// Reusable animated KPI Number Component
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
        <div className={`kpi-item ${isActive ? 'active' : ''}`} onClick={handleClick}>
            {ripple && (
                <span className="ripple" style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }} />
            )}
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">
                {formattedValue}
                {unit && <span className="kpi-unit">{unit}</span>}
            </div>
            {trend && (
                <div className={`kpi-trend trend ${trend}`}>
                    同比 {isUp ? '▲' : '▼'} {trendValue}%
                </div>
            )}
        </div>
    );
};

// --- 2. Main Dashboard Component ---

const DashboardTemplate = () => {
    const containerRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timeFilter, setTimeFilter] = useState('双周');
    const [dimFilter, setDimFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('active');
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // UI States for Interactive Requirements
    const [activeKpi, setActiveKpi] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [cardTabs, setCardTabs] = useState({ trend: 0, dist: 0, rank: 0, radar: 0 });

    // Clock effect
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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

    // Force charts to re-render after fullscreen change
    useEffect(() => {
        const timers = [50, 150, 300, 500].map(ms =>
            setTimeout(() => window.dispatchEvent(new Event('resize')), ms)
        );
        return () => timers.forEach(clearTimeout);
    }, [isFullscreen]);

    // --- ResizeObserver for responsive chart re-rendering ---
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

    // Helper to format date
    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const day = days[date.getDay()];
        return `${y}/${m}/${d} ${day}`;
    };

    // --- Interaction Mock Data Linkage ---
    const handleKpiClick = (index) => {
        setActiveKpi(index);
        setIsSyncing(true);
        // Simulate data fetch linkage
        setTimeout(() => setIsSyncing(false), 800);
    };

    const handleTabSwitch = (cardKey, tabIndex) => {
        setCardTabs(prev => ({ ...prev, [cardKey]: tabIndex }));
        // Simulate local card loading
    };

    // --- 3. ECharts Options ---
    
    // Common chart options to reduce boilerplate
    const getCommonOptions = () => ({
        backgroundColor: 'transparent',
        tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            borderColor: '#00f6ff',
            textStyle: { color: '#fff' }
        },
        grid: { top: 30, right: 20, bottom: 20, left: 40, containLabel: true }
    });

    // Sample Chart: Line Trend
    const lineChartOption = {
        ...getCommonOptions(),
        tooltip: { trigger: 'axis' },
        xAxis: { 
            type: 'category', 
            data: ['周一', '周二', '周三', '周四', '周五'],
            axisLabel: { color: '#a6c0fe' },
            axisLine: { lineStyle: { color: 'rgba(0,246,255,0.3)' } }
        },
        yAxis: { 
            type: 'value',
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)', type: 'dashed' } },
            axisLabel: { color: '#a6c0fe' }
        },
        series: isSyncing ? [] : [{
            type: 'line',
            smooth: true,
            // Mock data changes based on KPI
            data: activeKpi === 0 ? [120, 132, 101, 134, 90] : [60, 80, 50, 90, 110],
            itemStyle: { color: '#00f6ff' },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(0,246,255,0.5)' },
                    { offset: 1, color: 'transparent' }
                ]) 
            }
        }]
    };

    // Sample Chart: Horizontal Bar (Rank)
    const rankChartOption = {
        ...getCommonOptions(),
        grid: { top: 10, right: 30, bottom: 10, left: 10, containLabel: true },
        xAxis: { type: 'value', show: false },
        yAxis: { type: 'category', data: ['产品E', '产品D', '产品C', '产品B', '产品A'], axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#a6c0fe' } },
        series: [{ type: 'bar', data: [150, 200, 350, 600, 800], itemStyle: { color: new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:'transparent'},{offset:1,color:'#00f6ff'}]), borderRadius: [0,4,4,0] }, label: { show: true, position: 'right', color: '#00f6ff' } }]
    };

    // Sample Chart: Radar
    const radarChartOption = {
        ...getCommonOptions(),
        grid: { top: 30, right: 20, bottom: 20, left: 20, containLabel: true },
        radar: {
            indicator: [{name: '技术', max: 100}, {name: '服务', max: 100}, {name: '安全', max: 100}, {name: '管理', max: 100}, {name: '运营', max: 100}],
            splitNumber: 4, axisName: { color: '#a6c0fe' },
            splitLine: { lineStyle: { color: ['rgba(0,246,255,0.1)', 'rgba(0,246,255,0.2)', 'rgba(0,246,255,0.4)', 'rgba(0,246,255,0.6)'] } },
            splitArea: { show: false }, axisLine: { lineStyle: { color: 'rgba(0,246,255,0.5)' } }
        },
        series: [{ type: 'radar', data: [{ value: [80, 90, 85, 70, 75], name: '当前', areaStyle: { color: 'rgba(0,246,255,0.3)' }, lineStyle: { color: '#00f6ff' }, itemStyle: { color: '#00f6ff' } }] }]
    };

    // Sample Chart: Stacked Bar
    const stackedBarOption = {
        ...getCommonOptions(),
        grid: { top: 30, right: 20, bottom: 20, left: 20, containLabel: true },
        xAxis: { type: 'category', data: ['W1', 'W2', 'W3', 'W4'], axisLabel: { color: '#a6c0fe' }, axisLine: { lineStyle: { color: 'rgba(0,246,255,0.3)' } } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)', type: 'dashed' } }, axisLabel: { color: '#a6c0fe' } },
        series: [
            { name: 'A类', type: 'bar', stack: 'total', itemStyle: { color: '#00f6ff' }, barWidth: '40%', data: [120, 132, 101, 134] },
            { name: 'B类', type: 'bar', stack: 'total', itemStyle: { color: '#0077ff' }, barWidth: '40%', data: [220, 182, 191, 234] }
        ]
    };

    // Sample Chart: Dual-layer Cyber Pie
    const pieChartOption = {
        ...getCommonOptions(),
        tooltip: { trigger: 'item' },
        series: [
            {
                name: '当前期', type: 'pie', radius: ['60%', '80%'], center: ['50%', '50%'],
                label: { 
                    show: true, position: 'center', 
                    formatter: `{n|核心指标}\n{v|85%}\n{t|环比 ▲ 12.5%}`, 
                    rich: { 
                        n: {fontSize:16, color:'#a6c0fe', padding:[0,0,5,0]}, 
                        v: {fontSize:42, fontWeight:'bold', color:'#fff', fontFamily:'Impact', textShadow:'0 0 10px #00f6ff'}, 
                        t: {fontSize:18, color:'#ff4757', padding:[10,0,0,0], fontWeight:'bold'} 
                    } 
                },
                data: [ 
                    {value: 1048, name: 'A', itemStyle: {color: '#00f6ff', borderColor:'#030a16', borderWidth:2}}, 
                    {value: 735, name: 'B', itemStyle: {color: '#0077ff', borderColor:'#030a16', borderWidth:2}} 
                ]
            },
            {
                name: '上一期', type: 'pie', radius: ['45%', '55%'], center: ['50%', '50%'], label: { show: false },
                data: [ 
                    {value: 800, name: 'A (前)', itemStyle: {color: '#00f6ff', opacity: 0.3, borderColor:'#030a16', borderWidth:1}}, 
                    {value: 600, name: 'B (前)', itemStyle: {color: '#0077ff', opacity: 0.3, borderColor:'#030a16', borderWidth:1}} 
                ]
            }
        ]
    };

    return (
        <div className="dashboard-container" ref={containerRef}>
            {/* Header */}
            <div className="cyber-header">
                <div className="sys-info">
                    <div className="sys-time">
                        {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                    </div>
                    <div className="sys-date">
                        <span className="status-dot"></span>
                        {formatDate(currentTime)} SYSTEM ONLINE
                    </div>
                </div>
                
                <div className="title-wrapper">
                    <div className="cyber-title">REACT CYBER DASHBOARD</div>
                </div>

                <div className="filter-bar">
                    <div className="filter-group">
                        <span className="filter-label">维度:</span>
                        <select className="cyber-select" value={dimFilter} onChange={e => setDimFilter(e.target.value)}>
                            <option value="all">全网视角</option>
                            <option value="core">核心节点</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <span className="filter-label">状态:</span>
                        <select className="cyber-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="active">运行中</option>
                            <option value="warning">告警中</option>
                        </select>
                    </div>
                    <div className="time-filter">
                        {['双周', '本月', '半年', '一年'].map(tf => (
                            <button key={tf} className={`time-btn ${timeFilter === tf ? 'active' : ''}`} onClick={() => setTimeFilter(tf)}>
                                {tf}
                            </button>
                        ))}
                    </div>
                    <button className="time-btn" onClick={toggleFullscreen} title={isFullscreen ? '退出全屏' : '全屏展示'} style={{ padding: '4px 8px', marginLeft: 8 }}>
                        {isFullscreen ? '⊡' : '⛶'}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="dashboard-content">
                
                {/* KPI Row (Spans all columns) */}
                <div className="kpi-row">
                    <RollingNumber label="总签单金额" value={5680} unit="万" trend="up" trendValue={12.5} isActive={activeKpi === 0} onClick={() => handleKpiClick(0)} />
                    <RollingNumber label="订单总量" value={845} unit="单" trend="up" trendValue={8.3} isActive={activeKpi === 1} onClick={() => handleKpiClick(1)} />
                    <RollingNumber label="覆盖客户" value={320} unit="家" trend="down" trendValue={2.1} isActive={activeKpi === 2} onClick={() => handleKpiClick(2)} />
                    <RollingNumber label="活跃代理" value={68} unit="家" trend="up" trendValue={5.0} isActive={activeKpi === 3} onClick={() => handleKpiClick(3)} />
                </div>

                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="tech-card">
                        <div className="tech-card-title">
                            <span>趋势分析</span>
                            <div className="chart-tabs">
                                <button className={`tab-btn ${cardTabs.trend === 0 ? 'active' : ''}`} onClick={() => handleTabSwitch('trend', 0)}>按日</button>
                                <button className={`tab-btn ${cardTabs.trend === 1 ? 'active' : ''}`} onClick={() => handleTabSwitch('trend', 1)}>按周</button>
                            </div>
                        </div>
                        <div className="chart-wrapper">
                            <ReactECharts option={lineChartOption} showLoading={isSyncing} loadingOption={{ text: 'SYNCING...', color: '#00f6ff', textColor: '#00f6ff', maskColor: 'rgba(3, 10, 22, 0.8)' }} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                    <div className="tech-card">
                        <div className="tech-card-title">
                            <span>分布占比</span>
                            <div className="chart-tabs">
                                <button className={`tab-btn ${cardTabs.dist === 0 ? 'active' : ''}`} onClick={() => handleTabSwitch('dist', 0)}>类型</button>
                                <button className={`tab-btn ${cardTabs.dist === 1 ? 'active' : ''}`} onClick={() => handleTabSwitch('dist', 1)}>层级</button>
                            </div>
                        </div>
                        <div className="chart-wrapper">
                            <ReactECharts option={stackedBarOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                </div>

                {/* Center Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="tech-card" style={{ flex: 1.5 }}>
                         <div className="tech-card-title" style={{borderLeftColor: '#ffaa00', background: 'linear-gradient(90deg, rgba(255, 170, 0, 0.2) 0%, transparent 100%)'}}>核心转化中枢</div>
                         <div className="center-ring-container">
                            <div className="cyber-ring-bg"></div>
                            <div className="cyber-ring-bg2"></div>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}>
                                <ReactECharts option={pieChartOption} style={{ height: '100%', width: '100%' }} />
                            </div>
                        </div>
                    </div>
                    <div className="tech-card" style={{ flex: 1 }}>
                        <div className="tech-card-title">联动数据走势</div>
                        <div className="chart-wrapper">
                             <ReactECharts option={lineChartOption} showLoading={isSyncing} loadingOption={{ text: 'SYNCING...', color: '#00f6ff', textColor: '#00f6ff', maskColor: 'rgba(3, 10, 22, 0.8)' }} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="tech-card">
                        <div className="tech-card-title">
                            <span>排名 TOP5</span>
                            <div className="chart-tabs">
                                <button className={`tab-btn ${cardTabs.rank === 0 ? 'active' : ''}`} onClick={() => handleTabSwitch('rank', 0)}>收入</button>
                                <button className={`tab-btn ${cardTabs.rank === 1 ? 'active' : ''}`} onClick={() => handleTabSwitch('rank', 1)}>单量</button>
                            </div>
                        </div>
                        <div className="chart-wrapper">
                            <ReactECharts option={rankChartOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                    <div className="tech-card">
                        <div className="tech-card-title">
                            <span>雷达监测</span>
                            <div className="chart-tabs">
                                <button className={`tab-btn ${cardTabs.radar === 0 ? 'active' : ''}`} onClick={() => handleTabSwitch('radar', 0)}>综合</button>
                            </div>
                        </div>
                        <div className="chart-wrapper">
                            <ReactECharts option={radarChartOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DashboardTemplate;