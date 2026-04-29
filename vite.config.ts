import { defineConfig } from "vite";
// @ts-ignore - miaoda-sc-plugin 类型声明缺失，运行时正常工作
import { miaodaDevPlugin } from "miaoda-sc-plugin";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // 支持更广泛的 JSX 转换
      babel: {
        presets: [],
        plugins: [],
      },
    }),
    miaodaDevPlugin(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // 支持更广泛的浏览器
    target: [
      'es2020',
      'chrome80',
      'edge80',
      'firefox75',
      'safari13',
      'ios13'
    ],
  },
  // 开发服务器配置
  server: {
    port: 5175,
    // 支持 CORS
    cors: true,
  },
  // 预览服务器配置
  preview: {
    port: 4175,
    cors: true,
  },
});
