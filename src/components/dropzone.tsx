import React, { useRef, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface FileUploadProps {
  label: string;
  accept?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ label, accept, value, onChange, error }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const validateFileType = (file: File): boolean => {
    if (!accept) return true;
    const acceptTypes = accept.split(',').map((type) => type.trim());

    return acceptTypes.some((type) => {
      if (type === '*/*' || type === '*') return true;
      if (type.endsWith('/*')) return file.type.startsWith(type.slice(0, -2));
      if (type.startsWith('.')) return file.name.toLowerCase().endsWith(type.toLowerCase());
      return file.type === type;
    });
  };

  const setFile = (file: File | null) => {
    if (file && !validateFileType(file)) {
      toast.error(`文件类型不支持，请选择 ${accept} 格式的文件`);
      return;
    }
    onChange(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    setFile(event.dataTransfer.files?.[0] || null);
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    for (let index = 0; index < items.length; index += 1) {
      if (items[index].kind === 'file') {
        setFile(items[index].getAsFile());
        break;
      }
    }
  };

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <div
          ref={containerRef}
          tabIndex={0}
          className={`outline-none rounded-[1.5rem] border-2 border-dashed p-5 transition-all ${
            isDragging || isFocused
              ? 'border-primary bg-emerald-50/75'
              : 'border-cyan-100 bg-white/70 hover:border-primary/60'
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          onPaste={handlePaste}
          onClick={() => containerRef.current?.focus()}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />

          {value ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{value.name}</div>
                  <div className="text-xs text-muted-foreground">{(value.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(null);
                }}
                className="rounded-full p-2 transition-colors hover:bg-white"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-emerald-100 text-emerald-700">
                <Upload className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold text-slate-900">{isDragging ? '释放文件开始上传' : '拖拽文件到此处'}</p>
              <p className="mt-1 text-xs text-muted-foreground">支持点击选择、拖拽上传，也可按 Ctrl+V 粘贴</p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-4 rounded-full border border-white/80 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-cyan-50"
              >
                选择文件
              </button>
            </div>
          )}
        </div>
      </FormControl>
      <FormMessage>{error}</FormMessage>
    </FormItem>
  );
};

export default FileUpload;
