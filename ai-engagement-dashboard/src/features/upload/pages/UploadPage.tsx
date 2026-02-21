import PageContainer from "../../../app/layout/PageContainer";
import UploadForm from "../components/UploadForm";
import PreviewPanel from "../components/PreviewPanel";

export default function UploadPage() {
  return (
    <PageContainer>
      <div className="grid md:grid-cols-2 gap-8">
        <UploadForm />
        <PreviewPanel />
      </div>
    </PageContainer>
  );
}
