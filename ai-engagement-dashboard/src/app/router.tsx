import { createBrowserRouter } from "react-router-dom";
import UploadPage from "../features/upload/pages/UploadPage";
import CritiquePage from "../features/critique/pages/CritiquePage";
import LoginPage from "../features/auth/pages/LoginPage"; 

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> }, // กำหนด Route สำหรับ Login
  { path: "/", element: <UploadPage /> },
  { path: "/critique", element: <CritiquePage /> },
]);