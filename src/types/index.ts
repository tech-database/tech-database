export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

// 分类（支持无限层级）
export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  children?: Category[];
}

// 文件
export interface FileItem {
  id: string;
  name: string;
  image_url: string;
  source_file_url: string;
  category_id: string;
  specification?: string;
  created_at: string;
  updated_at: string;
}

// 带分类信息的文件
export interface FileWithCategories extends FileItem {
  category?: Category;
  categoryPath?: string[];
}
