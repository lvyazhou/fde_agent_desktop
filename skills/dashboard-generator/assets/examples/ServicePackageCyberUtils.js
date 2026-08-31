/**
 * 服务包赛博风大屏 - 工具函数与数据
 */
import * as echarts from 'echarts';

export const PACKAGES = ['勒索保','网站保','情报保','数据保','7X24小时保','合规保','APP保','演练保','防诈保','财务保'];
export const BASE_PKG_AMOUNTS = [3200,2100,1500,1000,800,600,350,200,150,100];
export const BASE_PKG_ORDERS  = [1800,1200, 950, 700,500,400,250,150,100, 50];
export const BLUES = ['#00f6ff','#0077ff','#20b2aa','#5da0e3','#8abde8','#b4d5f0','#d5e8f7','#6366f1','#a855f7','#ff6b81'];

export const ALL_IND_NAMES = ['医疗','教育','中型企业','大型企业','小型企业'];
export const ALL_IND_DATA = [
  [250,200, 50,  0, 80, 40,  0, 20,  0,  0],
  [150,120,  0, 80, 50,150,  0, 10,  0,  0],
  [500,350,180,120,100, 70, 50,  0, 10,  5],
  [800,450,400,250,200,100, 80, 50, 30, 10],
  [150,100, 50, 20, 10,  0,  0,  0,  0,  0],
];
export const ALL_REG_NAMES = ['广东','北京','上海','浙江','江苏','宁夏','青海','海南','西藏','新疆'];
export const ALL_REG_DATA = [
  [600,300,200,150,100, 80, 50, 30, 20, 10],
  [400,250,150,100,  0, 50, 40, 20,  0,  0],
  [280,120, 80, 60, 50, 40,  0,  0, 10,  5],
  [150, 90, 70,  0, 40,  0, 20,  0,  0,  0],
  [100, 70,  0, 40, 30, 20, 15, 10,  0,  0],
  [ 25, 15,  0,  8,  0,  4,  0,  0,  0,  0],
  [ 20,  0,  8,  6,  0,  0,  0,  2,  0,  0],
  [  0, 10,  8,  0,  4,  3,  0,  0,  0,  0],
  [ 12,  0,  5,  0,  0,  0,  2,  0,  0,  0],
  [ 10,  5,  0,  0,  3,  0,  0,  0,  0,  0],
];
export const AG_TYPE_NAMES = ['安全云代理商','安全云联运商','安全云联运商(二代)','地市级区域独代'];
export const AG_TYPE_DATA = [
  [800,500,400,200,120, 80, 60, 40, 20, 10],
  [600,350,180,120,100, 70,  0, 30, 20,  0],
  [400,150,120,  0, 60, 50, 30,  0, 10,  0],
  [200,120, 90, 70,  0,  0, 20,  0,  0,  2],
];
export const ALL_AGENT_NAMES = [
  '天津朗言安全技术服务有限公司','杭州怀遥科技有限公司','济南易信云科技服务有限公司',
  '深圳市恒鑫运科技有限公司','河南省力戈电子科技有限公司','广州查尔科技有限公司',
  '成都云创未来商贸有限公司','山西中科信和工贸有限公司','深圳市大触创新科技有限公司',
  '安徽嘉源利志信息科技有限公司',
];
export const ALL_AGENT_DATA = [
  [500,  0,150,100, 80, 60, 50,  0, 20,  0],
  [100,400,120, 80,  0, 50, 40, 20,  0,  5],
  [200,150,100,  0, 50, 40,  0, 10,  5,  0],
  [150,100, 80, 50, 40,  0, 20,  0,  0,  0],
  [ 80, 80, 60, 40,  0, 20, 10,  0,  0,  0],
  [ 30,  0, 15,  0,  8,  5,  4,  0,  0,  0],
  [ 25, 15, 10,  8,  6,  0,  0,  0,  0,  0],
  [ 20, 10,  0,  6,  5,  3,  0,  0,  0,  0],
  [  0,  8,  6,  5,  4,  0,  2,  0,  0,  0],
  [ 10,  0,  5,  0,  3,  2,  0,  0,  0,  0],
];

export function scaledData(arr, factor) {
  return arr.map(v => v === 0 ? 0 : Math.round(v * factor));
}
export function scaledMat(mat, factor) {
  return mat.map(row => row.map(v => v === 0 ? 0 : Math.round(v * factor)));
}
export function getRanked(names, dataMat, currentFilter) {
  const comb = names.map((n, i) => {
    const val = currentFilter === -1
      ? dataMat[i].reduce((a, b) => a + (b || 0), 0)
      : dataMat[i][currentFilter];
    return { n, d: dataMat[i], val };
  });
  comb.sort((a, b) => b.val - a.val);
  const top = comb.slice(0, 5);
  const validBot = comb.filter(x => x.val > 0);
  const bot = validBot.length > 0 ? validBot.slice(-5) : comb.slice(-5);
  return { tN: top.map(x=>x.n), tD: top.map(x=>x.d), bN: bot.map(x=>x.n), bD: bot.map(x=>x.d) };
}

export function buildSubBarOption(names, dataMat, isTop, currentFilter) {
  if (!names || names.length === 0) return { series: [] };
  const rn = isTop ? [...names].reverse() : [...names];
  const rd = isTop ? [...dataMat].reverse() : [...dataMat];
  
  let series = PACKAGES.map((pkg, pi) => {
    const isActive = currentFilter === -1 || currentFilter === pi;
    const isOnly = currentFilter === pi;
    return {
      name: pkg, type: 'bar', stack: 'T', barWidth: 24,
      itemStyle: {
        color: BLUES[pi % BLUES.length],
        borderRadius: isOnly ? [0,4,4,0] : [0,0,0,0]
      },
      label: isOnly ? {
        show: true, position: 'right', color: '#00f6ff', fontSize: 12, fontWeight: 'bold',
        formatter: p => (p.value > 0 ? p.value + '万' : '')
      } : { show: false },
      data: rd.map(r => (isActive && r[pi] > 0 ? r[pi] : null)),
    };
  });

  const sumArr = rd.map(r => r.reduce((a, b) => a + (b || 0), 0));
  series.push({
    name: '总计', type: 'bar', stack: 'T', barWidth: 24,
    itemStyle: { color: 'transparent' }, tooltip: { show: false },
    label: {
      show: currentFilter === -1, position: 'right', color: '#00f6ff', fontSize: 12, fontWeight: 'bold',
      formatter: p => (sumArr[p.dataIndex] > 0 ? sumArr[p.dataIndex] + '万' : ''),
    },
    data: rd.map(() => 0),
  });

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(0,0,0,0.8)', textStyle: { color: '#fff' }, confine: true,
      order: 'valueDesc', valueFormatter: v => (v || 0) + ' 万元',
    },
    legend: !isTop ? {
      show: true, type: 'scroll', bottom: 0,
      textStyle: { color: '#a6c0fe', fontSize: 11 }, itemWidth: 12, itemHeight: 12,
      pageIconColor: '#00f6ff', pageTextStyle: { color: '#fff' },
    } : { show: false },
    grid: { top: 5, bottom: !isTop ? 25 : 5, left: 10, right: 55, containLabel: true },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category', data: rn,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#a6c0fe', fontSize: 13, width: 85, overflow: 'truncate' },
    },
    series,
  };
}

export function buildRankOption(pkgAmounts, pkgOrders, currentFilter) {
  const revPkg = [...PACKAGES].reverse();
  const revAmt = [...pkgAmounts].reverse();
  const revOrd = [...pkgOrders].reverse();
  const totalAmt = pkgAmounts.reduce((a, b) => a + b, 0);

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', backgroundColor: 'rgba(0,0,0,0.8)', textStyle: { color: '#fff' },
      formatter: params => {
        const idx = params[0].dataIndex;
        const pct = totalAmt > 0 ? ((revAmt[idx] / totalAmt) * 100).toFixed(1) : 0;
        return `${revPkg[idx]}<br/>金额: ${revAmt[idx]}万元 (${pct}%)<br/>订单: ${revOrd[idx]}单`;
      },
    },
    grid: { top: 5, bottom: 5, left: 10, right: 90, containLabel: true }, // 增加 right 以容纳更多文字
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category', data: revPkg,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#a6c0fe', fontSize: 13, interval: 0, width: 75, overflow: 'truncate' },
    },
    series: [{
      name: '金额(万)', type: 'bar', barWidth: 18,
      data: revAmt.map((v, i) => {
        const ri = PACKAGES.length - 1 - i;
        const pct = totalAmt > 0 ? ((v / totalAmt) * 100).toFixed(1) : 0;
        let color;
        if (currentFilter !== -1 && currentFilter !== ri) color = 'rgba(0,119,255,0.15)';
        else if (currentFilter === ri) color = '#00f6ff';
        else color = new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:'#002c5f'},{offset:1,color:'#00f6ff'}]);
        return {
          value: v,
          itemStyle: { color, borderRadius: [0,8,8,0] },
          label: {
            show: true, position: 'right', color: '#fff',
            formatter: () => `{amt|${v}万} {pct|${pct}%} {ord|${revOrd[i]}单}`,
            rich: {
              amt: { color: '#00f6ff', fontSize: 12, fontWeight: 'bold' },
              pct: { color: '#b37feb', fontSize: 11 }, // 使用紫色展示占比，增强赛博感并区分
              ord: { color: '#ffaa00', fontSize: 11 },
            },
          },
        };
      }),
    }],
  };
}

export function buildPieOption(pkgAmounts, currentFilter, timeText) {
  const totalAmount = pkgAmounts.reduce((a, b) => a + b, 0);
  const outerData = [];
  const innerData = [];
  PACKAGES.forEach((p, i) => {
    const c = BLUES[i % BLUES.length];
    const dimC = 'rgba(0,119,255,0.1)';
    const isDimmed = currentFilter !== -1 && currentFilter !== i;
    const itemColor = isDimmed ? dimC : (currentFilter === i ? '#00f6ff' : c);
    const lastVal = Math.round(pkgAmounts[i] * (0.8 + (i % 3) * 0.2));
    outerData.push({ name: p, value: pkgAmounts[i], itemStyle: { color: itemColor, borderColor: '#030a16', borderWidth: 2 } });
    innerData.push({ name: `${p} (${timeText}前)`, value: lastVal, itemStyle: { color: isDimmed ? dimC : itemColor, opacity: 0.3, borderColor: '#030a16', borderWidth: 1 } });
  });
  const cName = currentFilter === -1 ? '全盘' : PACKAGES[currentFilter];
  const cVal = currentFilter === -1 ? totalAmount : pkgAmounts[currentFilter];
  const cPct = currentFilter === -1 ? 100 : Math.round(cVal / totalAmount * 100);
  let trendText = '';
  let trendColor = '#ff4757';
  if (currentFilter !== -1) {
    const cLastVal = Math.round(pkgAmounts[currentFilter] * (0.8 + (currentFilter % 3) * 0.2));
    const tp = cLastVal === 0 ? 0 : (((pkgAmounts[currentFilter] - cLastVal) / cLastVal) * 100).toFixed(1);
    const isUp = tp >= 0;
    trendColor = isUp ? '#ff4757' : '#2ed573';
    trendText = `\n{t|环比${timeText} ${isUp ? '▲' : '▼'} ${Math.abs(tp)}%}\n{dt|本期: ${cVal}万  |  上期: ${cLastVal}万}`;
  } else {
    const totalLastVal = Math.round(totalAmount * 0.88);
    trendText = `\n{t|环比${timeText} ▲ 12.5%}\n{dt|本期: ${cVal}万  |  上期: ${totalLastVal}万}`;
  }
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c}万元', backgroundColor: 'rgba(0,0,0,0.8)', textStyle: { color: '#fff' } },
    series: [
      {
        name: '当前期', type: 'pie', radius: ['50%','68%'], center: ['50%','50%'],
        label: {
          show: true, position: 'center',
          formatter: `{n|${cName}}\n{v|${cPct}%}${trendText}`,
          rich: {
            n: { fontSize: 16, color: '#a6c0fe', padding: [0,0,5,0] },
            v: { fontSize: 42, fontWeight: 'bold', color: '#fff', fontFamily: 'Impact' },
            t: { fontSize: 18, color: trendColor, padding: [10,0,0,0], fontWeight: 'bold' },
            dt: { fontSize: 15, color: '#a6c0fe', padding: [8,0,0,0] },
          },
        },
        data: outerData,
      },
      {
        name: '上一期', type: 'pie', radius: ['35%','45%'], center: ['50%','50%'],
        label: { show: false }, itemStyle: { borderRadius: 0 },
        data: innerData,
      },
    ],
  };
}

export function buildTrendOption(pkgAmounts, pkgOrders, currentFilter, timeText) {
  const totalAmount = pkgAmounts.reduce((a, b) => a + b, 0);
  const totalOrders = pkgOrders.reduce((a, b) => a + b, 0);
  const amtBase = currentFilter === -1 ? totalAmount : pkgAmounts[currentFilter];
  const ordBase = currentFilter === -1 ? totalOrders : pkgOrders[currentFilter];
  let timePoints = [];
  if (timeText === '双周') {
    const d = new Date();
    for (let i = 14; i >= 0; i -= 2) {
      const pd = new Date(d.getTime() - i * 24 * 60 * 60 * 1000);
      timePoints.push(`${pd.getMonth()+1}/${pd.getDate()}`);
    }
  } else if (timeText === '本月') timePoints = ['1日','5日','10日','15日','20日','25日','30日'];
  else if (timeText === '半年') timePoints = ['1月','2月','3月','4月','5月','6月'];
  else if (timeText === '一年') timePoints = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  else timePoints = ['起点','节点1','节点2','节点3','终点'];

  const avgAmt = amtBase / timePoints.length;
  const avgOrd = ordBase / timePoints.length;
  // 固定随机种子生成固定的波动数据，避免每次重新渲染时线条抖动
  const fixedRandom = (seed) => {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
  const amtPts = timePoints.map((_, i) => Math.round(avgAmt === 0 ? 0 : avgAmt * (0.4 + fixedRandom(i + 10) * 1.2)));
  const ordPts = timePoints.map((_, i) => Math.round(avgOrd === 0 ? 0 : avgOrd * (0.4 + fixedRandom(i + 20) * 1.2)));

  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, backgroundColor: 'rgba(0,0,0,0.8)', textStyle: { color: '#fff' } },
    legend: {
      data: ['金额(万)','单量(笔)'], textStyle: { color: '#a6c0fe', fontSize: 11 },
      top: 5, right: 10, icon: 'roundRect', itemWidth: 12, itemHeight: 8,
    },
    grid: { top: 35, bottom: 5, left: 10, right: 10, containLabel: true },
    xAxis: {
      type: 'category', boundaryGap: true, data: timePoints,
      axisLabel: { color: '#a6c0fe', fontSize: 11, margin: 12 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: 'rgba(0,246,255,0.3)' } },
    },
    yAxis: [
      { type: 'value', splitLine: { lineStyle: { color: 'rgba(0,246,255,0.08)', type: 'dashed' } }, axisLabel: { color: '#00f6ff', fontSize: 11 } },
      { type: 'value', splitLine: { show: false }, axisLabel: { show: false } },
    ],
    series: [
      {
        name: '单量(笔)', type: 'bar', yAxisIndex: 1, barWidth: '35%',
        itemStyle: {
          borderRadius: [4,4,0,0],
          color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(0,119,255,0.6)'},{offset:1,color:'rgba(0,119,255,0.1)'}]),
        },
        data: ordPts,
      },
      {
        name: '金额(万)', type: 'line', yAxisIndex: 0, smooth: true,
        symbol: 'circle', symbolSize: 6, showSymbol: false,
        itemStyle: { color: '#00f6ff', borderColor: '#fff', borderWidth: 2 },
        lineStyle: { width: 3, color: '#00f6ff', shadowColor: 'rgba(0,246,255,0.6)', shadowBlur: 8 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(0,246,255,0.3)'},{offset:1,color:'rgba(0,246,255,0)'}]),
        },
        data: amtPts,
      },
    ],
  };
}

export function calcYearProgress() {
  const now = new Date();
  const year = now.getFullYear();
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const totalDays = isLeap ? 366 : 365;
  const start = new Date(year, 0, 1);
  const pastDays = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
  const leftDays = totalDays - pastDays;
  const tPct = Math.min(100, (pastDays / totalDays * 100).toFixed(1));
  return { leftDays, tPct };
}