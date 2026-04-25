import HomePage from './pages/HomePage';
import CategoryBrowsePage from './pages/CategoryBrowsePage';
import FileUploadPage from './pages/FileUploadPage';
import CategoryManagementPage from './pages/CategoryManagementPage';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: '首页',
    path: '/',
    element: <HomePage />,
  },
  {
    name: '分类浏览',
    path: '/categories',
    element: <CategoryBrowsePage />,
  },
  {
    name: '上传文件',
    path: '/upload',
    element: <FileUploadPage />,
  },
  {
    name: '分类管理',
    path: '/manage',
    element: <CategoryManagementPage />,
  },
];
