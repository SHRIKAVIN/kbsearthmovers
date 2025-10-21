import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, Eye, Gauge } from 'lucide-react';
import { weatherService, WeatherData } from '../lib/weatherService';

interface WeatherWidgetProps {
  className?: string;
  showDetails?: boolean;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ className = '', showDetails = true }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get weather icon based on description
  const getWeatherIcon = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('rain') || desc.includes('drizzle')) return CloudRain;
    if (desc.includes('snow')) return CloudSnow;
    if (desc.includes('cloud')) return Cloud;
    return Sun;
  };

  // Get weather color based on description
  const getWeatherColor = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('rain') || desc.includes('drizzle')) return 'from-blue-500 to-blue-600';
    if (desc.includes('snow')) return 'from-gray-400 to-gray-500';
    if (desc.includes('cloud')) return 'from-gray-500 to-gray-600';
    return 'from-yellow-400 to-orange-500';
  };

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get user's location
        if (!navigator.geolocation) {
          throw new Error('Geolocation is not supported by this browser.');
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
              const weatherData = await weatherService.getCurrentWeather(latitude, longitude);
              setWeather(weatherData);
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

    fetchWeather();
  }, []);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-4 sm:p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-amber-600"></div>
          <span className="ml-2 sm:ml-3 text-gray-600 text-sm sm:text-base">Loading weather...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-4 sm:p-6 ${className}`}>
        <div className="text-center">
          <Cloud className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 text-xs sm:text-sm px-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const WeatherIcon = getWeatherIcon(weather.description);
  const weatherColor = getWeatherColor(weather.description);

  return (
    <div className={`relative bg-gradient-to-br ${weatherColor} text-white rounded-2xl shadow-xl overflow-hidden ${className}`}>
      {/* Weather-themed Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
      
      <div className="relative p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold truncate text-white">
              Current Weather
            </h3>
            <p className="text-xs sm:text-sm opacity-90 truncate flex items-center">
              <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
              {weather.city}, {weather.country}
            </p>
          </div>
          <WeatherIcon className="h-8 w-8 sm:h-10 sm:w-10 opacity-90 flex-shrink-0 ml-2 drop-shadow-lg" />
        </div>

        {/* Main Weather Info */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex-1">
            <div className="text-4xl sm:text-5xl font-bold text-white drop-shadow-lg">
              {weather.temperature}°C
            </div>
            <div className="text-sm sm:text-base capitalize opacity-90 truncate font-medium">
              {weather.description}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl sm:text-3xl font-bold drop-shadow-lg">{weather.temperature}°</div>
            <div className="text-xs opacity-80 bg-white/20 px-2 py-1 rounded-full">
              Feels like {weather.feelsLike}°
            </div>
          </div>
        </div>

        {/* Weather Details */}
        {showDetails && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-white/30">
            <div className="flex items-center space-x-2 bg-white/20 rounded-lg p-2 sm:p-3">
              <Droplets className="h-4 w-4 sm:h-5 sm:w-5 opacity-90 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">{weather.humidity}%</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/20 rounded-lg p-2 sm:p-3">
              <Wind className="h-4 w-4 sm:h-5 sm:w-5 opacity-90 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">{weather.windSpeed} m/s</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/20 rounded-lg p-2 sm:p-3">
              <Eye className="h-4 w-4 sm:h-5 sm:w-5 opacity-90 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">{weather.visibility} km</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/20 rounded-lg p-2 sm:p-3">
              <Gauge className="h-4 w-4 sm:h-5 sm:w-5 opacity-90 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium truncate">{weather.pressure} hPa</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherWidget;
