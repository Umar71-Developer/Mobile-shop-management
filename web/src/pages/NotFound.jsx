import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-5xl mb-3">🧭</div>
      <h2 className="text-xl font-bold text-gray-700">Page not found</h2>
      <p className="text-sm text-gray-400 mt-1">The page you're looking for doesn't exist.</p>
      <Link
        to="/"
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
