# 技术组数据库 - Vercel部署完整指南

## 🚀 快速开始（5分钟部署）

### 第一步：准备代码仓库

#### 1.1 确保文件结构正确

您的项目应该包含这些文件：

```
技术组数据库/
├── src/
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── CategoryBrowsePage.tsx
│   │   ├── FileUploadPage.tsx
│   │   └── CategoryManagementPage.tsx
│   └── ...
├── supabase/
│   └── migrations/
│       └── ... (所有SQL迁移文件)
├── .env.example          ✅ 已准备
├── .gitignore            ✅ 已配置
├── vercel.json           ✅ 已创建
├── package.json          ✅ 已修复
└── vite.config.ts
```

#### 1.2 初始化Git仓库（如果还没有）

```bash
# 检查是否已经是git仓库
git status

# 如果不是，初始化
git init
git add .
git commit -m "Initial commit: 技术组数据库"
```

#### 1.3 推送到GitHub/GitLab

**创建GitHub仓库：**
1. 访问 https://github.com/new
2. 填写仓库名称（例如：tech-database）
3. 选择 Public 或 Private
4. 点击 "Create repository"

**推送代码：**
```bash
# 关联远程仓库（替换为您的仓库地址）
git remote add origin https://github.com/您的用户名/tech-database.git

# 推送代码
git branch -M main
git push -u origin main
```

---

### 第二步：部署到Vercel

#### 2.1 登录Vercel

1. 访问 https://vercel.com
2. 使用GitHub账号登录（推荐）

#### 2.2 导入项目

1. 点击控制台右上角的 "Add New..." → "Project"
2. 找到您刚刚推送的仓库，点击 "Import"

#### 2.3 配置项目（重要！）

在项目配置页面：

**1. Framework Preset**
- 应该自动检测到 "Vite"
- 如果没有，手动选择 "Vite"

**2. Root Directory**
- 保持默认：`./`

**3. Build and Output Settings**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- 这些应该会自动填充，无需修改

**4. Environment Variables（最重要！）**

点击 "Environment Variables" 展开，添加以下变量：

```
VITE_SUPABASE_URL = https://您的项目.supabase.co
VITE_SUPABASE_ANON_KEY = 您的anon_key
```

**如何获取这些值：**
1. 访问 https://supabase.com/dashboard
2. 选择您的项目
3. 进入 Settings → API
4. 复制：
   - Project URL → 填入 `VITE_SUPABASE_URL`
   - `anon public` → 填入 `VITE_SUPABASE_ANON_KEY`

#### 2.4 点击部署！

点击 "Deploy" 按钮，等待1-2分钟！

---

### 第三步：配置Supabase（部署后必须做！）

#### 3.1 添加域名到Supabase白名单

部署成功后，您会获得一个Vercel域名，例如：
`https://tech-database.vercel.app`

**配置Supabase CORS：**
1. 访问 Supabase Dashboard → Authentication → URL Configuration
2. 在 "Site URL" 和 "Additional Redirect URLs" 中添加您的Vercel域名
3. 保存设置

#### 3.2 测试应用

访问您的Vercel网址，测试以下功能：
- ✅ 查看首页
- ✅ 上传文件
- ✅ 浏览分类
- ✅ 删除文件

---

## 🎯 详细步骤（图文版）

### 完整流程图

```
1. 创建GitHub仓库
   ↓
2. 推送代码
   ↓
3. Vercel导入项目
   ↓
4. 配置环境变量
   ↓
5. 点击Deploy
   ↓
6. 配置Supabase CORS
   ↓
7. 完成！🎉
```

### 常见问题解决

#### Q: 部署成功但页面空白？

**A:** 检查浏览器控制台，通常是以下原因：
1. 环境变量配置错误
2. Supabase项目未正确设置
3. 数据库表未创建

**解决方法：**
1. 检查Vercel项目设置中的Environment Variables
2. 确保值没有多余的空格
3. 重新部署

#### Q: 无法上传文件？

**A:** 检查：
1. Supabase存储桶是否已创建
2. 存储策略是否允许上传
3. 文件大小是否超限

#### Q: 数据库表不存在？

**A:** 在Supabase SQL编辑器中执行所有迁移文件：
1. `supabase/migrations/00001_create_categories_and_files_tables.sql`
2. `supabase/migrations/00002_create_storage_buckets.sql`
3. `supabase/migrations/00003_update_to_infinite_categories.sql`
4. `supabase/migrations/00004_add_specification_column.sql`

---

## 🔒 安全最佳实践

### 1. 永远不要提交 .env 文件

确保 `.gitignore` 包含：
```
.env
.env.local
.env.*.local
```

### 2. 使用独立的Supabase项目

为生产环境创建单独的Supabase项目，不要与开发环境混用。

### 3. 配置RLS策略

确保Supabase的行级安全策略已正确配置，防止未授权访问。

### 4. 定期轮换密钥

定期更新Supabase的anon key。

---

## 📱 自定义域名（可选）

### 如何添加自定义域名

1. 在Vercel项目设置 → Domains
2. 添加您的域名（例如：`files.yourcompany.com`）
3. 按照提示配置DNS解析
4. 等待SSL证书颁发

---

## 🎉 部署成功后

### 分享给团队

1. 复制Vercel提供的URL
2. 分享给团队成员
3. 每个人都可以立即使用！

### 监控和日志

- Vercel Dashboard → 查看部署历史
- Supabase Dashboard → 查看数据库和存储日志
- 浏览器开发者工具 → 查看错误信息

---

## 💡 提示

### 1. 快速重新部署

每次推送代码到GitHub的 `main` 分支，Vercel会自动重新部署！

### 2. 预览部署

创建新分支并推送，Vercel会自动创建预览链接，方便测试新功能。

### 3. 团队协作

- 在Vercel项目设置中添加团队成员
- 多人可以同时协作开发

---

## 🆘 需要帮助？

如果遇到问题：

1. 查看Vercel部署日志
2. 查看浏览器控制台错误
3. 检查Supabase项目日志
4. 查看本项目的 `部署指南.md` 了解更多部署选项

祝部署顺利！🚀
