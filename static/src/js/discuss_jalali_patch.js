/** @odoo-module **/

import { toJalali, jMonthName, createDiv} from "./jalali_service";


/* -----------------------
   Update one span
------------------------*/
function updateMailDateSpan(span) {
    if (!span) return;
    if (span.dataset.jalaliPatched) return;
    const gDateText = span.textContent.trim();
    if (!gDateText) return;
    const gDate = new Date(gDateText);

    if (isNaN(gDate)) return;

    const j = toJalali(gDate);

    if (j) {
        span.textContent += ` | ${j.jy}/${j.jm}/${j.jd}`;
        span.dataset.jalaliPatched = "1";
    }
}


/* -----------------------
   Convert .o-mail-Message-date
------------------------*/
function updateMessageDate(el) {

    if (!el) return;

    // Prevent duplicate patching across repeated observer passes. Only mark
    // the element after a valid conversion, so a later render can recover
    // from a temporarily empty or invalid title.
    if (el.dataset.jalaliPatched) return;

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
    el.dataset.jalaliPatched = "1";
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
