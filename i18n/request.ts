import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const LOCALE_COOKIE = "locale";
const DEFAULT_LOCALE = "es";
const SUPPORTED_LOCALES = ["es", "en"] as const;

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale =
    localeCookie && SUPPORTED_LOCALES.includes(localeCookie as (typeof SUPPORTED_LOCALES)[number])
      ? localeCookie
      : DEFAULT_LOCALE;

  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});
