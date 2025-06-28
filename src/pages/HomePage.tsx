import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Tractor, Wheat, Phone, Mail, Clock, Shield, Users, Star } from 'lucide-react';

const HomePage: React.FC = () => {
  const services = [
    {
      icon: Truck,
      title: 'JCB Services',
      description: 'Heavy-duty excavation and construction work with modern JCB machines',
      image: 'https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      icon: Tractor,
      title: 'Tractor Rental',
      description: 'Reliable tractors for farming, land preparation, and agricultural needs',
      image: 'https://images.pexels.com/photos/158028/bellingrath-gardens-alabama-landscape-scenic-158028.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      icon: Wheat,
      title: 'Harvester Services',
      description: 'Efficient harvesting solutions for various crops with modern equipment',
      image: 'https://images.pexels.com/photos/2132180/pexels-photo-2132180.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
  ];

  const features = [
    {
      icon: Clock,
      title: '24/7 Availability',
      description: 'Round-the-clock service for your urgent projects',
    },
    {
      icon: Shield,
      title: 'Reliable Equipment',
      description: 'Well-maintained machines with guaranteed performance',
    },
    {
      icon: Users,
      title: 'Expert Operators',
      description: 'Skilled drivers and operators for all equipment',
    },
  ];

  const stats = [
    { number: '500+', label: 'Projects Completed' },
    { number: '50+', label: 'Happy Clients' },
    { number: '15+', label: 'Years Experience' },
    { number: '24/7', label: 'Support Available' },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105 animate-slow-zoom"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.4)), url(https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=1920)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/40" />
        
        <div className="relative z-10 text-center text-white max-w-5xl mx-auto px-4">
          <div className="animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight">
              KBS EARTHMOVERS
              <span className="block text-amber-400 text-2xl sm:text-3xl md:text-4xl mt-2 animate-pulse">
                & HARVESTER
              </span>
            </h1>
          </div>
          
          <div className="animate-fade-in-up animation-delay-300">
            <p className="text-lg sm:text-xl md:text-2xl mb-4 font-light">
              Professional Heavy Machinery Rental Services
            </p>
            <p className="text-base sm:text-lg mb-8 text-amber-100">
              Your trusted partner for JCB, Tractor, and Harvester rentals
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-500">
            <Link
              to="/services"
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center group"
            >
              View Services
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/contact"
              className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-6 sm:px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              Contact Us
            </Link>
          </div>
        </div>
        
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-amber-600 to-orange-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center animate-fade-in-up" style={{animationDelay: `${index * 0.1}s`}}>
                <div className="text-3xl sm:text-4xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-amber-100 text-sm sm:text-base">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Professional heavy machinery rental services with experienced operators
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-all duration-500 hover:shadow-2xl group animate-fade-in-up"
                style={{animationDelay: `${index * 0.2}s`}}
              >
                <div className="h-48 sm:h-56 overflow-hidden relative">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-gradient-to-br from-amber-100 to-orange-100 p-3 rounded-lg group-hover:scale-110 transition-transform duration-300">
                      <service.icon className="h-6 w-6 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 ml-3">{service.title}</h3>
                  </div>
                  <p className="text-gray-600 mb-4 text-sm sm:text-base">{service.description}</p>
                  <Link
                    to="/contact"
                    className="text-amber-600 hover:text-amber-700 font-medium flex items-center group-hover:translate-x-2 transition-transform duration-300"
                  >
                    Get Quote
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Why Choose KBS?</h2>
            <p className="text-lg sm:text-xl text-gray-600">Reliable service you can trust</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 group animate-fade-in-up" style={{animationDelay: `${index * 0.2}s`}}>
                <div className="bg-gradient-to-br from-amber-100 to-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:shadow-lg">
                  <feature.icon className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in-up">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8">What Our Clients Say</h2>
            <div className="max-w-3xl mx-auto">
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                ))}
              </div>
              <blockquote className="text-lg sm:text-xl text-gray-300 mb-6 italic">
                "KBS EARTHMOVERS has been our go-to partner for all heavy machinery needs. 
                Their equipment is top-notch and their operators are highly skilled. 
                Highly recommended for any construction project."
              </blockquote>
              <cite className="text-amber-400 font-semibold">- Construction Industry Client</cite>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Contact */}
      <section className="py-16 bg-gradient-to-r from-amber-600 to-orange-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in-up">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-lg sm:text-xl text-amber-100 mb-8">Contact us for immediate assistance</p>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8">
              <a
                href="tel:9486532856"
                className="flex items-center text-white hover:text-amber-200 transition-colors duration-300 transform hover:scale-105"
              >
                <Phone className="h-5 w-5 mr-2" />
                <span className="font-semibold">9486532856</span>
              </a>
              <a
                href="tel:9943915881"
                className="flex items-center text-white hover:text-amber-200 transition-colors duration-300 transform hover:scale-105"
              >
                <Phone className="h-5 w-5 mr-2" />
                <span className="font-semibold">9943915881</span>
              </a>
              <a
                href="mailto:skmbhaskaran@gmail.com"
                className="flex items-center text-white hover:text-amber-200 transition-colors duration-300 transform hover:scale-105"
              >
                <Mail className="h-5 w-5 mr-2" />
                <span className="font-semibold">skmbhaskaran@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;