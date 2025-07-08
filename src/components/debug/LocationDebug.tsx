
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocationInput } from '@/components/ui/location-input';
import { WeatherService } from '@/services/weatherService';

export const LocationDebug = () => {
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [weather, setWeather] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleLocationSelect = async (locationData: { lat: number; lng: number; address: string }) => {
    addLog(`Location selected: ${locationData.address} (${locationData.lat}, ${locationData.lng})`);
    setCoordinates({ lat: locationData.lat, lng: locationData.lng });
    
    try {
      const weatherData = await WeatherService.getCurrentWeather(locationData.lat, locationData.lng);
      setWeather(weatherData);
      addLog(`Weather loaded: ${weatherData?.temp}°C - ${weatherData?.description}`);
    } catch (error) {
      addLog(`Weather error: ${error}`);
    }
  };

  const testApiKeys = async () => {
    addLog('Testing API connections...');
    
    // Test if we can load Google Maps
    try {
      const response = await fetch('/api/test-google-maps');
      addLog(`Google Maps API: ${response.ok ? 'OK' : 'Failed'}`);
    } catch (error) {
      addLog(`Google Maps API: Error - ${error}`);
    }
    
    // Test weather API with a known location (London)
    try {
      const weather = await WeatherService.getCurrentWeather(51.5074, -0.1278);
      addLog(`Weather API: ${weather ? 'OK' : 'Failed'}`);
    } catch (error) {
      addLog(`Weather API: Error - ${error}`);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Location & Weather Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testApiKeys}>Test API Connections</Button>
          
          <LocationInput
            value={location}
            onChange={setLocation}
            onLocationSelect={handleLocationSelect}
            label="Test Location Input"
            placeholder="Try entering a postcode like 'SW1A 1AA'"
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
            <h4 className="font-medium">Debug Logs:</h4>
            <div className="bg-black text-green-400 p-2 rounded text-sm max-h-48 overflow-y-auto font-mono">
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
