
import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Cloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  weather?: {
    temp: number;
    description: string;
    icon: string;
  } | null;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  value,
  onChange,
  onLocationSelect,
  label = "Location",
  placeholder = "Enter location or postcode",
  required = false,
  weather
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setIsLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&libraries=places`;
      script.onload = () => setIsLoaded(true);
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'gb' } // Restrict to UK
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const address = place.formatted_address || '';
          
          onChange(address);
          onLocationSelect?.({ lat, lng, address });
        }
      });
    }
  }, [isLoaded, onChange, onLocationSelect]);

  return (
    <div className="space-y-2">
      <Label htmlFor="location" className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id="location"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="pr-10"
        />
        {weather && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <Cloud className="h-3 w-3" />
              {Math.round(weather.temp)}°C
            </Badge>
          </div>
        )}
      </div>
      {weather && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <img 
            src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
            alt={weather.description}
            className="w-6 h-6"
          />
          {weather.description}
        </div>
      )}
    </div>
  );
};
