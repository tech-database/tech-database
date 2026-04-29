import React, { useState, useRef, useEffect } from 'react';
import { FileImage } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt?: string;
  className?: string;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt = '',
  className = '',
  placeholder,
  onLoad,
  onError
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            img.src = src;
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '200px 0px',
        threshold: 0.01
      }
    );

    observer.observe(img);

    return () => {
      observer.disconnect();
    };
  }, [src]);

  const handleLoad = () => {
    setLoaded(true);
    setError(false);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    setLoaded(false);
    onError?.();
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        ref={imgRef}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
        className={`
          w-full h-full object-contain
          transition-opacity duration-300
          ${loaded ? 'opacity-100' : 'opacity-0'}
        `}
      />
      
      {/* 加载占位 */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          {placeholder || (
            <div className="animate-pulse w-full h-full bg-muted" />
          )}
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <FileImage className="w-12 h-12 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export default LazyImage;
