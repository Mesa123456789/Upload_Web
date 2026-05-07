import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import PageContainer from "../../../app/layout/PageContainer";
import Card from "../../../shared/components/Card";
import { db, auth } from "../../../lib/firebase";
import type { DynamicSubmission } from "../../upload/types/submission";
import { getRememberedLatestSubmission, getSavedAnalyses } from "../../../shared/session";

export default function DashboardPage() {
  const [items, setItems] = useState<DynamicSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        const currentUserId = auth.currentUser?.uid || "guest_user";
        const q = query(collection(db, "submissions"), orderBy("timestamp", "desc"), limit(20));
        const snapshot = await getDocs(q);
        const remoteItems = snapshot.docs
          .map((doc) => doc.data() as DynamicSubmission)
          .filter((item) => item.userId === currentUserId);
        const localItems = getSavedAnalyses();
        const latest = getRememberedLatestSubmission();
        const merged = [...remoteItems, ...localItems, ...(latest ? [latest] : [])];
        const unique = Array.from(new Map(merged.map((item) => [item.timestamp, item])).values());
        setItems(unique.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8));
      } catch (error) {
        console.error("Failed to load dashboard:", error);
        const latest = getRememberedLatestSubmission();
        setItems([...(latest ? [latest] : []), ...getSavedAnalyses()]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, []);

  const latest = items[0];

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Recent game critique analyses saved for this account.</p>
        </div>

        {loading ? (
          <Card>
            <div className="py-12 text-center font-medium text-primary">Loading analyses...</div>
          </Card>
        ) : !latest ? (
          <Card>
            <div className="py-12 text-center">
              <h2 className="text-xl font-bold text-gray-900">No analyses yet</h2>
              <p className="mt-2 text-sm text-gray-500">Submit a game project to see results here.</p>
              <Link className="mt-5 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-light" to="/">
                Go to Upload
              </Link>
            </div>
          </Card>
        ) : (
          <>
            <Card>
              <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-light">Latest Analysis</p>
                  <h2 className="mt-2 text-2xl font-bold text-gray-900">{latest.gameTitle}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                    {latest.mechanic || "AI critique summary is ready for review."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(latest.genre || []).map((genre) => (
                      <span key={genre} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                        {genre}
                      </span>
                    ))}
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                      {latest.aiEnabled ? "AI enabled" : "Manual only"}
                    </span>
                  </div>
                </div>
                <Link className="rounded-full bg-primary px-6 py-2.5 text-center text-sm font-bold text-white hover:bg-primary-light" to="/critique">
                  Open Critique
                </Link>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <Link key={item.timestamp} to="/critique" className="block">
                  <Card>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-bold text-gray-900">{item.gameTitle}</h3>
                        <span className="shrink-0 rounded-full bg-background-main px-3 py-1 text-[11px] font-bold text-primary">
                          {item.classCode || "CLASS-DEMO"}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm leading-6 text-gray-500">
                        {item.audience || item.mechanic || "No summary provided."}
                      </p>
                      <p className="text-xs font-medium text-gray-400">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
