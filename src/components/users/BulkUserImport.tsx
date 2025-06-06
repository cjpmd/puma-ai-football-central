
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, FileText, Users } from 'lucide-react';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export const BulkUserImport: React.FC = () => {
  const { teams } = useAuth();
  const [csvData, setCsvData] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [defaultRole, setDefaultRole] = useState<'staff' | 'parent' | 'player'>('parent');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleBulkImport = async () => {
    if (!csvData.trim() || !selectedTeam) {
      toast.error('Please provide CSV data and select a team');
      return;
    }

    setIsImporting(true);
    const results: ImportResult = { success: 0, failed: 0, errors: [] };

    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

      // Validate headers
      const requiredHeaders = ['name', 'email'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        try {
          if (!row.name || !row.email) {
            results.errors.push(`Row ${i + 1}: Missing name or email`);
            results.failed++;
            continue;
          }

          // Check if user already exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', row.email)
            .single();

          if (existingProfile) {
            // User exists, just add to team if not already there
            const { data: existingTeamMember } = await supabase
              .from('user_teams')
              .select('id')
              .eq('user_id', existingProfile.id)
              .eq('team_id', selectedTeam)
              .single();

            if (!existingTeamMember) {
              await supabase
                .from('user_teams')
                .insert({
                  user_id: existingProfile.id,
                  team_id: selectedTeam,
                  role: defaultRole
                });
            }

            results.success++;
            continue;
          }

          // Create invitation for new user
          const { data: invitation, error: inviteError } = await supabase
            .from('user_invitations')
            .insert({
              email: row.email,
              name: row.name,
              role: defaultRole,
              team_id: selectedTeam,
              invited_by: (await supabase.auth.getUser()).data.user?.id
            })
            .select()
            .single();

          if (inviteError) throw inviteError;

          // Send invitation email
          try {
            await supabase.functions.invoke('send-invitation-email', {
              body: {
                email: row.email,
                name: row.name,
                invitationCode: invitation.invitation_code,
                role: defaultRole
              }
            });
          } catch (emailError) {
            console.error('Failed to send email:', emailError);
            // Don't fail the import if email fails
          }

          results.success++;
        } catch (error: any) {
          results.errors.push(`Row ${i + 1}: ${error.message}`);
          results.failed++;
        }
      }

      setImportResult(results);
      toast.success(`Import completed: ${results.success} successful, ${results.failed} failed`);
    } catch (error: any) {
      console.error('Error during bulk import:', error);
      toast.error(error.message || 'Failed to import users');
    } finally {
      setIsImporting(false);
    }
  };

  const csvTemplate = `name,email,phone
John Smith,john.smith@example.com,+44 123 456 7890
Jane Doe,jane.doe@example.com,+44 098 765 4321`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk User Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Role</Label>
              <Select value={defaultRole} onValueChange={(value: any) => setDefaultRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="player">Player</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>CSV Data</Label>
            <Textarea
              placeholder="Paste your CSV data here..."
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <Button 
            onClick={handleBulkImport}
            disabled={!csvData.trim() || !selectedTeam || isImporting}
            className="w-full"
          >
            {isImporting ? 'Importing...' : 'Import Users'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            CSV Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Use this template format for your CSV data. Required columns: name, email
          </p>
          <pre className="bg-gray-50 p-3 rounded text-sm font-mono overflow-x-auto">
            {csvTemplate}
          </pre>
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(csvTemplate)}
            >
              Copy Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Badge variant="default" className="bg-green-500">
                Success: {importResult.success}
              </Badge>
              <Badge variant="destructive">
                Failed: {importResult.failed}
              </Badge>
            </div>

            {importResult.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Errors:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
