# Custom Dark Table & Scrollbar Styles

When building Cyber-themed dashboards, standard UI library tables (like Ant Design's `<Table>`) often clash with the dark, glowing aesthetic. Instead, use a raw HTML `<table>` with the `.custom-table` class for ranking lists and data grids.

## 1. Custom Table HTML Structure

Always wrap the table in a `.custom-table-container` to handle overflowing content and custom scrollbars.

```jsx
<div className="custom-table-container">
    <table className="custom-table mini">
        <thead>
            <tr>
                <th>排名</th>
                <th>代理商名称</th>
                <th>业绩 (万元)</th>
                <th>占比</th>
            </tr>
        </thead>
        <tbody>
            {data.map((item, index) => (
                <tr key={item.id}>
                    <td>
                        <span className={`rank-badge rank-${index + 1}`}>
                            {index + 1}
                        </span>
                    </td>
                    <td>{item.name}</td>
                    <td style={{ color: '#00f6ff', fontFamily: 'Arial' }}>
                        {item.amount}
                    </td>
                    <td>{item.percentage}%</td>
                </tr>
            ))}
        </tbody>
    </table>
</div>
```

## 2. Table CSS Rules

Add these rules to your component's CSS to create the dark theme table.

```css
/* Container for scrolling */
.custom-table-container {
    flex: 1;
    overflow: auto;
    width: 100%;
}

/* Base Table */
.custom-table {
    width: 100%;
    border-collapse: collapse;
    color: #fff;
    font-size: 14px;
}

/* Cells */
.custom-table th,
.custom-table td {
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid rgba(0, 246, 255, 0.1);
}

/* Header Row */
.custom-table th {
    background: rgba(0, 246, 255, 0.1);
    color: #00f6ff;
    font-weight: 600;
    white-space: nowrap;
    position: sticky;
    top: 0; /* Keep header visible when scrolling */
    z-index: 2;
}

/* Hover Effect */
.custom-table tbody tr {
    transition: background-color 0.3s;
}
.custom-table tbody tr:hover {
    background: rgba(0, 246, 255, 0.15);
}

/* Truncate long text */
.custom-table td {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px; /* Adjust as needed */
}

/* Mini variant for tight spaces (like corner cards) */
.custom-table.mini th,
.custom-table.mini td {
    padding: 4px 8px;
    font-size: 12px;
}
```

## 3. Rank Badges

For Top N ranking lists, use distinct colors for 1st, 2nd, and 3rd place.

```css
.rank-badge {
    display: inline-block;
    width: 20px;
    height: 20px;
    line-height: 20px;
    text-align: center;
    border-radius: 50%;
    background: #666; /* Default for rank 4+ */
    color: #fff;
    font-size: 12px;
    font-weight: bold;
}

.rank-1 {
    background: linear-gradient(135deg, #FFD700, #FFA500);
    color: #000;
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
}

.rank-2 {
    background: linear-gradient(135deg, #C0C0C0, #A9A9A9);
    color: #000;
    box-shadow: 0 0 8px rgba(192, 192, 192, 0.6);
}

.rank-3 {
    background: linear-gradient(135deg, #CD7F32, #A0522D);
    color: #fff;
    box-shadow: 0 0 8px rgba(205, 127, 50, 0.6);
}
```

## 4. Cyber Scrollbars

Native white/gray scrollbars ruin the dark dashboard aesthetic. Apply these pseudo-elements to your main container (e.g., `.cyber-dashboard-wrapper`) or specific `.custom-table-container` elements.

```css
/* Target specific containers to avoid messing with global OS scrollbars if not full screen */
.custom-table-container::-webkit-scrollbar,
.cyber-dashboard-wrapper::-webkit-scrollbar {
    width: 6px;
    height: 6px; /* Horizontal scrollbar height */
}

/* The draggable thumb */
.custom-table-container::-webkit-scrollbar-thumb,
.cyber-dashboard-wrapper::-webkit-scrollbar-thumb {
    background: rgba(0, 246, 255, 0.3);
    border-radius: 3px;
    transition: background 0.3s;
}

.custom-table-container::-webkit-scrollbar-thumb:hover,
.cyber-dashboard-wrapper::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 246, 255, 0.6);
    box-shadow: 0 0 10px rgba(0, 246, 255, 0.5);
}

/* The track (background) */
.custom-table-container::-webkit-scrollbar-track,
.cyber-dashboard-wrapper::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
}
```

## 5. Alternative Data List (Non-Table)

If space is very tight (e.g., inside an `.ai-list` or `.corner-panel`), use flex rows instead of a table.

```jsx
<div className="cp-content">
    {data.map((item, idx) => (
        <div className="cp-item" key={item.id}>
            <span>
                <span className="blink-dot"></span>
                {item.name}
            </span>
            <span className="cp-val">
                {item.value} <small>{item.unit}</small>
            </span>
        </div>
    ))}
</div>
```

```css
.cp-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    overflow-y: auto;
}

.cp-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #a6c0fe;
    background: rgba(0, 246, 255, 0.05);
    padding: 4px 8px;
    border-radius: 2px;
    border-left: 2px solid transparent;
}

.cp-item:hover {
    background: rgba(0, 246, 255, 0.15);
    border-left-color: #00f6ff;
}

.blink-dot {
    display: inline-block; 
    width: 6px; 
    height: 6px; 
    background: #00f6ff; 
    border-radius: 50%; 
    margin-right: 6px; 
    box-shadow: 0 0 8px #00f6ff; 
    animation: cyberBlink 1.5s infinite;
}