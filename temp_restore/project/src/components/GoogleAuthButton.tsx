import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface GoogleAuthButtonProps {
  onSuccess: (userData: any) => void;
  onError?: (error: string) => void;
  className?: string;
  children: React.ReactNode;
}

const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ 
  onSuccess, 
  onError, 
  className = "",
  children 
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    
    try {
      // 実際のプロジェクトでは、Google OAuth 2.0 APIを使用
      // ここではデモ用の処理
      
      // Google認証のシミュレーション
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 成功時のユーザーデータ（実際はGoogleから取得）
      const userData = {
        id: 'google_123456789',
        name: '田中太郎',
        email: 'tanaka@gmail.com',
        picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        given_name: '太郎',
        family_name: '田中',
        locale: 'ja'
      };
      
      onSuccess(userData);
    } catch (error) {
      const errorMessage = 'Googleログインに失敗しました。もう一度お試しください。';
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
    <button
      onClick={handleGoogleAuth}
      disabled={isLoading}
      className={`${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>認証中...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default GoogleAuthButton;