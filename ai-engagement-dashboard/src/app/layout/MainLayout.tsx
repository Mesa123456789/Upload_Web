import { Outlet } from "react-router-dom";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white px-6 py-4 shadow">
        <h1 className="text-lg font-semibold">
          AI Engagement Design Critique Dashboard
        </h1>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
 