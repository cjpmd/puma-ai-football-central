
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const EmailTestPanel: React.FC = () => {
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testEmailSending = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Testing email sending to:', testEmail);
      
      const { data, error } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email: testEmail,
          name: 'Test User',
          invitationCode: 'TEST123',
          role: 'test'
        }
      });

      if (error) {
        console.error('Email test error:', error);
        toast.error(`Email test failed: ${error.message}`);
      } else {
        console.log('Email test successful:', data);
        toast.success('Test email sent successfully!');
      }
    } catch (error) {
      console.error('Email test exception:', error);
      toast.error('Failed to send test email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Test Email Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-email">Test Email Address</Label>
          <Input
            id="test-email"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
          />
        </div>
        <Button 
          onClick={testEmailSending} 
          disabled={isLoading || !testEmail}
          className="w-full"
        >
          {isLoading ? 'Sending...' : 'Send Test Email'}
        </Button>
      </CardContent>
    </Card>
  );
};
