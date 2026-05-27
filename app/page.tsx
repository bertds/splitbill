import { UploadForm } from '@/components/UploadForm';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo + title */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="SplitBill logo"
            className="w-20 h-20 mx-auto mb-4 drop-shadow-lg"
          />
          {/* Gradient title matching the branding */}
          <h1
            className="text-4xl font-extrabold tracking-tight"
            style={{
              background: 'linear-gradient(90deg, #f5a623 0%, #e8821a 40%, #c9680f 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            SplitBill
          </h1>
        </div>

        {/* Infographic — replaces the old text explanation */}
        <div className="mb-6">
          <img
            src="/infographic.png"
            alt="Photo your bill → share the link → everyone picks their items"
            className="w-full rounded-2xl"
          />
        </div>

        {/* Upload card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <UploadForm />
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          No account needed · Real-time updates · Share via any app
        </p>
      </div>
    </main>
  );
}
