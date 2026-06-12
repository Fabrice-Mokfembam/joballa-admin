"use client";

import { LocaleProvider } from "@/lib/i18n";
import { LoginForm } from "./login-form";

export default function AdminLoginPage() {
  return (
    <LocaleProvider>
      <LoginForm />
    </LocaleProvider>
  );
}
