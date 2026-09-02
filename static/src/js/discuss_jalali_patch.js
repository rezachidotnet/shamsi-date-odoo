/** @odoo-module **/

console.log("💬 Discuss Jalali Patch Loaded");

import { toJalali, jMonthName, updateOrCreateElement, createDiv} from "./jalali_service";


/* -----------------------
   Update one span
------------------------*/
function updateMailDateSpan(span) {
    // if (span.dataset.jalaliPatched) return;
    // span.dataset.jalaliPatched = "1";
    if (!span) return;
    const gDateText = span.textContent.trim();
    const gDate = new Date(gDateText);

    if (isNaN(gDate)) return;

    const j = toJalali(gDate);

    if (j) {
        span.textContent += ` | ${j.jy}/${j.jm}/${j.jd}`;
    }
}


/* -----------------------
   Convert .o-mail-Message-date
------------------------*/
function updateMessageDate(el) {

    if (!el) return;

    // prevent duplicate patch
    if (el.dataset.jalaliPatched) return;
    el.dataset.jalaliPatched = "1";

    const title = el.getAttribute("title");
    if (!title) return;

    const gDate = new Date(title);
    if (isNaN(gDate)) return;

    const j = toJalali(gDate);
    if (!j) return;

    // Use Persian month name
    const jalaliText = `${jMonthName(j.jm)} ${j.jd} `;

    const div = createDiv(
        "jalali-message-date",
        `| ${jalaliText}`,
        {
            fontSize: "11px",
            color: "#888",
            marginLeft: "4px"
        }
    );

    el.insertAdjacentElement("afterend", div);
}


/* -----------------------
   Update all spans
------------------------*/
export function updateAllMailDates(el) {
    if (!el) return;
    el
        .querySelectorAll(".o-mail-DateSection span")
        .forEach(updateMailDateSpan);

        // Message timestamps
    el
        .querySelectorAll(".o-mail-Message-date")
        .forEach(updateMessageDate);

}

