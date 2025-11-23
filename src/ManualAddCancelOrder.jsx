import React, { useState } from 'react';
import axios from 'axios';

const ManualAddCancelOrder = () => {
    const [formData, setFormData] = useState({
        employee_id: '',
        order_id: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const SHOPIFY_CANCEL_ORDER_URL = "https://picklist-backend.onrender.com"

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'employee_id' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const response = await axios.post(`${SHOPIFY_CANCEL_ORDER_URL}/api/v1/shopify/add`, formData);

            if (response.data.success) {
                setMessage('Cancelled order added successfully!');
                setFormData({
                    employee_id: '',
                    order_id: ''
                });
            }
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error adding cancelled order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Cancelled Order</h2>

            {message && (
                <div className={`p-3 rounded mb-4 ${message.includes('successfully')
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-red-100 text-red-700 border border-red-300'
                    }`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                        placeholder="Enter employee ID"
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
                        placeholder="Enter order ID"
                    />
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
                                Adding...
                            </div>
                        ) : 'Add Cancelled Order'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ManualAddCancelOrder;