import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Plus, Search, Filter, Calendar, CheckCircle2, 
  Clock, AlertCircle, FileText, Upload, Trash2, Edit2, X, 
  Users, Check, ExternalLink, ShieldCheck, Database, Info, Download
} from 'lucide-react';
import { supabase } from './supabase';

export default function App() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Filter Tanggal (Default: Tanggal hari ini)
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState(todayStr); // 'all' atau format 'YYYY-MM-DD'
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Pekerjaan');
  const [priority, setPriority] = useState('Sedang');
  const [date, setDate] = useState(todayStr);
  const [names, setNames] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Config Info Modal
  const [showConfigInfo, setShowConfigInfo] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        throw error;
      }
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      const localData = localStorage.getItem('yankes_activities');
      if (localData) {
        setActivities(JSON.parse(localData));
      }
    } finally {
      setLoading(false);
    }
  };

  const saveToLocalAndState = (updated) => {
    setActivities(updated);
    localStorage.setItem('yankes_activities', JSON.stringify(updated));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Hanya file berformat PDF yang diperbolehkan!');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file maksimal 2 MB!');
      return;
    }

    setUploadingPdf(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '.' + fileExt;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (error) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          setPdfUrl(reader.result);
          setPdfName(file.name);
          setUploadingPdf(false);
        };
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setPdfUrl(publicUrl);
      setPdfName(file.name);
    } catch (err) {
      console.error('Upload error:', err);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setPdfUrl(reader.result);
        setPdfName(file.name);
      };
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const namesArray = names
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    const newActivity = {
      title,
      category,
      priority,
      date,
      names: namesArray,
      pdf_url: pdfUrl || '',
      pdf_name: pdfName || '',
      completed: false
    };

    try {
      if (isEditing && currentId) {
        const { error } = await supabase
          .from('activities')
          .update(newActivity)
          .eq('id', currentId);

        if (error) throw error;
        
        const updated = activities.map(act => act.id === currentId ? { ...act, ...newActivity } : act);
        saveToLocalAndState(updated);
      } else {
        const { data, error } = await supabase
          .from('activities')
          .insert([newActivity])
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          saveToLocalAndState([data[0], ...activities]);
        } else {
          const offlineItem = { id: Date.now(), ...newActivity };
          saveToLocalAndState([offlineItem, ...activities]);
        }
      }

      resetForm();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Save error:', err);
      if (isEditing) {
        const updated = activities.map(act => act.id === currentId ? { ...act, ...newActivity } : act);
        saveToLocalAndState(updated);
      } else {
        const offlineItem = { id: Date.now(), ...newActivity };
        saveToLocalAndState([offlineItem, ...activities]);
      }
      resetForm();
      setIsModalOpen(false);
    }
  };

  const toggleComplete = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ completed: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      const updated = activities.map(act => act.id === id ? { ...act, completed: !currentStatus } : act);
      saveToLocalAndState(updated);
    } catch (err) {
      const updated = activities.map(act => act.id === id ? { ...act, completed: !currentStatus } : act);
      saveToLocalAndState(updated);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kegiatan ini?')) return;
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updated = activities.filter(act => act.id !== id);
      saveToLocalAndState(updated);
    } catch (err) {
      const updated = activities.filter(act => act.id !== id);
      saveToLocalAndState(updated);
    }
  };

  const handleEdit = (activity) => {
    setCurrentId(activity.id);
    setTitle(activity.title);
    setCategory(activity.category);
    setPriority(activity.priority);
    setDate(activity.date || todayStr);
    setNames(Array.isArray(activity.names) ? activity.names.join(', ') : (activity.names || ''));
    setPdfUrl(activity.pdf_url || '');
    setPdfName(activity.pdf_name || '');
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setTitle('');
    setCategory('Pekerjaan');
    setPriority('Sedang');
    setDate(todayStr);
    setNames('');
    setPdfFile(null);
    setPdfUrl('');
    setPdfName('');
    setIsEditing(false);
    setCurrentId(null);
  };

  const filteredActivities = activities.filter(act => {
    const matchesSearch = act.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (Array.isArray(act.names) && act.names.some(n => n.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesStatus = statusFilter === 'all' ? true : 
      statusFilter === 'completed' ? act.completed : !act.completed;
    
    const matchesCategory = categoryFilter === 'all' ? true : act.category === categoryFilter;

    // Filter Tanggal
    const matchesDate = dateFilter === 'all' ? true : act.date === dateFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesDate;
  });

  // Fungsi Export ke Excel (CSV format)
  const exportToExcel = () => {
    if (filteredActivities.length === 0) {
      alert('Tidak ada data kegiatan untuk diexport!');
      return;
    }

    const headers = ['No', 'Nama Kegiatan', 'Kategori', 'Prioritas', 'Tanggal', 'Petugas / Nama Terlibat', 'Status'];
    const rows = filteredActivities.map((act, idx) => [
      idx + 1,
      `"${(act.title || '').replace(/"/g, '""')}"`,
      `"${(act.category || '').replace(/"/g, '""')}"`,
      `"${(act.priority || '').replace(/"/g, '""')}"`,
      `"${act.date || ''}"`,
      `"${Array.isArray(act.names) ? act.names.join(', ') : (act.names || '')}"`,
      `"${act.completed ? 'Selesai' : 'Belum Selesai'}"`
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(e => e.join(';'))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Data_Kegiatan_Yankes_${dateFilter === 'all' ? 'Semua' : dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCount = activities.length;
  const completedCount = activities.filter(a => a.completed).length;
  const pendingCount = totalCount - completedCount;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-800 pb-12 font-sans">
      {/* Header */}
      <header className="bg-emerald-700 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center justify-center shrink-0">
              <img src="/yankes-logo.png" alt="Logo Yankes" className="w-24 h-24 object-contain" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Aktifitas Kegiatan Yankes</h1>
              <p className="text-emerald-100 text-xs sm:text-sm font-medium mt-0.5">Bidang Pelayanan Kesehatan - Dinas Kesehatan Kabupaten Badung</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition shrink-0"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
              <span>Tambah Kegiatan</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/70 flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-slate-500">Total Kegiatan</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800 mt-1">{totalCount}</p>
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/70 flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-slate-500">Selesai</p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">{completedCount}</p>
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/70 flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-slate-500">Belum Selesai</p>
              <p className="text-2xl sm:text-3xl font-bold text-amber-600 mt-1">{pendingCount}</p>
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/70 flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-slate-500">Progress Harian</p>
              <p className="text-2xl sm:text-3xl font-bold text-sky-600 mt-1">{completionRate}%</p>
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Filters, Search Toolbar & Export Excel */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/70 mb-6 flex flex-col lg:flex-row gap-3.5 items-center justify-between">
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kegiatan atau nama petugas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Filter Tanggal */}
            <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="date"
                value={dateFilter === 'all' ? '' : dateFilter}
                onChange={(e) => setDateFilter(e.target.value || 'all')}
                className="bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer w-full"
                title="Pilih Tanggal Kegiatan"
              />
              {dateFilter !== 'all' && (
                <button
                  onClick={() => setDateFilter('all')}
                  className="text-xs text-rose-600 font-semibold hover:underline ml-1 shrink-0"
                  title="Tampilkan Semua Tanggal"
                >
                  Semua
                </button>
              )}
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer w-full"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Belum Selesai</option>
                <option value="completed">Selesai</option>
              </select>
            </div>

            {/* Filter Kategori */}
            <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer w-full"
              >
                <option value="all">Semua Kategori</option>
                <option value="Cuti">Cuti</option>
                <option value="Sakit">Sakit</option>
                <option value="Dinas">Dinas</option>
                <option value="Rapat">Rapat</option>
              </select>
            </div>

            {/* Tombol Export Excel */}
            <button
              onClick={exportToExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-2xs transition w-full sm:w-auto justify-center shrink-0"
              title="Download Data ke Excel"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel</span>
            </button>
          </div>
        </div>

        {/* Activity List */}
        {loading ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/70 shadow-xs">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent"></div>
            <p className="mt-4 text-slate-500 text-sm">Memuat data kegiatan...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/70 shadow-xs">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-semibold">Tidak ada kegiatan ditemukan untuk tanggal ini</p>
            <p className="text-slate-400 text-sm mt-1">Ubah filter tanggal di atas untuk melihat kegiatan hari kemarin atau tanggal lainnya.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredActivities.map((act) => {
              const priorityColor = 
                act.priority === 'Tinggi' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                act.priority === 'Sedang' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                'bg-emerald-50 text-emerald-700 border-emerald-200';

              return (
                <div 
                  key={act.id} 
                  className={`bg-white rounded-2xl p-5 border shadow-xs transition flex flex-col justify-between ${
                    act.completed ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200/70 hover:shadow-md'
                  }`}
                >
                  <div>
                    {/* Top Meta */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                        {act.category}
                      </span>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${priorityColor}`}>
                        {act.priority}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={`font-semibold text-base mb-2.5 leading-snug ${act.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {act.title}
                    </h3>

                    {/* Date */}
                    {act.date && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{new Date(act.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                    )}

                    {/* Names / Assigned Personnel */}
                    {act.names && Array.isArray(act.names) && act.names.length > 0 && (
                      <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
                          <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Petugas / Nama Terlibat:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {act.names.map((name, idx) => (
                            <span key={idx} className="bg-white text-slate-700 text-xs px-2.5 py-1 rounded-lg border border-slate-200/80 font-medium shadow-2xs">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PDF Attachment */}
                    {act.pdf_url && (
                      <div className="mb-4">
                        <a 
                          href={act.pdf_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition font-medium w-full truncate"
                        >
                          <FileText className="w-4 h-4 shrink-0 text-emerald-600" />
                          <span className="truncate">{act.pdf_name || 'Dokumen PDF'}</span>
                          <ExternalLink className="w-3.5 h-3.5 ml-auto shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between mt-2">
                    <button
                      onClick={() => toggleComplete(act.id, act.completed)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition ${
                        act.completed 
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>{act.completed ? 'Selesai' : 'Tandai Selesai'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(act)}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-xl transition"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(act.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {isEditing ? 'Edit Kegiatan Yankes' : 'Tambah Kegiatan Yankes Baru'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Nama Kegiatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pembinaan Puskesmas dan Klinik Pratama"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  >
                    <option value="Cuti">Cuti</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Dinas">Dinas</option>
                    <option value="Rapat">Rapat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Prioritas
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  >
                    <option value="Rendah">Rendah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Tinggi">Tinggi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Tanggal Kegiatan
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Upload Dokumen PDF
                  </label>
                  <label className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer transition">
                    <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{pdfName || 'Pilih PDF (Max 2MB)'}</span>
                    <input 
                      type="file" 
                      accept="application/pdf" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>
                  {uploadingPdf && <p className="text-xs text-emerald-600 mt-1">Mengunggah PDF...</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Nama Petugas / Yang Mengikuti (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: dr. Ni Wayan Sudarmi, Kadek Budi, A.Md.Kep"
                  value={names}
                  onChange={(e) => setNames(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-sm font-semibold text-white shadow-sm transition"
                >
                  {isEditing ? 'Simpan Perubahan' : 'Tambah Kegiatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Config Info Modal */}
      {showConfigInfo && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-800">Panduan Hosting Vercel & Supabase</h2>
              </div>
              <button 
                onClick={() => setShowConfigInfo(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                Aplikasi ini siap di-deploy ke <strong className="text-slate-800">Vercel</strong> dan terhubung ke database <strong className="text-slate-800">Supabase</strong>.
              </p>
              
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <p className="font-semibold text-slate-700">1. Tabel Supabase (SQL Editor):</p>
                <pre className="bg-slate-900 text-emerald-400 p-2.5 rounded-lg text-xs overflow-x-auto">
{`CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  priority TEXT,
  date DATE,
  names TEXT[],
  pdf_url TEXT,
  pdf_name TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`}
                </pre>
              </div>

              <div>
                <p className="font-semibold text-slate-700 mb-1">2. Environment Variables di Vercel:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">VITE_SUPABASE_URL</code>: URL Project Supabase Anda</li>
                  <li><code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">VITE_SUPABASE_ANON_KEY</code>: Anon Public Key Supabase Anda</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowConfigInfo(false)}
                className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-sm font-semibold hover:bg-emerald-800 transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
