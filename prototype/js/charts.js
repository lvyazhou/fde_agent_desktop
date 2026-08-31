// ── 360 企业级 BI 配色 & ECharts 公共配置 ──────────────────────────────────────
window.TC_COLORS = {
  primary: '#2563eb', primaryDark: '#1d4ed8', primaryLight: '#eff6ff',
  deepBlue: '#1e3a8a', midBlue: '#1e40af', borderBlue: '#bfdbfe', softBlue: '#dbeafe',
  text: '#333', textSub: '#475569', textMute: '#999',
  border: '#e8ecf0', bg: '#f5f7fa',
  red: '#dc2626', amber: '#d97706', green: '#059669',
  palette: ['#1e40af','#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#1e3a8a','#0c4a6e','#475569','#94a3b8'],
};

window.TC_ECHARTS = {
  tooltip(extra) { return Object.assign({ trigger:'axis', backgroundColor:'#fff', borderColor:'#e8ecf0', textStyle:{color:'#333',fontSize:12}, appendToBody:true }, extra); },
  grid(extra) { return Object.assign({ left:50, right:20, top:28, bottom:32, containLabel:true }, extra); },
  axis(extra) { return Object.assign({ axisLine:{lineStyle:{color:'#e8ecf0'}}, axisTick:{show:false}, axisLabel:{color:'#666',fontSize:11}, splitLine:{lineStyle:{color:'#f0f2f5',type:'dashed'}} }, extra); },
  legend(extra) { return Object.assign({ icon:'circle', itemWidth:8, itemHeight:8, textStyle:{color:'#666',fontSize:12}, top:4 }, extra); },
};

window.TC_FMT = {
  thousands(v) { return v == null || isNaN(v) ? '-' : Number(v).toLocaleString('zh-CN'); },
  pct(v, d) { return v == null || isNaN(v) ? '-' : (Number(v)*100).toFixed(d||1)+'%'; },
  fixed(v, d) { return v == null || isNaN(v) ? '-' : Number(v).toFixed(d||1); },
};

// Toast helper (attach to Alpine data)
window.TC_TOAST = function(data) {
  return {
    toasts: [],
    _tid: 0,
    show(msg, type) {
      const id = ++this._tid;
      this.toasts.push({ id, msg, type, removing:false });
      setTimeout(() => {
        const t = this.toasts.find(t=>t.id===id);
        if(t) t.removing = true;
        setTimeout(() => { this.toasts = this.toasts.filter(t=>t.id!==id); }, 350);
      }, 2500);
    }
  };
};
