import { Receipt } from 'lucide-react';
import { UploadForm } from '@/components/UploadForm';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl shadow-lg mb-4">
            <Receipt className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">SplitBill</h1>
          <p className="text-gray-500 mt-2">
            Photo your bill → share the link → everyone picks their items
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <UploadForm />
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          No account needed · Real-time updates · WhatsApp sharing
        </p>
      </div>
    </main>
  );
}
