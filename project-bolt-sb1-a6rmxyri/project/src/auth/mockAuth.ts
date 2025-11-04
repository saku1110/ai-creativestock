// モック認証関数（後でSupabase Authに置き換え予定）

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export const signInWithGoogle = async (): Promise<AuthResponse> => {
  try {
    // Google認証のシミュレーション
    console.log('Sign in with Google');
    
    // 2秒の遅延でリアルな認証体験をシミュレート
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 成功時のユーザーデータ
    const user: AuthUser = {
      id: 'google_123456789',
      email: 'user@gmail.com',
      name: '田中太郎',
      picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
    };
    
    return { success: true, user };
  } catch (error) {
    console.error('Google sign in error:', error);
    return { 
      success: false, 
      error: 'Googleログインに失敗しました。もう一度お試しください。' 
    };
  }
};

export const signInWithApple = async (): Promise<AuthResponse> => {
  try {
    // Apple認証のシミュレーション
    console.log('Sign in with Apple');
    
    // 2秒の遅延でリアルな認証体験をシミュレート
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 成功時のユーザーデータ
    const user: AuthUser = {
      id: 'apple_987654321',
      email: 'user@privaterelay.appleid.com',
      name: '山田花子',
      picture: undefined // Appleは通常プロフィール画像を提供しない
    };
    
    return { success: true, user };
  } catch (error) {
    console.error('Apple sign in error:', error);
    return { 
      success: false, 
      error: 'Apple IDでのログインに失敗しました。もう一度お試しください。' 
    };
  }
};

export const signOut = async (): Promise<void> => {
  console.log('Sign out');
  // 実際のSupabase実装では supabase.auth.signOut() を呼び出し
};