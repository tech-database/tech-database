/**
 * 安全的localStorage操作工具
 * 处理Storage被禁用、隐私模式等情况
 */

export const safeStorage = {
  getItem: (key: string, defaultValue: string = ''): string => {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (error) {
      console.warn(`localStorage.getItem失败 (${key}):`, error);
      return defaultValue;
    }
  },

  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`localStorage.setItem失败 (${key}):`, error);
      return false;
    }
  },

  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`localStorage.removeItem失败 (${key}):`, error);
      return false;
    }
  },

  getBoolean: (key: string, defaultValue: boolean = false): boolean => {
    const value = safeStorage.getItem(key);
    if (value === 'true') return true;
    if (value === 'false') return false;
    return defaultValue;
  },

  setBoolean: (key: string, value: boolean): boolean => {
    return safeStorage.setItem(key, value.toString());
  },

  getNumber: (key: string, defaultValue: number = 0): number => {
    const value = safeStorage.getItem(key);
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  },
};

export default safeStorage;
