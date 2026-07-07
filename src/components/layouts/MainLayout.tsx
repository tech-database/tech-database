import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FolderTree, Home, LogOut, Menu, Settings, Shield, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { AdminPasswordDialog } from '@/components/AdminPasswordDialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAdmin } from '@/contexts/AdminContext';

interface MainLayoutProps {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
}

const navItems = [
  { name: '首页', path: '/', icon: Home },
  { name: '分类浏览', path: '/categories', icon: FolderTree },
];

const actionItems = [
  { name: '上传文件', path: '/upload', icon: Upload },
  { name: '分类管理', path: '/manage', icon: Settings },
];

const MainLayout: React.FC<MainLayoutProps> = ({ children, sidebarContent }) => {
  const location = useLocation();
  const { isAdmin, setShowPasswordDialog, logout } = useAdmin();
  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    toast.success('已退出管理员模式');
  };

  const renderLinks = (items: typeof navItems) => (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`group flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold transition-all ${
              active
                ? 'bg-primary text-primary-foreground shadow-[0_8px_18px_rgb(20_184_166/0.22)]'
                : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </>
  );

  const adminButton = (
    <Button
      variant={isAdmin ? 'default' : 'outline'}
      size="sm"
      onClick={isAdmin ? handleLogout : () => setShowPasswordDialog(true)}
      className="admin-button shrink-0"
    >
      {isAdmin ? (
        <>
          <LogOut className="h-4 w-4" />
          退出
        </>
      ) : (
        <>
          <Shield className="h-4 w-4" />
          管理员
        </>
      )}
    </Button>
  );

  return (
    <div className="pastel-shell flex h-screen w-full overflow-hidden">
      <AdminPasswordDialog />

      <aside className="hidden w-80 shrink-0 p-4 lg:flex lg:flex-col">
        <div className="soft-surface flex h-full flex-col overflow-hidden rounded-[1.75rem]">
          <div className="shrink-0 border-b border-white/70 p-5">
            <div className="mb-5 space-y-4">
              <Link to="/" className="block min-w-0">
                <h1 className="truncate text-xl font-bold text-slate-900">中泰家具集团</h1>
              </Link>
              <div className="flex justify-start">{adminButton}</div>
            </div>
          </div>

          {isAdmin && (
            <nav className="space-y-2 border-b border-white/70 p-4">
              {renderLinks(actionItems)}
            </nav>
          )}

          <nav className="space-y-2 p-4">{renderLinks(navItems)}</nav>

          {sidebarContent && (
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden border-t border-white/70 p-4">
              {sidebarContent}
            </div>
          )}
        </div>
      </aside>

      <div className="fixed inset-x-0 top-0 z-50 border-b border-white/70 bg-white/85 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-900">中泰家具集团</h1>
          </Link>
          <div className="flex items-center gap-2">
            {adminButton}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-white/70 bg-white/95 p-0">
                <div className="border-b border-border p-5">
                  <h2 className="text-xl font-bold text-slate-900">导航菜单</h2>
                  <p className="mt-1 text-sm text-slate-500">快速进入常用工作流</p>
                </div>
                {isAdmin && <nav className="space-y-2 border-b border-border p-4">{renderLinks(actionItems)}</nav>}
                <nav className="space-y-2 p-4">{renderLinks(navItems)}</nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden pt-16 lg:pt-0">{children}</main>
    </div>
  );
};

export default MainLayout;
