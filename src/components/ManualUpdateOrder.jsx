import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManualUpdateCancellOrder = () => {
    const [orderId, setOrderId] = useState('');
    const [formData, setFormData] = useState({
        employee_id: '',
        order_id: '',
        status: 'cancelled',
        channel: 'Shopify',
        id: "",
    });
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [message, setMessage] = useState('');
    const [orderFound, setOrderFound] = useState(false);

    const SHOPIFY_CANCEL_ORDER_URL = "https://picklist-backend.onrender.com"

    // Fetch order details when orderId changes
    const fetchOrderDetails = async (id) => {
        if (!id) return;

        setSearching(true);
        setMessage('');

        try {
            const response = await axios.get(`${SHOPIFY_CANCEL_ORDER_URL}/api/v1/shopify/list?order_id=${id}`);
            console.log("response", response.data.data.data)
            if (response.data.data.data && response.data.data.data.length > 0) {
                const order = response.data.data.data[0];
                setFormData({
                    employee_id: order.employee_id || '',
                    order_id: order.order_id || '',
                    status: order.status || 'cancelled',
                    channel: order.channel || 'Shopify',
                    id: order._id || "",
                });
                setOrderFound(true);
                setMessage('Order found! You can now update the details.');
            } else {
                setOrderFound(false);
                setMessage('Order not found. Please check the Order ID.');
                setFormData({
                    employee_id: '',
                    order_id: '',
                    status: 'cancelled',
                    channel: 'Shopify'
                });
            }
        } catch (error) {
            setOrderFound(false);
            setMessage('Error fetching order details');
            console.error('Error fetching order:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchOrderDetails(orderId);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'employee_id' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!orderFound) return;

        setLoading(true);
        setMessage('');

        try {
            const response = await axios.put(`${SHOPIFY_CANCEL_ORDER_URL}/api/v1/shopify/update/${formData.id}`, formData);

            if (response.data.success) {
                setMessage('Order updated successfully!');
                setFormData({ employee_id: "", order_id: "", status: "", channel: "" })
                setOrderId("");
            }
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error updating order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Update Cancelled Order</h2>

            {/* Search Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Find Order to Update</h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        placeholder="Enter Order ID to search"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={searching || !orderId}
                        className={`px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors ${searching || !orderId ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        {searching ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`p-3 rounded mb-4 ${message.includes('successfully') || message.includes('found')
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : message.includes('not found')
                        ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                        : 'bg-red-100 text-red-700 border border-red-300'
                    }`}>
                    {message}
                </div>
            )}

            {/* Update Form */}
            {orderFound && (
                <form onSubmit={handleSubmit} className="space-y-4 border-t pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Employee ID */}
                        <div>
                            <label htmlFor="employee_id" className="block text-sm font-medium text-gray-700 mb-1">
                                Employee ID *
                            </label>
                            <input
                                type="number"
                                id="employee_id"
                                name="employee_id"
                                value={formData.employee_id}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Order ID */}
                        <div>
                            <label htmlFor="order_id" className="block text-sm font-medium text-gray-700 mb-1">
                                Order ID *
                            </label>
                            <input
                                type="text"
                                id="order_id"
                                name="order_id"
                                value={formData.order_id}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Status */}
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="cancelled">Cancelled</option>
                                <option value="refunded">Refunded</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                            </select>
                        </div>

                        {/* Channel */}
                        <div>
                            <label htmlFor="channel" className="block text-sm font-medium text-gray-700 mb-1">
                                Channel
                            </label>
                            <select
                                id="channel"
                                name="channel"
                                value={formData.channel}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="Shopify">Shopify</option>
                                <option value="Amazon">Amazon</option>
                                <option value="Ebay">Ebay</option>
                                <option value="WooCommerce">WooCommerce</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {loading ? (
                                <div className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Updating...
                                </div>
                            ) : 'Update Order'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default ManualUpdateCancellOrder;