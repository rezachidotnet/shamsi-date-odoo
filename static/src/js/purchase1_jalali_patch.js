/** @odoo-module **/

import { toJalali, jMonthName, createDiv} from "./jalali_service";

function parseUSDate(dateStr) {
    if (!dateStr) return null;

    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;

    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (!month || !day || !year) return null;

    // Use UTC to avoid timezone shift
    return new Date(Date.UTC(year, month - 1, day));
}

function formatJalali(j) {
    if (!j) return "";
    return `${j.jd} ${jMonthName(j.jm)} ${j.jy}`;
}

let jalaliUpdateTimer = null;

function scheduleJalaliUpdate(modalEl) {
    if (!modalEl) return;

    clearTimeout(jalaliUpdateTimer);
    jalaliUpdateTimer = setTimeout(() => {
        updatePurchaseVendorPriceList(modalEl);
    }, 100);
}

function updateJalaliAfterButton(modalEl, fieldId, className) {
    if (!modalEl) return;

    const btn =
        modalEl.querySelector(`button#${fieldId}`) ||
        modalEl.querySelector(`button[data-field="${fieldId.replace(/_\d+$/, "")}"]`);

    if (!btn) return;

    const val = btn.getAttribute("value") || btn.getAttribute("data-tooltip");
    if (!val) return;

    const gDate = parseUSDate(val);
    if (!gDate || isNaN(gDate.getTime())) return;

    const j = toJalali(gDate);
    if (!j) return;

    const jalaliText = formatJalali(j);
    if (!jalaliText) return;

    let existing = btn.parentElement?.querySelector(`.${className}`);

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
    if (!modalEl) return;

    // اگر قبلاً همین فرم پردازش شده و چیزی تغییر نکرده، دوباره اجرا نشود
    // ولی چون ممکن است DOM دوباره ساخته شود، فقط وجود marker را چک می‌کنیم
    const startBtn =
        modalEl.querySelector('button#date_start_0') ||
        modalEl.querySelector('button[data-field="date_start"]');

    const endBtn =
        modalEl.querySelector('button#date_end_0') ||
        modalEl.querySelector('button[data-field="date_end"]');

    if (!startBtn && !endBtn) return;

    updateJalaliAfterButton(modalEl, "date_start_0", "jalali-date-start");
    updateJalaliAfterButton(modalEl, "date_end_0", "jalali-date-end");
}
