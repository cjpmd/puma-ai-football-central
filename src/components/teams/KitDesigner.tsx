
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shirt } from 'lucide-react';

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

  const KitPreview = ({ design, size = 'large' }: { design: KitDesign; size?: 'small' | 'large' }) => {
    const dimensions = size === 'small' ? 'w-12 h-12' : 'w-24 h-24';
    
    return (
      <div className={`${dimensions} relative`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Shirt body */}
          <path
            d="M20 25 L30 20 L35 25 L40 20 L50 22 L60 20 L65 25 L70 20 L80 25 L80 75 L20 75 Z"
            fill={design.shirtColor}
            stroke="#000"
            strokeWidth="1"
          />
          
          {/* Stripes if enabled */}
          {design.hasStripes && (
            <>
              <rect x="25" y="25" width="6" height="50" fill={design.stripeColor} />
              <rect x="35" y="25" width="6" height="50" fill={design.stripeColor} />
              <rect x="45" y="25" width="6" height="50" fill={design.stripeColor} />
              <rect x="55" y="25" width="6" height="50" fill={design.stripeColor} />
              <rect x="65" y="25" width="6" height="50" fill={design.stripeColor} />
            </>
          )}
          
          {/* Sleeves */}
          <ellipse cx="15" cy="35" rx="8" ry="15" fill={design.sleeveColor} stroke="#000" strokeWidth="1" />
          <ellipse cx="85" cy="35" rx="8" ry="15" fill={design.sleeveColor} stroke="#000" strokeWidth="1" />
          
          {/* Shorts */}
          <rect x="25" y="75" width="50" height="20" fill={design.shortsColor} stroke="#000" strokeWidth="1" />
          
          {/* Socks (only show in large view) */}
          {size === 'large' && (
            <>
              <rect x="28" y="95" width="8" height="5" fill={design.socksColor} />
              <rect x="64" y="95" width="8" height="5" fill={design.socksColor} />
            </>
          )}
        </svg>
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
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded border"
              style={{ backgroundColor: value }}
            />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {colorOptions.map((color) => (
            <SelectItem key={color.value} value={color.value}>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded border"
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
      <div className="flex flex-wrap gap-2">
        {kitTypes.map((kit) => (
          <Button
            key={kit.key}
            variant={activeKit === kit.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveKit(kit.key)}
            className="flex items-center gap-2"
          >
            <div className={`w-3 h-3 rounded ${kit.color}`} />
            {kit.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kit Designer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shirt className="h-5 w-5" />
              Design {kitTypes.find(k => k.key === activeKit)?.label}
            </CardTitle>
            <CardDescription>
              Customize colors and patterns for your kit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label>Shirt Style</Label>
              <Select 
                value={activeDesign.hasStripes ? "stripes" : "plain"} 
                onValueChange={(value) => updateKitDesign(activeKit, { hasStripes: value === "stripes" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plain">Plain</SelectItem>
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

            <div className="grid grid-cols-2 gap-4">
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

        {/* Kit Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Kit Preview</CardTitle>
            <CardDescription>
              Live preview of your kit design
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <KitPreview design={activeDesign} />
          </CardContent>
        </Card>
      </div>

      {/* All Kits Preview */}
      <Card>
        <CardHeader>
          <CardTitle>All Kits Overview</CardTitle>
          <CardDescription>
            Preview of all your team's kit designs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kitTypes.map((kit) => (
              <div key={kit.key} className="text-center space-y-2">
                <KitPreview design={designs[kit.key]} size="small" />
                <p className="text-sm font-medium">{kit.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={() => onSave(designs)}
          className="bg-puma-blue-500 hover:bg-puma-blue-600"
        >
          Save Kit Designs
        </Button>
      </div>
    </div>
  );
};
