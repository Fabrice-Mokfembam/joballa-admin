import { LocaleProvider } from "@/lib/i18n";
import { NotFoundView } from "./not-found-view";

export default function NotFound() {
  return (
    <LocaleProvider>
      <NotFoundView />
    </LocaleProvider>
  );
}
