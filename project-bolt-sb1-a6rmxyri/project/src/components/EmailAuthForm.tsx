import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';

interface EmailAuthFormProps {
  onSuccess: (userData: any) => void;
  onError?: (error: string) => void;
}

const EmailAuthForm: React.FC<EmailAuthFormProps> = ({ onSuccess, onError }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    // メールアドレスの検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!emailRegex.test(email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    // パスワードの検証
    if (!password) {
      newErrors.password = 'パスワードを入力してください';
    } else if (password.length < 8) {
      newErrors.password = 'パスワードは8文字以上で入力してください';
    }

    // 新規登録時の追加検証
    if (!isLogin) {
      if (!name) {
        newErrors.name = '名前を入力してください';
      }
      if (!confirmPassword) {
        newErrors.confirmPassword = 'パスワード確認を入力してください';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'パスワードが一致しません';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // 実際のプロジェクトでは、サーバーAPIを呼び出し
      // ここではデモ用の処理
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 成功時のユーザーデータ
      const userData = {
        id: `email_${Date.now()}`,
        name: isLogin ? '佐藤太郎' : name,
        email: email,
        picture: null,
        given_name: isLogin ? '太郎' : name.split(' ')[1] || name,
        family_name: isLogin ? '佐藤' : name.split(' ')[0] || '',
        locale: 'ja'
      };
      
      onSuccess(userData);
    } catch (error) {
      const errorMessage = isLogin 
        ? 'ログインに失敗しました。メールアドレスとパスワードを確認してください。'
        : 'アカウント作成に失敗しました。もう一度お試しください。';
      
      if (onError) {
        onError(errorMessage);
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* タブ切り替え */}
      <div className="flex mb-6">
        <button
          onClick={() => setIsLogin(true)}
          className={`flex-1 py-3 px-4 text-center font-bold transition-all rounded-l-xl ${
            isLogin 
              ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white' 
              : 'glass-effect text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          ログイン
        </button>
        <button
          onClick={() => setIsLogin(false)}
          className={`flex-1 py-3 px-4 text-center font-bold transition-all rounded-r-xl ${
            !isLogin 
              ? 'bg-gradient-to-r from-cyan-400 to-blue-600 text-white' 
              : 'glass-effect text-gray-400 hover:text-white border border-white/10'
          }`}
        >
          新規登録
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 名前（新規登録時のみ） */}
        {!isLogin && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              お名前
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full pl-4 pr-4 py-3 glass-effect rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400 border ${
                  errors.name ? 'border-red-400' : 'border-white/10'
                }`}
                placeholder="山田太郎"
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-sm text-red-400">{errors.name}</p>
            )}
          </div>
        )}

        {/* メールアドレス */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            メールアドレス
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full pl-12 pr-4 py-3 glass-effect rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400 border ${
                errors.email ? 'border-red-400' : 'border-white/10'
              }`}
              placeholder="example@gmail.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-400">{errors.email}</p>
          )}
        </div>

        {/* パスワード */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            パスワード
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full pl-12 pr-12 py-3 glass-effect rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400 border ${
                errors.password ? 'border-red-400' : 'border-white/10'
              }`}
              placeholder="8文字以上のパスワード"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-400">{errors.password}</p>
          )}
        </div>

        {/* パスワード確認（新規登録時のみ） */}
        {!isLogin && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              パスワード確認
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full pl-12 pr-12 py-3 glass-effect rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400 border ${
                  errors.confirmPassword ? 'border-red-400' : 'border-white/10'
                }`}
                placeholder="パスワードを再入力"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
            )}
          </div>
        )}

        {/* ログイン時のパスワードリセット */}
        {isLogin && (
          <div className="text-right">
            <button
              type="button"
              className="text-sm text-cyan-400 hover:text-white transition-colors"
            >
              パスワードを忘れた方
            </button>
          </div>
        )}

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-4 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2 ${
            isLoading 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'cyber-button text-white hover:shadow-cyan-500/25'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isLogin ? 'ログイン中...' : 'アカウント作成中...'}</span>
            </>
          ) : (
            <>
              {isLogin ? (
                <>
                  <Mail className="w-5 h-5" />
                  <span>メールアドレスでログイン</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>アカウントを作成</span>
                </>
              )}
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default EmailAuthForm;