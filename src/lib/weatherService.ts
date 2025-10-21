// Weather API service for OpenWeatherMap integration
import { mockWeatherService } from './mockWeatherService';

export interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  pressure: number;
  icon: string;
  city: string;
  country: string;
  feelsLike: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
}

export interface ForecastData {
  date: string;
  day: string;
  high: number;
  low: number;
  description: string;
  icon: string;
  precipitation: number;
}

class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.weatherapi.com/v1';

  constructor() {
    this.apiKey = import.meta.env.VITE_WEATHERAPI_KEY;
    
    if (!this.apiKey) {
      console.error('WeatherAPI key not found. Please add VITE_WEATHERAPI_KEY to your .env.local file');
    }
  }

  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData> {
    try {
      const response = await fetch(
        `${this.baseUrl}/current.json?key=${this.apiKey}&q=${latitude},${longitude}&aqi=no`
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your WeatherAPI key in .env.local');
        }
        throw new Error('Failed to fetch current weather data');
      }

      const data = await response.json();

    return {
      temperature: Math.round(data.current.temp_c),
      description: data.current.condition.text,
      humidity: data.current.humidity,
      windSpeed: data.current.wind_kph / 3.6, // Convert km/h to m/s
      visibility: data.current.vis_km,
      pressure: data.current.pressure_mb,
      icon: data.current.condition.icon,
      city: data.location.name,
      country: data.location.country,
      feelsLike: Math.round(data.current.feelslike_c),
      uvIndex: data.current.uv,
      sunrise: data.forecast?.forecastday?.[0]?.astro?.sunrise || '06:30 AM',
      sunset: data.forecast?.forecastday?.[0]?.astro?.sunset || '06:30 PM'
    };
    } catch (error) {
      console.error('WeatherAPI failed, using mock data:', error);
      return await mockWeatherService.getCurrentWeather(latitude, longitude);
    }
  }

  async getForecast(latitude: number, longitude: number): Promise<ForecastData[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${latitude},${longitude}&days=5&aqi=no&alerts=no`
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your WeatherAPI key in .env.local');
        }
        throw new Error('Failed to fetch forecast data');
      }

    const data = await response.json();
    const dailyForecast: ForecastData[] = [];

    data.forecast.forecastday.forEach((day: any) => {
      const date = new Date(day.date);
      dailyForecast.push({
        date: day.date,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        high: Math.round(day.day.maxtemp_c),
        low: Math.round(day.day.mintemp_c),
        description: day.day.condition.text,
        icon: day.day.condition.icon,
        precipitation: day.day.daily_chance_of_rain
      });
    });

    return dailyForecast;
    } catch (error) {
      console.error('WeatherAPI forecast failed, using mock data:', error);
      return await mockWeatherService.getForecast(latitude, longitude);
    }
  }

  async getWeatherByLocation(latitude: number, longitude: number): Promise<{
    current: WeatherData;
    forecast: ForecastData[];
  }> {
    try {
      const [current, forecast] = await Promise.all([
        this.getCurrentWeather(latitude, longitude),
        this.getForecast(latitude, longitude)
      ]);

      return { current, forecast };
    } catch (error) {
      console.error('Weather service error:', error);
      console.log('Falling back to mock weather service...');
      
      // Fallback to mock service when API fails
      return await mockWeatherService.getWeatherByLocation(latitude, longitude);
    }
  }
}

export const weatherService = new WeatherService();
