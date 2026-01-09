import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EventLocationMapProps {
  location: string;
  lat?: number | null;
  lng?: number | null;
}

export const EventLocationMap: React.FC<EventLocationMapProps> = ({
  location,
  lat,
  lng
}) => {
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('mapbox-config');
        
        if (error) {
          console.error('Mapbox config error:', error);
          setError('Map configuration not available');
          return;
        }
        
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setError('Map token not configured');
        }
      } catch (err) {
        console.error('Error fetching mapbox token:', err);
        setError('Failed to load map');
      } finally {
        setLoading(false);
      }
    };

    if (lat && lng) {
      fetchToken();
    } else {
      setLoading(false);
    }
  }, [lat, lng]);

  // Only show if we have coordinates
  if (!lat || !lng) {
    return null;
  }

  if (loading) {
    return (
      <div className="rounded-lg overflow-hidden border bg-muted h-[120px] flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading map...</span>
      </div>
    );
  }

  if (error || !mapboxToken) {
    return null; // Silently fail if no token configured
  }

  // Use Mapbox static image API for a simple map preview
  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+e74c3c(${lng},${lat})/${lng},${lat},14,0/600x200@2x?access_token=${mapboxToken}`;

  return (
    <div className="rounded-lg overflow-hidden border">
      <img 
        src={mapUrl} 
        alt={`Map of ${location}`}
        className="w-full h-[80px] object-cover"
        loading="lazy"
      />
    </div>
  );
};
