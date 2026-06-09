import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Search, BookOpen } from 'lucide-react';
import { DrillCard } from './DrillCard';
import { DrillDetailModal } from './DrillDetailModal';
import { DrillTagPill } from './DrillTagPill';
import type { DrillWithRelations, DrillTag } from './types';

export function DrillLibraryBrowser() {
  const [search, setSearch] = useState('');
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  const [selectedDrill, setSelectedDrill] = useState<DrillWithRelations | null>(null);

  const { data: drills = [], isLoading } = useQuery({
    queryKey: ['drill-library-browser'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drills')
        .select(`
          id, name, description, practice_design, how_to_play,
          coach_tips, player_tips, variations, equipment,
          drill_tag_assignments(drill_tags(id, name, color)),
          drill_media(id, file_url, file_name, file_type)
        `)
        .order('name');
      if (error) throw error;
      return (data || []).map((d: any): DrillWithRelations => ({
        id: d.id,
        name: d.name,
        description: d.description,
        practice_design: d.practice_design,
        how_to_play: d.how_to_play,
        coach_tips: d.coach_tips,
        player_tips: d.player_tips,
        variations: d.variations,
        equipment: d.equipment,
        drill_media: d.drill_media || [],
        tags: (d.drill_tag_assignments || [])
          .map((a: any) => a.drill_tags)
          .filter(Boolean) as DrillTag[],
      }));
    },
  });

  const allTags = useMemo(() => {
    const map = new Map<string, DrillTag>();
    drills.forEach((d) => d.tags.forEach((t) => map.set(t.id, t)));
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [drills]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return drills.filter((d) => {
      if (activeTagIds.length > 0) {
        const drillTagIds = new Set(d.tags.map((t) => t.id));
        if (!activeTagIds.every((id) => drillTagIds.has(id))) return false;
      }
      if (q) {
        const hay = `${d.name} ${d.description ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [drills, search, activeTagIds]);

  const toggleTag = (id: string) =>
    setActiveTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/55" />
        <Input
          placeholder="Search drills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((t) => (
            <DrillTagPill
              key={t.id}
              name={t.name}
              color={t.color}
              active={activeTagIds.includes(t.id)}
              onClick={() => toggleTag(t.id)}
            />
          ))}
          {activeTagIds.length > 0 && (
            <button
              onClick={() => setActiveTagIds([])}
              className="text-xs text-white/60 hover:text-white px-2"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" message="Loading drills..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 mx-auto text-white/40 mb-3" />
          <h3 className="font-semibold text-white">No drills found</h3>
          <p className="text-sm text-white/60">
            {drills.length === 0
              ? 'No drills available yet.'
              : 'Try adjusting your search or tag filters.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((drill) => (
            <DrillCard key={drill.id} drill={drill} onClick={() => setSelectedDrill(drill)} />
          ))}
        </div>
      )}

      <DrillDetailModal
        drill={selectedDrill}
        open={!!selectedDrill}
        onOpenChange={(o) => !o && setSelectedDrill(null)}
      />
    </div>
  );
}
