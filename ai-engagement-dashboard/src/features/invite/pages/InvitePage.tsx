import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../../app/layout/PageContainer";
import Card from "../../../shared/components/Card";
import Button from "../../../shared/components/Button";
import { auth } from "../../../lib/firebase";
import { deriveClassCode, getActiveClassCode, setStoredClassCode } from "../../../shared/session";

export default function InvitePage() {
  const navigate = useNavigate();
  const suggestedCode = useMemo(() => getActiveClassCode(), []);
  const [classCode, setClassCode] = useState(suggestedCode);

  const user = auth.currentUser;
  const derivedCode = deriveClassCode(user?.email);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setStoredClassCode(classCode || derivedCode);
    navigate("/");
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-black/5 pb-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-light">
                Class Invite
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                Join your game critique class
              </h1>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Enter the class code from your instructor before submitting a game project.
              </p>
            </div>

            <div>
              <label htmlFor="class-code" className="mb-2 block text-xs font-bold uppercase text-gray-500">
                Class Code
              </label>
              <input
                id="class-code"
                required
                value={classCode}
                onChange={(event) => setClassCode(event.target.value.toUpperCase())}
                placeholder="CMU-GAME101"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-lg font-bold tracking-widest text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              <p className="mt-2 text-xs text-gray-400">
                Demo code from your login email: {derivedCode}
              </p>
            </div>

            <div className="flex flex-col gap-3 border-t border-black/5 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setStoredClassCode(derivedCode);
                  navigate("/");
                }}
                className="rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
              >
                Use demo code
              </button>
              <Button type="submit">Continue to Upload</Button>
            </div>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}
