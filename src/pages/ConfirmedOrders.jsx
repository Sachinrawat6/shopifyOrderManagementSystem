import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiCheckCircle, FiTruck, FiRefreshCw, FiExternalLink, FiSearch, FiDownload } from 'react-icons/fi';
import { PulseLoader } from 'react-spinners';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const ConfirmedOrders = () => {
  const BASE_URL = "https://return-inventory-backend.onrender.com/api/v1/shopify";
  const [confirmedOrders, setConfirmedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [colors, setColors] = useState([]);
  const [product, setProductsData] = useState([]);




// product fetching like mrp style_id etc 
const fetchProducts = async()=>{
    const response = await fetch("https://inventorybackend-m1z8.onrender.com/api/product");
    const result = await response.json();
    setProductsData(result);
}

// color fetching 
const fetchColors = async()=>{
  const response = await axios.get("https://inventorybackend-m1z8.onrender.com/api/v1/colors/get-colors")
  setColors(response.data.data);
  
}










  const fetchConfirmedOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/confirm-orders`);
      setConfirmedOrders(response.data.data.map(order => ({
        ...order,
        selected: false,
        shipping: false
      })));
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load orders: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on search term
  const filteredOrders = confirmedOrders.filter(order =>
    order.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.styleNumber.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.contact_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle selection for a single order
  const toggleOrderSelection = (orderId) => {
    const updatedOrders = confirmedOrders.map(order => 
      order.order_id === orderId ? { ...order, selected: !order.selected } : order
    );
    setConfirmedOrders(updatedOrders);
    
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
    
    const updatedOrders = confirmedOrders.map(order => ({
      ...order,
      selected: newSelectAll
    }));
    setConfirmedOrders(updatedOrders);
    
    setSelectedOrders(newSelectAll ? confirmedOrders.map(order => order.order_id) : []);
  };

  const handleMarkAsShipped = async (orderId) => {
    try {
      setConfirmedOrders(prev => prev.map(order => 
        order.order_id === orderId ? { ...order, shipping: true } : order
      ));

      const matchedOrder = confirmedOrders.find(order => order.order_id === orderId);
      
      const validOrderForMarkShipped = {
         order_id: matchedOrder.order_id,
        styleNumber: matchedOrder.styleNumber,
        size: matchedOrder.size,
        quantity: matchedOrder.quantity,
        order_date: matchedOrder.order_date,
        shipping_method: matchedOrder.shipping_method,
        order_status: "Shipped",
        contact_number: matchedOrder.contact_number,
        payment_status: matchedOrder.payment_status,

      }

     

      
      const response = await axios.post(`${BASE_URL}/add-to-ship`, validOrderForMarkShipped);

      if (response.data.success) {
        toast.success(`Order ${orderId} marked as shipped!`);
        fetchConfirmedOrders(); // Refresh data
      } else {
        throw new Error(response.data.message || "Failed to update status");
      }
    } catch (err) {
      toast.error(`Failed to mark as shipped: ${err.message}`);
      setConfirmedOrders(prev => prev.map(order => 
        order.order_id === orderId ? { ...order, shipping: false } : order
      ));
    }
  };

  // Batch mark as shipped
  // const handleBatchShip = async () => {
  //   if (selectedOrders.length === 0) {
  //     toast.warning("Please select orders to mark as shipped");
  //     return;
  //   }

  //   try {
  //     setConfirmedOrders(prev => prev.map(order => 
  //       selectedOrders.includes(order.order_id) ? { ...order, shipping: true } : order
  //     ));

  //     const matchedOrder = confirmedOrders.filter(order => 
  //       selectedOrders.includes(order.order_id)
  //     );


    
     

  //     const promises = matchedOrder.map(order => 
  //       axios.post(`${BASE_URL}/add-to-ship`, {
  //           order_id: order.order_id,
  //       styleNumber: order.styleNumber,
  //       size: order.size,
  //       quantity: order.quantity,
  //       order_date: order.order_date,
  //       shipping_method: order.shipping_method,
  //       order_status: "Shipped",
  //       contact_number: order.contact_number,
  //       payment_status: order.payment_status,
  //       })
  //     );

  //     const results = await Promise.all(promises);
  //     const allSuccess = results.every(res => res.data.success);

  //     if (allSuccess) {
  //       toast.success(`${selectedOrders.length} orders marked as shipped!`);
  //       fetchConfirmedOrders(); // Refresh data
  //     } else {
  //       throw new Error("Some orders failed to update");
  //     }
  //   } catch (err) {
  //     toast.error(`Failed to mark some orders as shipped: ${err.message}`);
  //     setConfirmedOrders(prev => prev.map(order => 
  //       selectedOrders.includes(order.order_id) ? { ...order, shipping: false } : order
  //     ));
  //   }
  // };

const handleBatchShip = async () => {
  if (selectedOrders.length === 0) {
    toast.warning("Please select orders to mark as shipped");
    return;
  }

  try {
    // UI Update
    setConfirmedOrders(prev => prev.map(order =>
      selectedOrders.includes(order.order_id)
        ? { ...order, shipping: true, error: null }
        : order
    ));

    const ordersToShip = selectedOrders.map(orderId =>
      confirmedOrders.find(order => order.order_id === orderId)
    ).filter(order => !!order); // remove undefined

    const invalidOrders = ordersToShip.filter(order =>
      !order.styleNumber || !order.size || !order.quantity || !order.order_date || !order.contact_number
    );

    if (invalidOrders.length > 0) {
      console.error("❌ Invalid orders with missing fields:", invalidOrders);
      toast.error(`${invalidOrders.length} orders skipped due to missing data.`);
    }

    const validOrders = ordersToShip.filter(order =>
      order.styleNumber && order.size && order.quantity && order.order_date && order.contact_number
    );

    const promises = validOrders.map(order =>
      axios.post(`${BASE_URL}/add-to-ship`, {
        order_id: order.order_id,
        styleNumber: order.styleNumber,
        size: order.size,
        quantity: order.quantity,
        order_date: order.order_date,
        shipping_method: order.shipping_method,
        order_status: "Shipped",
        contact_number: order.contact_number,
        payment_status: order.payment_status,
      }).catch(err => ({ error: true, order, message: err?.response?.data?.message || err.message }))
    );

    const results = await Promise.all(promises);
    const failed = results.filter(res => res.error || res.data?.success === false);
    const successCount = validOrders.length - failed.length;

    if (successCount > 0) {
      toast.success(`${successCount} orders marked as shipped!`);
      setTimeout(fetchConfirmedOrders, 1000);
    }

    if (failed.length > 0) {
      console.error("❌ Failed orders during API:", failed);
      toast.error(`${failed.length} orders failed to mark as shipped.`);

      setConfirmedOrders(prev => prev.map(order =>
        failed.some(f => f.order?.order_id === order.order_id)
          ? { ...order, shipping: false, error: "Failed to ship" }
          : order
      ));
    }

  } catch (error) {
    console.error("❌ Unexpected ship error:", error);
    toast.error(`Unexpected error: ${error.message}`);
    setConfirmedOrders(prev => prev.map(order =>
      selectedOrders.includes(order.order_id)
        ? { ...order, shipping: false, error: error.message }
        : order
    ));
  }
};


  // Export to CSV
 const exportToCSV = () => {
  const dataToExport = selectedOrders.length > 0 
    ? confirmedOrders.filter(order => selectedOrders.includes(order.order_id))
    : confirmedOrders;

  if (dataToExport.length === 0) {
    toast.warning("No orders to export");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(dataToExport.map(order => ({
    'Sku Id': `${order.styleNumber}-${colors.find(c => c.style_code === order.styleNumber)?.color || 'N/A'}-${order.size || 'N/A'}`,
    'Rack Space': product.find(p => p.style_code === order.styleNumber)?.rack_space || 'Default',
    'Good': order.quantity || 1
  })));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Picklist");
  
  // Generate CSV instead of Excel
  const csvOutput = XLSX.write(wb, { bookType: 'csv', type: 'string' });
  
  // Create and download the file
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  FileSaver.saveAs(blob, `ShopifyPicklist_${new Date().toISOString().slice(0,10)}.csv`);
  
  toast.success(`Exported ${dataToExport.length} orders to CSV`);
};

  // Export to PDF
  const exportToPDF = () => {
    const dataToExport = selectedOrders.length > 0 
      ? confirmedOrders.filter(order => selectedOrders.includes(order.order_id)) && confirmedOrders.filter(order => !(order.shipping_method?.toLowerCase().includes("express shipping")) )
      : confirmedOrders;

    if (dataToExport.length === 0) {
      toast.warning("No orders to export");
      return;
    }

    const doc = new jsPDF();
    const title = `Confirmed Orders Report - ${new Date().toLocaleDateString()} Total Orders : ${dataToExport.length}`;
    const headers = [
      ['Sr.No','Order ID', 'Style Number', 'Size', 'Quantity', 'Payment Status', 'Shipping Method', 'Order Date']
    ];
    
    const data = dataToExport.map((order,i) => [
      i+1,
      order.order_id,
      order.styleNumber,
      order.size,
      order.quantity,
      order.payment_status,
      order.shipping_method,
      order.order_date
    ]);

    doc.text(title, 14, 15);
    autoTable(doc, {
      head: headers,
      body: data,
      startY: 20,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    doc.save(`confirmed_orders_${new Date().toISOString().slice(0,10)}.pdf`);
    toast.success(`Exported ${dataToExport.length} orders to PDF`);
  };


  const exportShippingOrderToPDF = () => {
  
    const dataToExport = confirmedOrders.filter(order => order?.shipping_method?.toLowerCase().includes("express shipping")); 

    if (dataToExport.length === 0) {
      toast.warning("No orders to export");
      return;
    }

    const doc = new jsPDF();
    const title = `Express Orders Report - ${new Date().toLocaleDateString()} Total orders : ${dataToExport.length}`;
    const headers = [
      ['Sr.No','Order ID', 'Style Number', 'Size', 'Quantity', 'Payment Status', 'Shipping Method', 'Order Date']
    ];
    
    const data = dataToExport.map((order,i) => [
      i+1 ,
      order.order_id,
      order.styleNumber,
      order.size,
      order.quantity,
      order.payment_status,
      order.shipping_method,
      order.order_date
    ]);

    doc.text(title, 14, 15);
    autoTable(doc, {
      head: headers,
      body: data,
      startY: 20,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    doc.save(`expressOrders${new Date().toISOString().slice(0,10)}.pdf`);
    toast.success(`Exported ${dataToExport.length} orders to PDF`);
  };




  useEffect(() => {
    fetchConfirmedOrders();
    fetchColors();
    fetchProducts();
  }, []);

  if (loading && confirmedOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <PulseLoader color="#3B82F6" size={10} />
        <p className="mt-4 text-gray-600">Loading confirmed orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={fetchConfirmedOrders}
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
      <div className='flex flex-row-reverse mb-4'>
        {selectedOrders.length > 0 && (
            <button
              onClick={handleBatchShip}
              className="flex items-center px-4 py-2 bg-green-100 text-green-700 border border-green-200 rounded-lg hover:bg-green-200 cursor-pointer  transition-colors"
            >
              <FiTruck className="mr-2" />
              Mark Selected as Shipped ({selectedOrders.length})
            </button>
          )}
      </div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <FiCheckCircle className="mr-2 text-green-500" />
          Confirmed Orders
        </h2>
        
        <div className="flex items-center space-x-4">
          <p className="text-gray-600">
            Total: {confirmedOrders.length}
            {selectedOrders.length > 0 && (
              <span className="ml-2 text-blue-600">Selected: {selectedOrders.length}</span>
            )}
          </p>
          <button
            onClick={fetchConfirmedOrders}
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
            placeholder="Search by Order ID, Style Number or Contact..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-200  cursor-pointer transition-colors"
          >
            <FiDownload className="mr-2" />
            Export to CSV
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center px-4 py-2 bg-purple-100 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-200 cursor-pointer  transition-colors"
          >
            <FiDownload className="mr-2" />
            Standard Order PDF
          </button>
           <button
            onClick={exportShippingOrderToPDF}
            className="flex items-center px-4 py-2 bg-green-100 text-green-700 border border-green-200 rounded-lg hover:bg-green-200 cursor-pointer  transition-colors"
          >
            <FiDownload className="mr-2" />
            Express Order PDF
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
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Style Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipping Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confirm Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => (
                  <tr key={order.order_id+index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={order.selected}
                        onChange={() => toggleOrderSelection(order.order_id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="font-medium">{order.order_status}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="font-medium">{order.shipping_method}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="font-medium">{order.contact_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.order_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {order.status !== 'shipped' && (
                          <button
                            onClick={() => handleMarkAsShipped(order.order_id)}
                            disabled={order.shipping}
                            className="flex items-center px-3 py-1 bg-green-50 border border-gray-300 rounded-md text-sm font-medium text-green-700 hover:bg-green-300 cursor-pointer duration-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            <FiTruck className="mr-1 text-green-400" />
                            {order.shipping ? 'Processing...' : 'Mark Shipped'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="px-6 py-4 text-center text-sm text-gray-500">
                    {searchTerm ? "No matching orders found" : "No confirmed orders found"}
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

export default ConfirmedOrders;