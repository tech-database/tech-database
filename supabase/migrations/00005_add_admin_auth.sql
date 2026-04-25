
-- 创建管理员密码表
CREATE TABLE IF NOT EXISTS admin_config (
    id SERIAL PRIMARY KEY,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 插入初始空密码记录（用特殊标记表示未设置）
INSERT INTO admin_config (password_hash) VALUES ('NOT_SET') 
ON CONFLICT DO NOTHING;
