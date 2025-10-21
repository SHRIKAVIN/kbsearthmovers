// Mock weather service for development/testing when API key is not available
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

class MockWeatherService {
  private getRandomWeather() {
    const weatherTypes = [
      { desc: 'clear sky', temp: 28, humidity: 45 },
      { desc: 'few clouds', temp: 26, humidity: 55 },
      { desc: 'scattered clouds', temp: 24, humidity: 65 },
      { desc: 'broken clouds', temp: 22, humidity: 70 },
      { desc: 'light rain', temp: 20, humidity: 85 },
      { desc: 'moderate rain', temp: 18, humidity: 90 }
    ];
    
    return weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
  }

  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const weather = this.getRandomWeather();
    const now = new Date();
    
    return {
      temperature: weather.temp,
      description: weather.desc,
      humidity: weather.humidity,
      windSpeed: Math.floor(Math.random() * 10) + 2,
      visibility: Math.floor(Math.random() * 5) + 8,
      pressure: Math.floor(Math.random() * 20) + 1000,
      icon: '01d',
      city: 'Your Location',
      country: 'IN',
      feelsLike: weather.temp + Math.floor(Math.random() * 3) - 1,
      uvIndex: Math.floor(Math.random() * 8) + 2,
      sunrise: '06:30 AM',
      sunset: '06:45 PM'
    };
  }

  async getForecast(latitude: number, longitude: number): Promise<ForecastData[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const forecast: ForecastData[] = [];
    
    for (let i = 0; i < 5; i++) {
      const weather = this.getRandomWeather();
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      forecast.push({
        date: date.toDateString(),
        day: days[i],
        high: weather.temp + Math.floor(Math.random() * 5),
        low: weather.temp - Math.floor(Math.random() * 5),
        description: weather.desc,
        icon: '01d',
        precipitation: Math.floor(Math.random() * 30)
      });
    }
    
    return forecast;
  }

  async getWeatherByLocation(latitude: number, longitude: number): Promise<{
    current: WeatherData;
    forecast: ForecastData[];
  }> {
    const [current, forecast] = await Promise.all([
      this.getCurrentWeather(latitude, longitude),
      this.getForecast(latitude, longitude)
    ]);

    return { current, forecast };
  }
}

export const mockWeatherService = new MockWeatherService();
