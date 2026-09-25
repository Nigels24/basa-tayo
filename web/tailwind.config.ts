import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1d2838',
        ink2: '#4a5568',
        ink3: '#7b8699',
        line: '#e1e6ef',
        ground: '#f3f5f9',
        accent: '#2458b3',
        mango: '#ffc53d',
        titik: '#e4572e',
        larawan: '#2e86de',
        buuin: '#3ba55c',
      },
    },
  },
  plugins: [],
} satisfies Config;
