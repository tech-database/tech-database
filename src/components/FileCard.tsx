import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Download, Trash2, FileImage, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FileWithCategories } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAdmin } from '@/contexts/AdminContext';

interface FileCardProps {
  file: FileWithCategories;
  onDelete?: (fileId: string) => void;
  onEdit?: (file: FileWithCategories) => void;
  isSelected?: boolean;
  onSelect?: (fileId: string) => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onDelete, onEdit, isSelected, onSelect }) => {
  const { isAdmin } = useAdmin();
  const [imageError, setImageError] = useState(false);

  const formatDate = useCallback((dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: zhCN });
    } catch {
      return dateString;
    }
  }, []);

  // 使用useMemo缓存格式化后的日期
  const formattedCreatedAt = useMemo(() => formatDate(file.created_at), [file.created_at, formatDate]);
  const formattedUpdatedAt = useMemo(() => formatDate(file.updated_at), [file.updated_at, formatDate]);

  // 使用useMemo缓存分类路径展示
  const categoryPathDisplay = useMemo(() => {
    const path = file.categoryPath || [];
    if (path.length === 0) {
      return <span className="px-1.5 py-0.5 bg-secondary rounded truncate">未分类</span>;
    }
    return path.map((categoryName, index) => (
      <React.Fragment key={index}>
        <span className="px-1.5 py-0.5 bg-secondary rounded truncate">
          {categoryName}
        </span>
        {index < path.length - 1 && <span>/</span>}
      </React.Fragment>
    ));
  }, [file.categoryPath]);

  return (
    <Card className={`hover-transition hover:bg-muted overflow-hidden min-w-0 ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-0">
        <div className="relative w-full aspect-square bg-muted">
          {onSelect && (
            <div className="absolute top-2 left-2 z-10">
              <button
                type="button"
                className={`w-6 h-6 rounded-full flex items-center justify-center ${isSelected ? 'bg-primary text-white' : 'bg-white/80 text-foreground'}`}
                onClick={() => onSelect(file.id)}
              >
                {isSelected ? '✓' : '○'}
              </button>
            </div>
          )}
          {imageError ? (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <FileImage className="h-12 w-12 text-muted-foreground" />
            </div>
          ) : (
            <img
              src={file.image_url}
              alt={file.name}
              className="w-full h-full object-contain"
              onError={() => setImageError(true)}
              loading="lazy"
              decoding="async"
            />
          )}
        </div>

        <div className="p-2 lg:p-3 space-y-1.5 lg:space-y-2 min-w-0">
          <h3 className="font-semibold text-foreground line-clamp-1 text-xs lg:text-sm">{file.name}</h3>
          
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            {categoryPathDisplay}
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            {file.specification && (
              <div className="flex items-center justify-between gap-2">
                <span className="shrink-0">规格:</span>
                <span className="truncate font-medium text-foreground">{file.specification}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0">上传时间:</span>
              <span className="truncate">{formattedCreatedAt}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0">修改时间:</span>
              <span className="truncate">{formattedUpdatedAt}</span>
            </div>
          </div>

          <div className="flex gap-1 pt-1 lg:pt-1.5">
            {isAdmin && onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs min-w-0"
                onClick={() => onEdit(file)}
              >
                <Edit className="h-3 w-3 shrink-0" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs min-w-0"
              onClick={() => window.open(file.image_url, '_blank')}
            >
              <FileText className="h-3 w-3 mr-1 shrink-0" />
              <span className="truncate">查看图片</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1 text-xs min-w-0"
              onClick={() => window.open(file.source_file_url, '_blank')}
            >
              <Download className="h-3 w-3 mr-1 shrink-0" />
              <span className="truncate">下载源文件</span>
            </Button>
            {isAdmin && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                className="text-xs min-w-0"
                onClick={() => onDelete(file.id)}
              >
                <Trash2 className="h-3 w-3 shrink-0" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 使用React.memo优化性能
export default React.memo(FileCard);