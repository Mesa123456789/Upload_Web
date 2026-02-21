import { useNavigate } from "react-router-dom";
import Card from "../../../shared/components/Card";
import Button from "../../../shared/components/Button";

export default function UploadForm() {
  const navigate = useNavigate();

  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate("/critique");
        }}
      >
        <h2 className="text-xl font-semibold text-center mb-1">
          Design Submission
        </h2>

        <p className="text-center text-gray-500 text-sm mb-6">
          Monetization & Engagement Intent
        </p>

        <div className="space-y-6 text-sm">

          <p className="text-gray-500">
            Define your design intent clearly before analysis.
          </p>

          {/* Project Context */}
          <div>
            <h3 className="font-semibold mb-3">Project Context</h3>

            <div className="space-y-3">

              <div>
                <label
                  htmlFor="playableType"
                  className="block font-medium"
                >
                  Playable Ad Type:
                </label>
                <select
                  id="playableType"
                  name="playableType"
                  className="w-full border rounded px-3 py-2 mt-1"
                >
                  <option>Install-driven playable ad</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="targetPlayer"
                  className="block font-medium"
                >
                  Target Player:
                </label>
                <select
                  id="targetPlayer"
                  name="targetPlayer"
                  className="w-full border rounded px-3 py-2 mt-1"
                >
                  <option>Casual mobile players</option>
                </select>
              </div>

            </div>
          </div>

          {/* Monetization Intent */}
          <div>
            <h3 className="font-semibold mb-3">Monetization Intent</h3>

            <div className="space-y-3">

              <div>
                <label
                  htmlFor="monetizationModel"
                  className="block font-medium"
                >
                  Monetization Model:
                </label>
                <select
                  id="monetizationModel"
                  name="monetizationModel"
                  className="w-full border rounded px-3 py-2 mt-1"
                >
                  <option>Reward-based motivation</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="ctaText"
                  className="block font-medium"
                >
                  CTA Text:
                </label>
                <input
                  id="ctaText"
                  name="ctaText"
                  type="text"
                  defaultValue="Join the Adventure!"
                  className="w-full border rounded px-3 py-2 mt-1"
                />
              </div>

              <div className="flex gap-3">

                <div className="flex-1">
                  <label
                    htmlFor="ctaTiming"
                    className="block font-medium"
                  >
                    CTA Timing:
                  </label>
                  <select
                    id="ctaTiming"
                    name="ctaTiming"
                    className="w-full border rounded px-3 py-2 mt-1"
                  >
                    <option>After first reward</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label
                    htmlFor="placement"
                    className="block font-medium"
                  >
                    Placement:
                  </label>
                  <select
                    id="placement"
                    name="placement"
                    className="w-full border rounded px-3 py-2 mt-1"
                  >
                    <option>Bottom Center</option>
                  </select>
                </div>

              </div>

              <div>
                <label
                  htmlFor="pressureLevel"
                  className="block font-medium"
                >
                  Pressure Level:
                </label>
                <select
                  id="pressureLevel"
                  name="pressureLevel"
                  className="w-full border rounded px-3 py-2 mt-1"
                >
                  <option>Medium</option>
                </select>
              </div>

            </div>
          </div>

          {/* Engagement Loop */}
          <div>
            <h3 className="font-semibold mb-3">Engagement Loop</h3>
            <div className="bg-gray-100 p-3 rounded space-y-2">
              <p>Hook: Tap treasure chest</p>
              <p>Core Interaction: Tap to collect coins</p>
              <p>Reward Moment: +10 Coins Popup</p>
              <p>CTA After 3 Loops</p>
            </div>
          </div>

          {/* Ethical Self-Check */}
          <div>
            <h3 className="font-semibold mb-3">Ethical Self-Check</h3>
            <div className="space-y-2">

              <div className="flex items-center gap-2">
                <input
                  id="noForcedChoice"
                  type="checkbox"
                  defaultChecked
                />
                <label htmlFor="noForcedChoice">
                  No forced choice
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="ctaAligns"
                  type="checkbox"
                  defaultChecked
                />
                <label htmlFor="ctaAligns">
                  CTA aligns with reward moment.
                </label>
              </div>

            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
          >
            Submit for Analysis
          </Button>

        </div>
      </form>
    </Card>
  );
}
