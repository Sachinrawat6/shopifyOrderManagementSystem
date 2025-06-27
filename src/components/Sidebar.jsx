import React from "react";
import { FiUpload, FiClock, FiCheckCircle, FiTruck, FiSettings, FiLogOut, FiX, FiBox } from "react-icons/fi";

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
      { id: "pending", label: "Pending Orders", icon: <FiClock className="text-lg" /> },
      { id: "confirmed", label: "Confirmed Orders", icon: <FiCheckCircle className="text-lg" /> },
      { id: "cancel", label: "Cancelled Orders", icon: <FiX className="text-lg" /> },
      { id: "shipped", label: "All Orders", icon: <FiBox className="text-lg" /> },
      { id: "upload", label: "Upload Orders", icon: <FiUpload className="text-lg" /> },
  ];

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-white shadow flex flex-col">
      {/* Logo/Site Name */}
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-xl font-bold text-indigo-600">Shopify OMS</h1>
      </div>
      
      {/* Navigation Items */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  activeTab === item.id
                    ? "bg-indigo-50 text-indigo-600 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className={`${activeTab === item.id ? "text-indigo-500" : "text-gray-400"}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Bottom Settings/Logout */}
      <div className="p-4 border-t border-gray-100">
        {/* <ul className="space-y-2">
          <li>
            <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-all duration-200">
              <FiSettings className="text-lg text-gray-400" />
              <span>Settings</span>
            </button>
          </li>
          <li>
            <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-all duration-200">
              <FiLogOut className="text-lg text-gray-400" />
              <span>Logout</span>
            </button>
          </li>
        </ul> */}
        <p className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-all duration-200">V.0.1</p>
      </div>
    </div>
  );
};

export default Sidebar;