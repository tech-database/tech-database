import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminAuth } from '../utils/adminAuth';

interface AdminContextType {
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
  showPasswordDialog: boolean;
  setShowPasswordDialog: (value: boolean) => void;
  isPasswordSet: boolean;
  setIsPasswordSet: (value: boolean) => void;
  login: (password: string) => Promise<boolean>;
  setPassword: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isPasswordSet, setIsPasswordSet] = useState(false);

  useEffect(() => {
    // 初始化时检查管理员状态
    setIsAdmin(adminAuth.isAdminMode());
    // 检查是否已设置密码
    checkPasswordSet();
  }, []);

  const checkPasswordSet = async () => {
    const set = await adminAuth.isPasswordSet();
    setIsPasswordSet(set);
  };

  const login = async (password: string): Promise<boolean> => {
    const success = await adminAuth.verifyPassword(password);
    if (success) {
      setIsAdmin(true);
      adminAuth.setAdminMode(true);
    }
    return success;
  };

  const setPassword = async (password: string): Promise<boolean> => {
    const success = await adminAuth.setPassword(password);
    if (success) {
      setIsAdmin(true);
      adminAuth.setAdminMode(true);
      // 设置密码成功后，重新检查密码状态确保同步
      await checkPasswordSet();
    }
    return success;
  };

  const logout = () => {
    setIsAdmin(false);
    adminAuth.setAdminMode(false);
  };

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        setIsAdmin,
        showPasswordDialog,
        setShowPasswordDialog,
        isPasswordSet,
        setIsPasswordSet,
        login,
        setPassword,
        logout
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};