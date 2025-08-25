import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, Search } from 'lucide-react';

interface DrillTag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  tags: DrillTag[];
  selectedTagIds: string[];
  onSelectionChange: (tagIds: string[]) => void;
  onClose: () => void;
  title: string;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  tags,
  selectedTagIds,
  onSelectionChange,
  onClose,
  title
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelection, setLocalSelection] = useState<string[]>(selectedTagIds);

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTag = (tagId: string) => {
    setLocalSelection(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = () => {
    onSelectionChange(localSelection);
    onClose();
  };

  const handleSelectAll = () => {
    setLocalSelection(filteredTags.map(tag => tag.id));
  };

  const handleClearAll = () => {
    setLocalSelection([]);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-left capitalize">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex-1"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="flex-1"
            >
              Clear All
            </Button>
          </div>

          {/* Tag Grid */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="grid grid-cols-2 gap-2">
              {filteredTags.map((tag) => {
                const isSelected = localSelection.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`
                      relative p-2 rounded-lg border-2 transition-all text-left
                      ${isSelected 
                        ? 'border-primary bg-primary/10' 
                        : 'border-muted hover:border-muted-foreground/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-1.5">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-xs font-medium truncate">
                        {tag.name}
                      </span>
                    </div>
                    
                    {isSelected && (
                      <div className="absolute -top-1 -right-1">
                        <Check className="h-3 w-3 text-primary bg-background rounded-full" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t mt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save ({localSelection.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};