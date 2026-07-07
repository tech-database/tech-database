import React, { useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Download, Edit, FileImage, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAdmin } from '@/contexts/AdminContext';
import type { FileWithCategories } from '@/types';

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

  const formattedCreatedAt = useMemo(() => formatDate(file.created_at), [file.created_at, formatDate]);
  const formattedUpdatedAt = useMemo(() => formatDate(file.updated_at), [file.updated_at, formatDate]);
  const categoryPath = file.categoryPath?.length ? file.categoryPath : ['未分类'];

  return (
    <Card className={`float-soft overflow-hidden ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
      <CardContent className="p-0">
        <div className="relative aspect-square w-full bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-4">
          {onSelect && (
            <button
              type="button"
              aria-label={isSelected ? '取消选择' : '选择文件'}
              className={`absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                isSelected ? 'bg-primary text-white' : 'bg-white/90 text-slate-500'
              }`}
              onClick={() => onSelect(file.id)}
            >
              {isSelected ? '✓' : ''}
            </button>
          )}

          {imageError ? (
            <div className="flex h-full w-full items-center justify-center rounded-[1.25rem] bg-white/70">
              <FileImage className="h-12 w-12 text-cyan-300" />
            </div>
          ) : (
            <img
              src={file.image_url}
              alt={file.name}
              className="h-full w-full object-contain"
              onError={() => setImageError(true)}
              loading="lazy"
              decoding="async"
            />
          )}
        </div>

        <div className="space-y-3 p-4">
          <div>
            <h3 className="line-clamp-1 text-sm font-bold text-slate-900">{file.name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {categoryPath.map((categoryName) => (
                <span key={categoryName} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                  {categoryName}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 rounded-[1rem] bg-white/65 p-3 text-xs text-slate-500">
            {file.specification && (
              <div className="flex items-center justify-between gap-2">
                <span>规格</span>
                <span className="truncate font-semibold text-slate-800">{file.specification}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span>上传时间</span>
              <span className="truncate">{formattedCreatedAt}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>修改时间</span>
              <span className="truncate">{formattedUpdatedAt}</span>
            </div>
          </div>

          <div className="flex gap-1.5">
            {isAdmin && onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(file)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(file.image_url, '_blank')}>
              <FileText className="h-3.5 w-3.5" />
              图片
            </Button>
            <Button size="sm" className="flex-1" onClick={() => window.open(file.source_file_url, '_blank')}>
              <Download className="h-3.5 w-3.5" />
              下载
            </Button>
            {isAdmin && onDelete && (
              <Button variant="destructive" size="sm" onClick={() => onDelete(file.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(FileCard);
