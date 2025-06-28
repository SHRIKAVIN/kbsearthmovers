import React from 'react';
import { Phone, Mail, MapPin, Clock, User, MessageSquare } from 'lucide-react';

const ContactPage: React.FC = () => {
  const contactInfo = [
    {
      icon: User,
      title: 'Owner',
      content: 'BHASKARAN K',
      subtitle: 'Business Owner'
    },
    {
      icon: Phone,
      title: 'Phone Numbers',
      content: '9486532856',
      subtitle: '9943915881'
    },
    {
      icon: Mail,
      title: 'Email',
      content: 'skmbhaskaran@gmail.com',
      subtitle: 'For business inquiries'
    },
    {
      icon: Clock,
      title: 'Working Hours',
      content: '24/7 Available',
      subtitle: 'Emergency services available'
    }
  ];

  const services = [
    { name: 'JCB Services', description: 'Excavation, construction, and earthmoving' },
    { name: 'Tractor Rental', description: 'Agricultural and land preparation work' },
    { name: 'Harvester Services', description: 'Crop harvesting and processing' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-r from-amber-600 to-orange-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Contact Us</h1>
          <p className="text-xl text-amber-100 max-w-2xl mx-auto">
            Get in touch for professional heavy machinery rental services
          </p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Get In Touch</h2>
            <p className="text-lg text-gray-600">
              Contact KBS EARTHMOVERS & HARVESTER for all your heavy machinery needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {contactInfo.map((info, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg text-center hover:shadow-xl transition-shadow">
                <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <info.icon className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{info.title}</h3>
                <p className="text-gray-700 font-medium">{info.content}</p>
                {info.subtitle && (
                  <p className="text-gray-500 text-sm mt-1">{info.subtitle}</p>
                )}
              </div>
            ))}
          </div>

          {/* Contact Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Business Info */}
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Business Information</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <User className="h-6 w-6 text-amber-600 mt-1 mr-3" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Owner</h4>
                    <p className="text-gray-700">BHASKARAN K</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Phone className="h-6 w-6 text-amber-600 mt-1 mr-3" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Contact Numbers</h4>
                    <p className="text-gray-700">9486532856</p>
                    <p className="text-gray-700">9943915881</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Mail className="h-6 w-6 text-amber-600 mt-1 mr-3" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Email Address</h4>
                    <p className="text-gray-700">skmbhaskaran@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="h-6 w-6 text-amber-600 mt-1 mr-3" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Service Hours</h4>
                    <p className="text-gray-700">24/7 Available</p>
                    <p className="text-gray-500 text-sm">Emergency services available</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Services Overview */}
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Our Services</h3>
              <div className="space-y-4">
                {services.map((service, index) => (
                  <div key={index} className="border-l-4 border-amber-600 pl-4">
                    <h4 className="font-semibold text-gray-900">{service.name}</h4>
                    <p className="text-gray-600">{service.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                <p className="text-amber-800 text-sm">
                  <strong>Note:</strong> All equipment comes with experienced operators. 
                  Flexible rental periods available. Contact us for custom requirements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Contact */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Need Immediate Assistance?</h2>
          <p className="text-xl text-gray-300 mb-8">Call us now for urgent machinery requirements</p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8">
            <a
              href="tel:9486532856"
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center"
            >
              <Phone className="h-5 w-5 mr-2" />
              Call 9486532856
            </a>
            <a
              href="tel:9943915881"
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center"
            >
              <Phone className="h-5 w-5 mr-2" />
              Call 9943915881
            </a>
            <a
              href="mailto:skmbhaskaran@gmail.com"
              className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center"
            >
              <Mail className="h-5 w-5 mr-2" />
              Send Email
            </a>
          </div>
        </div>
      </section>

      {/* Business Hours & Notes */}
      <section className="py-12 bg-amber-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Important Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Clock className="h-5 w-5 text-amber-600 mr-2" />
                  Service Availability
                </h4>
                <ul className="text-gray-700 space-y-1">
                  <li>• 24/7 Emergency services</li>
                  <li>• Weekend bookings available</li>
                  <li>• Flexible scheduling</li>
                  <li>• Advance booking recommended</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <MessageSquare className="h-5 w-5 text-amber-600 mr-2" />
                  Booking Information
                </h4>
                <ul className="text-gray-700 space-y-1">
                  <li>• Call for instant quotes</li>
                  <li>• Minimum booking duration applies</li>
                  <li>• Operator services included</li>
                  <li>• Competitive pricing</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;