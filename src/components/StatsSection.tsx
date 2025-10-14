import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface StatsData {
  totalProjects: number;
  totalHours: number;
  totalAmount: number;
  totalClients: number;
}

const StatsSection: React.FC = () => {
  const [stats, setStats] = useState<StatsData>({
    totalProjects: 0,
    totalHours: 0,
    totalAmount: 0,
    totalClients: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch work entries
        const { data: workEntries, error: workError } = await supabase
          .from('work_entries')
          .select('*');

        if (workError) {
          console.error('Error fetching work entries:', workError);
          return;
        }

        // Fetch broker entries
        const { data: brokerEntries, error: brokerError } = await supabase
          .from('broker_entries')
          .select('*');

        if (brokerError) {
          console.error('Error fetching broker entries:', brokerError);
          return;
        }

        // Calculate stats
        const allEntries = [...(workEntries || []), ...(brokerEntries || [])];
        
        // Total projects (entries)
        const totalProjects = allEntries.length;
        
        // Total hours
        const totalHours = allEntries.reduce((sum, entry) => {
          const hours = entry.hours_driven || entry.total_hours || 0;
          return sum + (typeof hours === 'string' ? parseFloat(hours) || 0 : hours);
        }, 0);
        
        // Total amount
        const totalAmount = allEntries.reduce((sum, entry) => {
          return sum + (entry.total_amount || 0);
        }, 0);
        
        // Unique clients (rental_person_name from work entries + broker_name from broker entries)
        const uniqueClients = new Set([
          ...(workEntries || []).map(entry => entry.rental_person_name).filter(Boolean),
          ...(brokerEntries || []).map(entry => entry.broker_name).filter(Boolean)
        ]);
        const totalClients = uniqueClients.size;

        setStats({
          totalProjects,
          totalHours,
          totalAmount,
          totalClients,
        });
      } catch (error) {
        console.error('Error calculating stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statsData = [
    { 
      number: loading ? '...' : `${stats.totalProjects}+`, 
      label: 'Projects Completed' 
    },
    { 
      number: loading ? '...' : `${stats.totalClients}+`, 
      label: 'Happy Clients' 
    },
    { 
      number: loading ? '...' : `${Math.round(stats.totalHours)}+`, 
      label: 'Hours Worked' 
    },
    { 
      number: '10+', 
      label: 'Years of Experience' 
    },
  ];

  return (
    <section data-testid="stats-section" className="py-16 bg-gradient-to-r from-amber-600 to-orange-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {statsData.map((stat, index) => (
            <div 
              key={index} 
              data-testid={`stat-${index}`} 
              className="text-center animate-fade-in-up" 
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
                {stat.number}
              </div>
              <div className="text-amber-100 text-sm sm:text-base">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
