import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ChevronLeft, Upload as UploadIcon, FileSpreadsheet, FileText, 
  CheckCircle, XCircle, Loader2, File, AlertCircle,
  Eye, Trash2, Plus
} from 'lucide-react'
import { parseStudentFile, getSupportedFormats } from '../lib/fileParser'

function Upload() {
  const navigate = useNavigate()
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  
  const formats = getSupportedFormats()

  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragActive(false)
    const droppedFiles = Array.from(e.dataTransfer?.files || e.target.files)
    processFiles(droppedFiles)
  }, [])

  // Handle file selection via click
  const handleFileSelect = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files)
    processFiles(selectedFiles)
  }, [])

  // Process uploaded files
  const processFiles = async (newFiles) => {
    if (newFiles.length === 0) return
    
    setError(null)
    setProcessing(true)
    
    const validFiles = []
    
    for (const file of newFiles) {
      try {
        const students = await parseStudentFile(file)
        validFiles.push({
          file,
          students,
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          studentCount: students.length,
          parsedAt: new Date().toISOString()
        })
      } catch (err) {
        setError(`Gagal memproses ${file.name}: ${err.message}`)
      }
    }
    
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles])
    }
    
    setProcessing(false)
  }

  // Remove file
  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Clear all files
  const clearAll = () => {
    setFiles([])
    setError(null)
  }

  // Continue to assessment
  const goToAssessment = () => {
    if (files.length === 0) return
    
    // Save parsed data to localStorage for assessment page
    const allStudents = files.flatMap(f => f.students)
    localStorage.setItem('uploaded_students', JSON.stringify(allStudents))
    localStorage.setItem('uploaded_files', JSON.stringify(files.map(f => ({
      name: f.name,
      studentCount: f.studentCount
    }))))
    
    navigate('/assessment')
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <a href="/" className="flex items-center gap-2 text-gray-600 hover:text-orange-500">
            <ChevronLeft className="w-5 h-5" />
            Kembali ke Home
          </a>
        </div>
      </header>
      
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Upload File</h1>
          <p className="text-gray-600">Upload data siswa untuk analisis statistik atau assessment</p>
        </div>

        {/* Supported Formats */}
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-border">
          <h3 className="font-semibold text-gray-800 mb-3">Format yang Didukung</h3>
          <div className="flex flex-wrap gap-2">
            {formats.map(format => (
              <span key={format.ext} className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-600 flex items-center gap-1">
                <span>{format.icon}</span>
                <span>{format.name}</span>
                <span className="text-muted">.{format.ext}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Upload Area */}
        <div 
          className={`bg-white rounded-2xl shadow-sm p-8 border-2 border-dashed transition-all ${
            dragActive 
              ? 'border-sky-400 bg-sky-50' 
              : 'border-gray-200 hover:border-sky-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <input 
            type="file" 
            id="file-upload"
            className="hidden" 
            accept=".xlsx,.xls,.csv,.docx,.pdf,.txt"
            multiple
            onChange={handleFileSelect}
          />
          
          <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              dragActive ? 'bg-sky-100' : 'bg-gray-100'
            }`}>
              {processing ? (
                <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
              ) : (
                <UploadIcon className={`w-8 h-8 ${dragActive ? 'text-sky-600' : 'text-muted'}`} />
              )}
            </div>
            <p className="text-gray-700 font-medium text-lg mb-1">
              {processing ? 'Memproses file...' : 'Klik untuk upload atau drag & drop'}
            </p>
            <p className="text-muted text-sm">
              Maksimum 10MB per file
            </p>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Uploaded Files List */}
        {files.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">
                File yang Diupload ({files.length})
              </h3>
              <button 
                onClick={clearAll}
                className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> Hapus Semua
              </button>
            </div>
            
            <div className="divide-y divide-gray-100">
              {files.map((file, index) => (
                <div key={index} className="p-4 flex items-center justify-between hover:bg-surface">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'bg-green-100' :
                      file.name.endsWith('.csv') ? 'bg-blue-100' :
                      file.name.endsWith('.pdf') ? 'bg-red-100' :
                      'bg-purple-100'
                    }`}>
                      <FileSpreadsheet className={`w-5 h-5 ${
                        file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'text-green-600' :
                        file.name.endsWith('.csv') ? 'text-blue-600' :
                        file.name.endsWith('.pdf') ? 'text-red-600' :
                        'text-purple-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{file.name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span>{file.size}</span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {file.studentCount} siswa terdeteksi
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFile(index)}
                    className="p-2 text-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Total Summary */}
            <div className="p-4 bg-surface border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">
                    Total: {files.reduce((sum, f) => sum + f.studentCount, 0)} siswa
                  </p>
                  <p className="text-sm text-gray-400">
                    Dari {files.length} file
                  </p>
                </div>
                <button
                  onClick={goToAssessment}
                  className="bg-sky-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-sky-600 transition-colors flex items-center gap-2"
                >
                  Lanjut ke Assessment
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sample Format Guide */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 mb-1">Tips Format Data</p>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Untuk <strong>Excel/CSV</strong>: Kolom pertama adalah nama siswa, kolom berikutnya adalah jawaban/nilai</p>
                <p>• Untuk <strong>Word/PDF</strong>: Pastikan ada nama siswa sebelum setiap jawaban</p>
                <p>• Format: <code>Nama: Budi</code> lalu jawaban di baris berikutnya</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Upload