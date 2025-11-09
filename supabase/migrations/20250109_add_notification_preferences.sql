/**
* Add Notification Preferences to Profiles
* Adds notification_preferences column for user settings
*/

-- Add notification_preferences column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
"email": {
"newLeads": true,
"newConversations": true,
"dailySummary": false,
"weeklySummary": true
},
"inApp": {
"enabled": true
}
}'::jsonb;

-- Add comment
COMMENT ON COLUMN public.profiles.notification_preferences IS 'User notification preferences for email and in-app notifications';
