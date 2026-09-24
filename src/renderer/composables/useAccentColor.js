import { useTheme } from './useTheme.js';

// 内置应用/专家的主题色存在 data/*.js 里，且绑到了 <input type="color">，
// 必须保持 hex 字面量（塞 var() 会让取色器读不出值）。所以不改数据，
// 改成渲染时按主题映射：冷色族在棕主题下换成对应暖色，其余原样透传。
const WARM = {
  '#2563eb': '#8f5a18',
  '#1d4ed8': '#6d4312',
  '#3b82f6': '#ac8347',
  '#1e40af': '#57350e',
  '#4f46e5': '#6d4312',
  '#0ea5e9': '#a87833',
  '#06b6d4': '#b98f4f',
  '#0369a1': '#8a6528',
  '#0c4a6e': '#5f4519',
  '#7c3aed': '#7b5688',
  '#0d9488': '#5c6b31',
  '#059669': '#6b7c3a',
  '#64748b': '#877b6b',
  '#94a3b8': '#ab9f8c',
};

export function useAccentColor() {
  const { theme } = useTheme();
  const accent = (hex, fallback = '#2563eb') => {
    const v = hex || fallback;
    if (theme.value !== 'brown') return v;
    return WARM[String(v).toLowerCase()] || v;
  };
  return { accent };
}
