import { useState, useEffect } from 'react';
import api from '../utils/api';
import Layout from '../components/Layout';

interface TimetableFile {
  id: number;
  title: string;
  original_filename: string;
  faculty_id: number;
  faculty_name: string;
  department: string;
  year: number;
  semester: string;
  assigned_timetable_file_id: number | null;
  created_at: string;
}

interface Faculty {
  id: number;
  name: string;
  department: string;
  assigned_timetable_file_id: number | null;
}

export default function AdminTimetableAssignment() {
  const [files, setFiles] = useState<TimetableFile[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchFiles();
    fetchFaculty();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/timetables');
      setFiles(res.data.files);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  const fetchFaculty = async () => {
    try {
      const res = await api.get('/admin/faculty');
      setFaculty(res.data.faculty);
    } catch (error) {
      console.error('Failed to fetch faculty');
    }
  };

  const handleAssign = async (fileId: number, facultyId: number) => {
    if (!confirm('Assign this timetable to the selected faculty?')) return;

    try {
      await api.post('/admin/timetables/assign', { fileId, facultyId });
      alert('Timetable assigned successfully');
      fetchFiles();
      fetchFaculty();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Assignment failed');
    }
  };

  const handleUnassign = async (facultyId: number) => {
    if (!confirm('Unassign the current timetable from this faculty?')) return;

    try {
      await api.post('/admin/timetables/unassign', { facultyId });
      alert('Timetable unassigned successfully');
      fetchFiles();
      fetchFaculty();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Unassignment failed');
    }
  };

  const handlePreview = (id: number) => {
    window.open(`${api.defaults.baseURL}/timetables/${id}/preview`, '_blank');
  };

  const filteredFiles = files.filter(file => 
    (!selectedFaculty || file.faculty_id.toString() === selectedFaculty) &&
    (!searchQuery || 
      file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.faculty_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Timetable Assignment Management</h1>

        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <h2 className="text-xl font-semibold mb-4">Faculty Timetable Status</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Faculty Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Department</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Assigned Timetable</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {faculty.map(fac => {
                  const assignedFile = files.find(f => f.id === fac.assigned_timetable_file_id);
                  return (
                    <tr key={fac.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{fac.name}</td>
                      <td className="px-4 py-3">{fac.department}</td>
                      <td className="px-4 py-3">
                        {assignedFile ? (
                          <div>
                            <div className="font-medium text-green-600">{assignedFile.title}</div>
                            <div className="text-sm text-gray-500">{assignedFile.original_filename}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {fac.assigned_timetable_file_id ? (
                          <button
                            onClick={() => handleUnassign(fac.id)}
                            className="text-red-600 hover:underline text-sm"
                          >
                            Unassign
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold mb-4">All Timetable Files</h2>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search by title or faculty name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border rounded px-3 py-2"
              />
              <select
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="">All Faculty</option>
                {faculty.map(fac => (
                  <option key={fac.id} value={fac.id}>{fac.name}</option>
                ))}
              </select>
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No timetable files found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Uploaded By</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Department</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Year/Sem</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredFiles.map(file => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{file.title}</div>
                        <div className="text-sm text-gray-500">{file.original_filename}</div>
                      </td>
                      <td className="px-4 py-3">{file.faculty_name}</td>
                      <td className="px-4 py-3">{file.department}</td>
                      <td className="px-4 py-3 text-sm">
                        {file.year || '-'} / {file.semester || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {file.assigned_timetable_file_id === file.id ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            Assigned
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            Not Assigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm space-x-2">
                        <button
                          onClick={() => handlePreview(file.id)}
                          className="text-blue-600 hover:underline"
                        >
                          Preview
                        </button>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssign(file.id, parseInt(e.target.value));
                              e.target.value = '';
                            }
                          }}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="">Assign to...</option>
                          {faculty.map(fac => (
                            <option key={fac.id} value={fac.id}>{fac.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
