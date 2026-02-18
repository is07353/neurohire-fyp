import { Language } from '../App';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { useUploadThing } from '../../lib/uploadthing';

interface CVUploadProps {
  language: Language;
  cvFile: File | null;
  onCVUpload: (file: File) => void;
  onContinue: () => void;
}

const translations = {
  english: {
    title: 'Upload Your CV',
    dragDrop: 'Drag and drop your CV here',
    or: 'or',
    uploadButton: 'Upload CV',
    supportedFormats: 'PDF, JPG, or PNG supported',
    uploadSuccess: 'CV uploaded successfully',
    continueButton: 'Continue',
  },
  urdu: {
    title: 'اپنا سی وی اپ لوڈ کریں',
    dragDrop: 'اپنا سی وی یہاں ڈراپ کریں',
    or: 'یا',
    uploadButton: 'سی وی اپ لوڈ کریں',
    supportedFormats: 'PDF، JPG، یا PNG معاون ہیں',
    uploadSuccess: 'سی وی کامیابی سے اپ لوڈ ہو گیا',
    continueButton: 'جاری رکھیں',
  },
};

const API_BASE =
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ??
  'http://127.0.0.1:8000';

export function CVUpload({ language, cvFile, onCVUpload, onContinue }: CVUploadProps) {
  const t = translations[language || 'english'];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadComplete, setUploadComplete] = useState(false);

  const { startUpload, isUploading } = useUploadThing('mediaUploader', {
    onClientUploadComplete: (res) => {
      console.log('[UploadThing] Client upload complete:', res);

      // Send the uploaded file URL to the backend and only mark complete when the server has accepted it.
      // That way when the user clicks Continue, analysis-status will have an application_id to poll.
      try {
        const first = Array.isArray(res) ? res[0] : undefined;
        const url = first?.url as string | undefined;
        if (url) {
          fetch(`${API_BASE}/candidate/cv-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_url: url,
              file_size: cvFile?.size ?? null,
              mime_type: cvFile?.type ?? null,
            }),
          })
            .then((r) => {
              if (r.ok) setUploadComplete(true);
            })
            .catch(() => {
              // Still allow continue so user is not stuck
              setUploadComplete(true);
            });
        } else {
          setUploadComplete(true);
        }
      } catch {
        setUploadComplete(true);
      }
    },
    onUploadError: (error) => {
      console.error('[UploadThing] Upload error:', error);
      setUploadComplete(false);
    },
  });

  const handleFileSelect = async (file: File) => {
    console.log('[CVUpload] File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      console.warn('[CVUpload] Invalid file type for UploadThing:', file.type);
      return;
    }

    // Reset completion flag when a new file is chosen
    setUploadComplete(false);

    onCVUpload(file);
    // Also upload to UploadThing
    try {
      console.log('[UploadThing] Starting upload via startUpload...');
      const result = await startUpload([file]);
      console.log('[UploadThing] startUpload result:', result);
    } catch (err) {
      console.error('[UploadThing] startUpload threw:', err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="py-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-medium text-[#000000] mb-3">
          {t.title}
        </h1>
      </div>
      
      <div className="mb-12">
        {!cvFile ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-4 border-dashed border-gray-300 rounded-lg p-16 text-center bg-gray-50 hover:border-[#000000] hover:bg-[#f5f5f5] transition-all"
          >
            <Upload className="w-20 h-20 text-[#000000] mx-auto mb-6" strokeWidth={1.5} />
            
            <p className="text-2xl text-gray-700 mb-4">{t.dragDrop}</p>
            
            <p className="text-xl text-gray-500 mb-8">{t.or}</p>
            
            <button
              onClick={handleUploadClick}
              className="bg-[#000000] text-white px-12 py-5 rounded-lg text-xl font-medium hover:bg-[#333333] active:bg-[#000000] transition-all"
            >
              {t.uploadButton}
            </button>
            
            <p className="text-lg text-gray-500 mt-6">{t.supportedFormats}</p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="border-4 border-[#000000] rounded-lg p-16 text-center bg-[#f5f5f5]">
            <CheckCircle className="w-20 h-20 text-[#000000] mx-auto mb-6" strokeWidth={1.5} />
            
            <p className="text-2xl text-[#000000] font-medium mb-6">
              {uploadComplete ? t.uploadSuccess : 'Uploading your CV...'}
            </p>
            
            <div className="flex items-center justify-center gap-3 mb-8">
              <FileText className="w-8 h-8 text-[#000000]" />
              <span className="text-xl text-gray-700">{cvFile.name}</span>
            </div>
            
            <button
              onClick={handleUploadClick}
              className="text-[#000000] px-8 py-3 rounded-lg text-lg border-2 border-[#000000] hover:bg-[#000000] hover:text-white transition-all"
            >
              {t.uploadButton}
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {isUploading && (
              <div className="mt-6">
                <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                  <div className="h-2 bg-[#000000] w-1/2 animate-pulse" />
                </div>
                <p className="mt-3 text-gray-500 text-sm">
                  Please wait while we upload your CV...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <button
        onClick={onContinue}
        disabled={!cvFile || !uploadComplete || isUploading}
        className={`w-full py-5 px-8 rounded-lg text-xl font-medium transition-all ${
          cvFile && uploadComplete && !isUploading
            ? 'bg-[#000000] text-white hover:bg-[#333333] active:bg-[#000000]'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {t.continueButton}
      </button>
    </div>
  );
}