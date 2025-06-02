
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

  const ProfessionalKitPreview = ({ design, size = 'large' }: { design: KitDesign; size?: 'small' | 'large' }) => {
    const dimensions = size === 'small' ? 'w-20 h-24' : 'w-40 h-48';
    
    return (
      <div className={`${dimensions} relative bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg p-3 border-2 border-gray-200 shadow-lg`}>
        <svg viewBox="0 0 400 480" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id={`shirtGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={design.shirtColor} stopOpacity="1" />
              <stop offset="100%" stopColor={design.shirtColor} stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id={`sleeveGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={design.sleeveColor} stopOpacity="1" />
              <stop offset="100%" stopColor={design.sleeveColor} stopOpacity="0.8" />
            </linearGradient>
          </defs>
          
          {/* Professional football shirt outline */}
          <path
            d="M200 45s-15-10-25-15c-15-8-30-12-45-15-20-4-35-5-45-2-15 4-25 15-30 25-8 15-10 30-8 40 2 8 8 15 12 20 5 6 10 8 15 10 8 3 15 2 20 0 6-2 8-8 8-15 0-10-2-20-2-30v-25s50-8 80-8 80 8 80 8v25c0 10-2 20-2 30 0 7 2 13 8 15 5 2 12 3 20 0 5-2 10-4 15-10 4-5 10-12 12-20 2-10 0-25-8-40-5-10-15-21-30-25-10-3-25-2-45 2-15 3-30 7-45 15-10 5-25 15-25 15z"
            fill={`url(#shirtGradient-${size})`}
            stroke="#2a2a2a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          
          {/* Main shirt body */}
          <path
            d="M80 90c0 0 5 80 8 120 3 50 5 100 5 120 0 25 10 35 25 35h164c15 0 25-10 25-35 0-20 2-70 5-120 3-40 8-120 8-120s-40-15-60-15h-120c-20 0-60 15-60 15z"
            fill={`url(#shirtGradient-${size})`}
            stroke="#2a2a2a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          
          {/* Stripes if enabled */}
          {design.hasStripes && (
            <>
              <rect x="120" y="90" width="15" height="275" fill={design.stripeColor} opacity="0.9" />
              <rect x="145" y="90" width="15" height="275" fill={design.stripeColor} opacity="0.9" />
              <rect x="170" y="90" width="15" height="275" fill={design.stripeColor} opacity="0.9" />
              <rect x="195" y="90" width="15" height="275" fill={design.stripeColor} opacity="0.9" />
              <rect x="220" y="90" width="15" height="275" fill={design.stripeColor} opacity="0.9" />
              <rect x="245" y="90" width="15" height="275" fill={design.stripeColor} opacity="0.9" />
              <rect x="270" y="90" width="15" height="275" fill={design.stripeColor} opacity="0.9" />
            </>
          )}
          
          {/* Left sleeve */}
          <ellipse 
            cx="60" 
            cy="120" 
            rx="25" 
            ry="45" 
            fill={`url(#sleeveGradient-${size})`} 
            stroke="#2a2a2a" 
            strokeWidth="2" 
          />
          
          {/* Right sleeve */}
          <ellipse 
            cx="340" 
            cy="120" 
            rx="25" 
            ry="45" 
            fill={`url(#sleeveGradient-${size})`} 
            stroke="#2a2a2a" 
            strokeWidth="2" 
          />
          
          {/* Collar */}
          <path
            d="M170 75c0-8 5-15 15-20 10-5 20-5 30-5s20 0 30 5c10 5 15 12 15 20"
            fill="none"
            stroke="#2a2a2a"
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {/* Professional shorts */}
          <path
            d="M110 365c0 0-5 15-5 25 0 15 5 25 15 30 8 4 18 5 28 5h104c10 0 20-1 28-5 10-5 15-15 15-30 0-10-5-25-5-25s-5-5-15-5h-150c-10 0-15 5-15 5z"
            fill={design.shortsColor}
            stroke="#2a2a2a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          
          {/* Shorts details */}
          <circle cx="150" cy="380" r="3" fill="#2a2a2a" opacity="0.3" />
          <circle cx="250" cy="380" r="3" fill="#2a2a2a" opacity="0.3" />
          
          {/* Professional socks (only show in large view) */}
          {size === 'large' && (
            <>
              {/* Left sock */}
              <path
                d="M140 420c0 0-8 5-10 15-2 12 0 25 5 35 3 8 8 12 15 12s12-4 15-12c5-10 7-23 5-35-2-10-10-15-10-15s-5-2-10-2-10 2-10 2z"
                fill={design.socksColor}
                stroke="#2a2a2a"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              
              {/* Right sock */}
              <path
                d="M260 420c0 0 8 5 10 15 2 12 0 25-5 35-3 8-8 12-15 12s-12-4-15-12c-5-10-7-23-5-35 2-10 10-15 10-15s5-2 10-2 10 2 10 2z"
                fill={design.socksColor}
                stroke="#2a2a2a"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              
              {/* Sock stripes */}
              <rect x="138" y="430" width="24" height="4" fill="#ffffff" opacity="0.6" />
              <rect x="138" y="440" width="24" height="4" fill="#ffffff" opacity="0.6" />
              <rect x="238" y="430" width="24" height="4" fill="#ffffff" opacity="0.6" />
              <rect x="238" y="440" width="24" height="4" fill="#ffffff" opacity="0.6" />
            </>
          )}
          
          {/* Shadow and depth */}
          <ellipse cx="200" cy="475" rx="80" ry="8" fill="#000000" opacity="0.1" />
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
    <div className="space-y-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Kit Designer Controls */}
        <div className="lg:col-span-3">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Shirt className="h-6 w-6 text-blue-600" />
                Design {kitTypes.find(k => k.key === activeKit)?.label}
              </CardTitle>
              <CardDescription className="text-base">
                Customize colors and patterns for your professional kit
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="space-y-4">
                <Label className="text-base font-semibold">Shirt Style</Label>
                <Select 
                  value={activeDesign.hasStripes ? "stripes" : "plain"} 
                  onValueChange={(value) => updateKitDesign(activeKit, { hasStripes: value === "stripes" })}
                >
                  <SelectTrigger className="h-11">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <Card className="shadow-lg h-fit sticky top-4">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="text-xl">Live Preview</CardTitle>
              <CardDescription className="text-base">
                {kitTypes.find(k => k.key === activeKit)?.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12">
              <ProfessionalKitPreview design={activeDesign} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* All Kits Overview */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle className="text-xl">Complete Kit Collection</CardTitle>
          <CardDescription className="text-base">
            Overview of all your team's professional kit designs
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {kitTypes.map((kit) => (
              <div 
                key={kit.key} 
                className={`text-center space-y-4 p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  activeKit === kit.key 
                    ? 'border-blue-500 bg-blue-50 shadow-md transform scale-105' 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
                onClick={() => setActiveKit(kit.key)}
              >
                <ProfessionalKitPreview design={designs[kit.key]} size="small" />
                <p className="text-sm font-semibold text-gray-700">{kit.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleSave}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-12 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          size="lg"
        >
          Save Professional Kit Designs
        </Button>
      </div>
    </div>
  );
};
