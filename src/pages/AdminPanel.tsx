import React, { useState, useEffect, useRef } from 'react';
import { supabase, type WorkEntry, type BrokerEntry } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { Lock, Eye, Download, Filter, Plus, Edit2, Trash2, Search, User, LogOut, Save, X, Users, FileText, RefreshCw, Building2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface AdminPanelProps {
  adminUser: string;
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ adminUser, onLogout }) => {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [brokerEntries, setBrokerEntries] = useState<BrokerEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<WorkEntry[]>([]);
  const [filteredBrokerEntries, setFilteredBrokerEntries] = useState<BrokerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'driver' | 'admin' | 'all' | 'brokers'>('all');
  const [editingEntry, setEditingEntry] = useState<WorkEntry | null>(null);
  const [editingBrokerEntry, setEditingBrokerEntry] = useState<BrokerEntry | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddBrokerForm, setShowAddBrokerForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    machineType: '',
    driver: '',
    broker: '',
    search: ''
  });
  const [brokerFilters, setBrokerFilters] = useState({
    dateFrom: '',
    dateTo: '',
    brokerName: '',
    search: ''
  });
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [showingStickyBar, setShowingStickyBar] = useState(false);
  const [stickyBarAnimation, setStickyBarAnimation] = useState('animate-fade-in-up');
  const tableRef = useRef<HTMLDivElement>(null);

  const driverNames = [
    'Vignesh',
    'Markandeyan',
    'Vijayakumar',
    'Sakthi / Mohan',
  ];

  const adminUsers = [
    'BHASKARAN K',
    'SHRINIVAS B',
    'SHRIKAVIN B'
  ];

  useEffect(() => {
    fetchEntries();
    fetchBrokerEntries();
    
    // Set up real-time subscription for work entries
    const workEntriesSubscription = supabase
      .channel('admin_work_entries_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'work_entries' },
        () => {
          console.log('Work entries changed, refetching...');
          fetchEntries();
        }
      )
      .subscribe();

    // Set up real-time subscription for broker entries
    const brokerEntriesSubscription = supabase
      .channel('admin_broker_entries_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'broker_entries' },
        () => {
          console.log('Broker entries changed, refetching...');
          fetchBrokerEntries();
        }
      )
      .subscribe();

    return () => {
      workEntriesSubscription.unsubscribe();
      brokerEntriesSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, filters, activeTab]);

  useEffect(() => {
    applyBrokerFilters();
  }, [brokerEntries, brokerFilters]);

  useEffect(() => {
    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };
    const observer = new window.IntersectionObserver(handleObserver, {
      root: null,
      threshold: 0.1,
    });
    if (tableRef.current) {
      observer.observe(tableRef.current);
    }
    return () => {
      if (tableRef.current) observer.unobserve(tableRef.current);
    };
  }, []);

  useEffect(() => {
    if (showStickyBar) {
      setShowingStickyBar(true);
      setStickyBarAnimation('animate-fade-in-up');
    } else if (showingStickyBar) {
      setStickyBarAnimation('animate-fade-out-down');
      const timeout = setTimeout(() => setShowingStickyBar(false), 500);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStickyBar]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      console.log('Fetching work entries...');
      const { data, error } = await supabase
        .from('work_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching work entries:', error);
        throw error;
      }
      
      console.log('Fetched work entries:', data);
      setEntries(data || []);
    } catch (error: any) {
      console.error('Error fetching work entries:', error.message);
      alert('Error fetching work entries: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBrokerEntries = async () => {
    try {
      console.log('Fetching broker entries...');
      const { data, error } = await supabase
        .from('broker_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching broker entries:', error);
        throw error;
      }
      
      console.log('Fetched broker entries:', data);
      setBrokerEntries(data || []);
    } catch (error: any) {
      console.error('Error fetching broker entries:', error.message);
      alert('Error fetching broker entries: ' + error.message);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchEntries(), fetchBrokerEntries()]);
    setRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...entries];

    // Filter by tab
    if (activeTab !== 'all' && activeTab !== 'brokers') {
      filtered = filtered.filter(entry => entry.entry_type === activeTab);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(entry => entry.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(entry => entry.date <= filters.dateTo);
    }
    if (filters.machineType) {
      filtered = filtered.filter(entry => entry.machine_type === filters.machineType);
    }
    if (filters.driver) {
      filtered = filtered.filter(entry => 
        entry.driver_name.toLowerCase().includes(filters.driver.toLowerCase())
      );
    }
    if (filters.broker) {
      filtered = filtered.filter(entry =>
        (entry.broker || '').toLowerCase().includes(filters.broker.toLowerCase())
      );
    }
    if (filters.search) {
      filtered = filtered.filter(entry => 
        entry.rental_person_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        entry.driver_name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Sort by date according to dateSortOrder
    filtered.sort((a, b) => {
      if (dateSortOrder === 'desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
    });

    setFilteredEntries(filtered);
  };

  const applyBrokerFilters = () => {
    let filtered = [...brokerEntries];

    if (brokerFilters.dateFrom) {
      filtered = filtered.filter(entry => entry.date >= brokerFilters.dateFrom);
    }
    if (brokerFilters.dateTo) {
      filtered = filtered.filter(entry => entry.date <= brokerFilters.dateTo);
    }
    if (brokerFilters.brokerName) {
      filtered = filtered.filter(entry => 
        entry.broker_name.toLowerCase().includes(brokerFilters.brokerName.toLowerCase())
      );
    }
    if (brokerFilters.search) {
      filtered = filtered.filter(entry => 
        entry.broker_name.toLowerCase().includes(brokerFilters.search.toLowerCase())
      );
    }

    // Sort by date according to dateSortOrder
    filtered.sort((a, b) => {
      if (dateSortOrder === 'desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
    });

    setFilteredBrokerEntries(filtered);
  };

  const formatCurrency = (amount: number): string => {
    return `Rs.${amount.toLocaleString('en-IN')}`;
  };

  const exportToExcel = () => {
    if (activeTab === 'brokers') {
      const worksheet = XLSX.utils.json_to_sheet(filteredBrokerEntries.map(entry => ({
        'Date': entry.date,
        'Time': entry.time || 'N/A',
        'Broker Name': entry.broker_name,
        'Total Hours': Number(entry.total_hours).toFixed(2),
        'Total Amount': formatCurrency(Number(entry.total_amount)),
        'Amount Received': formatCurrency(Number(entry.amount_received)),
        'Balance': formatCurrency(Number(entry.total_amount - entry.amount_received)),
        'Created At': entry.created_at ? format(parseISO(entry.created_at), 'dd/MM/yyyy HH:mm') : ''
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Broker Entries');
      XLSX.writeFile(workbook, `KBS_Broker_Entries_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(filteredEntries.map(entry => ({
        'Date': entry.date,
        'Time': entry.time || 'N/A',
        'Rental Person': entry.rental_person_name,
        'Driver': entry.driver_name,
        'Broker': entry.broker || '-',
        'Machine Type': entry.machine_type,
        'Hours Driven': Number(entry.hours_driven).toFixed(2),
        'Total Amount': formatCurrency(Number(entry.total_amount)),
        'Amount Received': formatCurrency(Number(entry.amount_received)),
        'Advance Amount': formatCurrency(Number(entry.advance_amount)),
        'Balance': formatCurrency(Number(entry.total_amount - entry.amount_received - entry.advance_amount)),
        'Entry Type': entry.entry_type,
        'Created At': entry.created_at ? format(parseISO(entry.created_at), 'dd/MM/yyyy HH:mm') : ''
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Work Entries');
      XLSX.writeFile(workbook, `KBS_Work_Entries_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('KBS EARTHMOVERS & HARVESTER', 20, 20);
    doc.setFontSize(12);
    
    if (activeTab === 'brokers') {
      doc.text('Broker Entries Report', 20, 30);
      doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 40);
      doc.text(`Total Entries: ${filteredBrokerEntries.length}`, 20, 50);

      // Table data with proper currency formatting
      const tableData = filteredBrokerEntries.map(entry => [
        entry.date,
        entry.time || 'N/A',
        entry.broker_name,
        Number(entry.total_hours).toFixed(2),
        formatCurrency(Number(entry.total_amount)),
        formatCurrency(Number(entry.amount_received)),
        formatCurrency(Number(entry.total_amount - entry.amount_received))
      ]);

      (doc as any).autoTable({
        head: [['Date', 'Time', 'Broker Name', 'Hours', 'Total', 'Received', 'Balance']],
        body: tableData,
        startY: 60,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [245, 158, 11] }
      });
    } else {
      doc.text('Work Entries Report', 20, 30);
      doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 40);
      doc.text(`Total Entries: ${filteredEntries.length}`, 20, 50);

      // Table data with proper currency formatting
      const tableData = filteredEntries.map(entry => [
        entry.date,
        entry.time || 'N/A',
        entry.rental_person_name,
        entry.driver_name,
        entry.broker || '-',
        entry.machine_type,
        typeof entry.hours_driven === 'number' ? entry.hours_driven.toFixed(2) : entry.hours_driven,
        formatCurrency(Number(entry.total_amount)),
        formatCurrency(Number(entry.amount_received)),
        formatCurrency(Number(entry.advance_amount)),
        formatCurrency(Number(entry.total_amount - entry.amount_received - entry.advance_amount)),
        entry.entry_type
      ]);

      (doc as any).autoTable({
        head: [['Date', 'Time', 'Rental Person', 'Driver', 'Broker', 'Machine', 'Hours', 'Total', 'Received', 'Advance', 'Balance', 'Type']],
        body: tableData,
        startY: 60,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [245, 158, 11] }
      });
    }

    doc.save(`KBS_${activeTab === 'brokers' ? 'Broker' : 'Work'}_Entries_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const deleteEntry = async (id: string, entryData: WorkEntry) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      try {
        console.log('Deleting work entry with ID:', id);
        const { data, error } = await supabase
          .from('work_entries')
          .delete()
          .eq('id', id)
          .select();
        console.log('Delete result:', { data, error });
        if (error) {
          console.error('Delete error:', error);
          throw error;
        }
        if (Array.isArray(data) && data.length === 0) {
          console.warn('No rows deleted. Check if the ID exists and RLS policies.');
        }
        console.log('Work entry deleted successfully');
        await fetchEntries();
        alert('Entry deleted successfully!');
      } catch (error: any) {
        console.error('Delete error:', error);
        alert('Error deleting entry: ' + error.message);
      }
    }
  };

  const deleteBrokerEntry = async (id: string) => {
    if (confirm('Are you sure you want to delete this broker entry?')) {
      try {
        console.log('Deleting broker entry with ID:', id);
        const { data, error } = await supabase
          .from('broker_entries')
          .delete()
          .eq('id', id)
          .select();
        console.log('Delete broker result:', { data, error });
        if (error) {
          console.error('Delete broker entry error:', error);
          throw error;
        }
        if (Array.isArray(data) && data.length === 0) {
          console.warn('No broker rows deleted. Check if the ID exists and RLS policies.');
        }
        console.log('Broker entry deleted successfully');
        await fetchBrokerEntries();
        alert('Broker entry deleted successfully!');
      } catch (error: any) {
        console.error('Delete broker entry error:', error);
        alert('Error deleting broker entry: ' + error.message);
      }
    }
  };

  const saveEntry = async (entry: Partial<WorkEntry>) => {
    try {
      if (entry.id) {
        // Update existing entry
        console.log('Updating work entry:', entry);
        const { data, error } = await supabase
          .from('work_entries')
          .update({
            rental_person_name: entry.rental_person_name,
            driver_name: entry.driver_name,
            broker: entry.broker || '',
            machine_type: entry.machine_type,
            hours_driven: entry.hours_driven || 0,
            total_amount: entry.total_amount || 0,
            amount_received: entry.amount_received || 0,
            advance_amount: entry.advance_amount || 0,
            date: entry.date,
            time: entry.time,
            updated_at: new Date().toISOString()
          })
          .eq('id', entry.id)
          .select();
        console.log('Update result:', { data, error });
        if (error) {
          console.error('Update work entry error:', error);
          throw error;
        }
        if (Array.isArray(data) && data.length === 0) {
          console.warn('No rows updated. Check if the ID exists and RLS policies.');
        }
        console.log('Work entry updated successfully');
        alert('Entry updated successfully!');
      } else {
        // Create new entry
        console.log('Creating new work entry:', entry);
        const { error } = await supabase
          .from('work_entries')
          .insert([{
            rental_person_name: entry.rental_person_name,
            driver_name: entry.driver_name,
            broker: entry.broker || '',
            machine_type: entry.machine_type,
            hours_driven: entry.hours_driven || 0,
            total_amount: entry.total_amount || 0,
            amount_received: entry.amount_received || 0,
            advance_amount: entry.advance_amount || 0,
            date: entry.date,
            time: entry.time || format(new Date(), 'HH:mm'),
            entry_type: 'admin'
          }]);

        if (error) {
          console.error('Create work entry error:', error);
          throw error;
        }
        console.log('Work entry created successfully');
        alert('Entry created successfully!');
      }

      setEditingEntry(null);
      setShowAddForm(false);
      await fetchEntries();
    } catch (error: any) {
      console.error('Save work entry error:', error);
      alert('Error saving entry: ' + error.message);
    }
  };

  const saveBrokerEntry = async (entry: Partial<BrokerEntry>) => {
    try {
      if (entry.id) {
        // Update existing broker entry
        console.log('Updating broker entry:', entry);
        const updateData = {
          broker_name: entry.broker_name,
          total_hours: Number(entry.total_hours) || 0,
          total_amount: Number(entry.total_amount) || 0,
          amount_received: Number(entry.amount_received) || 0,
          date: entry.date,
          time: entry.time
        };
        console.log('Update data:', updateData);
        const { data, error } = await supabase
          .from('broker_entries')
          .update(updateData)
          .eq('id', entry.id)
          .select();
        console.log('Update broker result:', { data, error });
        if (error) {
          console.error('Update broker entry error:', error);
          throw error;
        }
        if (Array.isArray(data) && data.length === 0) {
          console.warn('No broker rows updated. Check if the ID exists and RLS policies.');
        }
        console.log('Broker entry updated successfully:', data);
        alert('Broker entry updated successfully!');
      } else {
        // Create new broker entry
        console.log('Creating new broker entry:', entry);
        const insertData = {
          broker_name: entry.broker_name,
          total_hours: Number(entry.total_hours) || 0,
          total_amount: Number(entry.total_amount) || 0,
          amount_received: Number(entry.amount_received) || 0,
          date: entry.date,
          time: entry.time || format(new Date(), 'HH:mm')
        };
        
        console.log('Insert data:', insertData);
        
        const { data, error } = await supabase
          .from('broker_entries')
          .insert([insertData])
          .select();

        if (error) {
          console.error('Create broker entry error:', error);
          throw error;
        }
        
        console.log('Broker entry created successfully:', data);
        alert('Broker entry created successfully!');
      }

      setEditingBrokerEntry(null);
      setShowAddBrokerForm(false);
      await fetchBrokerEntries();
    } catch (error: any) {
      console.error('Save broker entry error:', error);
      alert('Error saving broker entry: ' + error.message);
    }
  };

  // Helper: sum H.MM strings or floats as total hours/minutes
  function sumHourMinuteStrings(entries: any[], field: string) {
    let totalMinutes = 0;
    console.log('Summing broker hours:', entries.map(e => e[field]));
    for (const entry of entries) {
      let val = entry[field];
      if (!val && val !== 0) continue; // skip empty/undefined/null
      if (typeof val === 'number') val = val.toFixed(2); // convert number to string with 2 decimals
      const [h, m] = val.split('.');
      const hours = parseInt(h || '0', 10);
      const minutes = parseInt((m || '0').padEnd(2, '0').slice(0, 2), 10);
      totalMinutes += hours * 60 + minutes;
    }
    const totalHours = Math.floor(totalMinutes / 60);
    const remMinutes = totalMinutes % 60;
    return `${totalHours}.${remMinutes.toString().padStart(2, '0')}`;
  }

  const calculateTotals = () => {
    const totals = filteredEntries.reduce((acc, entry) => ({
      totalAmount: acc.totalAmount + entry.total_amount,
      totalReceived: acc.totalReceived + entry.amount_received,
      totalAdvance: acc.totalAdvance + entry.advance_amount,
      totalBalance: acc.totalBalance + (entry.total_amount - entry.amount_received - entry.advance_amount)
    }), { totalAmount: 0, totalReceived: 0, totalAdvance: 0, totalBalance: 0 });
    return {
      ...totals,
      totalHours: sumHourMinuteStrings(filteredEntries, 'hours_driven')
    };
  };

  const calculateBrokerTotals = () => {
    const totals = filteredBrokerEntries.reduce((acc, entry) => ({
      totalAmount: acc.totalAmount + entry.total_amount,
      totalReceived: acc.totalReceived + entry.amount_received,
      totalBalance: acc.totalBalance + (entry.total_amount - entry.amount_received)
    }), { totalAmount: 0, totalReceived: 0, totalBalance: 0 });
    return {
      ...totals,
      totalHours: sumHourMinuteStrings(filteredBrokerEntries, 'total_hours')
    };
  };

  function formatDecimalHours(value: number) {
    if (typeof value !== 'number' || isNaN(value)) return '0.00';
    const [h, m] = value.toString().split('.').map(Number);
    const totalMinutes = (h || 0) * 60 + ((m || 0) * 6);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}.${minutes.toString().padStart(2, '0')}`;
  }

  // Helper: parse H.MM string to float hours (e.g., '2.20' => 2 + 20/60)
  function parseHourMinuteInput(val: string): number {
    if (!val) return 0;
    const [h, m] = val.split('.');
    const hours = parseInt(h || '0', 10);
    const minutes = parseInt((m || '0').padEnd(2, '0').slice(0, 2), 10); // always 2 digits
    if (minutes >= 60) return hours + 59 / 60; // clamp to 59 min
    return hours + minutes / 60;
  }

  // Helper: format float hours to H.MM string
  function floatToHourMinuteString(val: number): string {
    if (typeof val !== 'number' || isNaN(val)) return '0.00';
    const hours = Math.floor(val);
    const minutes = Math.round((val - hours) * 60);
    return `${hours}.${minutes.toString().padStart(2, '0')}`;
  }

  const EntryForm = ({ entry, onSave, onCancel }: { entry?: WorkEntry | null, onSave: (entry: Partial<WorkEntry>) => void, onCancel: () => void }) => {
    const [formData, setFormData] = useState<Partial<WorkEntry>>(() => {
      if (entry) {
        return {
          ...entry,
          hours_driven: entry.hours_driven ?? undefined,
          total_amount: entry.total_amount ?? undefined,
          amount_received: entry.amount_received ?? undefined,
          advance_amount: entry.advance_amount ?? undefined,
          broker: entry.broker ?? '',
        };
      }
      return {
        rental_person_name: '',
        driver_name: '',
        broker: '',
        machine_type: 'JCB',
        hours_driven: undefined,
        total_amount: undefined,
        amount_received: undefined,
        advance_amount: undefined,
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm')
      };
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validate required fields
      if (!formData.rental_person_name || !formData.driver_name || !formData.date) {
        alert('Please fill in all required fields');
        return;
      }

      onSave(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">{entry ? 'Edit Entry' : 'Add New Entry'}</h3>
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rental Person Name *</label>
                <input
                  type="text"
                  value={formData.rental_person_name || ''}
                  onChange={(e) => setFormData({...formData, rental_person_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter rental person's name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name *</label>
                <select
                  value={formData.driver_name || ''}
                  onChange={(e) => setFormData({...formData, driver_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                >
                  <option value="">Select driver</option>
                  {driverNames.map((name, index) => (
                    <option key={index} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Broker</label>
                <input
                  type="text"
                  value={formData.broker || ''}
                  onChange={(e) => setFormData({...formData, broker: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter broker name (if any)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Machine Type</label>
                <select
                  value={formData.machine_type || 'JCB'}
                  onChange={(e) => setFormData({...formData, machine_type: e.target.value as 'JCB' | 'Tractor' | 'Harvester'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="JCB">JCB</option>
                  <option value="Tractor">Tractor</option>
                  <option value="Harvester">Harvester</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours Driven</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hours_driven || ''}
                  onChange={(e) => setFormData({...formData, hours_driven: e.target.value ? Number(e.target.value) : undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter hours driven"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.total_amount || ''}
                  onChange={(e) => setFormData({...formData, total_amount: e.target.value ? Number(e.target.value) : undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter total amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.amount_received || ''}
                  onChange={(e) => setFormData({...formData, amount_received: e.target.value ? Number(e.target.value) : undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter amount received"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Advance Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.advance_amount || ''}
                  onChange={(e) => setFormData({...formData, advance_amount: e.target.value ? Number(e.target.value) : undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter advance amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={formData.time || ''}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Entry
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const BrokerEntryForm = ({ entry, onSave, onCancel }: { entry?: BrokerEntry | null, onSave: (entry: Partial<BrokerEntry>) => void, onCancel: () => void }) => {
    const [formData, setFormData] = useState<Partial<BrokerEntry & { total_hours_str?: string }>>(() => {
      if (entry) {
        return {
          ...entry,
          total_hours_str: entry.total_hours ? entry.total_hours.toString() : '',
          total_amount: entry.total_amount ?? undefined,
          amount_received: entry.amount_received ?? undefined,
        };
      }
      return {
        broker_name: '',
        total_hours_str: '',
        total_amount: undefined,
        amount_received: undefined,
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm')
      };
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.broker_name || !formData.date) {
        alert('Please fill in all required fields');
        return;
      }
      // Save total_hours as a string
      const total_hours = formData.total_hours_str || '';
      onSave({ ...formData, total_hours });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">{entry ? 'Edit Broker Entry' : 'Add New Broker Entry'}</h3>
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Broker Name *</label>
                <input
                  type="text"
                  value={formData.broker_name || ''}
                  onChange={(e) => setFormData({...formData, broker_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter broker name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Hours</label>
                <input
                  type="text"
                  value={formData.total_hours_str || ''}
                  onChange={(e) => {
                    // Only allow numbers and up to 2 decimals
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    // Prevent more than one decimal
                    if ((val.match(/\./g) || []).length > 1) return;
                    // Prevent minutes >= 60
                    const [h, m] = val.split('.');
                    if (m && parseInt(m.padEnd(2, '0').slice(0, 2), 10) >= 60) return;
                    setFormData({ ...formData, total_hours_str: val });
                  }}
                  onBlur={(e) => {
                    let val = e.target.value;
                    if (!val) return;
                    const [h, m] = val.split('.');
                    // Always pad minutes to two digits
                    const formatted = h + '.' + (m ? m.padEnd(2, '0').slice(0, 2) : '00');
                    setFormData({ ...formData, total_hours_str: formatted });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter total hours (e.g. 2.20 for 2hr 20min)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.total_amount || ''}
                  onChange={(e) => setFormData({...formData, total_amount: e.target.value ? Number(e.target.value) : undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter total amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.amount_received || ''}
                  onChange={(e) => setFormData({...formData, amount_received: e.target.value ? Number(e.target.value) : undefined})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter amount received"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={formData.time || ''}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Broker Entry
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const totals = calculateTotals();
  const brokerTotals = calculateBrokerTotals();

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-lg rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage work entries and generate reports</p>
              <div className="flex items-center mt-2 text-sm text-amber-600">
                <User className="h-4 w-4 mr-1" />
                <span>Welcome, {adminUser}</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg mb-6 sm:mb-8 animate-fade-in-up animation-delay-300">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-4 sm:px-6" aria-label="Tabs">
              {[
                { key: 'all', label: 'All Entries', icon: FileText, count: entries.length },
                { key: 'driver', label: 'Driver Entries', icon: Users, count: entries.filter(e => e.entry_type === 'driver').length },
                { key: 'admin', label: 'Admin Entries', icon: User, count: entries.filter(e => e.entry_type === 'admin').length },
                { key: 'brokers', label: 'Broker Entries', icon: Building2, count: brokerEntries.length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'driver' | 'admin' | 'all' | 'brokers')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-all duration-300 ${
                    activeTab === tab.key
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Stats Cards */}
        {activeTab === 'brokers' ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {[
              { title: 'Total Entries', value: filteredBrokerEntries.length, color: 'blue' },
              { title: 'Total Hours', value: brokerTotals.totalHours, color: 'green' },
              { title: 'Total Amount', value: `₹${brokerTotals.totalAmount.toLocaleString()}`, color: 'amber' },
              { title: 'Amount Received', value: `₹${brokerTotals.totalReceived.toLocaleString()}`, color: 'purple' },
              { title: 'Balance Due', value: `₹${brokerTotals.totalBalance.toLocaleString()}`, color: 'red' }
            ].map((stat, index) => (
              <div key={index} className={`bg-white p-4 sm:p-6 rounded-lg shadow-lg animate-fade-in-up`} style={{animationDelay: `${index * 0.1}s`}}>
                <h3 className="text-xs sm:text-sm font-medium text-gray-500">{stat.title}</h3>
                <p className={`text-lg sm:text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {[
              { title: 'Total Entries', value: filteredEntries.length, color: 'blue' },
              { title: 'Total Hours', value: totals.totalHours, color: 'green' },
              { title: 'Total Amount', value: `₹${totals.totalAmount.toLocaleString()}`, color: 'amber' },
              { title: 'Amount Received', value: `₹${totals.totalReceived.toLocaleString()}`, color: 'purple' },
              { title: 'Total Advance', value: `₹${totals.totalAdvance.toLocaleString()}`, color: 'indigo' },
              { title: 'Balance Due', value: `₹${totals.totalBalance.toLocaleString()}`, color: 'red' }
            ].map((stat, index) => (
              <div key={index} className={`bg-white p-4 sm:p-6 rounded-lg shadow-lg animate-fade-in-up`} style={{animationDelay: `${index * 0.1}s`}}>
                <h3 className="text-xs sm:text-sm font-medium text-gray-500">{stat.title}</h3>
                <p className={`text-lg sm:text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        {activeTab === 'brokers' ? (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 animate-fade-in-up animation-delay-500">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Broker Filters
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={brokerFilters.dateFrom}
                  onChange={(e) => setBrokerFilters({...brokerFilters, dateFrom: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={brokerFilters.dateTo}
                  onChange={(e) => setBrokerFilters({...brokerFilters, dateTo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Broker Name</label>
                <input
                  type="text"
                  value={brokerFilters.brokerName}
                  onChange={(e) => setBrokerFilters({...brokerFilters, brokerName: e.target.value})}
                  placeholder="Broker name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={brokerFilters.search}
                  onChange={(e) => setBrokerFilters({...brokerFilters, search: e.target.value})}
                  placeholder="Search entries"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setBrokerFilters({dateFrom: '', dateTo: '', brokerName: '', search: ''})}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors text-sm"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 animate-fade-in-up animation-delay-500">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Machine Type</label>
                <select
                  value={filters.machineType}
                  onChange={(e) => setFilters({...filters, machineType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                >
                  <option value="">All Machines</option>
                  <option value="JCB">JCB</option>
                  <option value="Tractor">Tractor</option>
                  <option value="Harvester">Harvester</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                <input
                  type="text"
                  value={filters.driver}
                  onChange={(e) => setFilters({...filters, driver: e.target.value})}
                  placeholder="Driver name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Broker</label>
                <input
                  type="text"
                  value={filters.broker}
                  onChange={(e) => setFilters({...filters, broker: e.target.value})}
                  placeholder="Broker name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  placeholder="Search entries"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({dateFrom: '', dateTo: '', machineType: '', driver: '', broker: '', search: ''})}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors text-sm"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-6 sm:mb-8">
          {activeTab === 'brokers' ? (
            <>
              <button
                onClick={() => setShowAddBrokerForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Broker Entry
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-all duration-300 transform hover:scale-105"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </button>
          )}
          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-all duration-300 transform hover:scale-105"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </button>
          <button
            onClick={exportToPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center transition-all duration-300 transform hover:scale-105"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>
        </div>

        {/* Tables */}
        {activeTab === 'brokers' ? (
          <div ref={tableRef} className="bg-white shadow rounded-lg overflow-hidden animate-fade-in-up animation-delay-700">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Broker Entries - {filteredBrokerEntries.length} entries
              </h2>
            </div>
            
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading broker entries...</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200">Date</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200">Time</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200">Broker Name</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200">Hours</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200">Total</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200">Received</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200">Balance</th>
                      <th className="px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBrokerEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 border-r border-gray-200">{format(parseISO(entry.date), 'dd/MM/yyyy')}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 border-r border-gray-200">{entry.time || 'N/A'}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 border-r border-gray-200">{entry.broker_name}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 border-r border-gray-200">{entry.total_hours}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-semibold border-r border-gray-200">₹{entry.total_amount.toLocaleString()}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-green-600 font-semibold border-r border-gray-200">₹{entry.amount_received.toLocaleString()}</td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap font-semibold text-xs sm:text-sm border-r border-gray-200">
                          <span className={entry.total_amount - entry.amount_received > 0 ? 'text-red-600' : 'text-green-600'}>
                            ₹{(entry.total_amount - entry.amount_received).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => setEditingBrokerEntry(entry)} 
                              className="text-amber-600 hover:text-amber-900 transition-colors" 
                              title="Edit broker entry"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => deleteBrokerEntry(entry.id!)} 
                              className="text-red-600 hover:text-red-900 transition-colors" 
                              title="Delete broker entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredBrokerEntries.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {brokerEntries.length === 0 ? 'No broker entries found. Add your first broker entry!' : 'No broker entries found matching your filters.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div ref={tableRef} className="bg-white shadow rounded-lg overflow-hidden animate-fade-in-up animation-delay-700">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Work Entries ({activeTab === 'all' ? 'All' : activeTab === 'driver' ? 'Driver' : 'Admin'}) - {filteredEntries.length} entries
              </h2>
            </div>
            
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading entries...</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="w-24 px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200">Date</th>
                      <th className="w-20 px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200">Time</th>
                      <th className="w-40 px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200 truncate-mobile">Rental Person</th>
                      <th className="w-32 px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200 truncate-mobile">Driver</th>
                      <th className="w-32 px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200 truncate-mobile">Broker</th>
                      <th className="w-32 px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200">Machine</th>
                      <th className="w-20 px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200">Hours</th>
                      <th className="w-28 px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200">Total</th>
                      <th className="w-28 px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200">Received</th>
                      <th className="w-28 px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200">Advance</th>
                      <th className="w-28 px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200">Balance</th>
                      <th className="w-20 px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap border-r border-gray-200">Type</th>
                      <th className="w-20 px-2 sm:px-3 py-2 sm:py-3 text-left font-medium text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                        <td className="w-24 px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 border-r border-gray-200">{format(parseISO(entry.date), 'dd/MM/yyyy')}</td>
                        <td className="w-20 px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 border-r border-gray-200">{entry.time || 'N/A'}</td>
                        <td className="w-40 px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 truncate-mobile border-r border-gray-200">{entry.rental_person_name}</td>
                        <td className="w-32 px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 truncate-mobile border-r border-gray-200">{entry.driver_name}</td>
                        <td className="w-32 px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 truncate-mobile border-r border-gray-200">{entry.broker || '-'}</td>
                        <td className="w-32 px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap border-r border-gray-200">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${entry.machine_type === 'JCB' ? 'bg-blue-100 text-blue-800' : entry.machine_type === 'Tractor' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{entry.machine_type}</span>
                        </td>
                        <td className="w-20 px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 border-r border-gray-200">{typeof entry.hours_driven === 'number' ? entry.hours_driven.toFixed(2) : entry.hours_driven}</td>
                        <td className="w-28 px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-semibold border-r border-gray-200">₹{entry.total_amount.toLocaleString()}</td>
                        <td className="w-28 px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-green-600 font-semibold border-r border-gray-200">₹{entry.amount_received.toLocaleString()}</td>
                        <td className="w-28 px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-blue-600 font-semibold border-r border-gray-200">₹{entry.advance_amount.toLocaleString()}</td>
                        <td className="w-28 px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap font-semibold text-xs sm:text-sm border-r border-gray-200">
                          <span className={entry.total_amount - entry.amount_received - entry.advance_amount > 0 ? 'text-red-600' : 'text-green-600'}>
                            ₹{(entry.total_amount - entry.amount_received - entry.advance_amount).toLocaleString()}
                          </span>
                        </td>
                        <td className="w-20 px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap border-r border-gray-200">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${entry.entry_type === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{entry.entry_type}</span>
                        </td>
                        <td className="w-20 px-2 sm:px-3 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button onClick={() => setEditingEntry(entry)} className="text-amber-600 hover:text-amber-900 transition-colors mobile-button" title="Edit entry">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => deleteEntry(entry.id!, entry)} className="text-red-600 hover:text-red-900 transition-colors mobile-button" title="Delete entry">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredEntries.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {entries.length === 0 ? 'No entries found. Add your first entry!' : 'No entries found matching your filters.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        {showAddForm && (
          <EntryForm
            onSave={saveEntry}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {editingEntry && (
          <EntryForm
            entry={editingEntry}
            onSave={saveEntry}
            onCancel={() => setEditingEntry(null)}
          />
        )}

        {showAddBrokerForm && (
          <BrokerEntryForm
            onSave={saveBrokerEntry}
            onCancel={() => setShowAddBrokerForm(false)}
          />
        )}

        {editingBrokerEntry && (
          <BrokerEntryForm
            entry={editingBrokerEntry}
            onSave={saveBrokerEntry}
            onCancel={() => setEditingBrokerEntry(null)}
          />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;