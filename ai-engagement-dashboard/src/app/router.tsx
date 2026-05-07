import { createBrowserRouter } from "react-router-dom";
import UploadPage from "../features/upload/pages/UploadPage";
import CritiquePage from "../features/critique/pages/CritiquePage";
import LoginPage from "../features/auth/pages/LoginPage";
import InvitePage from "../features/invite/pages/InvitePage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import ProfilePage from "../features/profile/pages/ProfilePage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/invite", element: <InvitePage /> },
  { path: "/", element: <UploadPage /> },
  { path: "/critique", element: <CritiquePage /> },
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/profile", element: <ProfilePage /> },
]);
