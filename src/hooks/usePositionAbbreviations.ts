
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PositionAbbreviation {
  id: string;
  positionName: string;
  abbreviation: string;
  positionGroup: 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  displayOrder: number;
}

export const usePositionAbbreviations = (gameFormat: string) => {
  const [positions, setPositions] = useState<PositionAbbreviation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPositions = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('position_abbreviations')
          .select('*')
          .eq('game_format', gameFormat)
          .order('display_order');

        if (error) throw error;

        const formattedPositions: PositionAbbreviation[] = data?.map(pos => ({
          id: pos.id,
          positionName: pos.position_name,
          abbreviation: pos.abbreviation,
          positionGroup: pos.position_group as 'goalkeeper' | 'defender' | 'midfielder' | 'forward',
          displayOrder: pos.display_order
        })) || [];

        setPositions(formattedPositions);
      } catch (error) {
        console.error('Error loading position abbreviations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (gameFormat) {
      loadPositions();
    }
  }, [gameFormat]);

  return { positions, loading };
};
