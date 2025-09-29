
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EnhancedUserManagement } from "@/components/users/EnhancedUserManagement";
import { StaffManagementDashboard } from "@/components/admin/StaffManagementDashboard";

const UserManagement = () => {
  return (
    <DashboardLayout>
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="staff">Staff Management</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <EnhancedUserManagement />
        </TabsContent>
        <TabsContent value="staff">
          <StaffManagementDashboard />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default UserManagement;
