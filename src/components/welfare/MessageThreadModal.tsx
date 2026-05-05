import { useState } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  playerId: string;
  playerName: string;
  messages: any[];
  onClose: () => void;
  onSaved: () => void;
}

export default function MessageThreadModal({ playerId, playerName, messages, onClose, onSaved }: Props) {
  const [reply, setReply] = useState('');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!reply.trim()) return;
    setSending(true);
    await supabase.from('parent_message').insert({
      player_id: playerId,
      sender_type: 'staff',
      content: reply,
      subject: subject || null,
      thread_id: messages[0]?.thread_id ?? null,
    });
    setSending(false);
    setReply('');
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[85vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between shrink-0 pb-3">
          <CardTitle className="text-base">Messages — {playerName}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No messages yet.</p>
          )}
          {[...messages].reverse().map((msg: any) => (
            <div key={msg.id} className={`flex ${msg.sender_type === 'staff' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                msg.sender_type === 'staff' ? 'bg-primary/20' : 'bg-muted'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs capitalize">{msg.sender_type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.created_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
                {msg.subject && <p className="font-semibold text-xs mb-0.5">{msg.subject}</p>}
                <p>{msg.content}</p>
              </div>
            </div>
          ))}
        </CardContent>

        <div className="p-4 border-t border-border space-y-2 shrink-0">
          {messages.length === 0 && (
            <Input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
              className="text-sm"
            />
          )}
          <div className="flex gap-2">
            <Input
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Type a reply…"
              className="flex-1 text-sm"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
            />
            <Button onClick={handleSend} disabled={sending || !reply.trim()} size="sm">
              {sending ? '…' : 'Send'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
