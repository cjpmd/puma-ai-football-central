import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Video } from 'lucide-react';
import { DrillTagPill } from './DrillTagPill';
import type { DrillWithRelations } from './types';

interface DrillCardProps {
  drill: DrillWithRelations;
  onClick: () => void;
}

export function DrillCard({ drill, onClick }: DrillCardProps) {
  const equipmentCount = drill.equipment?.length ?? 0;
  const hasVideo = (drill.drill_media?.length ?? 0) > 0;

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:bg-white/[0.09] transition-colors"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{drill.name}</CardTitle>
        {drill.description && (
          <p className="text-sm text-white/70 line-clamp-2">{drill.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {drill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {drill.tags.map((t) => (
              <DrillTagPill key={t.id} name={t.name} color={t.color} />
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-white/60">
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {equipmentCount} equipment
          </span>
          {hasVideo && (
            <span className="flex items-center gap-1">
              <Video className="w-3 h-3" />
              Video
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
