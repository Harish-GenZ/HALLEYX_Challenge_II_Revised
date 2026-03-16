import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus } from 'lucide-react';
import OrdersTable from '../components/OrdersTable.tsx';
import OrderModal from '../forms/OrderModal.tsx';

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

  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://localhost:5000/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    axios.get('http://localhost:5000/orders')
      .then((response) => {
        if (isMounted) {
          setOrders(response.data);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch orders', error);
      });

    return () => {
      isMounted = false;
    };
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
        await axios.delete(`http://localhost:5000/orders/${id}`);
        fetchOrders();
      } catch (error) {
        console.error('Failed to delete order', error);
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto w-full">
        <OrdersTable orders={orders} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      {isModalOpen && (
        <OrderModal order={editingOrder} onClose={handleModalClose} />
      )}
    </div>
  );
}
