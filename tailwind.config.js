module.exports = {
  content: ['./src/renderer/**/*.{vue,js,html}'],
  theme: {
    extend: {
      colors: {
        // 品牌蓝（与 tailwind.css @theme 一致，v4 实际以 @theme 为准）
        primary: '#2563eb',
        primaryDark: '#1d4ed8',
        primarySoft: '#eff4ff',
        // 语义色
        success: '#059669',
        warning: '#d97706',
        danger: '#dc2626',
        info: '#2563eb',
        // 中性层（冷调）
        surface: '#ffffff',
        panel: '#eef2f8',
        textSoft: '#64748b',
        border: '#e4e9f2',
      },
      boxShadow: {
        card: '0 8px 24px rgba(15, 23, 42, 0.06)',
        float: '0 12px 32px rgba(37, 99, 235, 0.14)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
