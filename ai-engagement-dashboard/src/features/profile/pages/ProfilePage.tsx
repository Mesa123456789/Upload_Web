import PageContainer from "../../../app/layout/PageContainer";
import Card from "../../../shared/components/Card";
import { auth } from "../../../lib/firebase";
import { deriveClassCode, getActiveClassCode } from "../../../shared/session";

export default function ProfilePage() {
  const user = auth.currentUser;
  const name = user?.displayName || "Demo Student";
  const email = user?.email || "student@example.com";
  const classCode = getActiveClassCode() || deriveClassCode(email);

  return (
    <PageContainer>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Profile</h1>
          <p className="mt-1 text-sm text-gray-500">Account details used for class and submission records.</p>
        </div>

        <Card>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-background-card">
              {name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-bold text-gray-900">{name}</h2>
              <p className="mt-1 truncate text-sm text-gray-500">{email}</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Email</p>
            <p className="mt-3 break-all text-lg font-bold text-gray-900">{email}</p>
          </Card>
          <Card>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Class Code</p>
            <p className="mt-3 text-lg font-bold tracking-widest text-primary">{classCode}</p>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
