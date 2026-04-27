import { logger } from '@/lib/logger';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Shirt, CheckCircle } from 'lucide-react';
import { KitDesign, KitDesigns, KitPattern, normalizeKitDesign } from '@/types/team';
import { KitShirt } from '@/components/shared/KitShirt';
import { cn } from '@/lib/utils';

interface KitDesignerProps {
  initialDesigns?: Partial<KitDesigns>;
  onSave: (designs: KitDesigns) => void;
  isSaving?: boolean;
}

const defaultKit: KitDesign = {
  shirtColor: '#3b82f6',
  sleeveColor: '#3b82f6',
  hasStripes: false,
  stripeColor: '#ffffff',
  shortsColor: '#1e40af',
  socksColor: '#1e40af',
  collarColor: '#ffffff',
  pattern: 'solid',
};

const presetSwatches = [
  '#000000', '#ffffff', '#dc2626', '#ef4444',
  '#f97316', '#f59e0b', '#facc15', '#84cc16',
  '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#e11d48', '#1e40af', '#1e3a8a', '#0c4a6e',
];

const patternOptions: { value: KitPattern; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'stripes', label: 'Stripes' },
  { value: 'hoops', label: 'Hoops' },
  { value: 'halves', label: 'Halves' },
  { value: 'sash', label: 'Sash' },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
  const isValidHex = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <label
          className="relative h-11 w-11 shrink-0 cursor-pointer rounded-md border-2 border-border shadow-sm overflow-hidden"
          style={{ backgroundColor: isValidHex ? value : '#cccccc' }}
        >
          <input
            type="color"
            value={isValidHex ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={label}
          />
        </label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="h-11 font-mono uppercase"
          maxLength={7}
        />
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {presetSwatches.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cn(
              'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
              value.toLowerCase() === c.toLowerCase()
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border'
            )}
            style={{ backgroundColor: c }}
            aria-label={c}
          />
        ))}
      </div>
    </div>
  );
};

export const KitDesigner: React.FC<KitDesignerProps> = ({
  initialDesigns = {},
  onSave,
  isSaving = false,
}) => {
  const normaliseInitial = (key: keyof KitDesigns): KitDesign => {
    const stored = initialDesigns?.[key];
    return stored ? normalizeKitDesign(stored) : { ...defaultKit };
  };

  const [designs, setDesigns] = useState<KitDesigns>({
    home: normaliseInitial('home'),
    away: normaliseInitial('away'),
    training: normaliseInitial('training'),
    goalkeeper: normaliseInitial('goalkeeper'),
  });

  const [activeKit, setActiveKit] = useState<keyof KitDesigns>('home');

  const kitTypes = [
    { key: 'home' as const, label: 'Home Kit', dot: 'bg-blue-500' },
    { key: 'away' as const, label: 'Away Kit', dot: 'bg-red-500' },
    { key: 'training' as const, label: 'Training Kit', dot: 'bg-green-500' },
    { key: 'goalkeeper' as const, label: 'Goalkeeper Kit', dot: 'bg-yellow-500' },
  ];

  const updateKitDesign = (kitType: keyof KitDesigns, updates: Partial<KitDesign>) => {
    setDesigns((prev) => {
      const next = { ...prev[kitType], ...updates };
      // Keep `hasStripes` in sync with `pattern` for back-compat with legacy readers.
      if (updates.pattern !== undefined) {
        next.hasStripes = updates.pattern === 'stripes';
      }
      return { ...prev, [kitType]: next };
    });
  };

  const handleSave = () => {
    if (!isSaving) {
      logger.log('Saving kit designs:', designs);
      onSave(designs);
    }
  };

  const activeDesign = designs[activeKit];
  const isPatterned = (activeDesign.pattern ?? 'solid') !== 'solid';

  return (
    <div className="space-y-6">
      {/* Kit Type Selector */}
      <div className="flex flex-wrap gap-2">
        {kitTypes.map((kit) => (
          <Button
            key={kit.key}
            variant={activeKit === kit.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveKit(kit.key)}
            className="flex items-center gap-2"
          >
            <span className={`h-3 w-3 rounded-full ${kit.dot}`} />
            {kit.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Designer Controls */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shirt className="h-5 w-5" />
                Design {kitTypes.find((k) => k.key === activeKit)?.label}
              </CardTitle>
              <CardDescription>
                Choose any colour. Patterns render exactly the same on the formation pitch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ColorPicker
                  value={activeDesign.shirtColor}
                  onChange={(color) =>
                    updateKitDesign(activeKit, { shirtColor: color, sleeveColor: color })
                  }
                  label="Shirt Color"
                />
                <ColorPicker
                  value={activeDesign.collarColor || '#ffffff'}
                  onChange={(color) => updateKitDesign(activeKit, { collarColor: color })}
                  label="Collar Color"
                />
                <ColorPicker
                  value={activeDesign.sleeveColor}
                  onChange={(color) => updateKitDesign(activeKit, { sleeveColor: color })}
                  label="Sleeve Color"
                />
                <ColorPicker
                  value={activeDesign.shortsColor}
                  onChange={(color) => updateKitDesign(activeKit, { shortsColor: color })}
                  label="Shorts Color"
                />
              </div>

              {/* Pattern Picker */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pattern</Label>
                <div className="flex flex-wrap gap-2">
                  {patternOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={(activeDesign.pattern ?? 'solid') === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateKitDesign(activeKit, { pattern: opt.value })}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {isPatterned && (
                <ColorPicker
                  value={activeDesign.stripeColor}
                  onChange={(color) => updateKitDesign(activeKit, { stripeColor: color })}
                  label="Accent Color"
                />
              )}

              <ColorPicker
                value={activeDesign.socksColor}
                onChange={(color) => updateKitDesign(activeKit, { socksColor: color })}
                label="Socks Color"
              />
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-2">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                {kitTypes.find((k) => k.key === activeKit)?.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
              <KitShirt design={activeDesign} squadNumber={9} size={200} />
              <div className="flex items-center gap-3">
                {/* Shorts preview */}
                <div
                  className="h-10 w-16 rounded-md border"
                  style={{ backgroundColor: activeDesign.shortsColor }}
                />
                {/* Socks preview */}
                <div
                  className="h-10 w-4 rounded-sm border"
                  style={{ backgroundColor: activeDesign.socksColor }}
                />
                <div
                  className="h-10 w-4 rounded-sm border"
                  style={{ backgroundColor: activeDesign.socksColor }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Same shirt rendered on the formation pitch.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Complete Kit Collection */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Kit Collection</CardTitle>
          <CardDescription>Tap a kit to edit it.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kitTypes.map((kit) => (
              <button
                type="button"
                key={kit.key}
                onClick={() => setActiveKit(kit.key)}
                className={cn(
                  'flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all',
                  activeKit === kit.key
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/40'
                )}
              >
                <KitShirt design={designs[kit.key]} size={72} hideNumber />
                <p className="text-sm font-medium">{kit.label}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-center">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-3 text-lg"
          size="lg"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Save Kit Designs
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
