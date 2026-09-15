import { Link } from "react-router-dom";
import { Compass, Home } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="container-page" style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
      <div className="state-box" style={{ maxWidth: 420, padding: "56px 24px" }}>
        <span className="state-icon"><Compass size={24} /></span>
        <div className="state-title">Page not found</div>
        <div className="state-desc">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </div>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 8 }}>
          <Home size={15} />
          Back to overview
        </Link>
      </div>
    </div>
  );
}