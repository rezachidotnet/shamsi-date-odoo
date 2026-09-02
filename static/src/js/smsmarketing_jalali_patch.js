/** @odoo-module **/

import { toJalali, jMonthName, createDiv } from "./jalali_service";

/**
 * Convert the schedule_date_0 button value to Jalali and append it after the button
 */
export function updateMassMailingScheduleDate(modalEl) {
    if (!modalEl) return;

    let btn;

    if (modalEl.querySelector("#schedule_date_0")) {
        btn = modalEl.querySelector("#schedule_date_0");
    } else if (modalEl.querySelector("#date_deadline_0")) {
        btn = modalEl.querySelector("#date_deadline_0");
    } else {
        btn = modalEl.querySelector("#plan_date_0");
    }

    
    if (!btn) return;
    const val = btn.value;
    if (!val) return;

    const gDate = new Date(val);
    if (isNaN(gDate)) return;

    const j = toJalali(gDate);
    if (!j) return;

    const jalaliText = `${j.jd} ${jMonthName(j.jm)} ${j.jy}`;

    // Find existing divs in the same container
    const container = btn.parentElement;
    if (!container) return;

    let div = container.querySelector(".jalali-schedule-date");

    if (div) {
        // Update the first existing div
        div.textContent = `| ${jalaliText}`;

        // Remove any additional duplicates
        container.querySelectorAll(".jalali-schedule-date").forEach((extraDiv, idx) => {
            if (idx > 0) extraDiv.remove();
        });

    } else {
        // Create if not exists
        div = createDiv(
            "jalali-schedule-date",
            `| ${jalaliText}`,
            {
                fontSize: "11px",
                color: "#888",
                marginLeft: "6px",
            }
        );
        btn.insertAdjacentElement("afterend", div);
    }
}

export function updateNextDepartureToJalali(containerEl) {
    if (!containerEl) return;

    const span = containerEl.querySelector("span[data-tooltip]");
    if (!span) return;

    // Prevent duplicate patch
    if (span.dataset.jalaliPatched) return;
    span.dataset.jalaliPatched = "1";

    const tooltip = span.getAttribute("data-tooltip");
    if (!tooltip) return;

    const gDate = new Date(tooltip);
    if (isNaN(gDate)) return;

    const j = toJalali(gDate);
    if (!j) return;

    // Convert month to Persian
    const jalaliText = `${j.jd} ${jMonthName(j.jm)} ${j.jy}`;

    // Check if a Jalali element already exists
    const container = span.parentElement;
    let jalaliDiv = container.querySelector(".jalali-next-departure");

    if (jalaliDiv) {
        jalaliDiv.textContent = `| ${jalaliText}`;
    } else {
        // Create a new span
        jalaliDiv = createDiv(
            "jalali-next-departure",
            `| ${jalaliText}`,
            {
                fontSize: "11px",
                color: "#888",
                marginLeft: "6px"
            }
        );
        span.insertAdjacentElement("afterend", jalaliDiv);
    }
}



export function updateCalendarDateList(el) {
    if (!el) return;

    let cells = el.querySelectorAll('td[name="calendar_date"]');

    if (!cells.length) {
        cells = el.querySelectorAll('td[name="create_date"]');
    }

    cells.forEach(cell => {

        if (!cell.innerText) return;

        // prevent duplicate patch
        if (cell.dataset.jalaliPatched) return;
        cell.dataset.jalaliPatched = "1";

        let originalText = cell.innerText.trim();

        // take only Gregorian part
        let gText = originalText.split('|')[0].trim();

        // detect if year exists
        const hasYear = /\b\d{4}\b/.test(gText);

        if (!hasYear) {
            const currentYear = new Date().getFullYear();
            gText = `${gText}, ${currentYear}`;
        }

        const gDate = new Date(gText);
        if (isNaN(gDate)) return;

        const j = toJalali(gDate);
        if (!j) return;

        let jalaliText;

        if (!hasYear) {
            jalaliText = `${j.jd} ${jMonthName(j.jm)}`;
        } else {
            jalaliText = `${j.jd} ${jMonthName(j.jm)} ${j.jy}`;
        }
        cell.innerText = `${jalaliText} | ${originalText.split('|')[0].trim()} `;
    });
}