
import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { QuickAccountLinking } from '@/components/users/QuickAccountLinking';

const AccountLinking = () => {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Account Linking</h1>
            <p className="text-muted-foreground">
              Link your account to a player to receive availability notifications and see colored event indicators.
            </p>
          </div>
          
          <QuickAccountLinking />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AccountLinking;
