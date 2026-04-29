import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";

// 安全检查 - 确保 DOM 环境可用
const rootElement = document.getElementById("root");

if (rootElement) {
  try {
    createRoot(rootElement).render(
      <AppWrapper>
        <App />
      </AppWrapper>
    );
  } catch (error) {
    console.error("应用启动失败:", error);
    // 如果 React 渲染失败，显示友好的错误信息
    rootElement.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: system-ui, -apple-system, sans-serif;">
        <h2 style="color: #333;">应用启动失败</h2>
        <p style="color: #666; margin-top: 10px;">抱歉，应用无法正常启动。</p>
        <p style="color: #666; margin-top: 10px;">请刷新页面或联系管理员。</p>
      </div>
    `;
  }
} else {
  console.error("无法找到 root 元素");
}
