export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

// 一级分类
export interface CategoryLevel1 {
  id: string;
  name: string;
  created_at: string;
}

// 二级分类
export interface CategoryLevel2 {
  id: string;
  name: string;
  parent_id: string;
  created_at: string;
}

// 文件
export interface FileItem {
  id: string;
  name: string;
  image_url: string;
  source_file_url: string;
  category_level1_id: string;
  category_level2_id: string;
  created_at: string;
  updated_at: string;
}

// 带分类信息的文件
export interface FileWithCategories extends FileItem {
  category_level1?: CategoryLevel1;
  category_level2?: CategoryLevel2;
}
