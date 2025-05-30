
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Users } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface StaffSelectionSectionProps {
  availableStaff: StaffMember[];
  existingSelection: Array<{ staffId: string; role: string }>;
  onSelectionChange: (newStaff: Array<{ staffId: string; role: string }>) => void;
}

export const StaffSelectionSection: React.FC<StaffSelectionSectionProps> = ({
  availableStaff,
  existingSelection,
  onSelectionChange
}) => {
  const handleStaffToggle = (staffId: string) => {
    const isSelected = existingSelection.some(staff => staff.staffId === staffId);
    
    if (isSelected) {
      // Remove staff member
      const newSelection = existingSelection.filter(staff => staff.staffId !== staffId);
      onSelectionChange(newSelection);
    } else {
      // Add staff member
      const staffMember = availableStaff.find(staff => staff.id === staffId);
      if (staffMember) {
        const newSelection = [...existingSelection, { staffId: staffId, role: staffMember.role }];
        onSelectionChange(newSelection);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Staff Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {availableStaff.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No staff members found for this team.
          </div>
        ) : (
          <div className="space-y-3">
            {availableStaff.map((staffMember) => {
              const isSelected = existingSelection.some(staff => staff.staffId === staffMember.id);
              
              return (
                <div key={staffMember.id} className="flex items-center space-x-3 p-3 border rounded">
                  <Checkbox
                    id={`staff-${staffMember.id}`}
                    checked={isSelected}
                    onCheckedChange={() => handleStaffToggle(staffMember.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={`staff-${staffMember.id}`} className="font-medium cursor-pointer">
                      {staffMember.name}
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      {staffMember.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
