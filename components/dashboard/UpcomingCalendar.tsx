"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Subscription } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAY_KEYS = ["weekdayMon", "weekdayTue", "weekdayWed", "weekdayThu", "weekdayFri", "weekdaySat", "weekdaySun"] as const;

interface UpcomingCalendarProps {
  subscriptions: Subscription[];
  onSubscriptionClick?: (subscription: Subscription) => void;
}

export function UpcomingCalendar({
  subscriptions,
  onSubscriptionClick,
}: UpcomingCalendarProps) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const dateFnsLocale = locale === "es" ? es : enUS;
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const formatCurrency = useFormatCurrency();
  const weekdayLabels = useMemo(() => WEEKDAY_KEYS.map((key) => t(key)), [t]);

  const activeWithDueDate = useMemo(
    () =>
      subscriptions.filter(
        (s) => s.status === "active" && s.next_payment_date
      ),
    [subscriptions]
  );

  const paymentsByDate = useMemo(() => {
    const map = new Map<string, { count: number; subs: Subscription[] }>();
    for (const sub of activeWithDueDate) {
      const key = format(new Date(sub.next_payment_date), "yyyy-MM-dd");
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.subs.push(sub);
      } else {
        map.set(key, { count: 1, subs: [sub] });
      }
    }
    return map;
  }, [activeWithDueDate]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  const selectedPayments = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return paymentsByDate.get(key)?.subs ?? [];
  }, [selectedDate, paymentsByDate]);

  const hasPayment = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    return paymentsByDate.has(key);
  };

  const getPaymentCount = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    return paymentsByDate.get(key)?.count ?? 0;
  };

  const isPast = (date: Date) =>
    isBefore(startOfDay(date), startOfDay(new Date()));

  return (
    <Card variant="outline" className="overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-4 sm:pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-[15px]">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          {t("upcomingDue")}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewDate((d) => subMonths(d, 1))}
            className="h-8 w-8 p-0"
            aria-label={t("prevMonth")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium text-foreground sm:min-w-[160px]">
            {format(viewDate, "MMMM yyyy", { locale: dateFnsLocale })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewDate((d) => addMonths(d, 1))}
            className="h-8 w-8 p-0"
            aria-label={t("nextMonth")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-7 gap-0.5 text-center sm:gap-1">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs"
            >
              {label}
            </div>
          ))}
          {calendarDays.map((day) => {
            const count = getPaymentCount(day);
            const hasPay = count > 0;
            const selected = selectedDate && isSameDay(day, selectedDate);
            const today = isToday(day);
            const otherMonth = !isSameMonth(day, viewDate);
            const past = isPast(day);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "relative flex min-h-[36px] flex-col items-center justify-center rounded-lg py-1.5 text-sm transition-colors sm:min-h-[44px]",
                  otherMonth && "text-muted-foreground/60",
                  !otherMonth && "text-foreground",
                  past && !otherMonth && "opacity-70",
                  today &&
                    !selected &&
                    "ring-1 ring-primary/40 bg-primary/5 font-semibold",
                  selected && "bg-primary text-primary-foreground font-medium",
                  !selected &&
                    hasPay &&
                    !otherMonth &&
                    "bg-[var(--chart-4)]/15 hover:bg-[var(--chart-4)]/25 text-foreground",
                  !selected && !hasPay && !today && "hover:bg-muted/50"
                )}
              >
                <span>{format(day, "d")}</span>
                {hasPay && (
                  <span
                    className={cn(
                      "mt-0.5 flex h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2",
                      selected ? "bg-primary-foreground/80" : "bg-[var(--chart-4)]"
                    )}
                    aria-hidden
                  />
                )}
                {count > 1 && !selected && (
                  <span
                    className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--chart-5)] text-[9px] font-bold text-white sm:-right-1 sm:-top-1 sm:h-4 sm:w-4 sm:text-[10px]"
                    aria-label={t("dueCount", { count })}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedDate && (
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {locale === "es"
                ? format(selectedDate, "EEEE d 'de' MMMM", { locale: dateFnsLocale })
                : format(selectedDate, "EEEE, MMMM d", { locale: dateFnsLocale })}
            </p>
            {selectedPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noDueThisDay")}
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedPayments.map((sub) => (
                  <li key={sub.id}>
                    <button
                      type="button"
                      onClick={() => onSubscriptionClick?.(sub)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/60"
                    >
                      <span className="font-medium text-foreground truncate pr-2">
                        {sub.name}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatCurrency(sub.price)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
