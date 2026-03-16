import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api.ts';

interface Order {
  id?: number;
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
  quantity: number | string;
  unitPrice: number | string;
  status: string;
  createdBy: string;
}

const INITIAL_STATE: Order = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  product: '',
  quantity: 1,
  unitPrice: 0,
  status: 'Pending',
  createdBy: 'Mr. Michael Harris'
};

const CREATORS = [
  'Mr. Michael Harris',
  'Mr. Ryan Cooper',
  'Ms. Olivia Carter',
  'Mr. Lucas Martin'
];

export default function OrderModal({ order, onClose }: { order?: Order | null, onClose: (refresh?: boolean) => void }) {
  const [formData, setFormData] = useState<Order>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (order) {
      setFormData(order);
    }
  }, [order]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'unitPrice' ? Number(value) : value
    }));
    
    // Clear error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'postalCode', 'country', 'product'];

    requiredFields.forEach(field => {
      if (!formData[field as keyof Order]) {
        newErrors[field] = 'Please fill the field';
      }
    });

    if (Number(formData.quantity) < 1) {
      newErrors['quantity'] = 'Quantity cannot be less than 1';
    }
    if (Number(formData.unitPrice) <= 0) {
      newErrors['unitPrice'] = 'Please enter a unit price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity),
        unitPrice: Number(formData.unitPrice)
      };

      if (order?.id) {
        await api.put(`/orders/${order.id}`, payload);
      } else {
        await api.post('/orders', payload);
      }
      onClose(true);
    } catch (error) {
      console.error('Failed to save order', error);
      alert('Failed to save order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-2xl font-semibold text-gray-800">
            {order ? 'Edit Order' : 'Create New Order'}
          </h2>
          <button onClick={() => onClose()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="orderForm" onSubmit={handleSubmit} className="space-y-8">
            {/* Customer Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Customer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { name: 'firstName', label: 'First Name' },
                  { name: 'lastName', label: 'Last Name' },
                  { name: 'email', label: 'Email Address', type: 'email' },
                  { name: 'phone', label: 'Phone Number' },
                ].map(field => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                    <input
                      type={field.type || 'text'}
                      name={field.name}
                      value={formData[field.name as keyof Order]}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow ${errors[field.name] ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors[field.name] && <p className="mt-1 text-sm text-red-500">{errors[field.name]}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Address Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
                </div>
                {[
                  { name: 'city', label: 'City' },
                  { name: 'state', label: 'State/Province' },
                  { name: 'postalCode', label: 'Postal Code' },
                  { name: 'country', label: 'Country' },
                ].map(field => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                    <input
                      type="text"
                      name={field.name}
                      value={formData[field.name as keyof Order]}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow ${errors[field.name] ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors[field.name] && <p className="mt-1 text-sm text-red-500">{errors[field.name]}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Order Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Order Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    name="product"
                    value={formData.product}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow ${errors.product ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.product && <p className="mt-1 text-sm text-red-500">{errors.product}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    value={formData.quantity}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow ${errors.quantity ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.quantity && <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price ($)</label>
                  <input
                    type="number"
                    name="unitPrice"
                    min="0"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow ${errors.unitPrice ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.unitPrice && <p className="mt-1 text-sm text-red-500">{errors.unitPrice}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount ($)</label>
                  <div className="w-full px-4 py-2 rounded-lg border border-gray-100 bg-gray-50 text-gray-500 font-semibold">
                    {(Number(formData.quantity || 0) * Number(formData.unitPrice || 0)).toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In progress">In progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                  <select
                    name="createdBy"
                    value={formData.createdBy}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow bg-white"
                  >
                    {CREATORS.map(creator => (
                      <option key={creator} value={creator}>{creator}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-4 rounded-b-2xl">
          <button
            type="button"
            onClick={() => onClose()}
            className="px-6 py-2.5 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="orderForm"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
