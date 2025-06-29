import React, { useState, useEffect } from 'react';
import { supabase, type WorkEntry } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { useNotifications } from '../contexts/NotificationContext';
import { Lock, Eye, Download, Filter, Plus, Edit2, Trash2, Search, User, LogOut, Save, X, Users, FileText, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface AdminPanelProps {
  adminUser: string;
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ adminUser, onLogout }) => {
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'driver' | 'admin' | 'all'>('all');
  const [editingEntry, setEditingEntry] = useState<WorkEntry | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { addNotification } = useNotifications();
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    machineType: '',
    driver: '',
    search: ''
  });

  const driverNames = [
    'Vignesh',
    'Markandeyan',
    'Vijayakumar',
    'Mohan',
    'Sakthi',
  ];

  const adminUsers = [
    'BHASKARAN K',
    'SHRINIVAS B',
    'SHRIKAVIN B'
  ];

  useEffect(() => {
    fetchEntries();
    // Set up real-time subscription
    const subscription = supabase
      .channel('work_entries_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'work_entries' },
        () => {
          fetchEntries();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [entries, filters, activeTab]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Fetched entries:', data);
      setEntries(data || []);
    } catch (error: any) {
      console.error('Error fetching entries:', error.message);
      alert('Error fetching entries: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...entries];

    // Filter by tab
    if (activeTab !== 'all') {
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
    if (filters.search) {
      filtered = filtered.filter(entry => 
        entry.rental_person_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        entry.driver_name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredEntries(filtered);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredEntries.map(entry => ({
      'Date': entry.date,
      'Time': entry.time || 'N/A',
      'Rental Person': entry.rental_person_name,
      'Driver': entry.driver_name,
      'Machine Type': entry.machine_type,
      'Hours Driven': Number(entry.hours_driven).toFixed(2),
      'Total Amount': '₹' + Number(entry.total_amount).toLocaleString('en-IN'),
      'Amount Received': '₹' + Number(entry.amount_received).toLocaleString('en-IN'),
      'Advance Amount': '₹' + Number(entry.advance_amount).toLocaleString('en-IN'),
      'Balance': '₹' + Number(entry.total_amount - entry.amount_received - entry.advance_amount).toLocaleString('en-IN'),
      'Entry Type': entry.entry_type,
      'Created At': entry.created_at ? format(parseISO(entry.created_at), 'dd/MM/yyyy HH:mm') : ''
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Work Entries');
    XLSX.writeFile(workbook, `KBS_Work_Entries_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('KBS EARTHMOVERS & HARVESTER', 20, 20);
    doc.setFontSize(12);
    doc.text('Work Entries Report', 20, 30);
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 40);
    doc.text(`Total Entries: ${filteredEntries.length}`, 20, 50);

    // Table data
    const tableData = filteredEntries.map(entry => [
      entry.date,
      entry.time || 'N/A',
      entry.rental_person_name,
      entry.driver_name,
      entry.machine_type,
      Number(entry.hours_driven).toFixed(2),
      '₹' + Number(entry.total_amount).toLocaleString('en-IN'),
      '₹' + Number(entry.amount_received).toLocaleString('en-IN'),
      '₹' + Number(entry.advance_amount).toLocaleString('en-IN'),
      '₹' + Number(entry.total_amount - entry.amount_received - entry.advance_amount).toLocaleString('en-IN'),
      entry.entry_type
    ]);

    (doc as any).autoTable({
      head: [['Date', 'Time', 'Rental Person', 'Driver', 'Machine', 'Hours', 'Total', 'Received', 'Advance', 'Balance', 'Type']],
      body: tableData,
      startY: 60,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [245, 158, 11] }
    });

    doc.save(`KBS_Work_Entries_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const deleteEntry = async (id: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      try {
        const { error } = await supabase
          .from('work_entries')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        // Refresh data after deletion
        await fetchEntries();
        addNotification({
          title: 'Entry Deleted',
          message: 'Work entry has been deleted successfully.',
          type: 'success'
        });
      } catch (error: any) {
        console.error('Delete error:', error);
        addNotification({
          title: 'Delete Failed',
          message: 'Error deleting entry: ' + error.message,
          type: 'error'
        });
      }
    }
  };

  const saveEntry = async (entry: Partial<WorkEntry>) => {
    try {
      if (entry.id) {
        // Update existing entry
        const { error } = await supabase
          .from('work_entries')
          .update({
            rental_person_name: entry.rental_person_name,
            driver_name: entry.driver_name,
            machine_type: entry.machine_type,
            hours_driven: entry.hours_driven,
            total_amount: entry.total_amount,
            amount_received: entry.amount_received,
            advance_amount: entry.advance_amount,
            date: entry.date,
            time: entry.time,
            updated_at: new Date().toISOString()
          })
          .eq('id', entry.id);

        if (error) throw error;
        
        addNotification({
          title: 'Entry Updated',
          message: 'Work entry has been updated successfully.',
          type: 'success'
        });
      } else {
        // Create new entry
        const { error } = await supabase
          .from('work_entries')
          .insert([{
            rental_person_name: entry.rental_person_name,
            driver_name: entry.driver_name,
            machine_type: entry.machine_type,
            hours_driven: entry.hours_driven,
            total_amount: entry.total_amount,
            amount_received: entry.amount_received,
            advance_amount: entry.advance_amount,
            date: entry.date,
            time: entry.time || format(new Date(), 'HH:mm'),
            entry_type: 'admin'
          }]);

        if (error) throw error;
        
        addNotification({
          title: 'Entry Created',
          message: 'New work entry has been created successfully.',
          type: 'success'
        });
      }

      setEditingEntry(null);
      setShowAddForm(false);
      await fetchEntries();
    } catch (error: any) {
      console.error('Save error:', error);
      addNotification({
        title: 'Save Failed',
        message: 'Error saving entry: ' + error.message,
        type: 'error'
      });
    }
  };

  const calculateTotals = () => {
    return filteredEntries.reduce((acc, entry) => ({
      totalAmount: acc.totalAmount + entry.total_amount,
      totalReceived: acc.totalReceived + entry.amount_received,
      totalAdvance: acc.totalAdvance + entry.advance_amount,
      totalHours: acc.totalHours + entry.hours_driven,
      totalBalance: acc.totalBalance + (entry.total_amount - entry.amount_received - entry.advance_amount)
    }), { totalAmount: 0, totalReceived: 0, totalAdvance: 0, totalHours: 0, totalBalance: 0 });
  };

  const EntryForm = ({ entry, onSave, onCancel }: { entry?: WorkEntry | null, onSave: (entry: Partial<WorkEntry>) => void, onCancel: () => void }) => {
    const [formData, setFormData] = useState<Partial<WorkEntry>>(() => {
      if (entry) {
        return {
          ...entry,
          hours_driven: entry.hours_driven ?? 0,
          total_amount: entry.total_amount ?? 0,
          amount_received: entry.amount_received ?? 0,
          advance_amount: entry.advance_amount ?? 0
        };
      }
      return {
        rental_person_name: '',
        driver_name: '',
        machine_type: 'JCB',
        hours_driven: 0,
        total_amount: 0,
        amount_received: 0,
        advance_amount: 0,
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
                  value={formData.hours_driven}
                  onChange={(e) => setFormData({...formData, hours_driven: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter hours driven"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.total_amount}
                  onChange={(e) => setFormData({...formData, total_amount: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter total amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.amount_received}
                  onChange={(e) => setFormData({...formData, amount_received: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter amount received"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Advance Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.advance_amount}
                  onChange={(e) => setFormData({...formData, advance_amount: Number(e.target.value)})}
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

  const totals = calculateTotals();

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
                { key: 'admin', label: 'Admin Entries', icon: User, count: entries.filter(e => e.entry_type === 'admin').length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'driver' | 'admin' | 'all')}
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {[
            { title: 'Total Entries', value: filteredEntries.length, color: 'blue' },
            { title: 'Total Hours', value: totals.totalHours.toFixed(2), color: 'green' },
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

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 animate-fade-in-up animation-delay-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
                onClick={() => setFilters({dateFrom: '', dateTo: '', machineType: '', driver: '', search: ''})}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </button>
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

        {/* Entries Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden animate-fade-in-up animation-delay-700">
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rental Person</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Machine</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advance</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(parseISO(entry.date), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.time || 'N/A'}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.rental_person_name}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.driver_name}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          entry.machine_type === 'JCB' ? 'bg-blue-100 text-blue-800' :
                          entry.machine_type === 'Tractor' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {entry.machine_type}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{Number(entry.hours_driven).toFixed(2)}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">₹{entry.total_amount.toLocaleString()}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">₹{entry.amount_received.toLocaleString()}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">₹{entry.advance_amount.toLocaleString()}</td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap font-semibold">
                        <span className={entry.total_amount - entry.amount_received - entry.advance_amount > 0 ? 'text-red-600' : 'text-green-600'}>
                          ₹{(entry.total_amount - entry.amount_received - entry.advance_amount).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          entry.entry_type === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {entry.entry_type}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingEntry(entry)}
                            className="text-amber-600 hover:text-amber-900 transition-colors"
                            title="Edit entry"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id!)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete entry"
                          >
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
      </div>
    </div>
  );
};

export default AdminPanel;