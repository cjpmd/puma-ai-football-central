
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
    onSave(designs);
  };

  // Simple shirt silhouette component like the reference images
  const SimpleShirtPreview = ({ design, size = 'large' }: { design: KitDesign; size?: 'small' | 'large' }) => {
    const dimensions = size === 'small' ? 'w-16 h-20' : 'w-32 h-40';
    
    return (
      <div className={`${dimensions} relative flex flex-col items-center justify-center bg-gray-50 rounded-lg p-2 border`}>
        {/* Simple shirt silhouette */}
        <svg viewBox="0 0 100 120" className="w-full h-full">
          {/* Main shirt body - simple rounded rectangle */}
          <path
            d="M20 25 L20 110 L80 110 L80 25 L75 20 L70 15 L65 15 L60 20 L60 15 L40 15 L40 20 L35 15 L30 15 L25 20 Z"
            fill={design.shirtColor}
            stroke="#333"
            strokeWidth="1"
          />
          
          {/* Sleeves - simple rectangles */}
          <rect x="10" y="15" width="15" height="25" fill={design.sleeveColor} stroke="#333" strokeWidth="1" rx="3" />
          <rect x="75" y="15" width="15" height="25" fill={design.sleeveColor} stroke="#333" strokeWidth="1" rx="3" />
          
          {/* Stripes if enabled */}
          {design.hasStripes && (
            <>
              <rect x="30" y="25" width="4" height="85" fill={design.stripeColor} opacity="0.9" />
              <rect x="38" y="25" width="4" height="85" fill={design.stripeColor} opacity="0.9" />
              <rect x="46" y="25" width="4" height="85" fill={design.stripeColor} opacity="0.9" />
              <rect x="54" y="25" width="4" height="85" fill={design.stripeColor} opacity="0.9" />
              <rect x="62" y="25" width="4" height="85" fill={design.stripeColor} opacity="0.9" />
              <rect x="70" y="25" width="4" height="85" fill={design.stripeColor} opacity="0.9" />
            </>
          )}
          
          {/* Simple collar */}
          <path d="M40 15 L45 10 L55 10 L60 15" fill="none" stroke="#333" strokeWidth="1" />
        </svg>
        
        {/* Shorts - simple rectangle below shirt */}
        <div 
          className="w-8 h-4 mt-1 rounded-sm border border-gray-400"
          style={{ backgroundColor: design.shortsColor }}
        />
        
        {/* Socks - two small rectangles */}
        {size === 'large' && (
          <div className="flex gap-1 mt-1">
            <div 
              className="w-2 h-3 rounded-sm border border-gray-400"
              style={{ backgroundColor: design.socksColor }}
            />
            <div 
              className="w-2 h-3 rounded-sm border border-gray-400"
              style={{ backgroundColor: design.socksColor }}
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
