import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Plus, Search, Filter, Calendar, CheckCircle2, 
  Clock, AlertCircle, FileText, Upload, Trash2, Edit2, X, 
  Users, Check, ExternalLink, ShieldCheck, Database, Download, Award
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
  
  // Ubah names menjadi array dan tambahkan inputName sementara
  const [names, setNames] = useState([]);
  const [inputName, setInputName] = useState('');

  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);

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

  const handleAddName = () => {
    if (!inputName.trim()) return;
    setNames([...names, inputName.trim()]);
    setInputName('');
  };

  const handleRemoveName = (indexToRemove) => {
    setNames(names.filter((_, index) => index !== indexToRemove));
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

    const newActivity = {
      title,
      category,
      priority,
      date,
      names: names,
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
    setNames(Array.isArray(activity.names) ? activity.names : (activity.names ? [activity.names] : []));
    setInputName('');
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
    setNames([]);
    setInputName('');
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

    const matchesDate = dateFilter === 'all' ? true : act.date === dateFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesDate;
  });

  // Hitung Akumulasi / Rekapan Nama Petugas dari data yang sedang difilter
  const personnelSummary = (() => {
    const counts = {};
    filteredActivities.forEach(act => {
      if (Array.isArray(act.names)) {
        act.names.forEach(name => {
          const trimmed = name.trim();
          if (trimmed) {
            counts[trimmed] = (counts[trimmed] || 0) + 1;
          }
        });
      }
    });
    // Ubah ke array & urutkan dari yang paling sering bertugas
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  })();

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
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">AKTIVITAS KEGIATAN YANKES</h1>
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
            <div className="w-11 h-11 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink
