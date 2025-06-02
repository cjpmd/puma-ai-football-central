
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Shirt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KitDesign {
  shirtColor: string;
  sleeveColor: string;
  hasStripes: boolean;
  stripeColor: string;
  shortsColor: string;
  socksColor: string;
}

interface KitDesigns {
  home: KitDesign;
  away: KitDesign;
  training: KitDesign;
  goalkeeper: KitDesign;
}

interface KitDesignerProps {
  initialDesigns?: Partial<KitDesigns>;
  onSave: (designs: KitDesigns) => void;
}

const defaultKit: KitDesign = {
  shirtColor: '#3b82f6',
  sleeveColor: '#3b82f6',
  hasStripes: false,
  stripeColor: '#ffffff',
  shortsColor: '#1e40af',
  socksColor: '#1e40af',
};

const colorOptions = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#ef4444', label: 'Red' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Yellow' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ffffff', label: 'White' },
  { value: '#000000', label: 'Black' },
  { value: '#f97316', label: 'Orange' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#84cc16', label: 'Lime' },
  { value: '#e11d48', label: 'Rose' },
  { value: '#0ea5e9', label: 'Sky' },
];

export const KitDesigner: React.FC<KitDesignerProps> = ({
  initialDesigns = {},
  onSave
}) => {
  const [designs, setDesigns] = useState<KitDesigns>({
    home: { ...defaultKit, ...initialDesigns.home },
    away: { ...defaultKit, ...initialDesigns.away },
    training: { ...defaultKit, ...initialDesigns.training },
    goalkeeper: { ...defaultKit, ...initialDesigns.goalkeeper },
  });

  const [activeKit, setActiveKit] = useState<keyof KitDesigns>('home');
  const { toast } = useToast();

  const kitTypes = [
    { key: 'home' as const, label: 'Home Kit', color: 'bg-blue-500' },
    { key: 'away' as const, label: 'Away Kit', color: 'bg-red-500' },
    { key: 'training' as const, label: 'Training Kit', color: 'bg-green-500' },
    { key: 'goalkeeper' as const, label: 'Goalkeeper Kit', color: 'bg-yellow-500' }
  ];

  const updateKitDesign = (kitType: keyof KitDesigns, updates: Partial<KitDesign>) => {
    setDesigns(prev => ({
      ...prev,
      [kitType]: { ...prev[kitType], ...updates }
    }));
  };

  const handleSave = () => {
    console.log('Saving kit designs:', designs);
    onSave(designs);
  };

  // Simple shirt preview with stripe support
  const SimpleShirtPreview = ({ design, size = 'large' }: { design: KitDesign; size?: 'small' | 'large' }) => {
    const isSmall = size === 'small';
    const shirtClasses = `${isSmall ? 'w-12 h-16' : 'w-24 h-32'} rounded-t-lg mb-1 border relative overflow-hidden`;
    
    return (
      <div className={`${isSmall ? 'w-16 h-20' : 'w-32 h-40'} flex flex-col items-center justify-center bg-gray-50 rounded-lg p-2 border`}>
        {/* Simple shirt */}
        <div 
          className={shirtClasses}
          style={{
            backgroundColor: design.shirtColor,
            border: design.shirtColor === '#ffffff' ? '2px solid #e5e7eb' : '1px solid #9ca3af'
          }}
        >
          {/* Stripes overlay */}
          {design.hasStripes && (
            <div 
              className="absolute inset-0 opacity-70"
              style={{
                background: `repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 8px,
                  ${design.stripeColor} 8px,
                  ${design.stripeColor} 12px
                )`
              }}
            />
          )}
          
          {/* Collar */}
          <div 
            className={`${isSmall ? 'w-3 h-2' : 'w-6 h-3'} mx-auto bg-white rounded-b-sm border-t-0`}
            style={{ marginTop: isSmall ? '2px' : '4px' }}
          />
        </div>
        
        {/* Simple shorts */}
        <div 
          className={`${isSmall ? 'w-8 h-3' : 'w-16 h-6'} rounded mb-1`}
          style={{
            backgroundColor: design.shortsColor,
            border: design.shortsColor === '#ffffff' ? '1px solid #e5e7eb' : 'none'
          }}
        />
        
        {/* Simple socks - only show for large size */}
        {!isSmall && (
          <div className="flex gap-2">
            <div 
              className="w-3 h-8 rounded"
              style={{
                backgroundColor: design.socksColor,
                border: design.socksColor === '#ffffff' ? '1px solid #e5e7eb' : 'none'
              }}
            />
            <div 
              className="w-3 h-8 rounded"
              style={{
                backgroundColor: design.socksColor,
                border: design.socksColor === '#ffffff' ? '1px solid #e5e7eb' : 'none'
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const ColorSelector = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: string; 
    onChange: (color: string) => void; 
    label: string;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11">
          <div className="flex items-center gap-3">
            <div 
              className="w-6 h-6 rounded-full border-2 border-gray-300 shadow-sm"
              style={{ backgroundColor: value }}
            />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {colorOptions.map((color) => (
            <SelectItem key={color.value} value={color.value}>
              <div className="flex items-center gap-3">
                <div 
                  className="w-5 h-5 rounded-full border shadow-sm"
                  style={{ backgroundColor: color.value }}
                />
                {color.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const activeDesign = designs[activeKit];

  return (
    <div className="space-y-6">
      {/* Kit Type Selector */}
      <div className="flex flex-wrap gap-3">
        {kitTypes.map((kit) => (
          <Button
            key={kit.key}
            variant={activeKit === kit.key ? "default" : "outline"}
            size="lg"
            onClick={() => setActiveKit(kit.key)}
            className="flex items-center gap-3 px-6 py-3"
          >
            <div className={`w-4 h-4 rounded-full ${kit.color}`} />
            {kit.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Kit Designer Controls */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shirt className="h-5 w-5" />
                Design {kitTypes.find(k => k.key === activeKit)?.label}
              </CardTitle>
              <CardDescription>
                Customize colors and patterns for your kit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorSelector
                  value={activeDesign.shirtColor}
                  onChange={(color) => updateKitDesign(activeKit, { shirtColor: color })}
                  label="Shirt Color"
                />
                
                <ColorSelector
                  value={activeDesign.shortsColor}
                  onChange={(color) => updateKitDesign(activeKit, { shortsColor: color })}
                  label="Shorts Color"
                />
              </div>

              {/* Stripes Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="stripes-toggle" className="text-sm font-medium">
                  Add Stripes
                </Label>
                <Switch
                  id="stripes-toggle"
                  checked={activeDesign.hasStripes}
                  onCheckedChange={(checked) => updateKitDesign(activeKit, { hasStripes: checked })}
                />
              </div>

              {/* Stripe Color - only show if stripes enabled */}
              {activeDesign.hasStripes && (
                <ColorSelector
                  value={activeDesign.stripeColor}
                  onChange={(color) => updateKitDesign(activeKit, { stripeColor: color })}
                  label="Stripe Color"
                />
              )}

              <ColorSelector
                value={activeDesign.socksColor}
                onChange={(color) => updateKitDesign(activeKit, { socksColor: color })}
                label="Socks Color"
              />
            </CardContent>
          </Card>
        </div>

        {/* Kit Preview */}
        <div className="lg:col-span-2">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                {kitTypes.find(k => k.key === activeKit)?.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-8">
              <SimpleShirtPreview design={activeDesign} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* All Kits Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Kit Collection</CardTitle>
          <CardDescription>
            Overview of all your team's kit designs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kitTypes.map((kit) => (
              <div 
                key={kit.key} 
                className={`text-center space-y-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  activeKit === kit.key 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setActiveKit(kit.key)}
              >
                <SimpleShirtPreview design={designs[kit.key]} size="small" />
                <p className="text-sm font-medium">{kit.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleSave}
          className="px-8 py-3 text-lg"
          size="lg"
        >
          Save Kit Designs
        </Button>
      </div>
    </div>
  );
};
