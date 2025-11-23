import React, { useState } from 'react';
import ManualAddCancelOrder from '../components/ManualAddCancelOrder';
import ManualUpdateCancellOrder from '../components/ManualUpdateOrder';


const Action = () => {
    const [activeTab, setActiveTab] = useState('add');

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-6xl mx-auto px-4">
                <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
                    Cancelled Orders Management
                </h1>

                {/* Tab Navigation */}
                <div className="flex justify-center mb-8">
                    <div className="bg-white rounded-lg shadow-sm p-1">
                        <button
                            onClick={() => setActiveTab('add')}
                            className={`px-6 py-2 rounded-md font-medium transition-colors ${activeTab === 'add'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Add Order
                        </button>
                        <button
                            onClick={() => setActiveTab('update')}
                            className={`px-6 py-2 rounded-md font-medium transition-colors ${activeTab === 'update'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Update Order
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div>
                    {activeTab === 'add' && <ManualAddCancelOrder />}
                    {activeTab === 'update' && <ManualUpdateCancellOrder />}
                </div>
            </div>
        </div>
    );
};

export default Action;