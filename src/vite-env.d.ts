
/// <reference types="vite/client" />

// Google Maps API type declarations
declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options?: any);
    }
    
    namespace places {
      class Autocomplete {
        constructor(input: HTMLInputElement, options?: any);
        addListener(event: string, handler: () => void): void;
        getPlace(): {
          geometry?: {
            location: {
              lat(): number;
              lng(): number;
            };
          };
          formatted_address?: string;
        };
      }
    }
  }
}
