import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiCheckCircle, FiTruck, FiRefreshCw, FiExternalLink, FiX } from 'react-icons/fi';
import { PulseLoader } from 'react-spinners';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CancelOrders = () => {
  const BASE_URL = "https://return-inventory-backend.onrender.com/api/v1/shopify";
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCancelledOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/cancel-orders`);
      setCancelledOrders(response.data.data);
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load orders: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchCancelledOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <PulseLoader color="#3B82F6" size={10} />
        <p className="mt-4 text-gray-600">Loading cancelled orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={fetchCancelledOrders}
          className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={5000} />
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <FiX className="mr-2 text-red-500" />
          Cancelled Orders
        </h2>
        <button
          onClick={fetchCancelledOrders}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Style Number </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confirm Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cancelledOrders.length > 0 ? (
                cancelledOrders.map((order, index) => (
                  <tr key={order.order_id  + index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.order_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="font-medium">{order.styleNumber}</div>
                      
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="font-medium">{order.size}</div>
                      
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="font-medium">{order.quantity} </div>
                      
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.order_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    
                   
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                    No cancelled orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CancelOrders;