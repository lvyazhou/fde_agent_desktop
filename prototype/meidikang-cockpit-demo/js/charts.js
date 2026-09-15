(function(){
  const css = getComputedStyle(document.documentElement);
  const hsl = (n, a) => {
    const v = css.getPropertyValue(n).trim() || '214 95% 44%';
    return a == null ? `hsl(${v})` : `hsl(${v} / ${a})`;
  };
  const P = hsl('--primary'), FG = hsl('--foreground'), SUB = hsl('--muted-foreground'), BD = hsl('--border');

  window.TC_COLORS = {
    primary: P, foreground: FG, textSub: SUB, textMute: SUB, border: BD,
    success: hsl('--success'), warning: hsl('--warning'), danger: hsl('--danger'), info: hsl('--info'),
    palette: [P, hsl('--primary',.78), hsl('--primary',.6), hsl('--primary',.45), hsl('--primary',.32), hsl('--primary',.2), FG, SUB, hsl('--info'), hsl('--border')],
  };

  window.TC_ECHARTS = {
    tooltip(extra={}) { return { trigger:'axis', backgroundColor:hsl('--background'), borderColor:BD, textStyle:{color:FG,fontSize:12}, appendToBody:true, ...extra }; },
    grid(extra={}) { return { left:48, right:20, top:28, bottom:32, containLabel:true, ...extra }; },
    axis(extra={}) { return { axisLine:{lineStyle:{color:BD}}, axisTick:{show:false}, axisLabel:{color:SUB,fontSize:12}, splitLine:{lineStyle:{color:hsl('--border',.5),type:'dashed'}}, ...extra }; },
    legend(extra={}) { return { icon:'circle', itemWidth:8, itemHeight:8, textStyle:{color:SUB,fontSize:12}, top:4, ...extra }; },
  };

  window.TC_FMT = {
    thousands(v) { return v == null || isNaN(v) ? '-' : Number(v).toLocaleString('zh-CN'); },
    pct(v, d=1) { return v == null || isNaN(v) ? '-' : (v*100).toFixed(d)+'%'; },
    fixed(v, d=1) { return v == null || isNaN(v) ? '-' : Number(v).toFixed(d); },
  };

  window.botFallback = function(img){
    img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='"+P+"'/><text x='32' y='43' font-size='30' text-anchor='middle' fill='white'>✦</text></svg>");
  };
})();
