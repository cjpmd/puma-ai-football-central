import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { Play, Plus, Film } from 'lucide-react';

const supabase = supabaseClient as any;

export default function ClipsTab({ playerId }: { playerId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', clip_url: '', session_date: '', tags: '' });

  const { data: clips = [], isLoading } = useQuery({
    queryKey: ['video-clips', playerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('video_clip')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const addClip = useMutation({
    mutationFn: async () => {
      await supabase.from('video_clip').insert({
        player_id: playerId,
        title: form.title,
        clip_url: form.clip_url || null,
        session_date: form.session_date || null,
        tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : null,
        source: 'internal',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['video-clips', playerId] });
      setForm({ title: '', clip_url: '', session_date: '', tags: '' });
      setShowForm(false);
    },
  });

  function sourceBadge(source: string) {
    const cls =
      source === 'hudl' ? 'bg-amber-100 text-amber-800' :
      source === 'internal' ? 'bg-blue-100 text-blue-800' :
      'bg-gray-100 text-gray-700';
    return <Badge className={cls}>{source}</Badge>;
  }

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading clips...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{clips.length} clip{clips.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setShowForm(v => !v)}><Plus className="w-4 h-4 mr-1" />Add Clip</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>URL</Label><Input value={form.clip_url} onChange={e => setForm(p => ({ ...p, clip_url: e.target.value }))} placeholder="https://..." /></div>
            <div><Label>Session Date</Label><Input type="date" value={form.session_date} onChange={e => setForm(p => ({ ...p, session_date: e.target.value }))} /></div>
            <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="goal, tackle, assist" /></div>
            <div className="flex gap-2">
              <Button onClick={() => addClip.mutate()} disabled={!form.title || addClip.isPending} size="sm">
                {addClip.isPending ? 'Saving...' : 'Save Clip'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {clips.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Film className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No clips yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clips.map((clip: any) => (
            <Card key={clip.id} className="overflow-hidden">
              <div className="relative bg-gray-900 h-32 flex items-center justify-center">
                {clip.thumbnail_url ? (
                  <img src={clip.thumbnail_url} alt={clip.title} className="w-full h-full object-cover opacity-80" />
                ) : (
                  <Film className="w-10 h-10 text-gray-600" />
                )}
                {clip.clip_url && (
                  <a href={clip.clip_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </a>
                )}
              </div>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm line-clamp-1">{clip.title}</p>
                  {sourceBadge(clip.source)}
                </div>
                {clip.session_date && <p className="text-xs text-muted-foreground mt-1">{new Date(clip.session_date).toLocaleDateString()}</p>}
                {clip.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {clip.tags.map((tag: string) => <span key={tag} className="text-xs bg-muted px-1 rounded">{tag}</span>)}
                  </div>
                )}
                {clip.duration_seconds && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.floor(clip.duration_seconds / 60)}:{String(clip.duration_seconds % 60).padStart(2, '0')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
