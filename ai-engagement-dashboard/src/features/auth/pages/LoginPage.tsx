import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../../lib/firebase"; 
import Card from "../../../shared/components/Card";

export default function LoginPage() {
  const navigate = useNavigate();

  const handleCmuLogin = () => {
    alert("ระบบ CMU OAuth กำลังรอเชื่อมต่อ API ครับ");
  };

  const handleGoogleGuestLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log("Login Success! User:", user.displayName, user.email);
      navigate("/");
    } catch (error) {
      console.error("Google Auth Error:", error);
      alert("ล็อกอินล้มเหลว กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 p-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="flex flex-col items-center text-center space-y-6">
            
            {/* Header Section */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                AI Engagement Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                Sign in to your account or continue as a guest to explore.
              </p>
            </div>

            {/* Actions Section */}
            <div className="w-full flex flex-col gap-3">
              
              {/* ปุ่ม CMU Account (อัปเดตใหม่) */}
              <button
                onClick={handleCmuLogin}
                className="w-full px-6 py-2.5 rounded-full text-white bg-[#9E76B4] hover:bg-[#8D6AA1] transition-colors shadow-sm font-bold cursor-pointer active:scale-95 flex items-center justify-center gap-3"
              >
                {/* ดึงภาพจากโฟลเดอร์ public/ มาแสดง 
                */}
                <img 
                  src="/Chiang_Mai_University.svg" 
                  alt="CMU Logo" 
                  className="w-6 h-6 object-contain bg-white rounded-full p-0.5" 
                />
                Login with CMU Account
              </button>
              
              {/* ปุ่มรองสำหรับ Guest */}
              <button
                onClick={handleGoogleGuestLogin}
                className="w-full px-6 py-2.5 rounded-full border-2 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm font-bold cursor-pointer active:scale-95 flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue as Guest (Demo)
              </button>
            </div>

            {/* Note/Disclaimer */}
            <p className="text-xs text-gray-400 mt-4 leading-relaxed px-4">
              This tool supports ethical monetization design for F2P games. It does not generate coercive/dark pattern tactics.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}