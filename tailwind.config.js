/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // カスタムカラー: 黒・グレー・白を基調とした映像制作者向けUI
      colors: {
        gray: {
          850: '#1a1a1a',
          950: '#0a0a0a',
        },
      },
    },
  },
  plugins: [],
};
