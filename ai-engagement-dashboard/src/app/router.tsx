import { createBrowserRouter } from "react-router-dom";
import UploadPage from "../features/upload/pages/UploadPage";
import CritiquePage from "../features/critique/pages/CritiquePage";

export const router = createBrowserRouter([
  { path: "/", element: <UploadPage /> },
  { path: "/critique", element: <CritiquePage /> },
]);
