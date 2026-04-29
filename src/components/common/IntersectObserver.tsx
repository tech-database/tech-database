import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const IntersectObserver = () => {
  const location = useLocation();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    const timer = setTimeout(() => {
      if (!isMounted.current) return;
      
      try {
        // 安全加载tailwindcss-intersect
        const { Observer } = require('tailwindcss-intersect');
        if (Observer && typeof Observer.restart === 'function') {
          Observer.restart();
        }
      } catch (error) {
        console.warn(
          'TailwindCSS Intersect Observer failed to load (this is non-critical):',
          error
        );
      }
    }, 100);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      // 尝试安全清理
      try {
        const { Observer } = require('tailwindcss-intersect');
        if (Observer && typeof Observer.disconnect === 'function') {
          Observer.disconnect();
        }
      } catch {
        // 忽略清理错误
      }
    };
  }, [location]);

  return null;
};

export default IntersectObserver;
