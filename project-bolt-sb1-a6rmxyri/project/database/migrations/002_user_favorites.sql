-- User favorites migration
-- Add user_favorites table for tracking liked videos

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID REFERENCES video_assets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id) -- Prevent duplicate favorites
);

-- Enable RLS for favorites
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Favorites policies
CREATE POLICY "Users can view their own favorites" ON user_favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own favorites" ON user_favorites
    FOR ALL USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_video_id ON user_favorites(video_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at);

-- Add function to check if video is favorited by user
CREATE OR REPLACE FUNCTION is_video_favorited(user_uuid UUID, video_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    favorite_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM user_favorites
        WHERE user_id = user_uuid AND video_id = video_uuid
    ) INTO favorite_exists;
    
    RETURN favorite_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to toggle favorite status
CREATE OR REPLACE FUNCTION toggle_video_favorite(user_uuid UUID, video_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    favorite_exists BOOLEAN;
    result JSONB;
BEGIN
    -- Check if favorite already exists
    SELECT EXISTS(
        SELECT 1 FROM user_favorites
        WHERE user_id = user_uuid AND video_id = video_uuid
    ) INTO favorite_exists;
    
    IF favorite_exists THEN
        -- Remove from favorites
        DELETE FROM user_favorites
        WHERE user_id = user_uuid AND video_id = video_uuid;
        
        result := jsonb_build_object(
            'success', true,
            'action', 'removed',
            'is_favorited', false
        );
    ELSE
        -- Add to favorites
        INSERT INTO user_favorites (user_id, video_id)
        VALUES (user_uuid, video_uuid);
        
        result := jsonb_build_object(
            'success', true,
            'action', 'added',
            'is_favorited', true
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON user_favorites TO anon, authenticated;