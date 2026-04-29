-- 添加缺失的RLS策略

-- 1. admin_config 表的RLS策略
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取admin_config（用于检查密码是否设置）
CREATE POLICY "允许读取管理员配置" ON admin_config FOR SELECT TO anon, authenticated USING (true);

-- 允许所有人更新admin_config（用于设置密码）
CREATE POLICY "允许更新管理员配置" ON admin_config FOR UPDATE TO anon, authenticated USING (true);

-- 2. categories 表的更新策略
CREATE POLICY "公开更新分类" ON categories FOR UPDATE TO anon, authenticated USING (true);

-- 3. files 表的完整策略
CREATE POLICY "公开删除文件" ON files FOR DELETE TO anon, authenticated USING (true);

-- 确保files表有更新策略（如果还没有）
CREATE POLICY "公开更新文件" ON files FOR UPDATE TO anon, authenticated USING (true);
