// ---------------------------------------------------------------------------
// SetupPage.tsx — Student Step 1: Game Info Setup
//
// Route (new project):    /project/new
// Route (edit existing): /project/:projectId/setup
//
// On mount:
//   - If projectId in URL → fetch from Supabase and pre-fill form
//   - If no projectId     → blank form (creating new project)
//
// On save:
//   - Creates or updates the project in the `projects` table
//   - Navigates to /project/:projectId/build
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import PageContainer from "../../../app/layout/PageContainer";
import Card from "../../../shared/components/Card";
import { useAuth } from "../../auth/context/AuthContext";
import {
  createProject,
  updateProject,
  getProject,
} from "../../projects/services/projects.service";
import type { Project } from "../../../lib/database.types";

// ---------------------------------------------------------------------------
// Step indicator — shared across all 4 step pages
// ---------------------------------------------------------------------------
function StepIndicator({ current }: { current: number }) {
  const steps = ["Setup", "Build", "Guardrail", "Output"];
  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      {steps.map((label, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                isActive
                  ? "bg-[#9E76B4] text-white"
                  : isDone
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {isDone ? "✓" : step}
            </div>
            <span
              className={`text-sm font-medium ${
                isActive ? "text-gray-800" : "text-gray-400"
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className="w-8 h-px bg-gray-200 mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form field values (mirrors projects table columns for Step 1)
// ---------------------------------------------------------------------------
interface SetupFormValues {
  title: string;
  genre: string[];
  platform: string[];
  target_audience: string;
  session_length: string;
  core_mechanic: string;
}

const EMPTY_FORM: SetupFormValues = {
  title: "",
  genre: [],
  platform: [],
  target_audience: "",
  session_length: "",
  core_mechanic: "",
};

const GENRE_OPTIONS = [
  "Action", "RPG", "Shooter", "Strategy", "Simulation",
  "Survival", "Horror", "Puzzle", "Casual", "Platformer",
  "Sports / Racing", "Visual Novel", "Idle / Clicker",
];

const PLATFORM_OPTIONS = ["iOS", "Android", "PC", "Console", "Web"];

const SESSION_OPTIONS = [
  "Under 5 min", "5-10 min", "10-20 min", "20-30 min", "30+ min",
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function SetupPage() {
  const { user } = useAuth();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  // courseId passed from Dashboard as ?courseId=<uuid>
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId");

  const [form, setForm] = useState<SetupFormValues>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(!!projectId); // true only when editing
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showMoreGenre, setShowMoreGenre] = useState(false);

  // -------------------------------------------------------------------------
  // On mount: if editing, fetch existing project and pre-fill form
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!projectId) return; // new project — nothing to load

    async function load() {
      setIsLoading(true);
      setLoadError(null);

      const { data, error } = await getProject(projectId!);
      if (error || !data) {
        setLoadError(error ?? "Project not found");
        setIsLoading(false);
        return;
      }

      // Map Project row → form values
      setForm({
        title: data.title,
        genre: data.genre ?? [],
        platform: data.platform ?? [],
        target_audience: data.target_audience ?? "",
        session_length: data.session_length ?? "",
        core_mechanic: data.core_mechanic ?? "",
      });
      setIsLoading(false);
    }

    load();
  }, [projectId]);

  // -------------------------------------------------------------------------
  // Toggle a value in a multi-select array field
  // -------------------------------------------------------------------------
  function toggleMulti(field: "genre" | "platform", value: string) {
    setForm((prev) => {
      const list = prev[field];
      return {
        ...prev,
        [field]: list.includes(value)
          ? list.filter((v) => v !== value)
          : [...list, value],
      };
    });
  }

  // -------------------------------------------------------------------------
  // Handle form submit — create or update project, then navigate to Build
  // -------------------------------------------------------------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaveError(null);
    setIsSaving(true);

    try {
      let savedProject: Project | null = null;

      if (projectId) {
        // Editing existing project
        const { data, error } = await updateProject(projectId, {
          title: form.title,
          genre: form.genre,
          platform: form.platform,
          target_audience: form.target_audience || null,
          session_length: form.session_length || null,
          core_mechanic: form.core_mechanic || null,
          current_step: 2, // advance to Step 2
        });
        if (error) { setSaveError(error); return; }
        savedProject = data;
      } else {
        // Creating new project
        const { data, error } = await createProject({
          owner_id: user.id,
          course_id: courseId, // from ?courseId= search param (null if not provided)
          title: form.title,
          genre: form.genre,
          platform: form.platform,
          target_audience: form.target_audience || null,
          session_length: form.session_length || null,
          core_mechanic: form.core_mechanic || null,
        });
        if (error) { setSaveError(error); return; }
        savedProject = data;
      }

      if (!savedProject) {
        setSaveError("Failed to save project.");
        return;
      }

      navigate(`/project/${savedProject.id}/build`);
    } finally {
      setIsSaving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const visibleGenres = showMoreGenre ? GENRE_OPTIONS : GENRE_OPTIONS.slice(0, 7);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-[#9E76B4] rounded-full animate-spin" />
        </div>
      </PageContainer>
    );
  }

  if (loadError) {
    return (
      <PageContainer>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">
          {loadError}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <StepIndicator current={1} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Step 1 — Project Setup
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Fill in your game info. This sets the context for monetization analysis.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <Card>
          <div className="p-6 space-y-6">

            {/* Game Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"
              >
                Game Title <span className="text-red-400">*</span>
              </label>
              <input
                id="title"
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Project Ethical Quest"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] outline-none transition-all text-gray-800"
              />
            </div>

            {/* Genre — multi-select pills */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Game Genre{" "}
                <span className="text-xs normal-case font-normal text-gray-400">
                  (Select all that apply)
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {visibleGenres.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleMulti("genre", g)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      form.genre.includes(g)
                        ? "bg-[#9E76B4] text-white shadow-sm"
                        : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {g}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowMoreGenre((v) => !v)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  {showMoreGenre ? "− Less" : `+ ${GENRE_OPTIONS.length - 7} More`}
                </button>
              </div>
            </div>

            {/* Platform — multi-select pills */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Platform{" "}
                <span className="text-xs normal-case font-normal text-gray-400">
                  (Select all that apply)
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleMulti("platform", p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      form.platform.includes(p)
                        ? "bg-[#9E76B4] text-white shadow-sm"
                        : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label
                htmlFor="audience"
                className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"
              >
                Target Audience
              </label>
              <input
                id="audience"
                type="text"
                value={form.target_audience}
                onChange={(e) =>
                  setForm({ ...form, target_audience: e.target.value })
                }
                placeholder="e.g. Competitive mobile players aged 18-25"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] outline-none transition-all text-gray-800"
              />
            </div>

            {/* Session Length — dropdown */}
            <div>
              <label
                htmlFor="session"
                className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"
              >
                Avg. Session Length
              </label>
              <select
                id="session"
                value={form.session_length}
                onChange={(e) =>
                  setForm({ ...form, session_length: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] outline-none transition-all text-gray-800"
              >
                <option value="">Select session length...</option>
                {SESSION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Core Mechanic */}
            <div>
              <label
                htmlFor="mechanic"
                className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5"
              >
                Core Mechanic & Game Loop
              </label>
              <textarea
                id="mechanic"
                rows={4}
                value={form.core_mechanic}
                onChange={(e) =>
                  setForm({ ...form, core_mechanic: e.target.value })
                }
                placeholder="Describe how players progress and interact with monetization moments..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] outline-none transition-all resize-none text-gray-800"
              />
            </div>
          </div>
        </Card>

        {/* Save error */}
        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {saveError}
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving || !form.title.trim()}
            className="px-6 py-2.5 bg-[#9E76B4] hover:bg-[#85619A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            {isSaving ? "Saving..." : "Save & Continue →"}
          </button>
        </div>
      </form>
    </PageContainer>
  );
}
