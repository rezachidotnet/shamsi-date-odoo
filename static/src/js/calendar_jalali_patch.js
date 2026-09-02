/** @odoo-module **/

import { localization } from "@web/core/l10n/localization";
import { jMonthName, updateOrCreateElement } from "./jalali_service";

function validComponents({ year, month, day } = {}) {
    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day) &&
        date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function parseISODate(dateString) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString || "");
    if (!match) return null;
    const components = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
    return validComponents(components) ? components : null;
}

function parseLocalizedValue(value, format) {
    if (!value || !format || !window.luxon?.DateTime) return null;
    const parsed = window.luxon.DateTime.fromFormat(value.trim(), format, {
        locale: window.luxon.Settings.defaultLocale,
        setZone: true,
    });
    return parsed.isValid ? { year: parsed.year, month: parsed.month, day: parsed.day } : null;
}

function normalizeDigits(value) {
    const persian = "۰۱۲۳۴۵۶۷۸۹";
    const arabic = "٠١٢٣٤٥٦٧٨٩";
    return [...value].map((character) => {
        const persianIndex = persian.indexOf(character);
        if (persianIndex >= 0) return String(persianIndex);
        const arabicIndex = arabic.indexOf(character);
        return arabicIndex >= 0 ? String(arabicIndex) : character;
    }).join("");
}

export function parseOdooFieldValue(value, isAllDay = false) {
    return parseLocalizedValue(value, isAllDay ? localization.dateFormat : localization.dateTimeFormat);
}

function jalaliForComponents(components) {
    if (!validComponents(components) || !window.jalali?.toJalaali) return null;
    return window.jalali.toJalaali(components.year, components.month, components.day);
}

function numericJalali(components, includeYear = true) {
    const jalali = jalaliForComponents(components);
    if (!jalali) return null;
    return includeYear ? `${jalali.jy}/${jalali.jm}/${jalali.jd}` : `${jalali.jm}/${jalali.jd}`;
}

function namedJalali(components) {
    const jalali = jalaliForComponents(components);
    return jalali ? `${jalali.jd} ${jMonthName(jalali.jm)} ${jalali.jy}` : null;
}

export function injectColumnHeaders(el) {
    if (!el) return;
    el.querySelectorAll(".fc-col-header-cell-cushion").forEach((header) => {
        const text = numericJalali(parseISODate(header.closest("th")?.dataset.date));
        if (text) updateOrCreateElement(header, "jalali-date-header", text, { fontSize: "11px", color: "#888", marginTop: "2px" });
    });
}

export function injectDayNumbers(el) {
    if (!el) return;
    el.querySelectorAll(".fc-daygrid-day-number").forEach((dayEl) => {
        const text = numericJalali(parseISODate(dayEl.closest("td")?.dataset.date), false);
        if (text) updateOrCreateElement(dayEl.closest("td"), "jalali-day", text, { fontSize: "10px", color: "#999", marginTop: "2px" });
    });
}

function parsePickerMonth(text) {
    return parseLocalizedValue(text, "LLLL yyyy");
}

function ownText(element) {
    return [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join("")
        .trim();
}

export function injectSidebar(el) {
    if (!el) return;
    const header = el.querySelector(".o_header_part");
    const month = header && parsePickerMonth(ownText(header));
    if (!header || !month) return;
    const selected = el.querySelector(".o_date_item_cell.o_selected");
    const selectedDay = Number(selected?.querySelector("div")?.innerText);
    const headerText = numericJalali(selectedDay ? { ...month, day: selectedDay } : { ...month, day: 1 }, Boolean(selectedDay));
    if (headerText) updateOrCreateElement(header, "jalali-header", headerText, { fontSize: "11px", color: "#888" });

    el.querySelectorAll(".o_date_item_cell").forEach((cell) => {
        const gregorianDay = Number(cell.querySelector(":scope > div")?.innerText);
        if (!gregorianDay) return;
        let { year, month: gregorianMonth } = month;
        if (cell.classList.contains("o_out_of_range")) {
            gregorianMonth += gregorianDay < 15 ? 1 : -1;
            if (gregorianMonth === 0) { gregorianMonth = 12; year -= 1; }
            if (gregorianMonth === 13) { gregorianMonth = 1; year += 1; }
        }
        const jalali = jalaliForComponents({ year, month: gregorianMonth, day: gregorianDay });
        if (jalali) updateOrCreateElement(cell, "jalali-day", String(jalali.jd), { fontSize: "9px", color: "#999" });
    });
}

function parsePopoverDate(text) {
    const value = text?.trim();
    if (!value) return null;
    const single = parseLocalizedValue(value, "DDD");
    if (single) return [single];
    const separated = value.split(" - ");
    if (separated.length === 2) {
        const dates = separated.map((part) => parseLocalizedValue(part, "DDD"));
        return dates.every(Boolean) ? dates : null;
    }
    const compact = /^(.+\s\d+)-(\d+),\s*(\d{4})$/.exec(normalizeDigits(value));
    if (!compact) return null;
    const start = parseLocalizedValue(`${compact[1]}, ${compact[3]}`, "DDD");
    const end = start && { year: start.year, month: start.month, day: Number(compact[2]) };
    return validComponents(end) ? [start, end] : null;
}

export function injectPopoverJalali(el) {
    if (!el) return;
    el.querySelectorAll(".fa-calendar + .fw-bold.ms-2").forEach((span) => {
        const dates = parsePopoverDate(span.innerText);
        if (!dates) return;
        const texts = dates.map(namedJalali);
        if (texts.some((text) => !text)) return;
        updateOrCreateElement(span.parentElement, "jalali-popover", texts.join(" - "), { fontSize: "11px", color: "#888", marginTop: "2px" });
    });
}

function updateFormDate(form, fieldName, target, isAllDay) {
    const field = form.querySelector(`button[data-field='${fieldName}']`);
    if (!field || !target) return;
    const text = namedJalali(parseOdooFieldValue(field.dataset.tooltip, isAllDay));
    if (text && target.innerText !== text) target.innerText = text;
}

export function updateJalaliDates(form) {
    if (!form) return;
    const startTarget = form.querySelector(".o_jalali_start_date");
    const stopTarget = form.querySelector(".o_jalali_end_date");
    const allDay = Boolean(form.querySelector("button[data-field='start_date']"));
    updateFormDate(form, allDay ? "start_date" : "start", startTarget, allDay);
    updateFormDate(form, allDay ? "stop_date" : "stop", stopTarget, allDay);
}
