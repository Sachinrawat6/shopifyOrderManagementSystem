import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiCheckCircle, FiXCircle, FiRefreshCw, FiSearch, FiCalendar, FiClock, FiPackage } from 'react-icons/fi';
import { PulseLoader } from 'react-spinners';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const OrderDashboard = () => {
  const BASE_URL = "https://return-inventory-backend.onrender.com/api/v1/shopify";
  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'shipped', 'cancel', 'pending'

  // Function to parse date in DD-MM-YYYY format
  const parseCustomDate = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    return new Date(`${year}-${month}-${day}`);
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [ordersResponse, pendingResponse] = await Promise.all([
        axios.get(`${BASE_URL}/all-orders`),
        axios.get(`${BASE_URL}/pending-orders`)
      ]);
      setAllOrders(ordersResponse.data.data);
      setFilteredOrders(ordersResponse.data.data);
      setPendingOrders(pendingResponse.data.data);
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Apply all filters
  useEffect(() => {
    let result = activeTab === 'pending' ? [...pendingOrders] : [...allOrders];

    // Apply status filter for non-pending tabs
    if (activeTab === 'shipped') {
      result = result.filter(order => order.order_status?.toLowerCase() === 'shipped');
    } else if (activeTab === 'cancel') {
      result = result.filter(order => order.order_status?.toLowerCase() === 'cancel');
    }

    // Apply search filter
    if (searchTerm.trim() !== '') {
      result = result.filter(order =>
        (order.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.styleNumber?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.size?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.quantity?.toString().includes(searchTerm))
      );
    }

    // Apply date filter with proper date parsing
    if (startDate || endDate) {
      result = result.filter(order => {
        const orderDate = parseCustomDate(order.order_date) || new Date(order.createdAt);
        if (!orderDate) return false;

        // Reset time components for date comparison
        const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
        const startDateOnly = startDate ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()) : null;
        const endDateOnly = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) : null;

        // If both dates are selected
        if (startDateOnly && endDateOnly) {
          return orderDateOnly >= startDateOnly && orderDateOnly <= endDateOnly;
        }
        // If only start date is selected
        else if (startDateOnly) {
          return orderDateOnly >= startDateOnly;
        }
        // If only end date is selected
        else if (endDateOnly) {
          return orderDateOnly <= endDateOnly;
        }
        return true;
      });
    }

    setFilteredOrders(result);
  }, [searchTerm, startDate, endDate, activeTab, allOrders, pendingOrders]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const resetDateFilters = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const getStatusCount = (status) => {
    return allOrders.filter(order => order.order_status?.toLowerCase() === status.toLowerCase()).length;
  };

  const getPendingOrdersCount = () => {
    return pendingOrders.length;
  };

  // Format date display to DD-MM-YYYY
  const formatDisplayDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <PulseLoader color="#4F46E5" size={15} />
        <p className="mt-4 text-gray-600 text-lg">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <div className="max-w-md w-full p-6 bg-red-50 border-l-4 border-red-500 rounded-lg shadow">
          <h3 className="text-lg font-medium text-red-800">Error Loading Data</h3>
          <p className="mt-2 text-red-700">{error}</p>
          <button
            onClick={fetchAllData}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center"
          >
            <FiRefreshCw className="mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <ToastContainer position="top-right" autoClose={5000} />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Order Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {activeTab === 'all' && 'Overview of all orders'}
              {activeTab === 'shipped' && 'Shipped orders'}
              {activeTab === 'cancel' && 'Cancelled orders'}
              {activeTab === 'pending' && 'Pending orders'}
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-2 md:space-y-0 md:space-x-4 w-full md:w-auto mt-4 md:mt-0">
            <div className="relative flex-grow md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search orders..."
                className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div 
            className={`p-5 rounded-xl shadow-sm border cursor-pointer transition-all transform hover:scale-[1.02] ${
              activeTab === 'all' 
                ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100' 
                : 'bg-white border-gray-200 hover:border-indigo-300'
            }`}
            onClick={() => setActiveTab('all')}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders Qty</p>
                <p className="text-3xl font-bold mt-1 text-gray-900">{allOrders.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                <FiPackage className="text-xl" />
              </div>
            </div>
          </div>

          <div 
            className={`p-5 rounded-xl shadow-sm border cursor-pointer transition-all transform hover:scale-[1.02] ${
              activeTab === 'shipped' 
                ? 'bg-green-50 border-green-200 ring-2 ring-green-100' 
                : 'bg-white border-gray-200 hover:border-green-300'
            }`}
            onClick={() => setActiveTab('shipped')}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-600">Shipped</p>
                <p className="text-3xl font-bold mt-1 text-gray-900">{getStatusCount('shipped')}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {allOrders.length > 0 ? `${Math.round((getStatusCount('shipped') / allOrders.length) * 100)}% of total` : '0% of total'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <FiCheckCircle className="text-xl" />
              </div>
            </div>
          </div>

          <div 
            className={`p-5 rounded-xl shadow-sm border cursor-pointer transition-all transform hover:scale-[1.02] ${
              activeTab === 'cancel' 
                ? 'bg-red-50 border-red-200 ring-2 ring-red-100' 
                : 'bg-white border-gray-200 hover:border-red-300'
            }`}
            onClick={() => setActiveTab('cancel')}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-3xl font-bold mt-1 text-gray-900">{getStatusCount('cancel')}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {allOrders.length > 0 ? `${Math.round((getStatusCount('cancel') / allOrders.length) * 100)}% of total` : '0% of total'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <FiXCircle className="text-xl" />
              </div>
            </div>
          </div>

          <div 
            className={`p-5 rounded-xl shadow-sm border cursor-pointer transition-all transform hover:scale-[1.02] ${
              activeTab === 'pending' 
                ? 'bg-yellow-50 border-yellow-200 ring-2 ring-yellow-100' 
                : 'bg-white border-gray-200 hover:border-yellow-300'
            }`}
            onClick={() => setActiveTab('pending')}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-3xl font-bold mt-1 text-gray-900">{getPendingOrdersCount()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {allOrders.length > 0 ? `${Math.round((getPendingOrdersCount() / allOrders.length) * 100)}% of total` : '0% of total'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                <FiClock className="text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Date Filter */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h3 className="text-lg font-medium text-gray-900 mb-2 md:mb-0">Filter Orders</h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiCalendar className="text-gray-400" />
                </div>
                <DatePicker
                  selected={startDate}
                  onChange={date => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  placeholderText="Start Date"
                  className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  dateFormat="dd-MM-yyyy"
                />
              </div>
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiCalendar className="text-gray-400" />
                </div>
                <DatePicker
                  selected={endDate}
                  onChange={date => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  placeholderText="End Date"
                  className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  dateFormat="dd-MM-yyyy"
                />
              </div>
              {(startDate || endDate) && (
                <button 
                  onClick={resetDateFilters}
                  className="px-4 py-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Clear Dates
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Style Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order, index) => (
                    <tr 
                      key={`${order.order_id}-${index}`} 
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <span className="inline-block min-w-[120px]">{order.order_id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.styleNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.size || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.quantity || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          order.order_status?.toLowerCase() === 'shipped' 
                            ? 'bg-green-100 text-green-800' 
                            : order.order_status?.toLowerCase() === 'cancel' 
                              ? 'bg-red-100 text-red-800' 
                              : activeTab === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.order_status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.order_date || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.createdAt ? formatDisplayDate(order.createdAt) : 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FiPackage className="text-gray-400 text-4xl mb-2" />
                        <h4 className="text-lg font-medium text-gray-900">No orders found</h4>
                        <p className="text-gray-500 mt-1">
                          {searchTerm || startDate || endDate || activeTab !== 'all' 
                            ? "Try adjusting your filters" 
                            : "No orders in the system"}
                        </p>
                        {(searchTerm || startDate || endDate) && (
                          <button
                            onClick={() => {
                              setSearchTerm('');
                              resetDateFilters();
                              setActiveTab('all');
                            }}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            Clear All Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDashboard;