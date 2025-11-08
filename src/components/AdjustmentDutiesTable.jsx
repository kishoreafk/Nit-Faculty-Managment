import React, { useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const AdjustmentDutiesTable = ({ field, value = [], onChange, error }) => {
  const [rows, setRows] = useState(value.length > 0 ? value : [createEmptyRow()]);

  function createEmptyRow() {
    const emptyRow = {};
    field.tableConfig.columns.forEach(col => {
      emptyRow[col.name] = '';
    });
    return emptyRow;
  }

  const handleRowChange = (rowIndex, columnName, newValue) => {
    const updatedRows = rows.map((row, index) => {
      if (index === rowIndex) {
        return { ...row, [columnName]: newValue };
      }
      return row;
    });
    setRows(updatedRows);
    onChange(updatedRows);
  };

  const addRow = () => {
    if (rows.length < (field.tableConfig.maxRows || 10)) {
      const newRows = [...rows, createEmptyRow()];
      setRows(newRows);
      onChange(newRows);
    }
  };

  const removeRow = (rowIndex) => {
    if (rows.length > (field.tableConfig.minRows || 1)) {
      const newRows = rows.filter((_, index) => index !== rowIndex);
      setRows(newRows);
      onChange(newRows);
    }
  };

  const renderCell = (row, column, rowIndex) => {
    const cellValue = row[column.name] || '';
    const cellId = `${field.name}_${rowIndex}_${column.name}`;
    
    const commonClasses = `px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
      column.required && !cellValue ? 'border-red-300' : ''
    }`;

    switch (column.type) {
      case 'select':
        return (
          <select
            id={cellId}
            value={cellValue}
            onChange={(e) => handleRowChange(rowIndex, column.name, e.target.value)}
            required={column.required}
            className={commonClasses}
          >
            <option value="">Select...</option>
            {column.options?.map(option => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        );
      
      case 'number':
        return (
          <input
            id={cellId}
            type="number"
            value={cellValue}
            onChange={(e) => handleRowChange(rowIndex, column.name, e.target.value)}
            placeholder={column.placeholder}
            required={column.required}
            min="1"
            max="10"
            className={commonClasses}
          />
        );
      
      case 'date':
        return (
          <input
            id={cellId}
            type="date"
            value={cellValue}
            onChange={(e) => handleRowChange(rowIndex, column.name, e.target.value)}
            required={column.required}
            className={commonClasses}
          />
        );
      
      case 'time':
        return (
          <input
            id={cellId}
            type="time"
            value={cellValue}
            onChange={(e) => handleRowChange(rowIndex, column.name, e.target.value)}
            required={column.required}
            className={commonClasses}
          />
        );
      
      default:
        return (
          <input
            id={cellId}
            type="text"
            value={cellValue}
            onChange={(e) => handleRowChange(rowIndex, column.name, e.target.value)}
            placeholder={column.placeholder}
            required={column.required}
            className={commonClasses}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= (field.tableConfig.maxRows || 10)}
          className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="h-4 w-4" />
          <span>{field.tableConfig.addButtonText || 'Add Row'}</span>
        </button>
      </div>

      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {field.tableConfig.columns.map((column) => (
                  <th
                    key={column.name}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column.label}
                    {column.required && <span className="text-red-500 ml-1">*</span>}
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {field.tableConfig.columns.map((column) => (
                    <td key={column.name} className="px-3 py-2 whitespace-nowrap">
                      {renderCell(row, column, rowIndex)}
                    </td>
                  ))}
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(rowIndex)}
                      disabled={rows.length <= (field.tableConfig.minRows || 1)}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={field.tableConfig.removeButtonText || 'Remove row'}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      <div className="text-xs text-gray-500">
        <p>• Add multiple adjustment duties as needed</p>
        <p>• Ensure all required fields are filled for each row</p>
        <p>• Contact the adjusting faculty member to confirm availability</p>
      </div>
    </div>
  );
};

export default AdjustmentDutiesTable;