import { useMemo, useRef, useEffect, useCallback, useState } from 'react';

/**
 * 防抖hook
 */
export const useDebounce = <T>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * 节流hook
 */
export const useThrottle = <T>(value: T, limit: number = 100): T => {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdate = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdate.current >= limit) {
      setThrottledValue(value);
      lastUpdate.current = now;
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastUpdate.current = Date.now();
      }, limit);
      return () => clearTimeout(timer);
    }
  }, [value, limit]);

  return throttledValue;
};

/**
 * 组件挂载ref，避免内存泄漏
 */
export const useIsMounted = () => {
  const isMounted = useRef(true);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
};

/**
 * 安全的异步状态设置（避免组件卸载后设置状态）
 */
export const useSafeState = <T>(initialValue: T) => {
  const isMounted = useIsMounted();
  const [state, setState] = useState(initialValue);

  const safeSetState = useCallback((newValue: T | ((prev: T) => T)) => {
    if (isMounted.current) {
      setState(newValue);
    }
  }, []);

  return [state, safeSetState] as const;
};

/**
 * 缓存hook（简单版本）
 */
export const useCache = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const updateValue = useCallback((newValue: T) => {
    setValue(newValue);
    try {
      sessionStorage.setItem(key, JSON.stringify(newValue));
    } catch {
      // 忽略存储错误
    }
  }, [key]);

  return [value, updateValue] as const;
};

export default {
  useDebounce,
  useThrottle,
  useIsMounted,
  useSafeState,
  useCache
};
