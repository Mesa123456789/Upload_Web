import { NavLink } from "react-router-dom";
import Dropdown, { DropdownItem } from "../../shared/components/Dropdown";

export default function Header() {
  return (
    <header className="bg-primary text-white shadow-md border-b border-primary-light/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-background-card rounded-md shrink-0 shadow-sm" />
          <span className="font-bold text-xl tracking-tight text-background-card">
            AI Engagement Dashboard
          </span>
        </div>

        {/* Navigation & User */}
        <div className="flex items-center gap-2 sm:gap-6">
          {/* Mobile Navigation */}
          <div className="sm:hidden">
            <Dropdown
              trigger={
                <button className="p-2 text-white/80 hover:text-white transition cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>
              }
              align="left"
            >
              <div className="px-4 py-2 text-xs text-gray-400 font-bold border-b">Menu</div>
              <DropdownItem onClick={() => window.location.href = "/"}>Upload Page</DropdownItem>
              <DropdownItem onClick={() => window.location.href = "/critique"}>Critique Dashboard</DropdownItem>
              <div className="border-t my-1"></div>
              <DropdownItem className="text-gray-400 cursor-not-allowed">Documentation</DropdownItem>
            </Dropdown>
          </div>

          <nav className="hidden sm:flex gap-6 text-sm font-medium">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `transition duration-200 ${
                  isActive
                    ? "text-white border-b-2 border-white"
                    : "text-white/70 hover:text-white"
                }`
              }
            >
              Upload
            </NavLink>

            <NavLink
              to="/critique"
              className={({ isActive }) =>
                `transition duration-200 ${
                  isActive
                    ? "text-white border-b-2 border-white"
                    : "text-white/70 hover:text-white"
                }`
              }
            >
              Critique
            </NavLink>
          </nav>

          <Dropdown
            trigger={
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition cursor-pointer">
                <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white/30">
                  JD
                </div>
              </button>
            }
            align="right"
          >
            <div className="px-4 py-2 border-b text-xs text-secondary">
              Logged in as <br />
              <span className="font-bold text-primary">John Doe</span>
            </div>
            <DropdownItem>Profile Settings</DropdownItem>
            <DropdownItem>Recent Analyses</DropdownItem>
            <DropdownItem className="text-red-600 hover:bg-red-50">Log out</DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
