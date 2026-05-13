import { NavLink, useNavigate } from "react-router-dom";
import Dropdown, { DropdownItem } from "../../shared/components/Dropdown";
import { useAuth } from "../../features/auth/context/AuthContext";
import { supabase } from "../../lib/supabase";

// Header — shown on every page inside PageContainer
// Nav links adapt to role: instructor sees dashboard link, student sees project link
export default function Header() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Display initials from email or display_name for the user avatar
  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "??";

  const displayName = profile?.display_name ?? user?.email ?? "User";

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <header className="bg-primary text-white shadow-md border-b border-primary-light/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">

        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-background-card rounded-md shrink-0 shadow-sm" />
          <span className="font-bold text-xl tracking-tight text-background-card">
            EMD
          </span>
        </div>

        {/* Navigation & User */}
        <div className="flex items-center gap-2 sm:gap-6">

          {/* Desktop nav — links differ by role */}
          <nav className="hidden sm:flex gap-6 text-sm font-medium">
            {profile?.role === "instructor" ? (
              <>
                <NavLink
                  to="/instructor/dashboard"
                  className={({ isActive }) =>
                    `transition duration-200 ${
                      isActive ? "text-white border-b-2 border-white" : "text-white/70 hover:text-white"
                    }`
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/instructor/courses"
                  className={({ isActive }) =>
                    `transition duration-200 ${
                      isActive ? "text-white border-b-2 border-white" : "text-white/70 hover:text-white"
                    }`
                  }
                >
                  Courses
                </NavLink>
                <NavLink
                  to="/instructor/projects"
                  className={({ isActive }) =>
                    `transition duration-200 ${
                      isActive ? "text-white border-b-2 border-white" : "text-white/70 hover:text-white"
                    }`
                  }
                >
                  Projects
                </NavLink>
              </>
            ) : (
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `transition duration-200 ${
                    isActive ? "text-white border-b-2 border-white" : "text-white/70 hover:text-white"
                  }`
                }
              >
                Dashboard
              </NavLink>
            )}
          </nav>

          {/* Mobile hamburger menu */}
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
              {profile?.role === "instructor" ? (
                <>
                  <DropdownItem onClick={() => navigate("/instructor/dashboard")}>Dashboard</DropdownItem>
                  <DropdownItem onClick={() => navigate("/instructor/courses")}>Courses</DropdownItem>
                  <DropdownItem onClick={() => navigate("/instructor/projects")}>Projects</DropdownItem>
                </>
              ) : (
                <DropdownItem onClick={() => navigate("/dashboard")}>Dashboard</DropdownItem>
              )}
            </Dropdown>
          </div>

          {/* User avatar + dropdown */}
          <Dropdown
            trigger={
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition cursor-pointer">
                <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white/30">
                  {initials}
                </div>
              </button>
            }
            align="right"
          >
            <div className="px-4 py-2 border-b text-xs text-secondary">
              Logged in as <br />
              <span className="font-bold text-primary">{displayName}</span>
            </div>
            <DropdownItem className="text-red-600 hover:bg-red-50" onClick={handleSignOut}>
              Log out
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
