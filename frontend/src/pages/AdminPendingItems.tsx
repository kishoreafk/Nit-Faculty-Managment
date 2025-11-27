import { useState, useEffect } from 'react';
import { Package, FileText } from 'lucide-react';
import api from '../utils/api';
import { formatDateTime } from '../utils/dateFormat';

export default function AdminPendingItems() {
  const [tab, setTab] = useState<'leave' | 'product'>('leave');
  const [leaveApps, setLeaveApps] = useState<any[]>([]);
  const [productReqs, setProductReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === 'leave') fetchLeave();
    else fetchProducts();
  }, [tab]);

  const fetchLeave = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/pending/leave');
      setLeaveApps(data);
    } catch (error) {
      console.error('Failed to fetch leave', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/pending/product');
      setProductReqs(data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveReview = async (id: number, action: 'APPROVED' | 'REJECTED') => {
    const reason = prompt(`Reason for ${action.toLowerCase()}:`);
    if (!reason || reason.trim() === '') {
      alert('Reason is required');
      return;
    }

    try {
      await api.put(`/admin/leave/${id}/review`, { action, reason: reason.trim() });
      alert(`Leave ${action.toLowerCase()} successfully`);
      await fetchLeave();
      // Trigger notification refresh by dispatching custom event
      window.dispatchEvent(new Event('notificationUpdate'));
    } catch (error) {
      alert('Failed to review leave');
    }
  };

  const handleProductReview = async (id: number, action: 'APPROVED' | 'REJECTED') => {
    const reason = prompt(`Reason for ${action.toLowerCase()}:`);
    if (!reason || reason.trim() === '') {
      alert('Reason is required');
      return;
    }

    try {
      await api.put(`/admin/product/${id}/review`, { action, reason: reason.trim() });
      alert(`Product request ${action.toLowerCase()} successfully`);
      await fetchProducts();
      // Trigger notification refresh by dispatching custom event
      window.dispatchEvent(new Event('notificationUpdate'));
    } catch (error) {
      alert('Failed to review product request');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Pending Items</h1>
          <p className="text-secondary-600 mt-1">Review and manage pending requests</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${tab === 'leave' ? 'bg-accent-500' : 'bg-primary-500'}`}></div>
          <span className="text-sm font-medium text-secondary-700 capitalize">{tab} Requests</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          onClick={() => setTab('leave')}
          className={`btn ${tab === 'leave' ? 'btn-primary' : 'btn-secondary'} flex-1 sm:flex-none`}
        >
          Leave Applications
        </button>
        <button
          onClick={() => setTab('product')}
          className={`btn ${tab === 'product' ? 'btn-primary' : 'btn-secondary'} flex-1 sm:flex-none`}
        >
          Product Requests
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          {tab === 'product' && (
            <div className="card">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Faculty</th>
                      <th className="hidden lg:table-cell">Department</th>
                      <th>Item</th>
                      <th className="text-center">Qty</th>
                      <th className="hidden md:table-cell">Reason</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productReqs.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <div>
                            <p className="font-semibold text-secondary-900">{req.faculty_name}</p>
                            <p className="text-sm text-secondary-600">{req.email}</p>
                            <p className="text-xs text-secondary-500 lg:hidden mt-1">{req.department}</p>
                          </div>
                        </td>
                        <td className="hidden lg:table-cell text-secondary-700">{req.department}</td>
                        <td>
                          <p className="font-semibold text-secondary-900">{req.item_name}</p>
                          <p className="text-sm text-secondary-600 md:hidden mt-1">{req.reason}</p>
                        </td>
                        <td className="text-center">
                          <span className="badge badge-info">{req.quantity}</span>
                        </td>
                        <td className="hidden md:table-cell text-secondary-600">{req.reason}</td>
                        <td>
                          <div className="flex flex-col sm:flex-row gap-2 justify-center">
                            <button
                              onClick={() => handleProductReview(req.id, 'APPROVED')}
                              className="btn btn-success text-xs px-3 py-1"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleProductReview(req.id, 'REJECTED')}
                              className="btn btn-danger text-xs px-3 py-1"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {productReqs.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                  <p className="text-secondary-500">No pending product requests</p>
                </div>
              )}
            </div>
          )}

          {tab === 'leave' && (
            <div className="card">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Faculty</th>
                      <th className="hidden lg:table-cell">Department</th>
                      <th>Leave Type</th>
                      <th className="hidden md:table-cell">Dates</th>
                      <th className="text-center">Days</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveApps.map((app) => (
                      <tr key={app.id}>
                        <td>
                          <div>
                            <p className="font-semibold text-secondary-900">{app.faculty_name}</p>
                            <p className="text-sm text-secondary-600">{app.email}</p>
                            <p className="text-xs text-secondary-500 lg:hidden mt-1">{app.department}</p>
                          </div>
                        </td>
                        <td className="hidden lg:table-cell text-secondary-700">{app.department}</td>
                        <td>
                          <span className="badge badge-info">{app.leave_type}</span>
                          <div className="text-xs text-secondary-600 mt-1 md:hidden">
                            <div>{formatDateTime(app.start_date)}</div>
                            <div>to {formatDateTime(app.end_date)}</div>
                          </div>
                        </td>
                        <td className="hidden md:table-cell">
                          <div className="text-sm text-secondary-900">
                            <p>{formatDateTime(app.start_date)}</p>
                            <p className="text-secondary-600">to {formatDateTime(app.end_date)}</p>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="font-semibold text-secondary-900">{app.total_days}</span>
                        </td>
                        <td>
                          <div className="flex flex-col sm:flex-row gap-2 justify-center">
                            <button
                              onClick={() => handleLeaveReview(app.id, 'APPROVED')}
                              className="btn btn-success text-xs px-3 py-1"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleLeaveReview(app.id, 'REJECTED')}
                              className="btn btn-danger text-xs px-3 py-1"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {leaveApps.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                  <p className="text-secondary-500">No pending leave applications</p>
                </div>
              )}
            </div>
          )}


        </>
      )}
    </div>
  );
}
