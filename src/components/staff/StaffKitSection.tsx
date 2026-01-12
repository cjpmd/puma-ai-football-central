import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Package, Calendar, Shirt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StaffRecord {
  id: string;
  team_id: string;
  team_name: string;
  role: string;
  kit_sizes: Record<string, string>;
}

interface KitIssue {
  id: string;
  kit_item_name: string;
  kit_size?: string;
  quantity: number;
  date_issued: string;
}

interface KitItem {
  id: string;
  name: string;
  available_sizes: string[];
}

interface StaffKitSectionProps {
  userId: string;
  onUpdate?: () => void;
}

export const StaffKitSection: React.FC<StaffKitSectionProps> = ({ userId, onUpdate }) => {
  const [staffRecords, setStaffRecords] = useState<StaffRecord[]>([]);
  const [kitIssues, setKitIssues] = useState<Record<string, KitIssue[]>>({});
  const [kitItems, setKitItems] = useState<Record<string, KitItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadStaffData();
    }
  }, [userId]);

  const loadStaffData = async () => {
    try {
      setLoading(true);

      // Get staff records via user_staff linking table
      const { data: userStaffData, error: userStaffError } = await supabase
        .from('user_staff')
        .select(`
          staff_id,
          team_staff!inner(
            id, team_id, role, kit_sizes,
            teams!inner(id, name)
          )
        `)
        .eq('user_id', userId);

      if (userStaffError) throw userStaffError;

      const records: StaffRecord[] = (userStaffData || []).map(link => {
        const staff = link.team_staff as any;
        return {
          id: staff.id,
          team_id: staff.team_id,
          team_name: staff.teams?.name || 'Unknown Team',
          role: staff.role,
          kit_sizes: (staff.kit_sizes as Record<string, string>) || {}
        };
      });

      setStaffRecords(records);

      // Load kit issues and items for each team
      const issuesMap: Record<string, KitIssue[]> = {};
      const itemsMap: Record<string, KitItem[]> = {};

      for (const record of records) {
        // Load kit issues for this staff member
        const { data: issuesData } = await supabase
          .from('team_kit_issues')
          .select('*')
          .eq('team_id', record.team_id)
          .or(`kit_type.eq.coaching,kit_type.eq.both`)
          .order('date_issued', { ascending: false });

        // Filter issues that include this staff member
        const staffIssues = (issuesData || [])
          .filter(issue => {
            const staffIds = Array.isArray((issue as any).staff_ids) ? (issue as any).staff_ids : [];
            return staffIds.includes(record.id);
          })
          .map(issue => ({
            id: issue.id,
            kit_item_name: issue.kit_item_name,
            kit_size: issue.kit_size,
            quantity: issue.quantity,
            date_issued: issue.date_issued
          }));

        issuesMap[record.id] = staffIssues;

        // Load coaching kit items for this team
        const { data: itemsData } = await supabase
          .from('team_kit_items')
          .select('id, name, available_sizes')
          .eq('team_id', record.team_id)
          .or('kit_type.eq.coaching,kit_type.eq.both')
          .order('name');

        itemsMap[record.team_id] = (itemsData || []).map(item => ({
          id: item.id,
          name: item.name,
          available_sizes: Array.isArray(item.available_sizes) ? item.available_sizes.map(String) : []
        }));
      }

      setKitIssues(issuesMap);
      setKitItems(itemsMap);
    } catch (error: any) {
      console.error('Error loading staff kit data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load coaching kit data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSizeChange = async (staffId: string, itemName: string, size: string) => {
    const record = staffRecords.find(r => r.id === staffId);
    if (!record) return;

    // Update local state
    setStaffRecords(prev => prev.map(r => 
      r.id === staffId 
        ? { ...r, kit_sizes: { ...r.kit_sizes, [itemName]: size } }
        : r
    ));
  };

  const handleSaveKitSizes = async (staffId: string) => {
    const record = staffRecords.find(r => r.id === staffId);
    if (!record) return;

    try {
      setSaving(staffId);

      const { error } = await supabase
        .from('team_staff')
        .update({ kit_sizes: record.kit_sizes })
        .eq('id', staffId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Kit sizes saved successfully'
      });

      onUpdate?.();
    } catch (error: any) {
      console.error('Error saving kit sizes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save kit sizes',
        variant: 'destructive'
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shirt className="h-5 w-5" />
            Coaching Kit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading coaching kit...</div>
        </CardContent>
      </Card>
    );
  }

  if (staffRecords.length === 0) {
    return null; // Don't show section if user is not staff
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shirt className="h-5 w-5" />
          Coaching Kit
        </CardTitle>
        <CardDescription>
          Your coaching kit sizes and issued items
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {staffRecords.map(record => (
          <div key={record.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{record.team_name}</h4>
                <p className="text-sm text-muted-foreground">{record.role}</p>
              </div>
            </div>

            {/* Kit Sizes Input */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">My Kit Sizes</Label>
              {kitItems[record.team_id]?.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {kitItems[record.team_id].map(item => (
                      <div key={item.id} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{item.name}</Label>
                        <Select 
                          value={record.kit_sizes[item.name] || ''} 
                          onValueChange={(v) => handleSizeChange(record.id, item.name, v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            {item.available_sizes.map(size => (
                              <SelectItem key={size} value={size}>{size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleSaveKitSizes(record.id)}
                    disabled={saving === record.id}
                  >
                    {saving === record.id ? 'Saving...' : 'Save Sizes'}
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No coaching kit items configured for this team.
                </p>
              )}
            </div>

            {/* Issued Kit */}
            {kitIssues[record.id]?.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Kit Issued to You</Label>
                <div className="space-y-2">
                  {kitIssues[record.id].map(issue => (
                    <div key={issue.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>{issue.kit_item_name}</span>
                        {issue.kit_size && (
                          <Badge variant="outline" className="text-xs">
                            Size: {issue.kit_size}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          Qty: {issue.quantity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Calendar className="h-3 w-3" />
                        {new Date(issue.date_issued).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
