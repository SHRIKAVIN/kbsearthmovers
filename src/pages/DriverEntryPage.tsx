import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { supabase, type WorkEntry } from '../lib/supabase';
import { CheckCircle, AlertCircle, User, Truck, Clock, DollarSign, Calendar, Timer } from 'lucide-react';

const DriverEntryPage: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const driverNames = [
    'Vignesh',
    'Markandeyan',
    'Vijayakumar',
    'Mohan',
    'Sakthi',
  ];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Omit<WorkEntry, 'id' | 'created_at' | 'updated_at'>>({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      entry_type: 'driver'
    }
  });

  const onSubmit = async (data: Omit<WorkEntry, 'id' | 'created_at' | 'updated_at'>) => {
    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage('');

    try {
      const { error } = await supabase
        .from('work_entries')
        .insert([{
          ...data,
          entry_type: 'driver'
        }]);

      if (error) {
        throw error;
      }

      setSubmitStatus('success');
      reset({
        rental_person_name: '',
        driver_name: '',
        machine_type: 'JCB',
        hours_driven: 0,
        total_amount: 0,
        amount_received: 0,
        advance_amount: 0,
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        entry_type: 'driver'
      });
    } catch (error: any) {
      setSubmitStatus('error');
      setErrorMessage(error.message || 'Failed to submit entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-4 sm:py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 animate-fade-in-up">
          <div className="bg-white p-3 sm:p-4 rounded-full w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 shadow-lg transform hover:scale-110 transition-transform duration-300">
            <User className="h-10 w-10 sm:h-12 sm:w-12 text-amber-600 mx-auto" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Driver Entry Form</h1>
          <p className="text-gray-600 text-sm sm:text-base">Submit your work details after completing the job</p>
        </div>

        {/* Form */}
        <div className="bg-white shadow-xl rounded-xl p-4 sm:p-8 animate-fade-in-up animation-delay-300">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            {/* Rental Person Name */}
            <div className="animate-slide-in-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Rental Person Name
              </label>
              <input
                type="text"
                {...register('rental_person_name', { required: 'Rental person name is required' })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                placeholder="Enter rental person's name"
              />
              {errors.rental_person_name && (
                <p className="mt-1 text-sm text-red-600 animate-shake">{errors.rental_person_name.message}</p>
              )}
            </div>

            {/* Driver Name Dropdown */}
            <div className="animate-slide-in-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Driver Name
              </label>
              <select
                {...register('driver_name', { required: 'Driver name is required' })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
              >
                <option value="">Select driver name</option>
                {driverNames.map((name, index) => (
                  <option key={index} value={name}>{name}</option>
                ))}
              </select>
              {errors.driver_name && (
                <p className="mt-1 text-sm text-red-600 animate-shake">{errors.driver_name.message}</p>
              )}
            </div>

            {/* Machine Type */}
            <div className="animate-slide-in-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Truck className="inline h-4 w-4 mr-1" />
                Machine Type
              </label>
              <select
                {...register('machine_type', { required: 'Machine type is required' })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
              >
                <option value="JCB">JCB</option>
                <option value="Tractor">Tractor</option>
                <option value="Harvester">Harvester</option>
              </select>
              {errors.machine_type && (
                <p className="mt-1 text-sm text-red-600 animate-shake">{errors.machine_type.message}</p>
              )}
            </div>

            {/* Hours Driven */}
            <div className="animate-slide-in-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Hours Driven
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('hours_driven', { 
                  required: 'Hours driven is required',
                  min: { value: 0, message: 'Hours must be positive' }
                })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                placeholder="Enter hours driven"
              />
              {errors.hours_driven && (
                <p className="mt-1 text-sm text-red-600 animate-shake">{errors.hours_driven.message}</p>
              )}
            </div>

            {/* Amount Fields */}
            <div className="grid grid-cols-1 gap-4 animate-fade-in-up">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Total Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  {...register('total_amount', { 
                    required: 'Total amount is required',
                    min: { value: 0, message: 'Amount must be positive' }
                  })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                  placeholder="0"
                />
                {errors.total_amount && (
                  <p className="mt-1 text-sm text-red-600 animate-shake">{errors.total_amount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Amount Received (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  {...register('amount_received', { 
                    required: 'Amount received is required',
                    min: { value: 0, message: 'Amount must be positive' }
                  })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                  placeholder="0"
                />
                {errors.amount_received && (
                  <p className="mt-1 text-sm text-red-600 animate-shake">{errors.amount_received.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Advance Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  {...register('advance_amount', { 
                    required: 'Advance amount is required',
                    min: { value: 0, message: 'Amount must be positive' }
                  })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                  placeholder="0"
                />
                {errors.advance_amount && (
                  <p className="mt-1 text-sm text-red-600 animate-shake">{errors.advance_amount.message}</p>
                )}
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-in-up">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  {...register('date', { required: 'Date is required' })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600 animate-shake">{errors.date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Timer className="inline h-4 w-4 mr-1" />
                  Time
                </label>
                <input
                  type="time"
                  {...register('time', { required: 'Time is required' })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                />
                {errors.time && (
                  <p className="mt-1 text-sm text-red-600 animate-shake">{errors.time.message}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:transform-none disabled:shadow-none animate-pulse-slow"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Submitting...
                </div>
              ) : (
                'Submit Entry'
              )}
            </button>
          </form>

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center animate-bounce-in">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-green-700">Entry submitted successfully!</span>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center animate-shake">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverEntryPage;