/** @odoo-module **/

import { parseDate, parseDateTime } from "@web/core/l10n/dates";
import { toJalali, jMonthName, createDiv } from "./jalali_service";

const SCHEDULE_FIELDS = [
    { selector: "#schedule_date_0", type: "datetime" },
    { selector: "#date_deadline_0", type: "date" },
    { selector: "#plan_date_0", type: "date" },
];

function normalizeDigits(value) {
    return value
        .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
        .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

function parseLocalized(value, type) {
    if (!value || typeof value !== "string") return null;
    try {
        const parsed = type === "date"
            ? parseDate(normalizeDigits(value.trim()))
            : parseDateTime(normalizeDigits(value.trim()));
        return parsed && parsed.isValid ? parsed : null;
    } catch {
        return null;
    }
}

function updateOrRemove(container, anchor, className, date) {
    const existing = container?.querySelector(`.${className}`);
    if (!container || !anchor || !date) {
        existing?.remove();
        return;
    }

    const jalali = toJalali(date);
    if (!jalali) {
        existing?.remove();
        return;
    }

    const text = `| ${jalali.jd} ${jMonthName(jalali.jm)} ${jalali.jy}`;
    if (existing) {
        existing.textContent = text;
        container.querySelectorAll(`.${className}`).forEach((extra, index) => {
            if (index > 0) extra.remove();
        });
        return;
    }

    const element = createDiv(className, text, {
        fontSize: "11px",
        color: "#888",
        marginLeft: "6px",
    });
    anchor.insertAdjacentElement("afterend", element);
}

/** Add the civil Jalali date beside supported scheduling fields in modal forms. */
export function updateMassMailingScheduleDate(modalEl) {
    if (!modalEl) return;

    const target = SCHEDULE_FIELDS.find(({ selector }) => modalEl.querySelector(selector));
    const field = target ? modalEl.querySelector(target.selector) : null;
    const container = field?.parentElement;
    const value = field?.getAttribute("data-tooltip") || field?.value || field?.textContent;
    const date = target ? parseLocalized(value, target.type) : null;
    updateOrRemove(container, field, "jalali-schedule-date", date);
}

/** Add the Jalali user-timezone date beside mailing.mailing.next_departure. */
export function updateNextDepartureToJalali(containerEl) {
    if (!containerEl) return;

    const span = containerEl.querySelector('[name="next_departure"] span[data-tooltip]');
    const container = span?.parentElement;
    const date = parseLocalized(span?.getAttribute("data-tooltip"), "datetime");
    updateOrRemove(container, span, "jalali-next-departure", date);
}

/** Add the Jalali user-timezone date to mailing.mailing calendar_date list cells. */
export function updateCalendarDateList(el) {
    if (!el) return;

    el.querySelectorAll('td[name="calendar_date"]').forEach((cell) => {
        const source = cell.querySelector("span[data-tooltip]");
        const date = parseLocalized(source?.getAttribute("data-tooltip"), "datetime");
        updateOrRemove(cell, source, "jalali-calendar-date-list", date);
    });
}
