import { expect, microTick, test } from "@odoo/hoot";

import { injectColumnHeaders } from "@sale_shamsi_report/js/calendar_jalali_patch";
import { updateAllMailDates } from "@sale_shamsi_report/js/discuss_jalali_patch";
import { updatePurchaseVendorPriceList } from "@sale_shamsi_report/js/purchase1_jalali_patch";
import { updateMassMailingScheduleDate } from "@sale_shamsi_report/js/smsmarketing_jalali_patch";

test("KNOWN_CENTRAL_BUG_MAIL_STALE_MARKER: marked reused mail source stays stale", () => {
    const previous = window.jalali;
    window.jalali = { toJalaali: (year) => ({ jy: year - 621, jm: 1, jd: 1 }) };
    const root = document.createElement("div");
    root.innerHTML = '<span class="o-mail-Message-date" title="2024-03-20T10:00:00Z"></span>';
    const date = root.querySelector(".o-mail-Message-date");
    try {
        updateAllMailDates(root);
        expect(root.querySelector(".jalali-message-date").textContent).toBe("| فروردین 1 ");
        date.title = "2025-03-20T10:00:00Z";
        updateAllMailDates(root);
        expect(root.querySelectorAll(".jalali-message-date").length).toBe(1);
        expect(root.querySelector(".jalali-message-date").textContent).toBe("| فروردین 1 ");
        expect(date.dataset.jalaliPatched).toBe("1");
    } finally {
        window.jalali = previous;
    }
});

test("calendar update-or-create is repeat-safe", () => {
    const previous = window.jalali;
    window.jalali = { toJalaali: () => ({ jy: 1403, jm: 1, jd: 1 }) };
    const root = document.createElement("div");
    root.innerHTML = '<table><thead><tr><th data-date="2024-03-20"><span class="fc-col-header-cell-cushion"></span></th></tr></thead></table>';
    try {
        injectColumnHeaders(root);
        injectColumnHeaders(root);
        expect(root.querySelectorAll(".jalali-date-header").length).toBe(1);
    } finally {
        window.jalali = previous;
    }
});

test("vendor broad-root callback rejects a non-supplier page before writing", () => {
    const root = document.createElement("div");
    root.innerHTML = '<button data-field="date_start">03/20/2024</button>';
    updatePurchaseVendorPriceList(root);
    expect(root.querySelector(".jalali-date-start")).toBe(null);
});

test("scheduling rewrites unchanged output and remains a self-mutation risk", async () => {
    const previous = window.jalali;
    window.jalali = { toJalaali: () => ({ jy: 1403, jm: 1, jd: 1 }) };
    const node = document.createElement("div");
    node.innerHTML = '<input id="plan_date_0" value="03/20/2024"><div class="jalali-schedule-date">| 1 فروردین 1403</div>';
    document.body.append(node);
    let records = 0;
    const observer = new MutationObserver((mutations) => { records += mutations.length; });
    observer.observe(node, { childList: true });
    try {
        updateMassMailingScheduleDate(node);
        await microTick();
        expect(records).toBe(1);
    } finally {
        observer.disconnect();
        node.remove();
        window.jalali = previous;
    }
});
