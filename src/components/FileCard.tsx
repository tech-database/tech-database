import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FileWithCategories } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface FileCardProps {
  file: FileWithCategories;
}

const FileCard: React.FC<FileCardProps> = ({ file }) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: zhCN });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="hover-transition hover:bg-muted overflow-hidden">
      <CardContent className="p-0">
        {/* 图片区域 */}
        <div className="relative aspect-video bg-muted">
          <img
            src={file.image_url}
            alt={file.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-muted"><svg class="h-16 w-16 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>`;
              }
            }}
          />
        </div>

        {/* 信息区域 */}
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-foreground line-clamp-1">{file.name}</h3>
          
          {/* 分类信息 */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 bg-secondary rounded">
              {file.category_level1?.name || '未分类'}
            </span>
            <span>/</span>
            <span className="px-2 py-1 bg-secondary rounded">
              {file.category_level2?.name || '未分类'}
            </span>
          </div>

          {/* 时间信息 */}
          <div className="space-y-1 text-xs text-muted-foreground font-mono-time">
            <div className="flex items-center justify-between">
              <span>上传时间:</span>
              <span>{formatDate(file.created_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>修改时间:</span>
              <span>{formatDate(file.updated_at)}</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(file.image_url, '_blank')}
            >
              <FileText className="h-4 w-4 mr-1" />
              查看图片
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => window.open(file.source_file_url, '_blank')}
            >
              <Download className="h-4 w-4 mr-1" />
              下载源文件
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileCard;
