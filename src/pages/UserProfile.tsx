import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UnifiedProfile } from "@/components/users/UnifiedProfile";

const UserProfile = () => {
  return (
    <DashboardLayout>
      <UnifiedProfile viewMode="self" />
    </DashboardLayout>
  );
};

export default UserProfile;