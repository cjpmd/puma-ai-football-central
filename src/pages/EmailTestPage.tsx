
import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmailTestPanel } from '@/components/users/EmailTestPanel';
import { InvitationResendPanel } from '@/components/users/InvitationResendPanel';

const EmailTestPage = () => {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Email Configuration Test</h1>
          <p className="text-gray-600 mt-2">
            Test email sending functionality and manage pending invitations
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EmailTestPanel />
          <InvitationResendPanel />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmailTestPage;
