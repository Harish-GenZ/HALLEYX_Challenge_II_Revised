import { Pencil, Trash2 } from 'lucide-react';

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

export default function OrdersTable({
  orders,
  onEdit,
  onDelete
}: {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="p-4 font-semibold text-gray-700">Order ID</th>
            <th className="p-4 font-semibold text-gray-700">Customer</th>
            <th className="p-4 font-semibold text-gray-700">Product</th>
            <th className="p-4 font-semibold text-gray-700 text-right">Amount</th>
            <th className="p-4 font-semibold text-gray-700">Status</th>
            <th className="p-4 font-semibold text-gray-700">Created By</th>
            <th className="p-4 font-semibold text-gray-700 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-8 text-center text-gray-500">
                No orders found.
              </td>
            </tr>
          ) : (
            orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 text-gray-600 font-medium">#{order.id}</td>
                <td className="p-4">
                  <div className="font-medium text-gray-900">{order.firstName} {order.lastName}</div>
                  <div className="text-sm text-gray-500">{order.email}</div>
                </td>
                <td className="p-4">
                  <div className="text-gray-900">{order.product}</div>
                  <div className="text-xs text-gray-500">{order.quantity} x ${order.unitPrice.toFixed(2)}</div>
                </td>
                <td className="p-4 text-right font-semibold text-gray-900">
                  ${order.totalAmount.toFixed(2)}
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    order.status === 'In progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="p-4 text-gray-600">{order.createdBy}</td>
                <td className="p-4">
                  <div className="flex items-center justify-center space-x-3">
                    <button
                      onClick={() => onEdit(order)}
                      className="text-gray-400 hover:text-emerald-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(order.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
