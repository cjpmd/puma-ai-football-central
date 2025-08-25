import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { TagSelector } from './TagSelector';

interface DrillTag {
  id: string;
  name: string;
  color: string;
}

interface PerformanceAnalysis {
  positives: {
    on_ball: string[];
    off_ball: string[];
  };
  challenges: {
    on_ball: string[];
    off_ball: string[];
  };
}

interface PerformanceAnalysisSectionProps {
  analysis: PerformanceAnalysis;
  onAnalysisChange: (analysis: PerformanceAnalysis) => void;
  tags: DrillTag[];
}

export const PerformanceAnalysisSection: React.FC<PerformanceAnalysisSectionProps> = ({
  analysis,
  onAnalysisChange,
  tags
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState<{
    category: 'positives' | 'challenges';
    subcategory: 'on_ball' | 'off_ball';
  } | null>(null);

  const getSelectedTags = (category: 'positives' | 'challenges', subcategory: 'on_ball' | 'off_ball') => {
    return tags.filter(tag => analysis[category][subcategory].includes(tag.id));
  };

  const handleTagSelection = (tagIds: string[], category: 'positives' | 'challenges', subcategory: 'on_ball' | 'off_ball') => {
    onAnalysisChange({
      ...analysis,
      [category]: {
        ...analysis[category],
        [subcategory]: tagIds
      }
    });
    setShowTagSelector(null);
  };

  const removeTag = (tagId: string, category: 'positives' | 'challenges', subcategory: 'on_ball' | 'off_ball') => {
    const updatedTags = analysis[category][subcategory].filter(id => id !== tagId);
    onAnalysisChange({
      ...analysis,
      [category]: {
        ...analysis[category],
        [subcategory]: updatedTags
      }
    });
  };

  const renderTagSection = (
    title: string,
    category: 'positives' | 'challenges',
    subcategory: 'on_ball' | 'off_ball'
  ) => {
    const selectedTags = getSelectedTags(category, subcategory);
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTagSelector({ category, subcategory })}
            className="h-6 px-2"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-1 min-h-[32px] p-2 rounded-md border border-dashed border-muted">
          {selectedTags.length > 0 ? (
            selectedTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs cursor-pointer transition-opacity hover:opacity-70"
                style={{ 
                  backgroundColor: tag.color + '20', 
                  color: tag.color,
                  borderColor: tag.color + '40'
                }}
                onClick={() => removeTag(tag.id, category, subcategory)}
              >
                {tag.name}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">Tap + to add tags</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-4 h-auto text-left"
          >
            <div>
              <h3 className="font-medium">Performance Analysis</h3>
              <p className="text-sm text-muted-foreground">Track positives and areas for improvement</p>
            </div>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="px-4 pb-4">
          <Tabs defaultValue="positives" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="positives" className="text-xs">Positives</TabsTrigger>
              <TabsTrigger value="challenges" className="text-xs">Challenges</TabsTrigger>
            </TabsList>
            
            <TabsContent value="positives" className="space-y-4 mt-4">
              {renderTagSection("On the Ball", "positives", "on_ball")}
              {renderTagSection("Off the Ball", "positives", "off_ball")}
            </TabsContent>
            
            <TabsContent value="challenges" className="space-y-4 mt-4">
              {renderTagSection("On the Ball", "challenges", "on_ball")}
              {renderTagSection("Off the Ball", "challenges", "off_ball")}
            </TabsContent>
          </Tabs>
        </CollapsibleContent>
      </Collapsible>

      {showTagSelector && (
        <TagSelector
          tags={tags}
          selectedTagIds={analysis[showTagSelector.category][showTagSelector.subcategory]}
          onSelectionChange={(tagIds) => 
            handleTagSelection(tagIds, showTagSelector.category, showTagSelector.subcategory)
          }
          onClose={() => setShowTagSelector(null)}
          title={`Select ${showTagSelector.category} - ${showTagSelector.subcategory.replace('_', ' ')}`}
        />
      )}
    </>
  );
};