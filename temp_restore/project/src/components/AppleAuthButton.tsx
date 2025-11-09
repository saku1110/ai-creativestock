import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface AppleAuthButtonProps {
  onSuccess: (userData: any) => void;
  onError?: (error: string) => void;
  className?: string;
  children: React.ReactNode;
}

const AppleAuthButton: React.FC<AppleAuthButtonProps> = ({ 
  onSuccess, 
  onError, 
  className = "",
  children 
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAppleAuth = async () => {
    setIsLoading(true);
    
    try {
      // 実際のプロジェクトでは、Apple Sign-In APIを使用
      // ここではデモ用の処理
      
      // Apple認証のシミュレーション
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      // 成功時のユーザーデータ（実際はAppleから取得）
      const userData = {
        id: 'apple_987654321',
        name: '山田花子',
        email: 'yamada@privaterelay.appleid.com',
        picture: null, // Appleは通常プロフィール画像を提供しない
        given_name: '花子',
        family_name: '山田',
        locale: 'ja'
      };
      
      onSuccess(userData);
    } catch (error) {
      const errorMessage = 'Apple IDでのログインに失敗しました。もう一度お試しください。';
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
      onClick={handleAppleAuth}
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

export default AppleAuthButton;