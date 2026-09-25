import { expect, microTick, test } from "@odoo/hoot";

import { injectColumnHeaders } from "@sale_shamsi_report/js/calendar_jalali_patch";
import { updateAllMailDates } from "@sale_shamsi_report/js/discuss_jalali_patch";
import { updatePurchaseVendorPriceList } from "@sale_shamsi_report/js/purchase1_jalali_patch";
import { updateMassMailingScheduleDate } from "@sale_shamsi_report/js/smsmarketing_jalali_patch";

function withFakeJalali(callback) {
    const previous = window.jalali;
    window.jalali = { toJalaali: (year) => ({ jy: year - 621, jm: 1, jd: 1 }) };
    try {
        callback();
    } finally {
        window.jalali = previous;
    }
}

test("mail date: repeated execution keeps one Jalali companion", () => {
    withFakeJalali(() => {
        const root = document.createElement("div");
        root.innerHTML = '<span class="o-mail-Message-date" title="2024-03-20T10:00:00Z">10:00</span>';
        updateAllMailDates(root);
        updateAllMailDates(root);
        expect(root.querySelectorAll(".jalali-message-date")).toHaveCount(1);
        expect(root.querySelector(".jalali-message-date").textContent).toBe("| فروردین 1 ");
        expect(root.querySelector(".o-mail-Message-date").textContent).toBe("10:00");
    });
});

test("mail date: OWL-like source replacement reuses the existing companion", () => {
    withFakeJalali(() => {
        const root = document.createElement("div");
        root.innerHTML = '<span class="o-mail-Message-date" title="2024-03-20T10:00:00Z">10:00</span>';
        updateAllMailDates(root);
        expect(root.querySelectorAll(".jalali-message-date")).toHaveCount(1);
        const fresh = document.createElement("span");
        fresh.className = "o-mail-Message-date";
        fresh.title = "2024-03-20T10:00:00Z";
        fresh.textContent = "10:00";
        root.querySelector(".o-mail-Message-date").replaceWith(fresh);
        expect(fresh.dataset.jalaliPatched).toBe(undefined);
        updateAllMailDates(root);
        expect(root.querySelectorAll(".jalali-message-date")).toHaveCount(1);
        expect(fresh.nextElementSibling.classList.contains("jalali-message-date")).toBe(true);
        expect(root.querySelector(".jalali-message-date").textContent).toBe("| فروردین 1 ");
        expect(fresh.textContent).toBe("10:00");
        expect(fresh.title).toBe("2024-03-20T10:00:00Z");
    });
});

test("mail date: reused source with changed title updates the companion", () => {
    const previous = window.jalali;
    // Day tracks the Gregorian year so a stale companion is detectable.
    window.jalali = { toJalaali: (year) => ({ jy: year - 621, jm: 1, jd: year - 2020 }) };
    const root = document.createElement("div");
    root.innerHTML = '<span class="o-mail-Message-date" title="2024-03-20T10:00:00Z"></span>';
    const date = root.querySelector(".o-mail-Message-date");
    try {
        updateAllMailDates(root);
        expect(root.querySelector(".jalali-message-date").textContent).toBe("| فروردین 4 ");
        date.title = "2025-03-20T10:00:00Z";
        updateAllMailDates(root);
        expect(root.querySelectorAll(".jalali-message-date")).toHaveCount(1);
        expect(root.querySelector(".jalali-message-date").textContent).toBe("| فروردین 5 ");
    } finally {
        window.jalali = previous;
    }
});

test("mail date: pre-existing consecutive duplicates collapse to one", () => {
    withFakeJalali(() => {
        const root = document.createElement("div");
        root.innerHTML = `<span class="o-mail-Message-date" title="2024-03-20T10:00:00Z"></span>`
            + `<div class="jalali-message-date">| stale </div>`
            + `<div class="jalali-message-date">| stale </div>`
            + `<div class="jalali-message-date">| stale </div>`
            + `<span class="o-mail-Message-date" title="2024-03-20T10:00:00Z"></span>`
            + `<div class="jalali-message-date">| فروردین 1 </div>`;
        updateAllMailDates(root);
        expect(root.querySelectorAll(".jalali-message-date")).toHaveCount(2);
        for (const source of root.querySelectorAll(".o-mail-Message-date")) {
            expect(source.nextElementSibling.textContent).toBe("| فروردین 1 ");
        }
    });
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

test("vendor legacy callback yields to a mounted native companion", () => {
    const root = document.createElement("div");
    root.innerHTML = `
        <form>
            <input name="partner_id"><input name="min_qty"><input name="price"><input name="delay">
            <button data-field="date_start">03/20/2024</button>
            <span class="jalali-date-start">| 1 فروردین 1403</span>
            <span data-jalali-native-date-widget="1" class="o_jalali_secondary_date">| 1 فروردین 1403</span>
        </form>`;
    updatePurchaseVendorPriceList(root);
    expect(root.querySelectorAll(".jalali-date-start")).toHaveCount(0);
    expect(root.querySelectorAll(".o_jalali_secondary_date")).toHaveCount(1);
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
