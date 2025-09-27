import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { YearGroup } from "@/types/index";

interface YearGroupFormProps {
  clubId: string;
  yearGroup?: YearGroup | null;
  onSubmit: (data: Partial<YearGroup>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const YearGroupForm = ({ 
  clubId, 
  yearGroup, 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}: YearGroupFormProps) => {
  const [formData, setFormData] = useState({
    name: yearGroup?.name || "",
    ageYear: yearGroup?.ageYear || undefined,
    playingFormat: yearGroup?.playingFormat || "",
    softPlayerLimit: yearGroup?.softPlayerLimit || undefined,
    description: yearGroup?.description || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      clubId,
      ageYear: formData.ageYear ? Number(formData.ageYear) : undefined,
      softPlayerLimit: formData.softPlayerLimit ? Number(formData.softPlayerLimit) : undefined,
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{yearGroup ? "Edit Year Group" : "Create Year Group"}</CardTitle>
        <CardDescription>
          Set up an age group to organize teams by cohort (e.g., U8s, U10s, 2015s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Year Group Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., U8s, U10s, 2015s"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ageYear">Birth Year (optional)</Label>
              <Input
                id="ageYear"
                type="number"
                value={formData.ageYear || ""}
                onChange={(e) => handleInputChange("ageYear", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g., 2015"
                min="1990"
                max="2030"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="playingFormat">Playing Format</Label>
              <Select value={formData.playingFormat} onValueChange={(value) => handleInputChange("playingFormat", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5-a-side">5-a-side</SelectItem>
                  <SelectItem value="7-a-side">7-a-side</SelectItem>
                  <SelectItem value="9-a-side">9-a-side</SelectItem>
                  <SelectItem value="11-a-side">11-a-side</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="softPlayerLimit">Soft Player Limit (optional)</Label>
            <Input
              id="softPlayerLimit"
              type="number"
              value={formData.softPlayerLimit || ""}
              onChange={(e) => handleInputChange("softPlayerLimit", e.target.value ? Number(e.target.value) : undefined)}
              placeholder="e.g., 16"
              min="1"
              max="50"
            />
            <p className="text-sm text-muted-foreground">
              Guidance for team size - not enforced
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Additional information about this year group..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting ? "Saving..." : yearGroup ? "Update Year Group" : "Create Year Group"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};