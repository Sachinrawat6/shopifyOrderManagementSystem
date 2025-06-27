import { useState } from "react";
import Sidebar from "./components/Sidebar";
import PendingOrders from "./pages/PendingOrders";
import ConfirmedOrders from "./pages/ConfirmedOrders";
import CancelOrders from "./pages/CancelOrders";
import UploadOrderList from "./pages/UploadOrderList"
import ShippedOrders from "./pages/ShippedOrders";
import Dashboard from "./pages/Dashboard";

const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="ml-64 flex-1 p-8">
        {/* Your main content based on activeTab */}
        {activeTab === "upload" && <UploadOrderList/>}
        {activeTab === "pending" && <PendingOrders/>}
        {activeTab === "confirmed" && <ConfirmedOrders/>}
        {activeTab === "cancel" && <CancelOrders/>}
        {activeTab === "shipped" && <ShippedOrders/>}
        {activeTab === "dashboard" && <Dashboard/>}
      </main>
    </div>
  );
};

export default App;