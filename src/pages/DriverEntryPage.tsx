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
    'Sakthi / Mohan',
  ];

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<Omit<WorkEntry, 'id' | 'created_at' | 'updated_at'> & { broker?: string }>({
    defaultValues: {
      rental_person_name: '',
      driver_name: 'Sakthi / Mohan',
      broker: '',
      machine_type: 'Harvester',
      hours_driven: undefined,
      total_amount: undefined,
      amount_received: undefined,
      advance_amount: undefined,
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      entry_type: 'driver'
    }
  });

  const watchedValues = watch();

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage('');

    try {
      // Convert undefined values to 0 for database insertion
      const submitData = {
        ...data,
        hours_driven: data.hours_driven || 0,
        total_amount: data.total_amount || 0,
        amount_received: data.amount_received || 0,
        advance_amount: data.advance_amount || 0,
        entry_type: 'driver',
        broker: data.broker || '',
      };

      const { error } = await supabase
        .from('work_entries')
        .insert([submitData]);

      if (error) {
        throw error;
      }

      setSubmitStatus('success');
      
      reset({
        rental_person_name: '',
        driver_name: 'Sakthi / Mohan',
        broker: '',
        machine_type: 'Harvester',
        hours_driven: undefined,
        total_amount: undefined,
        amount_received: undefined,
        advance_amount: undefined,
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
    <div data-testid="driver-entry-page" className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-4 sm:py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 animate-fade-in-up">
          <div className="bg-white p-3 sm:p-4 rounded-full w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 shadow-lg transform hover:scale-110 transition-transform duration-300">
            <User className="h-10 w-10 sm:h-12 sm:w-12 text-amber-600 mx-auto" />
          </div>
          <h1 data-testid="driver-entry-title" className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Driver Entry Form</h1>
          <p className="text-gray-600 text-sm sm:text-base">Submit your work details after completing the job</p>
        </div>

        {/* Form */}
        <div data-testid="driver-entry-form-container" className="bg-white shadow-xl rounded-xl p-4 sm:p-8 animate-fade-in-up animation-delay-300">
          <form data-testid="driver-entry-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            {/* Rental Person Name */}
            <div className="animate-slide-in-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Rental Person Name *
              </label>
              <input
                data-testid="rental-person-name"
                type="text"
                {...register('rental_person_name', { required: 'Rental person name is required' })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base bg-white text-gray-900"
                placeholder="Enter rental person's name"
              />
              {errors.rental_person_name && (
                <p data-testid="rental-person-name-error" className="mt-1 text-sm text-red-600 animate-shake">{errors.rental_person_name.message}</p>
              )}
            </div>

            {/* Driver Name Dropdown */}
            <div className="animate-slide-in-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Driver Name *
              </label>
              <select
                data-testid="driver-name-select"
                {...register('driver_name', { required: 'Driver name is required' })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base bg-white text-gray-900"
              >
                {driverNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              {errors.driver_name && (
                <p data-testid="driver-name-error" className="mt-1 text-sm text-red-600 animate-shake">{errors.driver_name.message}</p>
              )}
            </div>

            {/* Broker Field */}
            <div className="animate-slide-in-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Broker
              </label>
              <input
                data-testid="broker-input"
                type="text"
                {...register('broker')}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base bg-white text-gray-900"
                placeholder="Enter broker name (if any)"
              />
            </div>

            {/* Machine Type */}
            <div className="animate-slide-in-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Truck className="inline h-4 w-4 mr-1" />
                Machine Type
              </label>
              <select
                data-testid="machine-type-select"
                {...register('machine_type', { required: 'Machine type is required' })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base bg-white text-gray-900"
              >
                <option value="Harvester">Harvester</option>
              </select>
              {errors.machine_type && (
                <p data-testid="machine-type-error" className="mt-1 text-sm text-red-600 animate-shake">{errors.machine_type.message}</p>
              )}
            </div>

            {/* Hours Driven */}
            <div className="animate-slide-in-right">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Hours Driven
              </label>
              <input
                data-testid="hours-driven"
                type="number"
                step="0.01"
                min="0"
                {...register('hours_driven', { 
                  min: { value: 0, message: 'Hours must be positive' }
                })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base bg-white text-gray-900"
                placeholder="Enter hours driven"
              />
              {errors.hours_driven && (
                <p data-testid="hours-driven-error" className="mt-1 text-sm text-red-600 animate-shake">{errors.hours_driven.message}</p>
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
                  data-testid="total-amount"
                  type="number"
                  min="0"
                  {...register('total_amount', { 
                    min: { value: 0, message: 'Amount must be positive' }
                  })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base bg-white text-gray-900"
                  placeholder="Enter total amount"
                />
                {errors.total_amount && (
                  <p data-testid="total-amount-error" className="mt-1 text-sm text-red-600 animate-shake">{errors.total_amount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Amount Received (₹)
                </label>
                <input
                  data-testid="amount-received"
                  type="number"
                  min="0"
                  {...register('amount_received', { 
                    min: { value: 0, message: 'Amount must be positive' }
                  })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base bg-white text-gray-900"
                  placeholder="Enter amount received"
                />
                {errors.amount_received && (
                  <p data-testid="amount-received-error" className="mt-1 text-sm text-red-600 animate-shake">{errors.amount_received.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Advance Amount (₹)
                </label>
                <input
                  data-testid="advance-amount"
                  type="number"
                  min="0"
                  {...register('advance_amount', { 
                    min: { value: 0, message: 'Amount must be positive' }
                  })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base bg-white text-gray-900"
                  placeholder="Enter advance amount"
                />
                {errors.advance_amount && (
                  <p data-testid="advance-amount-error" className="mt-1 text-sm text-red-600 animate-shake">{errors.advance_amount.message}</p>
                )}
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-in-up">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date *
                </label>
                <input
                  data-testid="date-input"
                  type="date"
                  {...register('date', { required: 'Date is required' })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base bg-white text-gray-900"
                />
                {errors.date && (
                  <p data-testid="date-error" className="mt-1 text-sm text-red-600 animate-shake">{errors.date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Timer className="inline h-4 w-4 mr-1" />
                  Time *
                </label>
                <input
                  data-testid="time-input"
                  type="time"
                  {...register('time', { required: 'Time is required' })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base bg-white text-gray-900"
                />
                {errors.time && (
                  <p data-testid="time-error" className="mt-1 text-sm text-red-600 animate-shake">{errors.time.message}</p>
                )}
              </div>
            </div>

            {/* Preview Summary */}
            {watchedValues.rental_person_name && watchedValues.driver_name && (
              <div data-testid="entry-preview" className="bg-amber-50 border border-amber-200 rounded-lg p-4 animate-fade-in-up">
                <h4 className="text-sm font-medium text-amber-800 mb-2">Entry Preview</h4>
                <div className="text-xs text-amber-700 space-y-1">
                  <p><strong>Client:</strong> {watchedValues.rental_person_name}</p>
                  <p><strong>Driver:</strong> {watchedValues.driver_name}</p>
                  <p><strong>Machine:</strong> {watchedValues.machine_type}</p>
                  {watchedValues.hours_driven && watchedValues.hours_driven > 0 && <p><strong>Hours:</strong> {watchedValues.hours_driven}</p>}
                  {watchedValues.total_amount && watchedValues.total_amount > 0 && <p><strong>Total Amount:</strong> ₹{watchedValues.total_amount}</p>}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              data-testid="submit-entry-button"
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
            <div data-testid="success-message" className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center animate-bounce-in">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-green-700">Entry submitted successfully!</span>
            </div>
          )}

          {submitStatus === 'error' && (
            <div data-testid="error-message" className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center animate-shake">
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