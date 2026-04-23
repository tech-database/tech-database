import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FolderTree, Upload, Settings, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface MainLayoutProps {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, sidebarContent }) => {
  const location = useLocation();

  const navItems = [
    { name: '首页', path: '/', icon: Home },
    { name: '分类浏览', path: '/categories', icon: FolderTree },
  ];

  const actionItems = [
    { name: '上传文件', path: '/upload', icon: Upload },
    { name: '分类管理', path: '/manage', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{item.name}</span>
          </Link>
        );
      })}
    </>
  );

  const ActionLinks = () => (
    <>
      {actionItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{item.name}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* 桌面端侧边栏 */}
      <aside className="hidden lg:flex lg:flex-col shrink-0 border-r border-border bg-card w-80">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border shrink-0">
            <h1 className="text-xl font-bold text-foreground truncate">文件查找工具</h1>
          </div>
          {/* 操作按钮 - 一直显示在最上面 */}
          <nav className="p-4 space-y-2 shrink-0 border-b border-border">
            <ActionLinks />
          </nav>
          {/* 导航菜单 */}
          <nav className="p-4 space-y-2 shrink-0">
            <NavLinks />
          </nav>
          {sidebarContent && (
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 border-t border-border min-h-0">
              {sidebarContent}
            </div>
          )}
        </div>
      </aside>

      {/* 移动端导航 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold text-foreground">文件查找工具</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">导航菜单</h2>
              </div>
              <nav className="p-4 space-y-2 border-b border-border">
                <ActionLinks />
              </nav>
              <nav className="p-4 space-y-2">
                <NavLinks />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* 主内容区 */}
      <main className="flex-1 lg:pt-0 pt-16 overflow-y-auto overflow-x-hidden min-w-0">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
