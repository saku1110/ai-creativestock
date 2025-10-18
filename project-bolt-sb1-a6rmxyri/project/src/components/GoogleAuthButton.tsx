import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { auth } from '../lib/supabase';

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
      // Supabaseを使用したGoogle認証
      const { data, error } = await auth.signInWithGoogle();
      
      if (error) {
        throw error;
      }
      
      // 認証成功後、ユーザー情報を取得
      const { user } = await auth.getCurrentUser();
      
      if (user) {
        const userData = {
          id: user.id,
          name: user.user_metadata?.full_name || user.user_metadata?.name || 'Google ユーザー',
          email: user.email || '',
          picture: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          given_name: user.user_metadata?.given_name || '',
          family_name: user.user_metadata?.family_name || '',
          locale: user.user_metadata?.locale || 'ja'
        };
        
        onSuccess(userData);
      } else {
        throw new Error('ユーザー情報の取得に失敗しました');
      }
    } catch (error) {
      console.error('Google認証エラー:', error);
      
      let errorMessage = 'Googleログインに失敗しました。';
      
      if (error instanceof Error) {
        // よくあるエラーメッセージを日本語に変換
        if (error.message.includes('popup_closed_by_user')) {
          errorMessage = 'ログインがキャンセルされました。';
        } else if (error.message.includes('network')) {
          errorMessage = 'ネットワークエラーです。インターネット接続を確認してください。';
        } else if (error.message.includes('configuration')) {
          errorMessage = 'Google認証の設定に問題があります。管理者にお問い合わせください。';
        } else if (error.message.includes('Invalid provider')) {
          errorMessage = 'Google認証が有効になっていません。設定を確認してください。';
        } else {
          errorMessage = `Googleログインエラー: ${error.message}`;
        }
      }
      
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