
import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Cloud, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
  className?: string;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  value,
  onChange,
  onLocationSelect,
  label = "Location",
  placeholder = "Enter location or postcode",
  required = false,
  weather,
  className
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadGoogleMaps = async () => {
      console.log('[LocationInput] Starting Google Maps initialization...');
      
      // Check if already loaded
      if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
        console.log('[LocationInput] Google Maps already loaded');
        setIsLoaded(true);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log('[LocationInput] Fetching Google Maps config...');
        const { data, error } = await supabase.functions.invoke('google-maps-config');
        
        if (error) {
          console.error('[LocationInput] Error getting Google Maps config:', error);
          setError('Failed to load Google Maps configuration');
          setIsLoading(false);
          return;
        }

        if (!data?.scriptUrl) {
          console.error('[LocationInput] No script URL received');
          setError('No Google Maps script URL received');
          setIsLoading(false);
          return;
        }

        console.log('[LocationInput] Loading Google Maps script...');
        const script = document.createElement('script');
        script.src = data.scriptUrl;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          console.log('[LocationInput] Google Maps script loaded successfully');
          setIsLoaded(true);
          setIsLoading(false);
          setError(null);
        };
        
        script.onerror = (event) => {
          console.error('[LocationInput] Failed to load Google Maps script:', event);
          setError('Failed to load Google Maps script');
          setIsLoading(false);
        };
        
        document.head.appendChild(script);
      } catch (error) {
        console.error('[LocationInput] Error loading Google Maps:', error);
        setError(`Error loading Google Maps: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };

    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current && window.google && window.google.maps && window.google.maps.places) {
      try {
        console.log('[LocationInput] Initializing Google Places Autocomplete...');
        
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'gb' }
        });

        const autocomplete = autocompleteRef.current;

        // Add place_changed listener with proper event handling
        const handlePlaceChanged = () => {
          console.log('[LocationInput] Place changed event triggered');
          
          const place = autocomplete.getPlace();
          console.log('[LocationInput] Selected place:', place);
          
          if (place && place.formatted_address) {
            const address = place.formatted_address;
            console.log('[LocationInput] Setting address:', address);
            
            // Update the input value and call onChange
            onChange(address);
            
            // If geometry is available, call onLocationSelect
            if (place.geometry && place.geometry.location && onLocationSelect) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              console.log('[LocationInput] Location selected with geometry:', { lat, lng, address });
              onLocationSelect({ lat, lng, address });
            }
          } else {
            console.warn('[LocationInput] Place selected but no formatted_address available');
          }
        };

        autocomplete.addListener('place_changed', handlePlaceChanged);
        
        console.log('[LocationInput] Autocomplete initialized successfully');
      } catch (error) {
        console.error('[LocationInput] Error initializing Google Places Autocomplete:', error);
        setError(`Error initializing autocomplete: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }, [isLoaded, onChange, onLocationSelect]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (autocompleteRef.current && window.google && window.google.maps && window.google.maps.event) {
        // Clear listeners using the correct API
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow manual typing while autocomplete is available
    onChange(e.target.value);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="location" className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        {label}
        {required && <span className="text-red-500">*</span>}
        {isLoading && <span className="text-sm text-muted-foreground">(Loading...)</span>}
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id="location"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          className="pr-10"
          disabled={isLoading}
          autoComplete="off"
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
      
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      
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
      
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-muted-foreground">
          Status: {isLoading ? 'Loading...' : isLoaded ? 'Ready' : 'Not loaded'}
          {window.google ? ' | Google API: ✅' : ' | Google API: ❌'}
        </div>
      )}
    </div>
  );
};
