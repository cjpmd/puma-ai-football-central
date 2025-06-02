
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#f59e0b', label: 'Amber' },
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
    toast({
      title: 'Kit designs saved',
      description: 'Your kit designs have been saved successfully.',
    });
  };

  // Better shirt preview with proper color visualization
  const SimpleShirtPreview = ({ design, size = 'large' }: { design: KitDesign; size?: 'small' | 'large' }) => {
    const dimensions = size === 'small' ? 'w-16 h-20' : 'w-32 h-40';
    const shirtSize = size === 'small' ? 'w-12 h-14' : 'w-24 h-28';
    const shortsSize = size === 'small' ? 'w-8 h-3' : 'w-16 h-6';
    const socksSize = size === 'small' ? 'w-2 h-4' : 'w-3 h-8';
    
    return (
      <div className={`${dimensions} relative flex flex-col items-center justify-center bg-gray-50 rounded-lg p-2 border`}>
        {/* Shirt body with proper color fill */}
        <div className={`${shirtSize} relative rounded-t-lg border-2 border-gray-400 mb-1`} 
             style={{ backgroundColor: design.shirtColor }}>
          
          {/* Sleeve indicators */}
          <div className="absolute -left-2 top-2 w-4 h-8 rounded border border-gray-400" 
               style={{ backgroundColor: design.sleeveColor }} />
          <div className="absolute -right-2 top-2 w-4 h-8 rounded border border-gray-400" 
               style={{ backgroundColor: design.sleeveColor }} />
          
          {/* Collar */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-2 rounded-b border-b border-gray-400" 
               style={{ backgroundColor: design.shirtColor }} />
          
          {/* Stripes if enabled */}
          {design.hasStripes && (
            <div className="absolute inset-0 flex justify-center items-center">
              <div className="flex gap-1 h-full items-center pt-2 pb-2">
                <div className="w-0.5 h-full opacity-80 rounded" style={{ backgroundColor: design.stripeColor }} />
                <div className="w-0.5 h-full opacity-80 rounded" style={{ backgroundColor: design.stripeColor }} />
                <div className="w-0.5 h-full opacity-80 rounded" style={{ backgroundColor: design.stripeColor }} />
                <div className="w-0.5 h-full opacity-80 rounded" style={{ backgroundColor: design.stripeColor }} />
              </div>
            </div>
          )}
          
          {/* White outline for white shirts */}
          {design.shirtColor === '#ffffff' && (
            <div className="absolute inset-0 border-2 border-gray-300 rounded-t-lg pointer-events-none" />
          )}
        </div>
        
        {/* Shorts */}
        <div 
          className={`${shortsSize} rounded border-2 border-gray-400 mb-1`}
          style={{ backgroundColor: design.shortsColor }}
        >
          {/* White outline for white shorts */}
          {design.shortsColor === '#ffffff' && (
            <div className="absolute inset-0 border border-gray-300 rounded pointer-events-none" />
          )}
        </div>
        
        {/* Socks - only show for large size */}
        {size === 'large' && (
          <div className="flex gap-2">
            <div 
              className={`${socksSize} rounded border border-gray-400`}
              style={{ backgroundColor: design.socksColor }}
            >
              {/* White outline for white socks */}
              {design.socksColor === '#ffffff' && (
                <div className="absolute inset-0 border border-gray-300 rounded pointer-events-none" />
              )}
            </div>
            <div 
              className={`${socksSize} rounded border border-gray-400`}
              style={{ backgroundColor: design.socksColor }}
            >
              {/* White outline for white socks */}
              {design.socksColor === '#ffffff' && (
                <div className="absolute inset-0 border border-gray-300 rounded pointer-events-none" />
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ... keep existing code (ColorSelector component)
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
                  value={activeDesign.sleeveColor}
                  onChange={(color) => updateKitDesign(activeKit, { sleeveColor: color })}
                  label="Sleeve Color"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Shirt Style</Label>
                <Select 
                  value={activeDesign.hasStripes ? "stripes" : "plain"} 
                  onValueChange={(value) => updateKitDesign(activeKit, { hasStripes: value === "stripes" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plain">Plain Design</SelectItem>
                    <SelectItem value="stripes">Vertical Stripes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {activeDesign.hasStripes && (
                <ColorSelector
                  value={activeDesign.stripeColor}
                  onChange={(color) => updateKitDesign(activeKit, { stripeColor: color })}
                  label="Stripe Color"
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorSelector
                  value={activeDesign.shortsColor}
                  onChange={(color) => updateKitDesign(activeKit, { shortsColor: color })}
                  label="Shorts Color"
                />
                
                <ColorSelector
                  value={activeDesign.socksColor}
                  onChange={(color) => updateKitDesign(activeKit, { socksColor: color })}
                  label="Socks Color"
                />
              </div>
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
