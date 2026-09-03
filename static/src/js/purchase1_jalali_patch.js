/** @odoo-module **/

import { parseDate } from "@web/core/l10n/dates";
import { toJalali, jMonthName, createDiv } from "./jalali_service";

const SUPPLIERINFO_SIGNATURE = ["partner_id", "min_qty", "price", "delay"];

function normalizeDigits(value) {
    return value
        .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
        .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

function parseLocalizedDate(value) {
    if (!value || typeof value !== "string") return null;

    try {
        const parsed = parseDate(normalizeDigits(value.trim()));
        return parsed && parsed.isValid ? parsed : null;
    } catch {
        return null;
    }
}

function isSupplierInfoForm(form) {
    return SUPPLIERINFO_SIGNATURE.every((field) => form.querySelector(`[name="${field}"]`));
}

function formatJalali(j) {
    if (!j) return "";
    return `${j.jd} ${jMonthName(j.jm)} ${j.jy}`;
}

function updateJalaliAfterButton(modalEl, fieldName, className) {
    if (!modalEl) return;

    const btn =
        modalEl.querySelector(`button[data-field="${fieldName}"]`) ||
        modalEl.querySelector(`button#${fieldName}_0`);

    if (!btn) {
        modalEl.querySelector(`.${className}`)?.remove();
        return;
    }

    const value = btn.dataset.tooltip || btn.textContent;
    const gDate = parseLocalizedDate(value);
    const existing = btn.parentElement?.querySelector(`.${className}`);

    if (!gDate) {
        existing?.remove();
        return;
    }

    const j = toJalali(gDate);
    if (!j || typeof j !== "object") {
        existing?.remove();
        return;
    }

    const jalaliText = formatJalali(j);
    if (!jalaliText) {
        existing?.remove();
        return;
    }

    if (existing) {
        const newText = `| ${jalaliText}`;
        if (existing.textContent !== newText) {
            existing.textContent = newText;
        }
        return;
    }

    const div = createDiv(
        className,
        `| ${jalaliText}`,
        {
            fontSize: "11px",
            color: "#888",
            marginLeft: "6px",
            whiteSpace: "nowrap",
        }
    );

    btn.insertAdjacentElement("afterend", div);
}

/**
 * Update Jalali date for vendor price list
 */
export function updatePurchaseVendorPriceList(modalEl) {
    if (!modalEl || !isSupplierInfoForm(modalEl)) return;

    updateJalaliAfterButton(modalEl, "date_start", "jalali-date-start");
    updateJalaliAfterButton(modalEl, "date_end", "jalali-date-end");
}
