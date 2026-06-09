import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DrillTagPill } from './DrillTagPill';
import type { DrillWithRelations } from './types';

interface DrillDetailModalProps {
  drill: DrillWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/55">{title}</h3>
      <div className="text-sm text-white/85">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-1">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export function DrillDetailModal({ drill, open, onOpenChange }: DrillDetailModalProps) {
  const media = drill?.drill_media?.[0];

  const { data: videoUrl, isLoading: videoLoading, isError: videoError } = useQuery({
    queryKey: ['drill-video-url', drill?.id, media?.file_url],
    enabled: open && !!media?.file_url,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('drill-video-url', {
        body: { file_path: media!.file_url },
      });
      if (error) throw error;
      return (data as { url: string }).url;
    },
  });

  if (!drill) return null;

  const hasArr = (a: string[] | null | undefined) => Array.isArray(a) && a.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{drill.name}</DialogTitle>
          {drill.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {drill.tags.map((t) => (
                <DrillTagPill key={t.id} name={t.name} color={t.color} />
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {media && !videoError && (
            <div className="rounded-lg overflow-hidden bg-black/40 aspect-video flex items-center justify-center">
              {videoLoading || !videoUrl ? (
                <LoadingSpinner size="md" message="Loading video..." />
              ) : (
                <video src={videoUrl} controls className="w-full h-full" />
              )}
            </div>
          )}

          {drill.description && <Section title="Description">{drill.description}</Section>}
          {drill.practice_design && (
            <Section title="Practice Design">
              <p className="whitespace-pre-wrap">{drill.practice_design}</p>
            </Section>
          )}
          {drill.how_to_play && (
            <Section title="How to Play">
              <p className="whitespace-pre-wrap">{drill.how_to_play}</p>
            </Section>
          )}
          {hasArr(drill.coach_tips) && (
            <Section title="Coach Tips"><BulletList items={drill.coach_tips!} /></Section>
          )}
          {hasArr(drill.player_tips) && (
            <Section title="Player Tips"><BulletList items={drill.player_tips!} /></Section>
          )}
          {hasArr(drill.variations) && (
            <Section title="Variations"><BulletList items={drill.variations!} /></Section>
          )}
          {hasArr(drill.equipment) && (
            <Section title="Equipment"><BulletList items={drill.equipment!} /></Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
