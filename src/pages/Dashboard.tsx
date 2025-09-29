
import { SmartDashboardContent } from '@/components/dashboard/SmartDashboardContent';
import { SafeDashboardLayout } from '@/components/layout/SafeDashboardLayout';

const Dashboard = () => {
  return (
    <SafeDashboardLayout>
      <SmartDashboardContent />
    </SafeDashboardLayout>
  );
};

export default Dashboard;
