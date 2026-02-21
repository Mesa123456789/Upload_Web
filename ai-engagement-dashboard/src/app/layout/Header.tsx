import { NavLink } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-800 to-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-md" />
          <span className="font-semibold text-lg tracking-wide">
            AI Engagement Dashboard
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex gap-6 text-sm font-medium">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `transition ${
                isActive
                  ? "text-yellow-300"
                  : "text-white/80 hover:text-white"
              }`
            }
          >
            Upload
          </NavLink>

          <NavLink
            to="/critique"
            className={({ isActive }) =>
              `transition ${
                isActive
                  ? "text-yellow-300"
                  : "text-white/80 hover:text-white"
              }`
            }
          >
            Critique
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
