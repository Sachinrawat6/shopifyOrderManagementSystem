import axios from "axios";
import React, { useEffect, useState } from "react";
import { FiRefreshCw, FiCheck, FiX, FiClock, FiAlertCircle } from "react-icons/fi";
import { PulseLoader } from "react-spinners";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PendingOrders = () => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const BASE_URL = "https://return-inventory-backend.onrender.com/api/v1/shopify";

  // Toast notification helper
  const showToast = (message, type = 'info') => {
    toast[type](message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  // Fetch pending orders
  const fetchPendingOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/pending-orders`);
      setPendingOrders(response.data.data.map(order => ({
        ...order,
        confirming: false,
        cancelling: false,
        confirmed: false,
        cancelled: false,
        error: null
      })));
    } catch (error) {
      setError(error.message);
      showToast(`Failed to load orders: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Confirm order handler
  const handleConfirm = async (orderId) => {
    try {
      const matchedOrder = pendingOrders.find(order => order.order_id === orderId);
      if (!matchedOrder) throw new Error("Order not found");

      setPendingOrders(prev => prev.map(order => 
        order.order_id === orderId ? { ...order, confirming: true, error: null } : order
      ));

      const response = await axios.post(`${BASE_URL}/add-to-confirm`, {
        order_id: matchedOrder.order_id,
        styleNumber: matchedOrder.styleNumber,
        size: matchedOrder.size,
        quantity: matchedOrder.quantity,
        order_date: matchedOrder.order_date,
        shipping_method:matchedOrder.shipping_method,
        order_status:matchedOrder.order_status,
        contact_number:matchedOrder.contact_number,
        payment_status:matchedOrder.payment_status,


      });

      if (response.data.success) {
        showToast(`Order ${orderId} confirmed successfully!`, 'success');
        setPendingOrders(prev => prev.map(order => 
          order.order_id === orderId ? { ...order, confirmed: true, confirming: false } : order
        ));
        setTimeout(fetchPendingOrders, 1000);
      } else {
        throw new Error(response.data.message || "Confirmation failed");
      }
    } catch (error) {
      console.error("Confirmation error:", error);
      setPendingOrders(prev => prev.map(order => 
        order.order_id === orderId ? { 
          ...order, 
          confirming: false, 
          error: error.message 
        } : order
      ));
      showToast(`Failed to confirm order ${orderId}: ${error.message}`, 'error');
    }
  };

  // Cancel order handler
  const handleCancel = async (orderId) => {
    try {
      const matchedOrder = pendingOrders.find(order => order.order_id === orderId);
      if (!matchedOrder) throw new Error("Order not found");

      setPendingOrders(prev => prev.map(order => 
        order.order_id === orderId ? { ...order, cancelling: true, error: null } : order
      ));

      const response = await axios.post(`${BASE_URL}/add-to-cancel`, {
       order_id: matchedOrder.order_id,
        styleNumber: matchedOrder.styleNumber,
        size: matchedOrder.size,
        quantity: matchedOrder.quantity,
        order_date: matchedOrder.order_date,
        shipping_method:matchedOrder.shipping_method,
        order_status:matchedOrder.order_status,
        contact_number:matchedOrder.contact_number,
        payment_status:matchedOrder.payment_status,
        
      });

      if (response.data.success) {
        showToast(`Order ${orderId} cancelled successfully!`, 'success');
        setPendingOrders(prev => prev.map(order => 
          order.order_id === orderId ? { ...order, cancelled: true, cancelling: false } : order
        ));
        setTimeout(fetchPendingOrders, 1000);
      } else {
        throw new Error(response.data.message || "Cancellation failed");
      }
    } catch (error) {
      console.error("Cancellation error:", error);
      setPendingOrders(prev => prev.map(order => 
        order.order_id === orderId ? { 
          ...order, 
          cancelling: false, 
          error: error.message 
        } : order
      ));
      showToast(`Failed to cancel order ${orderId}: ${error.message}`, 'error');
    }
  };

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  if (loading && pendingOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <PulseLoader color="#3B82F6" size={10} />
        <p className="mt-4 text-gray-600">Loading pending orders...</p>
        <ToastContainer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
        <ToastContainer />
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={fetchPendingOrders}
          className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <ToastContainer />
      <div className="flex justify-between items-center mb-6">
       
        <h2 className="text-2xl font-bold text-gray-600 flex items-center">
          <FiClock className="mr-2 text-yellow-500" />
          Pending Orders 
        </h2>
         <p>
           <span> Total : {pendingOrders.length} </span>
        </p>
        
        <button
          onClick={fetchPendingOrders}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={`mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipping Type</th>
               
                

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingOrders.length > 0 ? (
                pendingOrders.map((order,index) => (
                  <tr key={order.order_id + index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.styleNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.size}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.quantity}</td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.order_status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.shipping_method}</td>
                   
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.order_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {order.confirming ? (
                          <span className="text-blue-500 flex items-center">
                            <FiRefreshCw className="animate-spin mr-1" /> Processing...
                          </span>
                        ) : order.confirmed ? (
                          <span className="text-green-500 flex items-center">
                            <FiCheck className="mr-1" /> Confirmed
                          </span>
                        ) : order.cancelling ? (
                          <span className="text-yellow-600 flex items-center">
                            <FiRefreshCw className="animate-spin mr-1" /> Cancelling...
                          </span>
                        ) : order.cancelled ? (
                          <span className="text-gray-500 flex items-center">
                            <FiX className="mr-1" /> Cancelled
                          </span>
                        ) : order.error ? (
                          <span 
                            className="text-red-500 flex items-center cursor-help"
                            title={order.error}
                          >
                            <FiAlertCircle className="mr-1" /> Error
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleConfirm(order.order_id)}
                              className="text-green-600 cursor-pointer hover:text-green-800 flex items-center px-3 py-1 border border-green-200 rounded hover:bg-green-50 transition-colors"
                              disabled={order.cancelling}
                            >
                              <FiCheck className="mr-1" /> Confirm
                            </button>
                            <button
                              onClick={() => handleCancel(order.order_id)}
                              className="text-red-600 cursor-pointer hover:text-red-800 flex items-center px-3 py-1 border border-red-200 rounded hover:bg-red-50 transition-colors"
                              disabled={order.confirming}
                            >
                              <FiX className="mr-1" /> Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                    No pending orders found
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

export default PendingOrders;