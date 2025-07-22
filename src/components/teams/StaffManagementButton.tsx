import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'lucide-react';
import { StaffAccountLinkingModal } from './StaffAccountLinkingModal';

interface StaffManagementButtonProps {
  teamId: string;
  teamName: string;
}

export const StaffManagementButton: React.FC<StaffManagementButtonProps> = ({
  teamId,
  teamName
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2"
      >
        <Link className="h-4 w-4" />
        Manage Staff Links
      </Button>
      
      <StaffAccountLinkingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teamId={teamId}
        teamName={teamName}
      />
    </>
  );
};