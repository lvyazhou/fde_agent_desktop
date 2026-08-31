module.exports = {
  content: ['./src/renderer/**/*.{vue,js,html}'],
  theme: {
    extend: {
      colors: {
        primary: '#059669',
        primaryDark: '#047857',
        surface: '#f4f7f6',
        panel: '#e6ece9',
        textSoft: '#7b8b85',
      },
      boxShadow: {
        card: '0 12px 24px rgba(15, 23, 42, 0.06)',
        float: '0 8px 30px rgba(148, 163, 184, 0.18)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
