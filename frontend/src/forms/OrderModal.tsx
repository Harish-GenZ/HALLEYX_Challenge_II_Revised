import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { api } from '../lib/api.ts';
import axios from 'axios';

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

/**
 * Build a clean payload that exactly matches the backend Prisma schema.
 * - Only includes fields that the backend expects
 * - Converts numbers explicitly
 * - Strips `id` and `totalAmount` (backend computes totalAmount)
 */
function buildOrderPayload(formData: Order) {
  const quantity = Number(formData.quantity) || 1;
  const unitPrice = Number(formData.unitPrice) || 0;

  return {
    firstName: (formData.firstName || '').trim(),
    lastName: (formData.lastName || '').trim(),
    email: (formData.email || '').trim(),
    phone: (formData.phone || '').trim(),
    address: (formData.address || '').trim(),
    city: (formData.city || '').trim(),
    state: (formData.state || '').trim(),
    postalCode: (formData.postalCode || '').trim(),
    country: (formData.country || '').trim(),
    product: (formData.product || '').trim(),
    quantity,
    unitPrice,
    totalAmount: Number((quantity * unitPrice).toFixed(2)),
    status: formData.status || 'Pending',
    createdBy: formData.createdBy || 'System',
  };
}

export default function OrderModal({ order, onClose }: { order?: Order | null, onClose: (refresh?: boolean) => void }) {
  const [formData, setFormData] = useState<Order>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

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
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    // Clear API error when user makes changes
    if (apiError) {
      setApiError(null);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const requiredFields: (keyof Order)[] = [
      'firstName', 'lastName', 'email', 'phone',
      'address', 'city', 'state', 'postalCode', 'country', 'product'
    ];

    for (const field of requiredFields) {
      const value = formData[field];
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        newErrors[field] = 'Please fill this field';
      }
    }

    const quantity = Number(formData.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      newErrors['quantity'] = 'Quantity must be at least 1';
    }

    const unitPrice = Number(formData.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      newErrors['unitPrice'] = 'Please enter a valid unit price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      // Build a clean payload — no extra fields, correct types
      const payload = buildOrderPayload(formData);

      console.log('Sending order payload:', JSON.stringify(payload, null, 2));

      if (order?.id) {
        await api.put(`/orders/${order.id}`, payload);
      } else {
        await api.post('/orders', payload);
      }
      onClose(true);
    } catch (error) {
      console.error('Failed to save order:', error);

      // Extract a user-friendly error message
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as { error?: string; message?: string; details?: Record<string, string> } | undefined;
        const serverMsg = data?.error || data?.message;
        const details = data?.details;

        if (details && typeof details === 'object') {
          // Map backend validation errors to form fields
          setErrors(prev => ({ ...prev, ...details }));
          setApiError(serverMsg || 'Please fix the highlighted fields.');
        } else if (serverMsg) {
          setApiError(serverMsg);
        } else if (error.response?.status === 500) {
          setApiError('Server error — please check the backend logs and database connection.');
        } else {
          setApiError(`Request failed (${error.response?.status || 'network error'}). Please try again.`);
        }
      } else {
        setApiError('An unexpected error occurred. Please try again.');
      }
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
          {apiError && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

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
                      value={formData[field.name as keyof Order] ?? ''}
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
                      value={formData[field.name as keyof Order] ?? ''}
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
