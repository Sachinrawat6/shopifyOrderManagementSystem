import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiX, FiRefreshCw, FiSearch, FiDownload, FiTrash2 } from 'react-icons/fi';
import { PulseLoader } from 'react-spinners';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const CancelOrders = () => {
  const BASE_URL = "https://return-inventory-backend.onrender.com/api/v1/shopify";
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const fetchCancelledOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/cancel-orders`);
      setCancelledOrders(response.data.data.map(order => ({
        ...order,
        selected: false
      })));
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load orders: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on search term
  const filteredOrders = cancelledOrders.filter(order =>
    order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.styleNumber.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle selection for a single order
  const toggleOrderSelection = (orderId) => {
    const updatedOrders = cancelledOrders.map(order => 
      order.order_id === orderId ? { ...order, selected: !order.selected } : order
    );
    setCancelledOrders(updatedOrders);
    
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  // Toggle select all orders
  const toggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    const updatedOrders = cancelledOrders.map(order => ({
      ...order,
      selected: newSelectAll
    }));
    setCancelledOrders(updatedOrders);
    
    setSelectedOrders(newSelectAll ? cancelledOrders.map(order => order.order_id) : []);
  };

  // Bulk delete orders
  const handleBulkDelete = async () => {
  if (selectedOrders.length === 0) {
    toast.warning("Please select orders to delete");
    return;
  }

  setBulkProcessing(true);
  try {
    // Process each order individually since the backend expects single order_id
    const results = await Promise.all(
      selectedOrders.map(async (orderId) => {
        try {
          const response = await axios.post(`${BASE_URL}/add/all-orders`, {
            order_id: orderId // Sending single order_id per request
          });
          return { success: true, orderId, data: response.data };
        } catch (err) {
          return { 
            success: false, 
            orderId, 
            error: err.response?.data?.message || err.message 
          };
        }
      })
    );

    // Check results for failures
    const failedDeletions = results.filter(result => !result.success);
    
    if (failedDeletions.length > 0) {
      const errorMessage = failedDeletions.length === selectedOrders.length
        ? "All orders failed to process"
        : `${failedDeletions.length} of ${selectedOrders.length} orders failed to process`;
      
      toast.error(`${errorMessage}. See console for details.`);
      console.error("Failed orders:", failedDeletions);
    }

    if (failedDeletions.length < selectedOrders.length) {
      const successCount = selectedOrders.length - failedDeletions.length;
      toast.success(`${successCount} orders moved to shipped successfully!`);
      fetchCancelledOrders(); // Refresh the list
    }
  } catch (err) {
    toast.error(`Failed to process orders: ${err.message}`);
  } finally {
    setBulkProcessing(false);
  }
};

  // Export to CSV
  const exportToCSV = () => {
    const dataToExport = selectedOrders.length > 0 
      ? cancelledOrders.filter(order => selectedOrders.includes(order.order_id))
      : cancelledOrders;

    if (dataToExport.length === 0) {
      toast.warning("No orders to export");
      return;
    }

    const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const fileExtension = '.xlsx';
    
    const ws = XLSX.utils.json_to_sheet(dataToExport.map(order => ({
      'Order ID': order.order_id,
      'Style Number': order.styleNumber,
      'Size': order.size,
      'Quantity': order.quantity,
      'Order Date': order.order_date,
      'Cancel Date': new Date(order.createdAt).toLocaleString()
    })));
    
    const wb = { Sheets: { 'data': ws }, SheetNames: ['data'] };
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], {type: fileType});
    FileSaver.saveAs(data, `cancelled_orders_${new Date().toISOString().slice(0,10)}${fileExtension}`);
    toast.success(`Exported ${dataToExport.length} orders to CSV`);
  };

  // Export to PDF
  const exportToPDF = () => {
    const dataToExport = selectedOrders.length > 0 
      ? cancelledOrders.filter(order => selectedOrders.includes(order.order_id))
      : cancelledOrders;

    if (dataToExport.length === 0) {
      toast.warning("No orders to export");
      return;
    }

    const doc = new jsPDF();
    const title = `Cancelled Orders Report - ${new Date().toLocaleDateString()}`;
    const headers = [
      ['Order ID', 'Style Number', 'Size', 'Quantity', 'Order Date', 'Cancel Date']
    ];
    
    const data = dataToExport.map(order => [
      order.order_id,
      order.styleNumber,
      order.size,
      order.quantity,
      order.order_date,
      new Date(order.createdAt).toLocaleString()
    ]);

    doc.text(title, 14, 15);
    autoTable(doc, {
      head: headers,
      body: data,
      startY: 20,
      theme: 'grid',
      headStyles: {
        fillColor: [231, 76, 60], // Red color for cancelled orders
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    doc.save(`cancelled_orders_${new Date().toISOString().slice(0,10)}.pdf`);
    toast.success(`Exported ${dataToExport.length} orders to PDF`);
  };

  useEffect(() => {
    fetchCancelledOrders();
  }, []);

  if (loading && cancelledOrders.length === 0) {
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
        <div className="flex items-center space-x-4">
          {selectedOrders.length > 0 && (
            <span className="text-sm text-blue-600">
              {selectedOrders.length} selected
            </span>
          )}
          <button
            onClick={fetchCancelledOrders}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Export Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by Order ID or Style Number..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {selectedOrders.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkProcessing}
              className="flex items-center px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              <FiTrash2 className="mr-2" />
              {bulkProcessing ? 'Processing...' : `Delete Selected (${selectedOrders.length})`}
            </button>
          )}
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <FiDownload className="mr-2" />
            Export to CSV
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center px-4 py-2 bg-purple-100 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-200 transition-colors"
          >
            <FiDownload className="mr-2" />
            Export to PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Style Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cancel Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => (
                  <tr key={order.order_id + index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={order.selected}
                        onChange={() => toggleOrderSelection(order.order_id)}
                        className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                    </td>
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
                      <div className="font-medium">{order.quantity}</div>
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
                    {searchTerm ? "No matching orders found" : "No cancelled orders found"}
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