import React, { useState } from 'react';
import { CalculatorIcon, XMarkIcon } from '@heroicons/react/24/outline';

const SimpleLeaveCalculator = ({ onClose }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  const [result, setResult] = useState(null);

  const calculateDays = () => {
    if (!startDate || !endDate) return;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      setResult({ error: 'End date must be after start date' });
      return;
    }
    
    let totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    let workingDays = totalDays;
    
    if (excludeWeekends) {
      workingDays = 0;
      const current = new Date(start);
      
      while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
          workingDays++;
        }
        current.setDate(current.getDate() + 1);
      }
    }
    
    setResult({
      totalDays,
      workingDays,
      weekends: totalDays - workingDays
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CalculatorIcon className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Leave Calculator</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={excludeWeekends}
              onChange={(e) => setExcludeWeekends(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Exclude weekends</span>
          </label>

          <button
            onClick={calculateDays}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Calculate
          </button>

          {result && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              {result.error ? (
                <p className="text-red-600 text-sm">{result.error}</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Days:</span>
                    <span className="font-medium">{result.totalDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Working Days:</span>
                    <span className="font-medium text-blue-600">{result.workingDays}</span>
                  </div>
                  {excludeWeekends && (
                    <div className="flex justify-between">
                      <span>Weekend Days:</span>
                      <span className="font-medium text-gray-600">{result.weekends}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleLeaveCalculator;