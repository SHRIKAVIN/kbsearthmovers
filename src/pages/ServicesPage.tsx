import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, Tractor, Wheat, ArrowRight, CheckCircle } from 'lucide-react';

const ServicesPage: React.FC = () => {
  const services = [
    {
      icon: Truck,
      title: 'JCB Services',
      description: 'Professional excavation and construction work',
      image: 'https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=800',
      features: [
        'Site preparation and excavation',
        'Foundation digging',
        'Road construction support',
        'Material handling and loading',
        'Demolition work',
        'Landscaping and grading'
      ],
      specifications: [
        'Operating weight: 8-15 tons',
        'Bucket capacity: 0.5-1.2 cubic meters',
        'Maximum dig depth: 4-6 meters',
        'Experienced operators included'
      ]
    },
    {
      icon: Tractor,
      title: 'Tractor Rental',
      description: 'Versatile agricultural and construction tractors',
      image: 'https://images.pexels.com/photos/158028/bellingrath-gardens-alabama-landscape-scenic-158028.jpeg?auto=compress&cs=tinysrgb&w=800',
      features: [
        'Land preparation and plowing',
        'Seeding and planting',
        'Cultivation and weeding',
        'Material transportation',
        'PTO-driven implement operations',
        'Field maintenance'
      ],
      specifications: [
        'Engine power: 35-75 HP',
        '4WD and 2WD options available',
        'Multiple implement compatibility',
        'Fuel-efficient operations'
      ]
    },
    {
      icon: Wheat,
      title: 'Harvester Services',
      description: 'Efficient crop harvesting solutions',
      image: 'https://images.pexels.com/photos/2132180/pexels-photo-2132180.jpeg?auto=compress&cs=tinysrgb&w=800',
      features: [
        'Rice harvesting',
        'Wheat and grain crops',
        'Corn and maize harvesting',
        'Multi-crop compatibility',
        'Grain cleaning and separation',
        'Straw management'
      ],
      specifications: [
        'Cutting width: 2.5-4 meters',
        'Grain tank capacity: 3-5 tons',
        'Advanced threshing technology',
        'GPS guidance systems available'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-r from-amber-600 to-orange-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Our Services</h1>
          <p className="text-xl text-amber-100 max-w-2xl mx-auto">
            Professional heavy machinery rental services for construction, agriculture, and industrial needs
          </p>
        </div>
      </section>

      {/* Services Detail */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-20">
            {services.map((service, index) => (
              <div key={index} className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}>
                <div className="lg:w-1/2">
                  <div className="relative overflow-hidden rounded-xl shadow-2xl bg-white p-8">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-80 object-contain hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-6 left-6 bg-white p-3 rounded-lg shadow-lg">
                      <service.icon className="h-8 w-8 text-amber-600" />
                    </div>
                  </div>
                </div>
                
                <div className="lg:w-1/2 space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">{service.title}</h2>
                    <p className="text-lg text-gray-600 mb-6">{service.description}</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Service Features</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {service.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Specifications</h3>
                    <ul className="space-y-2">
                      {service.specifications.map((spec, specIndex) => (
                        <li key={specIndex} className="text-gray-700 flex items-center">
                          <div className="w-2 h-2 bg-amber-600 rounded-full mr-3"></div>
                          {spec}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4">
                    <Link
                      to="/contact"
                      className="inline-flex items-center bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
                    >
                      Get Quote for {service.title}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Need Custom Solutions?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            We provide tailored machinery rental solutions for your specific project requirements
          </p>
          <Link
            to="/contact"
            className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 inline-flex items-center"
          >
            Contact Our Team
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;