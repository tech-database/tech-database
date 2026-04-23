import React, { useState, useRef } from 'react';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Upload, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  label: string;
  accept?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept,
  value,
  onChange,
  error,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 验证文件类型的辅助函数
  const validateFileType = (file: File): boolean => {
    if (!accept) return true;
    
    const acceptTypes = accept.split(',').map(type => type.trim());
    
    for (const type of acceptTypes) {
      if (type === '*/*' || type === '*') {
        return true;
      } else if (type.endsWith('/*')) {
        const category = type.slice(0, -2);
        if (file.type.startsWith(category)) {
          return true;
        }
      } else if (type.startsWith('.')) {
        const extension = type.toLowerCase();
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith(extension)) {
          return true;
        }
      } else if (file.type === type) {
        return true;
      }
    }
    
    return false;
  };

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (!validateFileType(file)) {
        toast.error(`文件类型不支持，请选择 ${accept} 格式的文件`);
        return;
      }
      onChange(file);
    }
  };

  // Handle paste events
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          if (!validateFileType(file)) {
            toast.error(`文件类型不支持，请选择 ${accept} 格式的文件`);
            return;
          }
          onChange(file);
          break;
        }
      }
    }
  };

  // Focus container on click (don't open file dialog)
  const handleContainerClick = () => {
    containerRef.current?.focus();
  };

  // Open file dialog only when button is clicked
  const handleSelectFileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // Handle file input change with validation
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && !validateFileType(file)) {
      toast.error(`文件类型不支持，请选择 ${accept} 格式的文件`);
      // Reset the input
      e.target.value = '';
      return;
    }
    onChange(file);
  };

  // Remove file
  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <div
          ref={containerRef}
          tabIndex={0}
          className={`border-2 rounded-lg p-4 transition-all duration-200 outline-none ${isDragging ? 'border-primary bg-primary/5' : isFocused ? 'border-primary' : 'border-border hover:border-primary'}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onPaste={handlePaste}
          onClick={handleContainerClick}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{ cursor: 'default' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileInputChange}
          />

          {value ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div className="truncate">
                  <div className="font-medium text-sm">{value.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(value.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <div className="space-y-1">
                <p className="text-sm font-medium">{isDragging ? '释放文件以上传' : '拖拽文件到此处'}</p>
                <p className="text-xs text-muted-foreground">
                  鼠标放此区域，按 Ctrl+V 直接粘贴
                </p>
                {accept && (
                  <p className="text-xs text-muted-foreground">
                    {accept === 'image/*' ? '支持所有图片格式' : '支持所有文件格式'}
                  </p>
                )}
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleSelectFileClick}
                  className="px-4 py-2 text-sm border border-border rounded hover:bg-muted transition-colors"
                >
                  选择文件
                </button>
              </div>
            </div>
          )}
        </div>
      </FormControl>
      <FormMessage>{error}</FormMessage>
    </FormItem>
  );
};

export default FileUpload;