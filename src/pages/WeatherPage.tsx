import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow, 
  Wind, 
  Droplets, 
  Eye, 
  Gauge, 
  MapPin,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { weatherService, WeatherData, ForecastData } from '../lib/weatherService';

const WeatherPage: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const getWeatherIcon = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('rain') || desc.includes('drizzle')) return CloudRain;
    if (desc.includes('snow')) return CloudSnow;
    if (desc.includes('cloud')) return Cloud;
    return Sun;
  };

  const getWeatherColor = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('rain') || desc.includes('drizzle')) return 'from-blue-500 to-blue-600';
    if (desc.includes('snow')) return 'from-gray-400 to-gray-500';
    if (desc.includes('cloud')) return 'from-gray-500 to-gray-600';
    return 'from-yellow-400 to-orange-500';
  };

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser.');
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            const { current, forecast } = await weatherService.getWeatherByLocation(latitude, longitude);
            setWeather(current);
            setForecast(forecast);
            setLastUpdated(new Date());
          } catch (apiError) {
            console.error('Weather API error:', apiError);
            setError('Failed to load weather data. Please check your API key.');
          }
          setLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Unable to get your location. Please enable location services.');
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError('Failed to load weather data. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Weather Data...</h2>
          <p className="text-gray-500 mt-2">Getting your location and weather information</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Cloud className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Weather Unavailable</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={fetchWeatherData}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-300 flex items-center mx-auto"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const WeatherIcon = getWeatherIcon(weather.description);
  const weatherColor = getWeatherColor(weather.description);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 relative" style={{willChange: 'auto'}}>
      {/* Weather-themed Background - Simplified */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 via-transparent to-indigo-100/20" style={{transform: 'translate3d(0,0,0)'}}></div>
      
      <div className="relative max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Weather Forecast</h1>
            <p className="text-sm sm:text-base text-gray-600">Current conditions and 5-day forecast</p>
          </div>
          <button
            onClick={fetchWeatherData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-3 rounded-lg shadow-md transition-colors duration-300 flex items-center justify-center w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="text-sm sm:text-base font-medium">Refresh</span>
          </button>
        </div>

        {/* Current Weather */}
        <div className={`bg-gradient-to-br ${weatherColor} text-white rounded-2xl shadow-xl overflow-hidden mb-6 sm:mb-8`}>
          <div className="p-4 sm:p-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center mb-2">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                  <span className="text-sm sm:text-lg font-semibold truncate">{weather.city}, {weather.country}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm opacity-90">
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
              <WeatherIcon className="h-12 w-12 sm:h-16 sm:w-16 opacity-90 flex-shrink-0 ml-2" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
              <div className="text-center sm:text-center">
                <div className="text-4xl sm:text-6xl font-bold mb-1 sm:mb-2">{weather.temperature}°C</div>
                <div className="text-lg sm:text-xl capitalize opacity-90">{weather.description}</div>
                <div className="text-sm opacity-80 mt-1">Feels like {weather.feelsLike}°C</div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Droplets className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0" />
                    <span className="text-sm sm:text-base">Humidity</span>
                  </div>
                  <span className="font-semibold text-sm sm:text-base">{weather.humidity}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Wind className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0" />
                    <span className="text-sm sm:text-base">Wind Speed</span>
                  </div>
                  <span className="font-semibold text-sm sm:text-base">{weather.windSpeed} m/s</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0" />
                    <span className="text-sm sm:text-base">Visibility</span>
                  </div>
                  <span className="font-semibold text-sm sm:text-base">{weather.visibility} km</span>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Gauge className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0" />
                    <span className="text-sm sm:text-base">Pressure</span>
                  </div>
                  <span className="font-semibold text-sm sm:text-base">{weather.pressure} hPa</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Sun className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0" />
                    <span className="text-sm sm:text-base">Sunrise</span>
                  </div>
                  <span className="font-semibold text-sm sm:text-base">{weather.sunrise}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Sun className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0" />
                    <span className="text-sm sm:text-base">Sunset</span>
                  </div>
                  <span className="font-semibold text-sm sm:text-base">{weather.sunset}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5-Day Forecast */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-8 border border-blue-200/50">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">5-Day Forecast</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {forecast.map((day, index) => {
              const DayIcon = getWeatherIcon(day.description);
              return (
                <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 sm:p-4 text-center hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 border border-blue-200/30 shadow-sm hover:shadow-md">
                  <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">{day.day}</div>
                  <DayIcon className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 sm:mb-3 text-blue-600" />
                  <div className="text-base sm:text-lg font-bold text-gray-800">{day.high}°</div>
                  <div className="text-sm text-gray-600">{day.low}°</div>
                  <div className="text-xs text-gray-700 mt-1 sm:mt-2 capitalize truncate bg-white/50 px-2 py-1 rounded-full">
                    {day.description}
                  </div>
                  <div className="text-xs text-blue-600 mt-2 font-medium bg-blue-100 px-2 py-1 rounded-full">
                    {day.precipitation}% rain
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="text-center mt-6 text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherPage;
