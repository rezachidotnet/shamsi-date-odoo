/** @odoo-module **/
console.log("JALALI CALENDAR PATCH LOADED FOR CALENDAR");

import { toJalali, jMonthName, updateOrCreateElement, createDiv} from "./jalali_service";

/* -----------------------
   Parse tooltip date (AM/PM safe)
------------------------*/
function parseTooltipDate(str) {
    if (!str) return null;
    // Example: "03/16/2026 04:30:00 PM"
    const parts = str.split(/\s+/);
    if (parts.length < 2) return null;
    
    const [datePart, timePart, ampm] = parts;
    if (!datePart || !timePart) return null;

    const [month, day, year] = datePart.split("/").map(Number);
    let [hour, min, sec] = timePart.split(":").map(Number);
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return new Date(year, month - 1, day, hour, min, sec);
}


/* -----------------------
   Column headers
------------------------*/
export function injectColumnHeaders(el) {

    if (!el) return;

    el.querySelectorAll(".fc-col-header-cell-cushion").forEach(header => {
        const dateStr = header.closest("th")?.dataset.date;
        if (!dateStr) return;
        const jText = toJalali(new Date(dateStr));
        if (!jText || !jText.jy) return;
        updateOrCreateElement(header, "jalali-date-header", `${jText.jy}/${jText.jm}/${jText.jd}`, {
            fontSize: "11px",
            color: "#888",
            marginTop: "2px"
        });
    });
}

/* -----------------------
   Day numbers
------------------------*/
export function injectDayNumbers(el) {

    if (!el) return;

    el.querySelectorAll(".fc-daygrid-day-number").forEach(dayEl => {
        if (dayEl.nextElementSibling?.classList.contains("jalali-day")) return;
        const dateStr = dayEl.closest("td")?.dataset.date;
        if (!dateStr) return;
        const [year, month, day] = dateStr.split("-").map(Number);
        const j = toJalali(new Date(year, month - 1, day));
        const jdEl = document.createElement("div");
        jdEl.className = "jalali-day";
        jdEl.style.fontSize = "10px";
        jdEl.style.color = "#999";
        jdEl.style.marginTop = "2px";
        jdEl.innerText = `${j.jm}/${j.jd}`;
        dayEl.insertAdjacentElement("afterend", jdEl);
    });
}

/* -----------------------
   Sidebar header/days
------------------------*/
export function injectSidebar(el) {

    if (!el) return;
    
    const header = el.querySelector(".o_header_part");
    if (!header) return;

    const text = header.innerText.trim();
    const parts = text.split(" ");
    if (parts.length !== 2) return;

    const monthMap = {
        January:0, February:1, March:2, April:3,
        May:4, June:5, July:6, August:7,
        September:8, October:9, November:10, December:11
    };

    const gm = monthMap[parts[0]];
    const gy = parseInt(parts[1]);
    if (gm === undefined || isNaN(gy)) return;

    // Header Jalali
    const selected = el.querySelector(".o_date_item_cell.o_selected");
    let headerJalaliText;
    if (selected) {
        const gd = parseInt(selected.querySelector("div")?.innerText);
        if (!gd) return;
        const date = new Date(gy, gm, gd);
        const j = toJalali(date);
        headerJalaliText = `${j.jy}/${j.jm}/${j.jd}`;
    } else {
        const date = new Date(gy, gm, 1);
        const j = toJalali(date);
        headerJalaliText = `${j.jy}/${j.jm}`;
    }

    updateOrCreateElement(header, "jalali-header", headerJalaliText, {
        fontSize: "11px",
        color: "#888"
    });

    // Sidebar Days
    const cells = el.querySelectorAll(".o_date_item_cell");
    cells.forEach(cell => {
        if (cell.querySelector(".jalali-day")) return;

        const dayDiv = cell.querySelector("div");
        if (!dayDiv) return;
        const gd = parseInt(dayDiv.innerText);
        if (isNaN(gd)) return;

        // Determine real Gregorian month for this cell
        let realMonth = gm;
        if (cell.classList.contains("o_out_of_range")) {
            // If day < 15, it belongs to next month
            realMonth = gd < 15 ? gm + 1 : gm - 1;
        }
        let realYear = gy;
        if (realMonth < 0) {
            realMonth = 11;
            realYear -= 1;
        } else if (realMonth > 11) {
            realMonth = 0;
            realYear += 1;
        }

        const j = toJalali(new Date(realYear, realMonth, gd));
        const jd = createDiv("jalali-day", j.jd, {
            fontSize: "9px",
            color: "#999"
        });

        cell.appendChild(jd);
    });
}


export function injectPopoverJalali(el) {

    if (!el) return;


    const spans = el.querySelectorAll(".fa-calendar + .fw-bold.ms-2");

    if (!spans) return;

    const monthMap = {
        January:1, February:2, March:3, April:4,
        May:5, June:6, July:7, August:8,
        September:9, October:10, November:11, December:12
    };

    spans.forEach(span => {

        if (span.parentElement.querySelector(".jalali-popover")) return;

        const text = span.innerText.trim();

        const match = text.match(/^(\w+)\s(\d+)(?:-(\d+))?,\s(\d+)$/);
        if (!match) return;

        const month = monthMap[match[1]];
        const day1 = parseInt(match[2]);
        const day2 = match[3] ? parseInt(match[3]) : null;
        const year = parseInt(match[4]);

        const j1 = window.jalali.toJalaali(year, month, day1);

        let result;

        if (day2) {
            const j2 = window.jalali.toJalaali(year, month, day2);
            result = `${j1.jd}-${j2.jd} ${jMonthName(j1.jm)} ${j1.jy}`;
        } else {
            result = `${j1.jd} ${jMonthName(j1.jm)} ${j1.jy}`;
        }

        updateOrCreateElement(span.parentElement, "jalali-popover", result, {
            fontSize: "11px",
            color: "#888",
            marginTop: "2px"
        });

    });
}



/* -----------------------
   Update Jalali Dates
------------------------*/
export function updateJalaliDates(form) {
    console.log("🚀 updateJalaliDates called");

    // const form = document.querySelector(".o_form_view");
    if (!form) {
        console.log("❌ Form not found");
        return;
    }
    

    const startDiv = form.querySelector(".o_jalali_start_date");
    const endDiv   = form.querySelector(".o_jalali_end_date");
    if (!startDiv && !endDiv) {
        console.log("❌ Jalali divs not found");
        return;
    }

    // Use data-field
    const startBtn = form.querySelector("button[data-field='start']");
    const endBtn   = form.querySelector("button[data-field='stop']");
    if (!startBtn || !endBtn) {
        console.log("❌ Start/Stop buttons not found");
        return;
    }

    /* ---------- START ---------- */
    const startValue = startBtn.getAttribute("value");
    console.log("🔹 Start tooltip value:", startValue);
    const gStart = parseTooltipDate(startValue);
    console.log("🔹 Parsed Gregorian start date:", gStart);

    if (gStart && !isNaN(gStart) && startDiv) {
        const j = toJalali(gStart);
        const newStartText = `${j.jd} ${jMonthName(j.jm)} ${j.jy}`;
        if (startDiv.innerText !== newStartText) {
            startDiv.innerText = newStartText;
        }
        // startDiv.innerText = `${j.jd} ${jMonthName(j.jm)} ${j.jy}`;
    }

    /* ---------- END ---------- */
    const endValue = endBtn.getAttribute("value");
    console.log("🔹 End tooltip value:", endValue);
    const gEnd = parseTooltipDate(endValue);
    console.log("🔹 Parsed Gregorian end date:", gEnd);

    if (gEnd && !isNaN(gEnd) && endDiv) {
        const j = toJalali(gEnd);
        const newText = `${j.jd} ${jMonthName(j.jm)} ${j.jy}`;

        if (endDiv.innerText !== newText) {
            endDiv.innerText = newText;
        }

    }

    console.log("✅ updateJalaliDates finished");
}




