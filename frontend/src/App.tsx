import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart } from 'lucide-react';
import Orders from './pages/Orders.tsx';
import DashboardBuilder from './dashboard/DashboardBuilder.tsx';

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50 text-gray-900">
        {/* Sidebar */}
        <aside className="w-16 lg:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all">
          <div className="h-16 flex items-center justify-center lg:justify-start px-4 lg:px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-800 hidden lg:block">HalleyX Challenge II</h1>
            <h1 className="text-xl font-bold text-gray-800 block lg:hidden">HX</h1>
          </div>
          <nav className="flex-1 p-2 lg:p-4 space-y-2">
            <Link
              to="/"
              className="flex items-center space-x-3 px-3 py-3 rounded-lg text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
            >
              <LayoutDashboard size={20} />
              <span className="font-medium hidden lg:block">Dashboard</span>
            </Link>
            <Link
              to="/orders"
              className="flex items-center space-x-3 px-3 py-3 rounded-lg text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
            >
              <ShoppingCart size={20} />
              <span className="font-medium hidden lg:block">Orders</span>
            </Link>
          </nav>
          <div className="mt-auto p-4 lg:p-6 border-t border-gray-100 hidden lg:block bg-gray-50/50">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Author</p>
            <p className="text-xs text-gray-600 font-medium leading-relaxed">Done by Balaharish alais yogesh N </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <Routes>
            <Route path="/" element={<DashboardBuilder />} />
            <Route path="/orders" element={<Orders />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
