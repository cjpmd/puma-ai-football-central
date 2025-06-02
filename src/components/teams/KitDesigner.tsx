
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
    toast({
      title: 'Kit designs saved',
      description: 'Your team kit designs have been updated successfully.',
    });
  };

  const KitPreview = ({ design, size = 'large' }: { design: KitDesign; size?: 'small' | 'large' }) => {
    const dimensions = size === 'small' ? 'w-16 h-20' : 'w-32 h-40';
    
    return (
      <div className={`${dimensions} relative bg-gray-50 rounded-lg p-2 border`}>
        <svg viewBox="0 0 120 150" className="w-full h-full">
          {/* Main shirt with professional outline */}
          <path
            d="M20 45s3-15 8-20c5-5 15-12 25-15s20-5 25-5 15 2 25 5 20 10 25 15c5 5 8 20 8 20l5 15c2 8 0 15-3 20-2 3-8 5-12 3-3-1-5-8-5-8s-2 25-2 40v35c0 10-5 15-15 15H35c-10 0-15-5-15-15V95c0-15-2-40-2-40s-2 7-5 8c-4 2-10 0-12-3-3-5-5-12-3-20l5-15z"
            fill={design.shirtColor}
            stroke="#2a2a2a"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          
          {/* Stripes if enabled */}
          {design.hasStripes && (
            <>
              <rect x="32" y="45" width="6" height="45" fill={design.stripeColor} />
              <rect x="42" y="45" width="6" height="45" fill={design.stripeColor} />
              <rect x="52" y="45" width="6" height="45" fill={design.stripeColor} />
              <rect x="62" y="45" width="6" height="45" fill={design.stripeColor} />
              <rect x="72" y="45" width="6" height="45" fill={design.stripeColor} />
              <rect x="82" y="45" width="6" height="45" fill={design.stripeColor} />
            </>
          )}
          
          {/* Sleeves */}
          <ellipse cx="15" cy="55" rx="10" ry="18" fill={design.sleeveColor} stroke="#2a2a2a" strokeWidth="1.5" />
          <ellipse cx="105" cy="55" rx="10" ry="18" fill={design.sleeveColor} stroke="#2a2a2a" strokeWidth="1.5" />
          
          {/* Collar/Neck */}
          <ellipse cx="60" cy="45" rx="8" ry="5" fill="none" stroke="#2a2a2a" strokeWidth="1.5" />
          
          {/* Shorts */}
          <rect x="35" y="90" width="50" height="25" rx="3" fill={design.shortsColor} stroke="#2a2a2a" strokeWidth="1.5" />
          
          {/* Socks (only show in large view) */}
          {size === 'large' && (
            <>
              <rect x="40" y="115" width="12" height="25" rx="2" fill={design.socksColor} stroke="#2a2a2a" strokeWidth="1" />
              <rect x="68" y="115" width="12" height="25" rx="2" fill={design.socksColor} stroke="#2a2a2a" strokeWidth="1" />
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
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10">
          <div className="flex items-center gap-2">
            <div 
              className="w-5 h-5 rounded border-2 border-gray-300"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kit Designer Controls */}
        <div className="lg:col-span-2">
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
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Preview</CardTitle>
              <CardDescription>
                {kitTypes.find(k => k.key === activeKit)?.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-8">
              <KitPreview design={activeDesign} />
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
          onClick={handleSave}
          className="bg-puma-blue-500 hover:bg-puma-blue-600 px-8"
          size="lg"
        >
          Save Kit Designs
        </Button>
      </div>
    </div>
  );
};
