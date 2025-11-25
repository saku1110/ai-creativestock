-- AI Creative Stock Database Schema
-- Created for Supabase PostgreSQL

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE subscription_plan AS ENUM ('standard', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'unpaid');
CREATE TYPE video_category AS ENUM ('beauty', 'fitness', 'haircare', 'business', 'lifestyle');
CREATE TYPE beauty_sub_category AS ENUM ('skincare', 'haircare', 'oralcare');
CREATE TYPE license_type AS ENUM ('standard', 'extended', 'commercial');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan subscription_plan NOT NULL,
  status subscription_status NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  monthly_download_limit INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video assets table
CREATE TABLE IF NOT EXISTS video_assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category video_category NOT NULL,
  beauty_sub_category beauty_sub_category,
  tags TEXT[] DEFAULT '{}',
  duration INTEGER NOT NULL, -- in seconds
  resolution TEXT NOT NULL DEFAULT '1080p',
  file_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  file_size INTEGER, -- in bytes
  license license_type DEFAULT 'standard',
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Download history table
CREATE TABLE IF NOT EXISTS download_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID REFERENCES video_assets(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Payment history table
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'jpy',
  status TEXT NOT NULL,
  plan subscription_plan,
  billing_period TEXT, -- 'monthly' or 'yearly'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Checkout sessions table (for tracking)
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  price_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  billing_cycle TEXT DEFAULT 'monthly', -- 'monthly' or 'yearly'
  plan_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES admin_users(id),
  UNIQUE(user_id)
);

-- Audit log table for security events
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT
);

-- Session management table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  csrf_token TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  identifier TEXT NOT NULL, -- user_id, IP address, or other identifier
  action_type TEXT NOT NULL, -- 'api', 'upload', 'login', etc.
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(identifier, action_type, window_start)
);

-- Enable RLS for all security tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Admin users policies
CREATE POLICY "Admin users are only viewable by authenticated users" ON admin_users
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only active admins can manage admin users" ON admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      JOIN profiles p ON au.user_id = p.id 
      WHERE p.id = auth.uid() AND au.is_active = TRUE
    )
  );

-- Audit logs policies
CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      JOIN profiles p ON au.user_id = p.id 
      WHERE p.id = auth.uid() AND au.is_active = TRUE
    )
  );

CREATE POLICY "Users can view their own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- User sessions policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions" ON user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Rate limits policies (restrictive)
CREATE POLICY "Only system can manage rate limits" ON rate_limits
  FOR ALL USING (false); -- This will be managed by server-side code only

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_category ON video_assets(category);
CREATE INDEX IF NOT EXISTS idx_video_assets_is_featured ON video_assets(is_featured);
CREATE INDEX IF NOT EXISTS idx_video_assets_is_active ON video_assets(is_active);
CREATE INDEX IF NOT EXISTS idx_download_history_user_id ON download_history(user_id);
CREATE INDEX IF NOT EXISTS idx_download_history_video_id ON download_history(video_id);
CREATE INDEX IF NOT EXISTS idx_download_history_downloaded_at ON download_history(downloaded_at);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);

-- Security-related indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_action_type ON rate_limits(action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_end ON rate_limits(window_end);

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_assets_updated_at BEFORE UPDATE ON video_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Download history policies
CREATE POLICY "Users can view their own download history" ON download_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own download history" ON download_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payment history policies
CREATE POLICY "Users can view their own payment history" ON payment_history
    FOR SELECT USING (auth.uid() = user_id);

-- Video assets policies (public read)
CREATE POLICY "Anyone can view active video assets" ON video_assets
    FOR SELECT USING (is_active = TRUE);

-- Functions for business logic
CREATE OR REPLACE FUNCTION get_user_monthly_downloads(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    download_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO download_count
    FROM download_history
    WHERE user_id = user_uuid
    AND downloaded_at >= DATE_TRUNC('month', NOW());
    
    RETURN COALESCE(download_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_user_download(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_subscription RECORD;
    monthly_downloads INTEGER;
BEGIN
    -- Get user's subscription
    SELECT * INTO user_subscription
    FROM subscriptions
    WHERE user_id = user_uuid
    AND status = 'active'
    AND current_period_end > NOW();
    
    -- If no active subscription, return false
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Get monthly download count
    SELECT get_user_monthly_downloads(user_uuid) INTO monthly_downloads;
    
    -- Check if user has remaining downloads
    RETURN monthly_downloads < user_subscription.monthly_download_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ダウンロード数をインクリメントする関数
CREATE OR REPLACE FUNCTION increment_download_count(video_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE video_assets
  SET download_count = download_count + 1
  WHERE id = video_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 認証済みユーザーに実行権限を付与
GRANT EXECUTE ON FUNCTION increment_download_count(UUID) TO authenticated;

-- Security functions
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_severity TEXT DEFAULT 'medium',
    p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, details,
        ip_address, user_agent, severity, session_id
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id, p_details,
        p_ip_address, p_user_agent, p_severity, p_session_id
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate limiting function
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier TEXT,
    p_action_type TEXT,
    p_window_minutes INTEGER DEFAULT 15,
    p_max_requests INTEGER DEFAULT 100
)
RETURNS JSONB AS $$
DECLARE
    window_start TIMESTAMP WITH TIME ZONE;
    window_end TIMESTAMP WITH TIME ZONE;
    current_count INTEGER;
    rate_limit_record RECORD;
    result JSONB;
BEGIN
    window_start := DATE_TRUNC('minute', NOW()) - INTERVAL '1 minute' * (EXTRACT(MINUTE FROM NOW())::INTEGER % p_window_minutes);
    window_end := window_start + INTERVAL '1 minute' * p_window_minutes;
    
    -- Get current rate limit record
    SELECT * INTO rate_limit_record
    FROM rate_limits
    WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND window_start <= NOW()
    AND window_end > NOW()
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF rate_limit_record IS NOT NULL THEN
        -- Check if blocked
        IF rate_limit_record.blocked_until IS NOT NULL AND rate_limit_record.blocked_until > NOW() THEN
            result := jsonb_build_object(
                'allowed', false,
                'remaining', 0,
                'reset_time', EXTRACT(EPOCH FROM rate_limit_record.blocked_until),
                'blocked_until', EXTRACT(EPOCH FROM rate_limit_record.blocked_until)
            );
            RETURN result;
        END IF;
        
        current_count := rate_limit_record.request_count + 1;
        
        -- Update existing record
        UPDATE rate_limits
        SET request_count = current_count,
            blocked_until = CASE 
                WHEN current_count > p_max_requests THEN NOW() + INTERVAL '1 hour'
                ELSE NULL
            END
        WHERE id = rate_limit_record.id;
    ELSE
        current_count := 1;
        
        -- Create new record
        INSERT INTO rate_limits (identifier, action_type, request_count, window_start, window_end)
        VALUES (p_identifier, p_action_type, current_count, window_start, window_end);
    END IF;
    
    result := jsonb_build_object(
        'allowed', current_count <= p_max_requests,
        'remaining', GREATEST(0, p_max_requests - current_count),
        'reset_time', EXTRACT(EPOCH FROM window_end),
        'current_count', current_count
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin functions
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    admin_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM admin_users
        WHERE user_id = user_uuid AND is_active = TRUE
    ) INTO admin_exists;
    
    RETURN admin_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Session management functions
CREATE OR REPLACE FUNCTION create_user_session(
    p_user_id UUID,
    p_session_token TEXT,
    p_csrf_token TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_expires_in_hours INTEGER DEFAULT 24
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN
    -- Deactivate old sessions for the user
    UPDATE user_sessions
    SET is_active = FALSE
    WHERE user_id = p_user_id AND is_active = TRUE;
    
    -- Create new session
    INSERT INTO user_sessions (
        user_id, session_token, csrf_token, ip_address, user_agent,
        expires_at
    ) VALUES (
        p_user_id, p_session_token, p_csrf_token, p_ip_address, p_user_agent,
        NOW() + INTERVAL '1 hour' * p_expires_in_hours
    ) RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up expired sessions and rate limits
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS VOID AS $$
BEGIN
    -- Clean up expired sessions
    DELETE FROM user_sessions
    WHERE expires_at < NOW() - INTERVAL '1 day';
    
    -- Clean up old rate limit records
    DELETE FROM rate_limits
    WHERE window_end < NOW() - INTERVAL '1 day';
    
    -- Clean up old audit logs (keep last 90 days)
    DELETE FROM audit_logs
    WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample data for development
INSERT INTO video_assets (title, description, category, tags, duration, resolution, file_url, thumbnail_url, file_size, is_featured) VALUES
('美容クリーム広告', '高級美容クリームの魅力的な広告動画', 'beauty', '{"美容", "クリーム", "スキンケア"}', 10, '1080p', 'https://example.com/video1.mp4', 'https://example.com/thumb1.jpg', 5242880, TRUE),
('フィットネスジム紹介', '最新フィットネスジムの設備紹介動画', 'fitness', '{"フィットネス", "ジム", "運動"}', 12, '1080p', 'https://example.com/video2.mp4', 'https://example.com/thumb2.jpg', 6291456, FALSE),
('ヘアケア商品', '髪の健康を保つヘアケア商品の紹介', 'haircare', '{"ヘアケア", "シャンプー", "トリートメント"}', 8, '1080p', 'https://example.com/video3.mp4', 'https://example.com/thumb3.jpg', 4194304, FALSE),
('ビジネスコンサル', 'プロフェッショナルなビジネスコンサルティング', 'business', '{"ビジネス", "コンサル", "成長"}', 15, '1080p', 'https://example.com/video4.mp4', 'https://example.com/thumb4.jpg', 7340032, TRUE),
('ライフスタイル提案', '豊かなライフスタイルの提案動画', 'lifestyle', '{"ライフスタイル", "豊かさ", "幸せ"}', 11, '1080p', 'https://example.com/video5.mp4', 'https://example.com/thumb5.jpg', 5767168, FALSE);

-- Grant necessary permissions (セキュリティ強化: 最小権限原則)
-- Supabaseのanon（匿名）ユーザーには最小限の権限のみ付与
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 匿名ユーザーには読み取り専用アクセスのみ（video_assetsのみ）
GRANT SELECT ON video_assets TO anon;

-- 認証済みユーザーには必要な操作のみ許可
-- プロフィール管理
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
-- サブスクリプション情報（読み取りのみ）
GRANT SELECT ON subscriptions TO authenticated;
-- 動画アセット（読み取りのみ）
GRANT SELECT ON video_assets TO authenticated;
-- ダウンロード履歴（挿入・読み取りのみ）
GRANT SELECT, INSERT ON download_history TO authenticated;
-- 決済履歴（読み取りのみ）
GRANT SELECT ON payment_history TO authenticated;
-- チェックアウトセッション（挿入・読み取りのみ）
GRANT SELECT, INSERT ON checkout_sessions TO authenticated;

-- シーケンスの使用権限
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 関数の実行権限（認証済みユーザーのみ）
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
