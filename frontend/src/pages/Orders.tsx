import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import OrdersTable from '../components/OrdersTable.tsx';
import OrderModal from '../forms/OrderModal.tsx';
import { api } from '../lib/api.ts';

interface Order {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  product: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: string;
  createdBy: string;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders', error);
      setErrorMsg('Unable to load orders right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  const handleCreateNew = () => {
    setEditingOrder(null);
    setIsModalOpen(true);
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this order?')) {
      try {
        await api.delete(`/orders/${id}`);
        await fetchOrders();
      } catch (error) {
        console.error('Failed to delete order', error);
        setErrorMsg('Unable to delete the order right now. Please try again.');
      }
    }
  };

  const handleModalClose = (refresh: boolean = false) => {
    setIsModalOpen(false);
    setEditingOrder(null);
    if (refresh) {
      fetchOrders();
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Customer Orders</h2>
          <p className="mt-1 md:mt-2 text-xs md:text-sm text-gray-500">Manage all customer orders in your database.</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center justify-center w-full sm:w-auto space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Add Order</span>
        </button>
      </div>

      {loading && orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full p-10 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900">Loading orders</h3>
          <p className="mt-2 text-sm text-gray-500">Fetching the latest order data from the backend.</p>
        </div>
      ) : errorMsg && orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-rose-200 w-full p-10 text-center">
          <h3 className="text-lg font-semibold text-rose-700">Orders could not be loaded</h3>
          <p className="mt-2 text-sm text-rose-600">{errorMsg}</p>
          <button
            onClick={() => void fetchOrders()}
            className="mt-5 inline-flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {(loading || errorMsg) && (
            <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${errorMsg ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{errorMsg || 'Refreshing orders...'}</span>
                {errorMsg && (
                  <button
                    onClick={() => void fetchOrders()}
                    className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 font-medium text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto w-full">
            <OrdersTable orders={orders} onEdit={handleEdit} onDelete={handleDelete} />
          </div>
        </>
      )}

      {isModalOpen && (
        <OrderModal order={editingOrder} onClose={handleModalClose} />
      )}
    </div>
  );
}
