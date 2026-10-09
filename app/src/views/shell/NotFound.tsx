import { Link } from "react-router";
import { useT } from "@/i18n";

export function NotFound() {
  const t = useT();
  return (
    <div className="page-pad center-note">
      <p className="hand-note">{t("content.notFound")}</p>
      <Link to="/" className="link-btn">
        {t("nav.home")}
      </Link>
    </div>
  );
}
