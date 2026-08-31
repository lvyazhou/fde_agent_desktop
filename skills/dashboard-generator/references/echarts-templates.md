# ECharts Templates for Tech Dashboards

Use these configuration templates when building charts for the dashboard to ensure a consistent, high-tech dark theme.

## Common Options (Apply to almost all charts)

```javascript
const getCommonOption = () => ({
    backgroundColor: 'transparent',
    tooltip: {
        trigger: 'axis', // or 'item' for pie/map
        backgroundColor: 'rgba(0,0,0,0.95)',
        borderColor: '#00f6ff',
        borderWidth: 1,
        textStyle: { color: '#fff', fontSize: 12 },
        extraCssText: 'box-shadow: 0 0 10px rgba(0, 246, 255, 0.5);',
        confine: true
    },
    grid: { 
        top: 30, right: 20, bottom: 20, left: 40, containLabel: true 
    }
});
```

## Bar Chart (Ranking/Volume)

```javascript
const getBarOption = (xData, yData) => ({
    ...getCommonOption(),
    xAxis: {
        type: 'category',
        data: xData,
        axisLabel: { color: '#a6c0fe' },
        axisLine: { lineStyle: { color: '#00f6ff' } },
        axisTick: { show: false }
    },
    yAxis: {
        type: 'value',
        splitLine: { 
            show: true, 
            lineStyle: { color: 'rgba(255,255,255,0.1)', type: 'dashed' } 
        },
        axisLabel: { color: '#a6c0fe' },
        axisLine: { show: false } // Often hide y-axis line
    },
    series: [{
        type: 'bar',
        data: yData,
        barWidth: '40%',
        itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#00f6ff' },
                { offset: 1, color: 'rgba(0,119,255,0.1)' }
            ]),
            borderRadius: [4, 4, 0, 0]
        }
    }]
});
```

## Horizontal Bar (Top 10/Ranking)

```javascript
const getHorizontalBarOption = (categories, values) => ({
    ...getCommonOption(),
    xAxis: {
        type: 'value',
        show: false // Hide x-axis for horizontal rank
    },
    yAxis: {
        type: 'category',
        data: categories, // Remember to reverse data if top is highest
        axisLabel: { color: '#fff' },
        axisTick: { show: false },
        axisLine: { show: false }
    },
    series: [{
        type: 'bar',
        data: values,
        itemStyle: {
            color: '#00f6ff',
            borderRadius: [0, 4, 4, 0]
        },
        label: { 
            show: true, 
            position: 'right', 
            color: '#fff',
            formatter: '{c}'
        }
    }]
});
```

## Line Chart (Trends)

```javascript
const getLineOption = (xData, yData) => ({
    ...getCommonOption(),
    xAxis: {
        type: 'category',
        data: xData,
        axisLabel: { color: '#a6c0fe' },
        axisLine: { lineStyle: { color: '#00f6ff' } }
    },
    yAxis: {
        type: 'value',
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: '#a6c0fe' }
    },
    series: [{
        type: 'line',
        data: yData,
        smooth: true, // Curve the line
        areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(0, 246, 255, 0.5)' },
                { offset: 1, color: 'rgba(0, 246, 255, 0)' }
            ])
        },
        itemStyle: { color: '#00f6ff' },
        lineStyle: { width: 3, shadowColor: 'rgba(0,246,255,0.5)', shadowBlur: 10 },
        symbolSize: 8,
        showSymbol: false // Only show on hover
    }]
});
```

## Pie Chart / Donut (Distribution)

```javascript
const getPieOption = (data) => {
    const colors = ['#00f6ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#1890ff'];
    
    return {
        ...getCommonOption(),
        tooltip: {
            ...getCommonOption().tooltip,
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
        },
        legend: {
            orient: 'vertical',
            right: 10,
            top: 'center',
            textStyle: { color: '#fff', fontSize: 12 }
        },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'], // Donut style
            center: ['35%', '50%'], // Push left to make room for legend
            data: data.map((item, index) => ({
                ...item,
                itemStyle: { color: colors[index % colors.length] }
            })),
            label: { show: false }, // Hide line labels, use legend
            itemStyle: {
                borderRadius: 5,
                borderColor: '#030814', // Match background to create gap
                borderWidth: 2
            }
        }]
    };
};
```

## Dual-Layer Pie (Period Comparison)

A highly effective pattern for center core metrics. Shows the current period as a bright outer ring and the previous period as a dimmed inner ring.

```javascript
const getDualLayerPieOption = (currentData, prevData, centerLabelConfig) => {
    // currentData = [{ name: 'A', value: 100 }, ...]
    // prevData = [{ name: 'A', value: 80 }, ...] (Same categories, just past values)
    const colors = ['#00f6ff', '#0077ff', '#ffaa00', '#ff4757', '#b37feb'];
    
    return {
        ...getCommonOption(),
        tooltip: { trigger: 'item' },
        series: [
            // Outer Ring (Current Period)
            {
                name: '当前期',
                type: 'pie',
                radius: ['60%', '80%'], // Thicker, outer
                center: ['50%', '50%'],
                label: {
                    show: true,
                    position: 'center',
                    formatter: centerLabelConfig.text,
                    rich: centerLabelConfig.rich // Use rich text for multi-line styled center
                },
                itemStyle: {
                    borderColor: '#030814',
                    borderWidth: 2
                },
                data: currentData.map((item, idx) => ({
                    ...item,
                    itemStyle: { color: colors[idx % colors.length] }
                }))
            },
            // Inner Ring (Previous Period)
            {
                name: '上一期',
                type: 'pie',
                radius: ['45%', '55%'], // Thinner, inner
                center: ['50%', '50%'],
                label: { show: false }, // Hide labels for inner ring
                itemStyle: {
                    borderColor: '#030814',
                    borderWidth: 1
                },
                data: prevData.map((item, idx) => ({
                    value: item.value,
                    name: `${item.name} (前)`, // Differentiate name
                    itemStyle: {
                        color: colors[idx % colors.length],
                        opacity: 0.3 // Dimmed
                    }
                }))
            }
        ]
    };
};
```

## China Map (Geographic Distribution)

*Requires loading `china.json` and `echarts.registerMap('china', geoJson)` beforehand.*

```javascript
const getMapOption = (data) => ({
    ...getCommonOption(),
    tooltip: {
        ...getCommonOption().tooltip,
        trigger: 'item',
        formatter: (params) => {
            if (params.data) {
                 return `${params.name}<br/>Value: ${params.value}`;
            }
            return params.name;
        }
    },
    visualMap: {
        min: 0,
        max: 100, // Dynamic max based on data
        text: ['High', 'Low'],
        calculable: true,
        inRange: { color: ['#003366', '#00f6ff'] },
        textStyle: { color: '#fff' },
        bottom: 10,
        left: 10
    },
    geo: {
        map: 'china',
        roam: true,
        itemStyle: {
            areaColor: '#0a1525',
            borderColor: '#00f6ff',
            borderWidth: 1,
            shadowColor: 'rgba(0, 246, 255, 0.5)',
            shadowBlur: 10
        },
        emphasis: {
            itemStyle: {
                areaColor: '#2a333d',
                borderColor: '#ff4d4f',
                borderWidth: 2
            },
            label: { show: true, color: '#fff' }
        }
    },
    series: [
        {
            type: 'map',
            geoIndex: 0,
            data: data
        },
        // Optional: Add glowing dots for specific points
        {
            type: 'effectScatter',
            coordinateSystem: 'geo',
            data: data.map(item => ({
                name: item.name,
                // [longitude, latitude, value] - Note: needs coordinates mapped
                value: [item.lng, item.lat, item.value] 
            })),
            symbolSize: (val) => Math.max(10, Math.min(30, val[2] / 10)),
            showEffectOn: 'render',
            rippleEffect: { brushType: 'stroke', scale: 3 },
            itemStyle: {
                color: '#ff4d4f',
                shadowBlur: 10,
                shadowColor: '#ff4d4f'
            },
            zlevel: 1
        }
    ]
});
```

## Stacked Bar Chart (Composition Analysis)

```javascript
const getStackedBarOption = (categories, seriesDataArray) => {
    // seriesDataArray = [{ name: 'A', data: [10, 20...] }, { name: 'B', data: [5, 15...] }]
    const colors = ['#00f6ff', '#0077ff', '#20b2aa', '#5da0e3', '#8abde8'];
    
    return {
        ...getCommonOption(),
        tooltip: {
            ...getCommonOption().tooltip,
            axisPointer: { type: 'shadow' }
        },
        legend: {
            textStyle: { color: '#a6c0fe', fontSize: 11 },
            top: 0,
            right: 10,
            icon: 'roundRect',
            itemWidth: 12,
            itemHeight: 8
        },
        xAxis: {
            type: 'category',
            data: categories,
            axisLabel: { color: '#a6c0fe', fontSize: 11 },
            axisTick: { show: false },
            axisLine: { lineStyle: { color: 'rgba(0,246,255,0.3)' } }
        },
        yAxis: {
            type: 'value',
            splitLine: {
                lineStyle: { color: 'rgba(0,246,255,0.08)', type: 'dashed' }
            },
            axisLabel: { color: '#00f6ff', fontSize: 11 }
        },
        series: seriesDataArray.map((series, index) => ({
            name: series.name,
            type: 'bar',
            stack: 'total', // Use same string to stack
            barWidth: '40%',
            itemStyle: {
                color: colors[index % colors.length]
            },
            data: series.data
        }))
    };
};
```

## Dual-Axis Mixed Chart (Bar + Line)

Used when comparing two metrics with different scales (e.g., Revenue vs. Order Count).

```javascript
const getDualAxisOption = (categories, barData, lineData) => {
    return {
        ...getCommonOption(),
        tooltip: {
            ...getCommonOption().tooltip,
            trigger: 'axis',
            axisPointer: { type: 'cross' }
        },
        legend: {
            data: ['Revenue', 'Order Count'],
            textStyle: { color: '#a6c0fe', fontSize: 11 },
            top: 5,
            right: 10
        },
        grid: { top: 35, bottom: 5, left: 10, right: 10, containLabel: true },
        xAxis: {
            type: 'category',
            data: categories,
            axisLabel: { color: '#a6c0fe' },
            axisTick: { show: false },
            axisLine: { lineStyle: { color: 'rgba(0,246,255,0.3)' } }
        },
        yAxis: [
            {
                type: 'value',
                name: 'Revenue',
                splitLine: { lineStyle: { color: 'rgba(0,246,255,0.08)', type: 'dashed' } },
                axisLabel: { color: '#00f6ff' }
            },
            {
                type: 'value',
                name: 'Count',
                splitLine: { show: false }, // Hide secondary grid lines
                axisLabel: { color: '#b37feb' } // Use distinct color for right axis
            }
        ],
        series: [
            {
                name: 'Revenue',
                type: 'bar',
                yAxisIndex: 0,
                barWidth: '35%',
                itemStyle: {
                    borderRadius: [4, 4, 0, 0],
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(0,246,255,0.8)' },
                        { offset: 1, color: 'rgba(0,246,255,0.1)' }
                    ])
                },
                data: barData
            },
            {
                name: 'Order Count',
                type: 'line',
                yAxisIndex: 1, // Bind to right axis
                smooth: true,
                showSymbol: false,
                itemStyle: { color: '#b37feb', borderColor: '#fff', borderWidth: 2 },
                lineStyle: { width: 3, shadowColor: 'rgba(179,127,235,0.6)', shadowBlur: 8 },
                data: lineData
            }
        ]
    };
};
```

## Nightingale Rose Chart

Used for cyclic or highly distinct categorical distributions where radius represents value.

```javascript
const getRoseOption = (data) => {
    // data = [{ value: 40, name: 'rose 1' }, ...]
    const colors = ['#00f6ff', '#0077ff', '#20b2aa', '#5da0e3', '#8abde8', '#b37feb'];
    
    return {
        ...getCommonOption(),
        tooltip: {
            trigger: 'item',
            formatter: '{b} : {c} ({d}%)',
            backgroundColor: 'rgba(0,0,0,0.9)',
            textStyle: { color: '#fff' }
        },
        legend: {
            bottom: '0',
            textStyle: { color: '#a6c0fe', fontSize: 10 }
        },
        series: [
            {
                type: 'pie',
                radius: ['20%', '70%'],
                center: ['50%', '45%'],
                roseType: 'radius', // 'radius' or 'area'
                itemStyle: {
                    borderRadius: 5,
                    borderColor: '#030a16',
                    borderWidth: 2
                },
                label: {
                    show: true,
                    color: '#00f6ff'
                },
                labelLine: {
                    lineStyle: { color: 'rgba(0, 246, 255, 0.4)' }
                },
                data: data.map((item, idx) => ({
                    ...item,
                    itemStyle: { color: colors[idx % colors.length] }
                }))
            }
        ]
    };
};
```

## Bubble / Scatter Chart

Useful for comparing 3 dimensions (e.g., X=Growth, Y=Revenue, Bubble Size=Profit Margin).

```javascript
const getBubbleOption = (data) => {
    // data = [[x, y, size, 'Name'], ...]
    return {
        ...getCommonOption(),
        xAxis: {
            type: 'value',
            name: 'Growth (%)',
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
            axisLabel: { color: '#a6c0fe' },
            nameTextStyle: { color: '#a6c0fe' }
        },
        yAxis: {
            type: 'value',
            name: 'Revenue',
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
            axisLabel: { color: '#a6c0fe' },
            nameTextStyle: { color: '#a6c0fe' }
        },
        series: [{
            type: 'scatter',
            data: data,
            symbolSize: function (data) {
                // Determine bubble size based on 3rd array element
                return Math.max(10, Math.min(data[2] * 2, 60));
            },
            itemStyle: {
                color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [
                    { offset: 0, color: 'rgba(0, 246, 255, 0.8)' },
                    { offset: 1, color: 'rgba(0, 119, 255, 0.4)' }
                ]),
                borderColor: '#00f6ff',
                borderWidth: 1,
                shadowBlur: 10,
                shadowColor: 'rgba(0, 246, 255, 0.5)'
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 20,
                    shadowColor: '#fff'
                },
                label: {
                    show: true,
                    formatter: function (param) { return param.data[3]; }, // Show Name
                    position: 'top',
                    color: '#fff'
                }
            }
        }]
    };
};
```