import React, { useState, useEffect, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  PACKAGES, BASE_PKG_AMOUNTS, BASE_PKG_ORDERS,
  ALL_IND_NAMES, ALL_IND_DATA, ALL_REG_NAMES, ALL_REG_DATA,
  AG_TYPE_NAMES, AG_TYPE_DATA, ALL_AGENT_NAMES, ALL_AGENT_DATA,
  scaledData, scaledMat, getRanked,
  buildSubBarOption, buildRankOption, buildPieOption, buildTrendOption, calcYearProgress,
} from './ServicePackageCyberUtils';
import './ServicePackageCyber.css';

const TIME_OPTS = ['双周','本月','半年','一年'];
const TIME_FACTOR_MAP = { '双周': 2/52, '本月': 1/12, '半年': 6/12, '一年': 1.0 };
const KPI_BASES  = [10000, 6100, 1500, 120];
const KPI_UNITS  = ['万', '单', '家', '家'];
const KPI_LABELS = ['总签单金额', '订单总量', '覆盖客户', '活跃代理'];

const ServicePackageAnalysisDashboard = ({ dateRange, selectedAgentCategory, selectedSkuType, isActive }) => {
  const [timeText, setTimeText]           = useState('双周');
  const [timeFactor, setTimeFactor]       = useState(2 / 52);
  const [currentFilter, setCurrentFilter] = useState(-1);
  const [agentTab, setAgentTab]           = useState(0);
  const [sysTime, setSysTime]             = useState('');
  const [sysDate, setSysDate]             = useState('');
  const [kpiValues, setKpiValues]         = useState(KPI_BASES.map(() => 0));
  const [kpiTrends, setKpiTrends]         = useState(KPI_BASES.map(() => ({ up: true, pct: '0.0' })));
  const [yearProgress, setYearProgress]   = useState({ leftDays: 0, tPct: 0 });
  const [targetProgress, setTargetProgress] = useState({ diff: 0, pct: 0 });
  // 时钟
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2,'0');
      const m = String(now.getMinutes()).padStart(2,'0');
      const s = String(now.getSeconds()).padStart(2,'0');
      setSysTime(`${h}:${m}:${s}`);
      const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
      const y = now.getFullYear();
      const mo = String(now.getMonth()+1).padStart(2,'0');
      const d = String(now.getDate()).padStart(2,'0');
      setSysDate(`${y}/${mo}/${d} ${days[now.getDay()]} SYSTEM ONLINE`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // 年度进度
  useEffect(() => { setYearProgress(calcYearProgress()); }, []);

  // 处理父组件传入的 dateRange
  useEffect(() => {
    if (dateRange && dateRange.length === 2) {
      const start = dateRange[0];
      const end = dateRange[1];
      const diffDays = end.diff(start, 'day');
      
      let factor = 1.0; // 默认一年
      let txt = '一年';
      
      if (diffDays <= 15) {
        factor = TIME_FACTOR_MAP['双周'];
        txt = '双周';
      } else if (diffDays <= 35) {
        factor = TIME_FACTOR_MAP['本月'];
        txt = '本月';
      } else if (diffDays <= 190) {
        factor = TIME_FACTOR_MAP['半年'];
        txt = '半年';
      }
      
      setTimeText(txt);
      setTimeFactor(factor);
      
      const newVals = KPI_BASES.map(base => {
        const v = Math.floor(base * factor);
        return v < 1 && base > 0 ? 1 : v;
      });
      setKpiValues(newVals);
      setKpiTrends(KPI_BASES.map(() => ({ up: Math.random() > 0.3, pct: (Math.random() * 20).toFixed(1) })));
      const pkgAmt = scaledData(BASE_PKG_AMOUNTS, factor);
      const globalAmt = pkgAmt.reduce((a,b)=>a+b,0);
      const diff = Math.max(0, 10000 - globalAmt);
      const pct = Math.min(100, +(globalAmt / 10000 * 100).toFixed(1));
      setTargetProgress({ diff, pct });
    }
  }, [dateRange]);

  // 当前时间周期的缩放数据
  const pkgAmounts = scaledData(BASE_PKG_AMOUNTS, timeFactor);
  const pkgOrders  = scaledData(BASE_PKG_ORDERS,  timeFactor);

  // 计算衍生指标用于左下角角标
  const totalAmt = kpiValues[0];
  const totalOrders = kpiValues[1];
  const arpu = totalOrders > 0 ? ((totalAmt / totalOrders) * 10000).toFixed(0) : 0;
  
  // 找出最高销量的服务包
  let maxPkgIdx = 0;
  let maxPkgVal = 0;
  pkgAmounts.forEach((v, i) => {
    if (v > maxPkgVal) { maxPkgVal = v; maxPkgIdx = i; }
  });
  const topPkgName = PACKAGES[maxPkgIdx] || '未知';

  // 行业图表（排序后）
  const indScaled = scaledMat(ALL_IND_DATA, timeFactor);
  const combInd = ALL_IND_NAMES.map((n, i) => {
    const val = currentFilter === -1 ? indScaled[i].reduce((a,b)=>a+(b||0),0) : indScaled[i][currentFilter];
    return { n, d: indScaled[i], val };
  }).sort((a,b) => b.val - a.val);
  const indNames = combInd.map(x=>x.n).reverse();
  const indData  = combInd.map(x=>x.d).reverse();

  // 代理商类型图表
  const agScaled = scaledMat(AG_TYPE_DATA, timeFactor);
  const combAg = AG_TYPE_NAMES.map((n, i) => {
    const val = currentFilter === -1 ? agScaled[i].reduce((a,b)=>a+(b||0),0) : agScaled[i][currentFilter];
    return { n, d: agScaled[i], val };
  }).sort((a,b) => b.val - a.val);

  // 代理商排名
  const agR = getRanked(ALL_AGENT_NAMES, scaledMat(ALL_AGENT_DATA, timeFactor), currentFilter);
  // 区域排名
  const regR = getRanked(ALL_REG_NAMES, scaledMat(ALL_REG_DATA, timeFactor), currentFilter);

  // 点击服务包联动
  const handleRankClick = (params) => {
    const ri = PACKAGES.length - 1 - params.dataIndex;
    setCurrentFilter(f => f === ri ? -1 : ri);
  };
  const handlePieClick = (params) => {
    const iName = params.name.replace(/ \(.+\)$/, '');
    const dIdx = PACKAGES.indexOf(iName);
    if (dIdx !== -1) setCurrentFilter(f => f === dIdx ? -1 : dIdx);
  };
  const resetFilter = () => setCurrentFilter(-1);

  // ==================== JSX ====================
  return (
    <div className="cyber-dashboard-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 顶部 Header 和默认查询条件已被移除，通过外层的 BusinessAnalysisDashboard 传递的 dateRange 属性进行时间过滤 */}

      {/* ===== 主容器 Grid ===== */}
      <div className="cyber-container">

        {/* ===== 左上：服务包销售榜单 ===== */}
        <div className="cyber-chart-box box-rank">
          <div className="cyber-chart-title">
            1. 服务包销售榜单
            <span className="sub" title="点击下方柱子可全盘联动计算">※ 联动源</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <ReactECharts
              option={buildRankOption(pkgAmounts, pkgOrders, currentFilter)}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, height: '100%', width: '100%' }}
              onEvents={{ click: handleRankClick }}
            />
          </div>
        </div>

        {/* ===== 左下：代理商分析 ===== */}
        <div className="cyber-chart-box box-agent">
          <div className="cyber-chart-title" style={{ justifyContent: 'flex-start' }}>
            2. 代理商分析
            <div style={{ marginLeft: 'auto', display: 'flex' }}>
              <button
                className={`tab-btn${agentTab === 0 ? ' active' : ''}`}
                onClick={() => setAgentTab(0)}
              >代理商类型</button>
              <button
                className={`tab-btn${agentTab === 1 ? ' active' : ''}`}
                onClick={() => setAgentTab(1)}
              >代理商排名</button>
            </div>
          </div>

          {agentTab === 0 && (
            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, position: 'relative' }}>
              <ReactECharts
                option={buildSubBarOption(combAg.map(x=>x.n), combAg.map(x=>x.d), true, currentFilter)}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, height: '100%', width: '100%' }}
              />
            </div>
          )}

          {agentTab === 1 && (
            <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 10 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
                <div style={{ color: '#00f6ff', fontSize: 12, textAlign: 'center', marginBottom: 5 }}>▲ 优势代理 TOP 5</div>
                <ReactECharts
                  option={buildSubBarOption(agR.tN, agR.tD, true, currentFilter)}
                  style={{ position: 'absolute', top: 20, left: 0, right: 0, bottom: 0, height: 'calc(100% - 20px)', width: '100%' }}
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
                <div style={{ color: '#ffaa00', fontSize: 12, textAlign: 'center', marginBottom: 5 }}>▼ 潜力代理 BOT 5</div>
                <ReactECharts
                  option={buildSubBarOption(agR.bN, agR.bD, false, currentFilter)}
                  style={{ position: 'absolute', top: 20, left: 0, right: 0, bottom: 0, height: 'calc(100% - 20px)', width: '100%' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ===== 中间核心区 ===== */}
        <div className="box-center">
          {/* KPI 行 */}
          <div className="center-kpi-row">
            {KPI_LABELS.map((label, idx) => {
              const tr = kpiTrends[idx];
              const numStr = kpiValues[idx].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
              return (
                <div key={idx} className="kpi-item">
                  <div className="label">{label}</div>
                  <div className="value">{numStr}<span className="unit">{KPI_UNITS[idx]}</span></div>
                  <div className={`trend${tr.up ? ' up' : ' down'}`}>
                    环比{timeText} {tr.up ? '▲' : '▼'} {tr.pct}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* 大环形图 + 面板 */}
          <div className="center-ring-container" style={{ flex: 1.4, minHeight: 0, marginBottom: 15 }}>
            {/* 时间进度倒计时 */}
            <div className="time-countdown">
              <div className="tc-title">
                <span>▶ 时间进度</span>
                <span>{yearProgress.tPct}%</span>
              </div>
              <div className="tc-diff">今年还剩 <span className="tc-num">{yearProgress.leftDays}</span> 天</div>
              <div className="tc-progress-wrap">
                <div className="tc-progress-inner" style={{ width: `${yearProgress.tPct}%` }} />
              </div>
            </div>

            {/* 破亿冲刺面板 */}
            <div className="target-panel">
              <div className="t-title">
                <span>★ 破亿冲刺</span>
                <span>{targetProgress.pct}%</span>
              </div>
              <div className="t-diff">距1亿目标还差 <span className="t-num">{targetProgress.diff.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</span> 万</div>
              <div className="t-progress-wrap">
                <div className="t-progress-inner" style={{ width: `${targetProgress.pct}%` }} />
              </div>
            </div>

            <div className="cyber-ring-bg" />
            <div className="cyber-ring-bg2" />

            {/* 南丁格尔玫瑰图 */}
            <ReactECharts
              option={buildPieOption(pkgAmounts, currentFilter, timeText)}
              style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 10 }}
              onEvents={{ click: handlePieClick }}
            />

            {/* 联动解除提示 */}
            {currentFilter !== -1 && (
              <div className="filter-alert" style={{ display: 'block' }} onClick={resetFilter}>
                [ 解除锁定：<span>{PACKAGES[currentFilter]}</span> ]
              </div>
            )}

            {/* 左下角：客单分析面板 */}
            <div className="corner-panel bottom-left">
              <div className="cp-title"><span className="blink-dot" />客单与均值分析</div>
              <div className="cp-content">
                <div className="cp-item">
                  <span>平均客单价</span>
                  <span className="cp-val">{arpu.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} <small>元/单</small></span>
                </div>
                <div className="cp-item">
                  <span>平均件客比</span>
                  <span className="cp-val highlight">1.82 <small>包/单</small></span>
                </div>
              </div>
            </div>

            {/* 右下角：AI智能洞察面板 */}
            <div className="corner-panel bottom-right">
              <div className="cp-title ai-title"><span className="ai-pulse-ring" />AI 智能洞察</div>
              <div className="cp-content ai-list">
                <div className="ai-row"><span>核心引擎：</span><span className="hl">{topPkgName}</span></div>
                <div className="ai-row"><span>突破客群：</span><span className="hl">大型企业</span></div>
                <div className="ai-row"><span>推演收益：</span>转化率 <span className="hl">+12.5%</span></div>
              </div>
            </div>
          </div>

          {/* 趋势图 */}
          <div className="cyber-chart-box" style={{ flex: 0.8, minHeight: 0, padding: '10px 15px' }}>
            <div className="cyber-chart-title" style={{ marginBottom: 0, fontSize: 15, borderLeft: '3px solid #ffaa00', background: 'linear-gradient(90deg, rgba(255,170,0,0.2) 0%, transparent 100%)' }}>
              5. 签单与单量走势
            </div>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <ReactECharts
                option={buildTrendOption(pkgAmounts, pkgOrders, currentFilter, timeText)}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, height: '100%', width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* ===== 右上：渗透行业画像 ===== */}
        <div className="cyber-chart-box box-ind">
          <div className="cyber-chart-title">3. 渗透行业画像</div>
          <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column', position: 'relative' }}>
            <ReactECharts
              option={buildSubBarOption(indNames, indData, false, currentFilter)}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, height: '100%', width: '100%' }}
            />
          </div>
        </div>

        {/* ===== 右下：全国区域分布 ===== */}
        <div className="cyber-chart-box box-region">
          <div className="cyber-chart-title">4. 全国区域分布</div>
          <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 10 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
              <div style={{ color: '#00f6ff', fontSize: 12, textAlign: 'center', marginBottom: 5 }}>▲ 核心区域 TOP 5</div>
              <ReactECharts
                option={buildSubBarOption(regR.tN, regR.tD, true, currentFilter)}
                style={{ position: 'absolute', top: 20, left: 0, right: 0, bottom: 0, height: 'calc(100% - 20px)', width: '100%' }}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
              <div style={{ color: '#ffaa00', fontSize: 12, textAlign: 'center', marginBottom: 5 }}>▼ 边缘区域 BOT 5</div>
              <ReactECharts
                option={buildSubBarOption(regR.bN, regR.bD, false, currentFilter)}
                style={{ position: 'absolute', top: 20, left: 0, right: 0, bottom: 0, height: 'calc(100% - 20px)', width: '100%' }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ServicePackageAnalysisDashboard;
