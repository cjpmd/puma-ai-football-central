
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocationInput } from '@/components/ui/location-input';
import { WeatherService } from '@/services/weatherService';
import { supabase } from '@/integrations/supabase/client';

export const LocationDebug = () => {
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [weather, setWeather] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  const addLog = (message: string) => {
    console.log(`[LocationDebug] ${message}`);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleLocationSelect = async (locationData: { lat: number; lng: number; address: string }) => {
    addLog(`Location selected: ${locationData.address} (${locationData.lat}, ${locationData.lng})`);
    setCoordinates({ lat: locationData.lat, lng: locationData.lng });
    
    try {
      addLog('Fetching weather data...');
      const weatherData = await WeatherService.getCurrentWeather(locationData.lat, locationData.lng);
      if (weatherData) {
        setWeather(weatherData);
        addLog(`Weather loaded: ${weatherData.temp}°C - ${weatherData.description}`);
      } else {
        addLog('Weather data is null');
      }
    } catch (error) {
      addLog(`Weather error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testGoogleMapsScript = async () => {
    addLog('Testing Google Maps script loading...');
    
    try {
      const { data, error } = await supabase.functions.invoke('google-maps-config');
      
      if (error) {
        addLog(`Google Maps config error: ${JSON.stringify(error)}`);
        return;
      }
      
      addLog(`Google Maps script URL received: ${data?.scriptUrl ? 'Yes' : 'No'}`);
      
      // Check if script is already loaded
      if (window.google && window.google.maps) {
        addLog('Google Maps already loaded in window');
        setIsGoogleMapsLoaded(true);
      } else {
        addLog('Google Maps not found in window');
        setIsGoogleMapsLoaded(false);
      }
      
    } catch (error) {
      addLog(`Google Maps test error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testWeatherAPI = async () => {
    addLog('Testing Weather API with London coordinates...');
    
    try {
      const weather = await WeatherService.getCurrentWeather(51.5074, -0.1278);
      if (weather) {
        addLog(`Weather API test successful: ${weather.temp}°C - ${weather.description}`);
      } else {
        addLog('Weather API returned null');
      }
    } catch (error) {
      addLog(`Weather API test error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const testSupabaseFunctions = async () => {
    addLog('Testing Supabase functions directly...');
    
    // Test weather function directly
    try {
      const { data, error } = await supabase.functions.invoke('weather-data', {
        body: { lat: 51.5074, lng: -0.1278 }
      });
      
      if (error) {
        addLog(`Weather function error: ${JSON.stringify(error)}`);
      } else {
        addLog(`Weather function success: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      addLog(`Weather function exception: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Location & Weather Debug Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={testGoogleMapsScript} variant="outline">
              Test Google Maps
            </Button>
            <Button onClick={testWeatherAPI} variant="outline">
              Test Weather API
            </Button>
            <Button onClick={testSupabaseFunctions} variant="outline">
              Test Supabase Functions
            </Button>
            <Button onClick={clearLogs} variant="outline">
              Clear Logs
            </Button>
          </div>
          
          <div className="p-2 bg-muted rounded text-sm">
            <p><strong>Google Maps Status:</strong> {isGoogleMapsLoaded ? '✅ Loaded' : '❌ Not Loaded'}</p>
            <p><strong>Window.google:</strong> {typeof window !== 'undefined' && window.google ? '✅ Available' : '❌ Not Available'}</p>
          </div>
          
          <LocationInput
            value={location}
            onChange={setLocation}
            onLocationSelect={handleLocationSelect}
            label="Test Location Input"
            placeholder="Try entering a postcode like 'SW1A 1AA' or 'DD5 2BG'"
            weather={weather}
          />
          
          {coordinates && (
            <div className="p-2 bg-muted rounded">
              <p><strong>Coordinates:</strong> {coordinates.lat}, {coordinates.lng}</p>
            </div>
          )}
          
          {weather && (
            <div className="p-2 bg-muted rounded">
              <p><strong>Weather:</strong> {weather.temp}°C - {weather.description}</p>
              <img 
                src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                alt={weather.description}
                className="w-8 h-8"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Debug Logs:</h4>
              <span className="text-sm text-muted-foreground">({logs.length} entries)</span>
            </div>
            <div className="bg-black text-green-400 p-2 rounded text-sm max-h-48 overflow-y-auto font-mono">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet. Click the test buttons above to start debugging.</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
