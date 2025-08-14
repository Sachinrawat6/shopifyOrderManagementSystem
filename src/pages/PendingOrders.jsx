import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  FiRefreshCw,
  FiCheck,
  FiX,
  FiClock,
  FiAlertCircle,
  FiSearch,
  FiDownload,
  FiCalendar,
} from "react-icons/fi";
import { PulseLoader } from "react-spinners";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as FileSaver from "file-saver";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import EditPage from "../components/EditPage";

const PendingOrders = () => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [confirmOrders, setConfirmOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [sortOrder, setSortOrder] = useState("oldest"); // "newest" or "oldest"
  const [edit, setEdit] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);

  const BASE_URL = "https://return-inventory-backend.onrender.com/api/v1/shopify";

  // Toast notification helper
  const showToast = (message, type = "info") => {
    toast[type](message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  // Add this utility function at the top of your component (outside the PendingOrders function)
  const parseCustomDate = (dateString) => {
    if (!dateString) return null;

    const [day, month, year] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  // fetching confirm orders

  const fetchConfirmOrder = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/confirm-orders`);
      setConfirmOrders(response.data.data);
    } catch (error) {
      setError(error.message);
      showToast(`Failed to load orders : ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  console.log(pendingOrders)

  // Inside your PendingOrders component, modify the fetchPendingOrders function:
  const fetchPendingOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/pending-orders`);
      setPendingOrders(
        response.data.data.map((order) => ({
          ...order,
          confirming: false,
          cancelling: false,
          confirmed: false,
          cancelled: false,
          error: null,
          selected: false,
          parsedDate: parseCustomDate(order.order_date), // Add parsed date for sorting
        }))
      );
      setSelectedOrders([]);
      setSelectAll(false);
    } catch (error) {
      setError(error.message);
      showToast(`Failed to load orders: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Update the filteredAndSortedOrders calculation:
  const filteredAndSortedOrders = pendingOrders
    .filter((order) => {
      // Search filter
      const matchesSearch = order.order_id
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      // Date range filter
      const orderDate = order.parsedDate;
      const matchesDateRange =
        (!startDate || (orderDate && orderDate >= startDate)) &&
        (!endDate || (orderDate && orderDate <= endDate));

      return matchesSearch && matchesDateRange;
    })
    .sort((a, b) => {
      // Sorting by date
      if (sortOrder === "newest") {
        return (b.parsedDate?.getTime() || 0) - (a.parsedDate?.getTime() || 0);
      } else {
        return (a.parsedDate?.getTime() || 0) - (b.parsedDate?.getTime() || 0);
      }
    });

  // Toggle selection for a single order
  const toggleOrderSelection = (orderId) => {
    const updatedOrders = pendingOrders.map((order) =>
      order.order_id === orderId
        ? { ...order, selected: !order.selected }
        : order
    );
    setPendingOrders(updatedOrders);

    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter((id) => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  // Toggle select all orders
  const toggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);

    const updatedOrders = pendingOrders.map((order) => ({
      ...order,
      selected: newSelectAll,
    }));
    setPendingOrders(updatedOrders);

    setSelectedOrders(
      newSelectAll ? pendingOrders.map((order) => order.order_id) : []
    );
  };

  // Confirm order handler
  const handleConfirm = async (orderId) => {
    try {
      const confirm = window.confirm(
        "Are you sure want to confirm this order."
      );
      if (!confirm) return;
      const checkOrderInConfirmOrders = confirmOrders.length === 0;
      if (!checkOrderInConfirmOrders) {
        const confirm = window.confirm("Are you sure to confirm this order while confirm orders have extra orders remaining");
        if (!confirm) {
          setError(`First mark shipped orders from confirm orders`);
          showToast(`First mark shipped orders from confirm orders`);
          return;
        }

      }
      const matchedOrder = pendingOrders.find(
        (order) => order.order_id === orderId
      );
      if (!matchedOrder) throw new Error("Order not found");

      setPendingOrders((prev) =>
        prev.map((order) =>
          order.order_id === orderId
            ? { ...order, confirming: true, error: null }
            : order
        )
      );

      const response = await axios.post(`${BASE_URL}/add-to-confirm`, {
        order_id: matchedOrder.order_id,
        styleNumber: matchedOrder.styleNumber,
        size: matchedOrder.size,
        quantity: matchedOrder.quantity,
        order_date: matchedOrder.order_date,
        shipping_method: matchedOrder.shipping_method,
        order_status: "Confirm",
        contact_number: matchedOrder.contact_number,
        payment_status: matchedOrder.payment_status,
      });

      if (response.data.success) {
        showToast(`Order ${orderId} confirmed successfully!`, "success");
        setPendingOrders((prev) =>
          prev.map((order) =>
            order.order_id === orderId
              ? { ...order, confirmed: true, confirming: false }
              : order
          )
        );
        setTimeout(fetchPendingOrders, 1000);
      } else {
        throw new Error(response.data.message || "Confirmation failed");
      }
    } catch (error) {
      console.error("Confirmation error:", error);
      setPendingOrders((prev) =>
        prev.map((order) =>
          order.order_id === orderId
            ? {
              ...order,
              confirming: false,
              error: error.message,
            }
            : order
        )
      );
      showToast(
        `Failed to confirm order ${orderId}: ${error.message}`,
        "error"
      );
    }
  };

  // Cancel order handler
  const handleCancel = async (orderId) => {
    try {
      const confirm = window.confirm("Are you sure want to cancel this order.");
      if (!confirm) return;
      const matchedOrder = pendingOrders.find(
        (order) => order.order_id === orderId
      );
      if (!matchedOrder) throw new Error("Order not found");

      setPendingOrders((prev) =>
        prev.map((order) =>
          order.order_id === orderId
            ? { ...order, cancelling: true, error: null }
            : order
        )
      );

      const response = await axios.post(`${BASE_URL}/add-to-cancel`, {
        order_id: matchedOrder.order_id,
        styleNumber: matchedOrder.styleNumber,
        size: matchedOrder.size,
        quantity: matchedOrder.quantity,
        order_date: matchedOrder.order_date,
        shipping_method: matchedOrder.shipping_method,
        order_status: "Cancel",
        contact_number: matchedOrder.contact_number,
        payment_status: matchedOrder.payment_status,
      });

      if (response.data.success) {
        showToast(`Order ${orderId} cancelled successfully!`, "success");
        setPendingOrders((prev) =>
          prev.map((order) =>
            order.order_id === orderId
              ? { ...order, cancelled: true, cancelling: false }
              : order
          )
        );
        setTimeout(fetchPendingOrders, 1000);
      } else {
        throw new Error(response.data.message || "Cancellation failed");
      }
    } catch (error) {
      console.error("Cancellation error:", error);
      setPendingOrders((prev) =>
        prev.map((order) =>
          order.order_id === orderId
            ? {
              ...order,
              cancelling: false,
              error: error.message,
            }
            : order
        )
      );
      showToast(`Failed to cancel order ${orderId}: ${error.message}`, "error");
    }
  };

  // Batch confirm orders
  const handleBatchConfirm = async () => {
    if (selectedOrders.length === 0) {
      showToast("Please select orders to confirm", "warning");
      return;
    }

    try {
      setPendingOrders((prev) =>
        prev.map((order) =>
          selectedOrders.includes(order.order_id)
            ? { ...order, confirming: true, error: null }
            : order
        )
      );

      const promises = selectedOrders.map((orderId) => {
        const order = pendingOrders.find((o) => o.order_id === orderId);
        return axios.post(`${BASE_URL}/add-to-confirm`, {
          order_id: order.order_id,
          styleNumber: order.styleNumber,
          size: order.size,
          quantity: order.quantity,
          order_date: order.order_date,
          shipping_method: order.shipping_method,
          order_status: "Confirm",
          contact_number: order.contact_number,
          payment_status: order.payment_status,
        });
      });

      const results = await Promise.all(promises);
      const allSuccess = results.every((res) => res.data.success);

      if (allSuccess) {
        showToast(
          `${selectedOrders.length} orders confirmed successfully!`,
          "success"
        );
        setPendingOrders((prev) =>
          prev.map((order) =>
            selectedOrders.includes(order.order_id)
              ? { ...order, confirmed: true, confirming: false }
              : order
          )
        );
        setTimeout(fetchPendingOrders, 1000);
      } else {
        throw new Error("Some orders failed to confirm");
      }
    } catch (error) {
      console.error("Batch confirmation error:", error);
      setPendingOrders((prev) =>
        prev.map((order) =>
          selectedOrders.includes(order.order_id)
            ? {
              ...order,
              confirming: false,
              error: error.message,
            }
            : order
        )
      );
      showToast(`Failed to confirm some orders: ${error.message}`, "error");
    }
  };

  // Batch cancel orders
  const handleBatchCancel = async () => {
    if (selectedOrders.length === 0) {
      showToast("Please select orders to cancel", "warning");
      return;
    }

    try {
      setPendingOrders((prev) =>
        prev.map((order) =>
          selectedOrders.includes(order.order_id)
            ? { ...order, cancelling: true, error: null }
            : order
        )
      );

      const promises = selectedOrders.map((orderId) => {
        const order = pendingOrders.find((o) => o.order_id === orderId);
        return axios.post(`${BASE_URL}/add-to-cancel`, {
          order_id: order.order_id,
          styleNumber: order.styleNumber,
          size: order.size,
          quantity: order.quantity,
          order_date: order.order_date,
          shipping_method: order.shipping_method,
          order_status: "Cancel",
          contact_number: order.contact_number,
          payment_status: order.payment_status,
        });
      });

      const results = await Promise.all(promises);
      const allSuccess = results.every((res) => res.data.success);

      if (allSuccess) {
        showToast(
          `${selectedOrders.length} orders cancelled successfully!`,
          "success"
        );
        setPendingOrders((prev) =>
          prev.map((order) =>
            selectedOrders.includes(order.order_id)
              ? { ...order, cancelled: true, cancelling: false }
              : order
          )
        );
        setTimeout(fetchPendingOrders, 1000);
      } else {
        throw new Error("Some orders failed to cancel");
      }
    } catch (error) {
      console.error("Batch cancellation error:", error);
      setPendingOrders((prev) =>
        prev.map((order) =>
          selectedOrders.includes(order.order_id)
            ? {
              ...order,
              cancelling: false,
              error: error.message,
            }
            : order
        )
      );
      showToast(`Failed to cancel some orders: ${error.message}`, "error");
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const dataToExport =
      selectedOrders.length > 0
        ? pendingOrders.filter((order) =>
          selectedOrders.includes(order.order_id)
        )
        : pendingOrders;

    if (dataToExport.length === 0) {
      showToast("No orders to export", "warning");
      return;
    }

    const fileType =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
    const fileExtension = ".xlsx";

    const ws = XLSX.utils.json_to_sheet(
      dataToExport.map((order) => ({
        "Order ID": order.order_id,
        "Style Number": order.styleNumber,
        Size: order.size,
        Quantity: order.quantity,
        Status: order.payment_status,
        "Shipping Method": order.shipping_method,
        "Order Date": order.order_date,
        "Created At": new Date(order.createdAt).toLocaleString(),
        "Payment Status": order.payment_status,
      }))
    );

    const wb = { Sheets: { data: ws }, SheetNames: ["data"] };
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: fileType });
    FileSaver.saveAs(
      data,
      `pending_orders_${new Date().toISOString().slice(0, 10)}${fileExtension}`
    );
    showToast(`Exported ${dataToExport.length} orders to CSV`, "success");
  };

  // Export to PDF
  const exportToPDF = () => {
    const dataToExport =
      selectedOrders.length > 0
        ? pendingOrders.filter((order) =>
          selectedOrders.includes(order.order_id)
        )
        : pendingOrders;

    if (dataToExport.length === 0) {
      showToast("No orders to export", "warning");
      return;
    }

    // Create new jsPDF instance
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text(
      `Pending Orders Report - ${new Date().toLocaleDateString()} Total orders : ${dataToExport.length
      }`,
      14,
      15
    );

    // Prepare data for the table
    const headers = [
      "Sr.No",
      "Order ID",
      "Style Number",
      "Size",
      "Quantity",
      "Payment Status",
      "Shipping Method",
      "Order Date",
    ];

    const data = dataToExport.map((order, i) => [
      i + 1,
      order.order_id,
      order.styleNumber,
      order.size,
      order.quantity,
      order.payment_status,
      order.shipping_method,
      order.order_date,
    ]);

    // Add the table
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 20,
      theme: "grid",
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Save the PDF
    doc.save(`pending_orders_${new Date().toISOString().slice(0, 10)}.pdf`);
    showToast(`Exported ${dataToExport.length} orders to PDF`, "success");
  };

  // Show warning for 4 day above orders
  const showWarningForFourDaysPendingOrder = (orderDate) => {
    if (!orderDate) return 0;

    // Convert DD-MM-YYYY to YYYY-MM-DD
    const [day, month, year] = orderDate.split("-");
    const formattedDateStr = `${year}-${month}-${day}`;
    const parsedDate = new Date(formattedDateStr);

    if (isNaN(parsedDate.getTime())) return 0;

    const nowTime = new Date().getTime();
    const diffInMs = nowTime - parsedDate.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    return diffInDays;
  };

  // count of pending for 4 days orders

  const pendingOverFourDaysCount = filteredAndSortedOrders.filter(
    (order) => showWarningForFourDaysPendingOrder(order.order_date) > 4
  ).length;
  // Clear date filters
  const clearDateFilters = () => {
    setStartDate(null);
    setEndDate(null);
  };

  useEffect(() => {
    fetchPendingOrders();
    fetchConfirmOrder();
  }, []);

  // console.log(pendingOrders);

  const handleEdit = () => {
    setEdit(true);

  }






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
        <div className="flex items-center space-x-4">
          <p className="text-gray-600">
            <span>Total: {pendingOrders.length}</span>
            {selectedOrders.length > 0 && (
              <span className="ml-2 text-blue-600">
                Selected: {selectedOrders.length}
              </span>
            )}
            <span className="ml-2">
              Showing: {filteredAndSortedOrders.length}
            </span>
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
      </div>

      {/* Search, Date Filter, and Export Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by Order ID..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex items-center space-x-2">
              <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
                <FiCalendar className="text-gray-400 mr-2" />
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  placeholderText="Start Date"
                  className="w-32 focus:outline-none"
                />
              </div>
              <span className="text-gray-400">to</span>
              <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2">
                <FiCalendar className="text-gray-400 mr-2" />
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  placeholderText="End Date"
                  className="w-32 focus:outline-none"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={clearDateFilters}
                  className="text-md font-medium text-gray-500 bg-red-100 py-[10px] px-6 rounded shadow-xs cursor-pointer  hover:text-red-700 hover:bg-red-200"
                >
                  Clear
                </button>
              )}
            </div>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* {selectedOrders.length > 0 && (
            <>
              <button
                onClick={handleBatchConfirm}
                className="flex items-center px-4 py-2 bg-green-100 text-green-700 border border-green-200 rounded-lg hover:bg-green-200 transition-colors"
              >
                <FiCheck className="mr-2" />
                Confirm Selected ({selectedOrders.length})
              </button>
              <button
                onClick={handleBatchCancel}
                className="flex items-center px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg hover:bg-red-200 transition-colors"
              >
                <FiX className="mr-2" />
                Cancel Selected ({selectedOrders.length})
              </button>
            </>
          )} */}
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
        <p className="text-red-600 font-semibold">
          Pending Over 4 Days: {pendingOverFourDaysCount}
        </p>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Style Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shipping Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Date
                </th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th> */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedOrders.length > 0 ? (
                filteredAndSortedOrders.map((order, index) => (
                  <tr
                    key={order.order_id + index}
                    className={`hover:bg-gray-50 transition-colors ${showWarningForFourDaysPendingOrder(order.order_date) > 4
                      ? "bg-red-100 hover:bg-red-200"
                      : ""
                      }`}
                  >
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
                      {order.styleNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 ">
                      {" "}
                      <span className="bg-yellow-100  py-1 px-2 text-yellow-800 rounded-2xl text-xs">
                        {order.payment_status}
                      </span>{" "}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500  ">
                      <span> {order.shipping_method?.substring(0, 25)}... </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.order_date}
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={` ${showWarningForFourDaysPendingOrder(order.order_date) >
                          4
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                          } py-1 px-2 rounded-md text-xs `}
                      >
                        {showWarningForFourDaysPendingOrder(order.order_date) >
                          4
                          ? `Delay from ${showWarningForFourDaysPendingOrder(
                            order.order_date
                          ) - 4} days`
                          : `Remaining ${4 -
                          showWarningForFourDaysPendingOrder(
                            order.order_date
                          )
                          } DAYS`}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {order.confirming ? (
                          <span className="text-blue-500 flex items-center">
                            <FiRefreshCw className="animate-spin mr-1" />{" "}
                            Processing...
                          </span>
                        ) : order.confirmed ? (
                          <span className="text-green-500 flex items-center">
                            <FiCheck className="mr-1" /> Confirmed
                          </span>
                        ) : order.cancelling ? (
                          <span className="text-yellow-600 flex items-center">
                            <FiRefreshCw className="animate-spin mr-1" />{" "}
                            Cancelling...
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
                              onClick={() => handleCancel(order.order_id)}
                              className="text-red-600 cursor-pointer hover:text-red-800 flex items-center px-3 py-1 border border-red-200 rounded hover:bg-red-50 transition-colors"
                              disabled={order.confirming}
                            >
                              <FiX className="mr-1" /> Cancel
                            </button>
                            <button

                              // style={{ opacity: showWarningForFourDaysPendingOrder(order.order_date) > 4 ? "0" : "1" }}
                              onClick={() => handleConfirm(order.order_id)}
                              className="text-green-600 cursor-pointer hover:text-green-800 flex items-center px-3 py-1 border border-green-200 rounded hover:bg-green-50 transition-colors"
                              disabled={order.cancelling}
                            >
                              <FiCheck className="mr-1" /> Confirm
                            </button>

                            {editingOrderId === order._id ? (
                              <EditPage order={order} onClose={() => setEditingOrderId(null)} refreshPendingOrders={fetchPendingOrders} />
                            ) : (
                              <button
                                // style={{ opacity: showWarningForFourDaysPendingOrder(order.order_date) > 4 ? "0" : "1" }}
                                onClick={() => setEditingOrderId(order._id)}
                                className="text-yellow-600 cursor-pointer hover:text-yellow-800 flex items-center px-3 py-1 border border-yellow-200 rounded hover:bg-yellow-50 transition-colors"
                                disabled={order.cancelling}
                              >
                                <FiCheck className="mr-1" /> Edit
                              </button>
                            )}

                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="10"
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    {searchTerm || startDate || endDate
                      ? "No matching orders found for your filters"
                      : "No pending orders found"}
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
