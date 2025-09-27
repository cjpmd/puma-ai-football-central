
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lat, lng, eventDate } = await req.json()
    const openWeatherApiKey = Deno.env.get('OPENWEATHERMAP_API_KEY')
    
    if (!openWeatherApiKey) {
      throw new Error('OpenWeatherMap API key not configured')
    }

    const baseUrl = 'https://api.openweathermap.org/data/2.5'
    
    // Determine if we need current weather or forecast
    const eventTime = new Date(eventDate || new Date()).getTime()
    const now = new Date().getTime()
    const timeDiff = eventTime - now
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

    let response
    
    if (daysDiff > 0 && daysDiff <= 5) {
      // Use forecast API for future events within 5 days
      response = await fetch(
        `${baseUrl}/forecast?lat=${lat}&lon=${lng}&appid=${openWeatherApiKey}&units=metric`
      )
      
      if (!response.ok) {
        throw new Error(`Weather forecast API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Find the forecast closest to the event date
      const targetDate = new Date(eventDate)
      const closestForecast = data.list.reduce((closest: any, current: any) => {
        const currentDate = new Date(current.dt * 1000)
        const closestDate = new Date(closest.dt * 1000)
        
        return Math.abs(currentDate.getTime() - targetDate.getTime()) < 
               Math.abs(closestDate.getTime() - targetDate.getTime()) ? current : closest
      })

      return new Response(
        JSON.stringify({
          temp: closestForecast.main.temp,
          description: closestForecast.weather[0].description,
          icon: closestForecast.weather[0].icon,
          humidity: closestForecast.main.humidity,
          windSpeed: closestForecast.wind.speed,
          feels_like: closestForecast.main.feels_like
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } else {
      // Use current weather API
      response = await fetch(
        `${baseUrl}/weather?lat=${lat}&lon=${lng}&appid=${openWeatherApiKey}&units=metric`
      )

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`)
      }

      const data = await response.json()
      
      return new Response(
        JSON.stringify({
          temp: data.main.temp,
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          humidity: data.main.humidity,
          windSpeed: data.wind.speed,
          feels_like: data.main.feels_like
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
