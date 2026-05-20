import { SessionClient } from '@/components/SessionClient';

export default function SessionPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        <SessionClient sessionId={params.id} />
      </div>
    </main>
  );
}
