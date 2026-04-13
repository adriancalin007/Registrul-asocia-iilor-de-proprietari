// src/lib/i18n.ts
import ro from "../../messages/ro.json";
import en from "../../messages/en.json";

export type Locale = "ro" | "en";
export const LOCALES: Locale[] = ["ro", "en"];
export const DEFAULT_LOCALE: Locale = "ro";

export const messages = { ro, en } as const;

type Messages = typeof ro;
type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string ? (T[K] extends object ? `${K}.${NestedKeyOf<T[K]>}` : K) : never }[keyof T]
  : never;

export type MessageKey = NestedKeyOf<Messages>;

export function getTranslator(locale: Locale) {
  const dict = messages[locale] as Record<string, Record<string, string>>;

  return function t(key: string, params?: Record<string, string | number>): string {
    const [section, ...rest] = key.split(".");
    const subKey = rest.join(".");
    let value: string = dict[section]?.[subKey] ?? key;

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }

    return value;
  };
}
