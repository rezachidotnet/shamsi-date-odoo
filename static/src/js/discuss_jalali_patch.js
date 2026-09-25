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

    // Do not rely on data-jalali-patched to skip work: OWL may recreate the
    // source node on hover/rerender (dropping the marker) while the previously
    // inserted companion stays in the DOM. The companion sibling itself is the
    // source of truth, so this function is idempotent.
    const title = el.getAttribute("title");
    if (!title) return;

    const gDate = new Date(title);
    if (isNaN(gDate)) return;

    const j = toJalali(gDate);
    if (!j) return;

    // Use Persian month name
    const jalaliText = `${jMonthName(j.jm)} ${j.jd} `;
    const text = `| ${jalaliText}`;

    let div = el.nextElementSibling;
    if (div?.classList.contains("jalali-message-date")) {
        // Collapse consecutive duplicates left behind by earlier renders.
        let extra = div.nextElementSibling;
        while (extra?.classList.contains("jalali-message-date")) {
            const next = extra.nextElementSibling;
            extra.remove();
            extra = next;
        }
        if (div.textContent !== text) {
            div.textContent = text;
        }
    } else {
        div = createDiv(
            "jalali-message-date",
            text,
            {
                fontSize: "11px",
                color: "#888",
                marginLeft: "4px"
            }
        );
        el.insertAdjacentElement("afterend", div);
    }
    // Metadata only; correctness never depends on this marker.
    if (!el.dataset.jalaliPatched) {
        el.dataset.jalaliPatched = "1";
    }
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
