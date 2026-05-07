import { NavLink, useNavigate } from "react-router-dom";
import Dropdown, { DropdownItem } from "../../shared/components/Dropdown";
import { auth } from "../../lib/firebase";
import { getActiveClassCode } from "../../shared/session";

const navItems = [
  { to: "/invite", label: "Invite" },
  { to: "/", label: "Upload" },
  { to: "/critique", label: "Critique" },
  { to: "/dashboard", label: "Dashboard" },
];

export default function Header() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const name = user?.displayName || "Demo Student";
  const email = user?.email || "student@example.com";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="bg-primary text-white shadow-md border-b border-primary-light/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button onClick={() => navigate("/")} className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 bg-background-card rounded-md shrink-0 shadow-sm" />
          <span className="font-bold text-xl tracking-tight text-background-card">
            AI Engagement Dashboard
          </span>
        </button>

        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-6">
          <div className="sm:hidden">
            <Dropdown
              trigger={
                <button className="p-2 text-white/80 hover:text-white transition cursor-pointer" aria-label="Open menu">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>
              }
              align="left"
            >
              <div className="px-4 py-2 text-xs text-gray-400 font-bold border-b">Menu</div>
              {navItems.map((item) => (
                <DropdownItem key={item.to} onClick={() => navigate(item.to)}>
                  {item.label}
                </DropdownItem>
              ))}
            </Dropdown>
          </div>

          <nav className="hidden sm:flex gap-6 text-sm font-medium">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `transition duration-200 ${
                    isActive
                      ? "text-white border-b-2 border-white"
                      : "text-white/70 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

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
            <div className="px-4 py-3 border-b text-xs text-secondary">
              Logged in as <br />
              <span className="font-bold text-primary">{name}</span>
              <div className="mt-1 max-w-48 truncate text-gray-400">{email}</div>
              <div className="mt-2 font-bold text-primary-light">{getActiveClassCode()}</div>
            </div>
            <DropdownItem onClick={() => navigate("/profile")}>Profile</DropdownItem>
            <DropdownItem onClick={() => navigate("/dashboard")}>Recent Analyses</DropdownItem>
            <DropdownItem onClick={() => navigate("/invite")}>Change Class Code</DropdownItem>
            <DropdownItem onClick={() => navigate("/login")} className="text-red-600 hover:bg-red-50">
              Log out
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
