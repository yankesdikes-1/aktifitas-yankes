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
            <p className="text-slate-400 text-sm mt-1">Ubah filter tanggal di atas untuk melihat kegiatan pada tanggal lainnya.</p>
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
                    act.completed ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200/70 hover:shadow-md'
                  }`}
                >
                  <div>
                    {/* Top Meta: Kategori & Prioritas */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                        {act.category}
                      </span>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${priorityColor}`}>
                        {act.priority}
                      </span>
                    </div>

                    {/* Title Kegiatan */}
                    <h3 className={`font-bold text-base mb-2 leading-snug ${act.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {act.title}
                    </h3>

                    {/* Tanggal Kegiatan (Dibuat Lebih Menonjol) */}
                    {act.date && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50/80 px-3 py-1.5 rounded-xl mb-3.5 border border-emerald-100">
                        <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{new Date(act.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                    )}

                    {/* Names / Assigned Personnel (Dibuat Sangat Jelas) */}
                    {act.names && Array.isArray(act.names) && act.names.length > 0 && (
                      <div className="mb-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                          <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Petugas / Nama Terlibat ({act.names.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {act.names.map((name, idx) => (
                            <span key={idx} className="bg-white text-emerald-900 text-xs px-2.5 py-1 rounded-lg border border-emerald-200/80 font-semibold shadow-2xs">
                              ✓ {name}
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
                          className="inline-flex items-center gap-2 text-xs bg-slate-50 text-slate-700 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition font-medium w-full truncate"
                        >
                          <FileText className="w-4 h-4 shrink-0 text-emerald-600" />
                          <span className="truncate">{act.pdf_name || 'Dokumen PDF'}</span>
                          <ExternalLink className="w-3.5 h-3.5 ml-auto shrink-0 text-slate-400" />
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
