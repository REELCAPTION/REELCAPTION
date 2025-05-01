import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const logActivity = async (userId: string, toolId: string, content?: string) => {
  const supabase = createClientComponentClient();
  
  await supabase
    .from('user_activities')
    .insert({
      user_id: userId,
      tool_id: toolId,
      tool_name: toolId.replace('-', ' '), // 'tweet-gen' → 'tweet gen'
      content: content
    });
};