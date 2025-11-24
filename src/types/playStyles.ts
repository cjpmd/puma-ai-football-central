import { supabase } from '@/integrations/supabase/client';

export interface PlayStyle {
  id?: string;
  value: string;
  label: string;
  icon_emoji?: string;
  icon_image_url?: string;
  icon_type: 'emoji' | 'image';
  category: 'attacker' | 'midfielder' | 'defender' | 'goalkeeper';
  is_active?: boolean;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
}

// Legacy support - convert old icon format
export const getIconDisplay = (style: PlayStyle): string => {
  if (style.icon_type === 'image' && style.icon_image_url) {
    return style.icon_image_url;
  }
  return style.icon_emoji || '⚽';
};

// Service methods for play styles
export const playStylesService = {
  // Get all active play styles from database
  getAllPlayStyles: async (): Promise<PlayStyle[]> => {
    const { data, error } = await supabase
      .from('play_styles')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('label', { ascending: true });

    if (error) {
      console.error('Error fetching play styles:', error);
      return [];
    }

    return (data || []) as PlayStyle[];
  },

  // Get play styles by category
  getPlayStylesByCategory: async (category: PlayStyle['category']): Promise<PlayStyle[]> => {
    const { data, error } = await supabase
      .from('play_styles')
      .select('*')
      .eq('is_active', true)
      .eq('category', category)
      .order('label', { ascending: true });

    if (error) {
      console.error('Error fetching play styles:', error);
      return [];
    }

    return (data || []) as PlayStyle[];
  },

  // Admin-only: Create new play style
  createPlayStyle: async (playStyle: Omit<PlayStyle, 'id' | 'created_at' | 'updated_at'>): Promise<PlayStyle | null> => {
    const { data, error } = await supabase
      .from('play_styles')
      .insert({
        value: playStyle.value,
        label: playStyle.label,
        icon_emoji: playStyle.icon_emoji,
        icon_image_url: playStyle.icon_image_url,
        icon_type: playStyle.icon_type,
        category: playStyle.category,
        is_active: playStyle.is_active ?? true,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        updated_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating play style:', error);
      return null;
    }

    return data as unknown as PlayStyle;
  },

  // Admin-only: Update existing play style
  updatePlayStyle: async (id: string, updates: Partial<PlayStyle>): Promise<PlayStyle | null> => {
    const { data, error } = await supabase
      .from('play_styles')
      .update({
        ...updates,
        updated_by: (await supabase.auth.getUser()).data.user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating play style:', error);
      return null;
    }

    return data as unknown as PlayStyle;
  },

  // Admin-only: Delete (soft delete) play style
  deletePlayStyle: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('play_styles')
      .update({ 
        is_active: false,
        updated_by: (await supabase.auth.getUser()).data.user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error deleting play style:', error);
      return false;
    }

    return true;
  },

  // Admin-only: Upload play style image
  uploadPlayStyleImage: async (file: File, styleValue: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${styleValue}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from('play-style-icons')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('play-style-icons')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  // Admin-only: Delete play style image
  deletePlayStyleImage: async (styleValue: string): Promise<boolean> => {
    const { data: files } = await supabase.storage
      .from('play-style-icons')
      .list();

    const matchingFile = files?.find(f => f.name.startsWith(styleValue));
    
    if (!matchingFile) return true;

    const { error } = await supabase.storage
      .from('play-style-icons')
      .remove([matchingFile.name]);

    if (error) {
      console.error('Error deleting image:', error);
      return false;
    }

    return true;
  },
};
