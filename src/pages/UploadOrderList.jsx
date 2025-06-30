import React, { useState } from "react";
import Papa from "papaparse";
import axios from "axios";
import { FiUpload, FiCheckCircle, FiClock, FiSend, FiLoader } from "react-icons/fi";

const REQUIRED_COLUMNS = [
  "Name", // Order ID
  "Lineitem sku", // Style Number
  "Lineitem quantity",
  "Financial Status",
  "Payment Method",
  "Tags",
  "Created at",
  "Billing Phone",
  "Shipping Method"
  
];

const BASE_URL = "https://return-inventory-backend.onrender.com/api/v1/shopify";

const OrderUpload = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    percentage: 0
  });



  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError("");
    setData([]);
    setProgress({
      total: 0,
      completed: 0,
      percentage: 0
    });

    if (!file.name.endsWith(".csv")) {
      setError("Please upload a valid CSV file.");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      // complete: (results) => {
      //   if (results.errors.length > 0) {
      //     setError("Error parsing CSV file.");
      //     return;
      //   }

      //   const filtered = results.data.map((row) => {
      //     const filteredRow = {};
      //     REQUIRED_COLUMNS.forEach((col) => {
      //       filteredRow[col] = row[col] || "";
      //     });
      //     return filteredRow;
      //   });
      //   setData(filtered);
      // },
      complete: (results) => {
  if (results.errors.length > 0) {
    setError("Error parsing CSV file.");
    return;
  }

  // Step 1: Group rows by Order ID
  const groupedOrders = {};
  results.data.forEach(row => {
    const orderId = row["Name"];
    if (!groupedOrders[orderId]) {
      groupedOrders[orderId] = [];
    }
    groupedOrders[orderId].push(row);
  });

  const finalData = [];

  // Step 2: Normalize each group
  Object.values(groupedOrders).forEach(orderGroup => {
    // Try to find the most complete row
    const baseRow = orderGroup.find(row =>
      row["Financial Status"] || row["Billing Phone"] || row["Tags"] || row["Shipping Method"]
    );

    const commonFields = {
      "Financial Status": baseRow?.["Financial Status"] || "NA",
      "Billing Phone": baseRow?.["Billing Phone"]?.toString() || "NA",
      "Tags": baseRow?.["Tags"] || "NA",
      "Shipping Method": baseRow?.["Shipping Method"] || "NA"
    };

    // Step 3: Fill missing values in each row
    orderGroup.forEach(row => {
      const filteredRow = {};
      REQUIRED_COLUMNS.forEach(col => {
        if (Object.keys(commonFields).includes(col)) {
          filteredRow[col] = commonFields[col];
        } else {
          filteredRow[col] = row[col] || "";
        }
      });
      finalData.push(filteredRow);
    });
  });

  setData(finalData);
},

      
      error: (err) => setError("Error reading file: " + err.message),
    });
  };

  const sendOrdersToBackend = async () => {
    if (data.length === 0) {
      setError("No data to send");
      return;
    }

    setSending(true);
    setError("");
    
    // Initialize progress
    const confirmedOrders = data.filter(
      (row) =>
        row["Tags"]?.includes("COD Confirmed") ||
        row["Financial Status"]?.toLowerCase() === "paid"
    );

    const pendingOrders = data.filter(
      (row) =>
        !row["Tags"]?.includes("COD Confirmed") &&
        row["Financial Status"]?.toLowerCase() !== "paid"
    );

    const totalOperations = confirmedOrders.length + (pendingOrders.length > 0 ? 1 : 0);
    setProgress({
      total: totalOperations,
      completed: 0,
      percentage: 0
    });

    try {
      // Send confirmed orders
      if (confirmedOrders.length > 0) {
        for (const order of confirmedOrders) {
          const styleNumber = Number(order["Lineitem sku"]?.split("-")[0]) || 0;
          const size = extractSize(order["Lineitem sku"]);
          const quantity = Number(order["Lineitem quantity"]) || 0;
          const order_date = formatDate(order["Created at"]) || formatDate(new Date());
          const order_id = order["Name"];
          const  shipping_method = order["Shipping Method"] || "NA";
           const  order_status =  order["Tags"] || "NA";
           const  contact_number =  order["Billing Phone"].toString()  ||"NA";
           const  payment_status = order["Financial Status"] || "NA";

          // skip if any field is invalid
          if (!order_id || !styleNumber || !size || !quantity || !order_date) continue;

          const singlePayload = {
            order_id,
            styleNumber,
            size,
            order_date,
            quantity,
            shipping_method,
            order_status,
            contact_number,
            payment_status
          };

          try {
            await axios.post(`${BASE_URL}/add-to-confirm`, singlePayload);
          } catch (err) {
            console.error("Failed to confirm order:", order_id, err.response?.data || err.message);
          } finally {
            // Update progress after each confirmed order
            setProgress(prev => {
              const completed = prev.completed + 1;
              return {
                ...prev,
                completed,
                percentage: Math.round((completed / prev.total) * 100)
              };
            });
          }
        }
      }

      // Send pending orders
      if (pendingOrders.length > 0) {
        const pendingPayload = {
          orders: pendingOrders.map(order => ({
            order_id: order["Name"],
            styleNumber: Number(order["Lineitem sku"]?.split("-")[0]) || 0,
            size: extractSize(order["Lineitem sku"]),
            quantity: Number(order["Lineitem quantity"]) || 0,
            order_date: formatDate(order["Created at"]) || formatDate(new Date()),
            shipping_method:order["Shipping Method"] || "NA",
            order_status: order["Tags"] || "NA",
            contact_number:order["Billing Phone"].toString() ||"NA",
            payment_status:order["Financial Status"] || "NA",
          }))
        };

        try {
          const response = await axios.post(`${BASE_URL}/add-to-pending`, pendingPayload);
          if (response.data) {
            setError(prev => `${prev ? `${prev}\n` : ''}Successfully sent ${pendingOrders.length} pending orders.`);
            window.location.href = "/confirmed";

            
          }
        } catch (err) {
          console.error("API Error:", err.response?.data || err);
          setError(`Failed to process pending orders: ${err.response?.data?.message || err.message}`);
        } finally {
          // Update progress after pending orders batch
          setProgress(prev => {
            const completed = prev.completed + 1;
            return {
              ...prev,
              completed,
              percentage: Math.round((completed / prev.total) * 100),
              
            };
          });
        }
      }

      setError(prev => `Processed ${confirmedOrders.length} confirmed and ${pendingOrders.length} pending orders.${prev ? ` ${prev}` : ''}`);

    } catch (err) {
      console.error("API Error:", err.response?.data || err);
      setError(`Failed to process orders: ${err.response?.data?.message || err.message}`);
    } finally {
      setSending(false);
    }
  };

  // Helper function to format date as DD-MM-YYYY
  const formatDate = (dateString) => {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  };

  // Size extraction function (now handles 3XL case)
  const extractSize = (sku) => {
    if (!sku) return "";
    const parts = sku.split('-');
    let sizePart = parts[parts.length - 1].toUpperCase();
    
    // Standardize size formats
    if (sizePart === 'XXL' || sizePart === '2XL') return '2XL';
    if (sizePart === 'XXXL' || sizePart === '3XL') return '3XL';
    
    return sizePart;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Order Processor</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-blue-500 transition-colors">
            <FiUpload className="text-3xl text-blue-500 mb-3" />
            <span className="text-lg font-medium text-gray-700">Upload Orders CSV</span>
            <span className="text-sm text-gray-500 mt-1">File should contain order details</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {error && (
          <div className={`p-4 mb-6 rounded-lg ${
            error.startsWith("Success") || error.includes("Processed")
              ? "bg-green-100 text-green-800 border-l-4 border-green-500" 
              : "bg-red-100 text-red-800 border-l-4 border-red-500"
          }`}>
            {error.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}

        {sending && (
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Processing orders... ({progress.completed}/{progress.total})
              </span>
              <span className="text-sm font-medium text-gray-700">
                {progress.percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {data.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-700">
                  Order Summary ({data.length} total)
                </h2>
                <button
                  onClick={sendOrdersToBackend}
                  disabled={sending}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <FiLoader className="animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FiSend className="mr-2" />
                      Process Orders
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <FiCheckCircle className="text-green-500 mr-2" />
                    <span className="font-medium">Confirmed Orders</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    {data.filter(row => 
                      row["Tags"]?.includes("COD Confirmed") || 
                      row["Financial Status"]?.toLowerCase() === "paid"
                    ).length}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    (COD Confirmed or Paid)
                  </p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center">
                    <FiClock className="text-yellow-500 mr-2" />
                    <span className="font-medium">Pending Orders</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    {data.filter(row => 
                      !row["Tags"]?.includes("COD Confirmed") && 
                      row["Financial Status"]?.toLowerCase() !== "paid"
                    ).length}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    (Not confirmed and not paid)
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto h-[50vh]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, idx) => {
                      const isConfirmed = 
                        row["Tags"]?.includes("COD Confirmed") || 
                        row["Financial Status"]?.toLowerCase() === "paid";
                      
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row["Name"]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row["Lineitem sku"]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row["Lineitem quantity"]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row["Payment Method"]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              isConfirmed
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {isConfirmed ? "Confirmed" : "Pending"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderUpload;