import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAdmin } from '../contexts/AdminContext';
import { toast } from 'sonner';

export const AdminPasswordDialog: React.FC = () => {
  const { showPasswordDialog, setShowPasswordDialog, isPasswordSet, login, setPassword } = useAdmin();
  const [password, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!isPasswordSet) {
        // 设置密码模式
        if (password.length < 4) {
          toast.error('密码至少需要4位');
          return;
        }
        if (password !== confirmPassword) {
          toast.error('两次输入的密码不一致');
          return;
        }
        console.log('开始设置密码...');
        const success = await setPassword(password);
        console.log('密码设置结果:', success);
        if (success) {
          toast.success('密码设置成功！已进入管理员模式');
          setShowPasswordDialog(false);
          setPasswordInput('');
          setConfirmPassword('');
        } else {
          toast.error('密码设置失败，请检查数据库设置');
        }
      } else {
        // 登录模式
        console.log('开始验证密码...');
        const success = await login(password);
        console.log('密码验证结果:', success);
        if (success) {
          toast.success('登录成功！已进入管理员模式');
          setShowPasswordDialog(false);
          setPasswordInput('');
        } else {
          toast.error('密码错误，请重试');
        }
      }
    } catch (err) {
      console.error('操作异常:', err);
      toast.error('操作失败，请检查控制台');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isPasswordSet ? '管理员登录' : '设置管理员密码'}
          </DialogTitle>
          <DialogDescription>
            {isPasswordSet 
              ? '输入密码以激活管理员模式' 
              : '这是第一次设置，设置后需要密码才能进入管理员模式'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder={isPasswordSet ? '请输入密码' : '请设置密码'}
                autoFocus
              />
            </div>
            {!isPasswordSet && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setShowPasswordDialog(false);
              setPasswordInput('');
              setConfirmPassword('');
            }}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '处理中...' : (isPasswordSet ? '登录' : '设置密码')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};