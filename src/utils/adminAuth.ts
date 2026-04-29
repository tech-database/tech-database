import { supabase } from '../db/supabase';
import { safeStorage } from './safeStorage';

// 简单的密码哈希（生产环境应该用更安全的方法）
const simpleHash = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(16);
};

export const adminAuth = {
  // 检查是否已设置密码
  async isPasswordSet(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('admin_config')
        .select('password_hash')
        .single();
      
      if (error) {
        console.error('检查密码状态错误:', error);
        return false;
      }
      
      const result = data?.password_hash !== 'NOT_SET';
      console.log('密码已设置:', result);
      return result;
    } catch (err) {
      console.error('检查密码状态异常:', err);
      return false;
    }
  },

  // 设置密码（第一次）
  async setPassword(password: string): Promise<boolean> {
    try {
      const passwordHash = simpleHash(password);
      console.log('设置密码哈希:', passwordHash);
      
      const { error } = await supabase
        .from('admin_config')
        .update({ password_hash: passwordHash })
        .eq('id', 1);
      
      if (error) {
        console.error('设置密码错误:', error);
        return false;
      }
      
      console.log('密码设置成功');
      return true;
    } catch (err) {
      console.error('设置密码异常:', err);
      return false;
    }
  },

  // 验证密码
  async verifyPassword(password: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('admin_config')
        .select('password_hash')
        .single();
      
      if (error || !data) {
        console.error('验证密码错误:', error);
        return false;
      }
      
      const passwordHash = simpleHash(password);
      const result = data.password_hash === passwordHash;
      console.log('密码验证结果:', result);
      return result;
    } catch (err) {
      console.error('验证密码异常:', err);
      return false;
    }
  },

  // 本地存储管理员状态
  isAdminMode(): boolean {
    return safeStorage.getBoolean('adminMode', false);
  },

  setAdminMode(isAdmin: boolean) {
    safeStorage.setBoolean('adminMode', isAdmin);
  }
};