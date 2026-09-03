import { expect, test } from "@odoo/hoot";

import { PatchRegistry } from "@sale_shamsi_report/js/patch_registry";
import { applyRegisteredPatches } from "@sale_shamsi_report/js/patch_runner";

const EXPECTED_SELECTORS = [
    ".o_calendar_container", ".o_calendar_form_view", ".o_cw_popover",
    ".o_datetime_picker", ".o-mail-Discuss, .o-mail-ChatterContainer",
    ".o-main-components-container", ".o_mass_mailing_mailing_form",
    ".o_list_renderer", ".o_form_sheet_bg",
];

const EXPECTED_PATCH_CALLS = [
    ["injectColumnHeaders", "injectDayNumbers"],
    ["updateJalaliDates"],
    ["injectPopoverJalali"],
    ["injectSidebar"],
    ["updateAllMailDates"],
    ["updateMassMailingScheduleDate"],
    ["updateNextDepartureToJalali"],
    ["updateCalendarDateList"],
    ["updatePurchaseVendorPriceList"],
];

function withRegistry(entries, callback) {
    const original = PatchRegistry.splice(0, PatchRegistry.length, ...entries);
    try {
        return callback();
    } finally {
        PatchRegistry.splice(0, PatchRegistry.length, ...original);
    }
}

test("registry has nine anonymous callbacks in the current selector order", () => {
    expect(PatchRegistry.length).toBe(9);
    expect(PatchRegistry.map(({ view }) => view)).toEqual(EXPECTED_SELECTORS);
    expect(PatchRegistry.every((entry) => Object.keys(entry).sort().join(",") === "patch,view")).toBe(true);
    expect(PatchRegistry.every((entry) => typeof entry.patch === "function")).toBe(true);
    PatchRegistry.forEach(({ patch }, index) => {
        const source = patch.toString();
        EXPECTED_PATCH_CALLS[index].forEach((callbackName) => {
            expect(source.includes(callbackName)).toBe(true);
        });
    });
    expect(PatchRegistry.some(({ view }) => view.includes(","))).toBe(true);
    expect(PatchRegistry.filter(({ view }) => [
        ".o-main-components-container", ".o_list_renderer", ".o_form_sheet_bg",
    ].includes(view)).length).toBe(3);
});

test("runner queries every entry and invokes every matching root synchronously", () => {
    const calls = [];
    const roots = [document.createElement("div"), document.createElement("div")];
    const originalQuery = document.querySelectorAll;
    document.querySelectorAll = (selector) => {
        calls.push(`query:${selector}`);
        return selector === ".many" ? roots : [];
    };
    try {
        withRegistry([
            { view: ".none", patch: () => calls.push("none") },
            { view: ".many", patch: (root) => calls.push(root === roots[0] ? "first" : "second") },
            { view: ".later", patch: () => calls.push("later") },
        ], applyRegisteredPatches);
    } finally {
        document.querySelectorAll = originalQuery;
    }
    expect(calls).toEqual(["query:.none", "query:.many", "first", "second", "query:.later"]);
});

test("callback and element failures are isolated, including later entries", () => {
    const calls = [];
    const originalWarn = console.warn;
    console.warn = () => {};
    const one = document.createElement("div");
    const two = document.createElement("div");
    try {
        withRegistry([
            { view: ".roots", patch: (root) => {
                calls.push(root === one ? "one" : "two");
                if (root === one) throw new Error("expected characterization failure");
            } },
            { view: ".later", patch: () => calls.push("later") },
        ], () => {
            one.className = "roots";
            two.className = "roots";
            const later = document.createElement("div");
            later.className = "later";
            document.body.append(one, two, later);
            applyRegisteredPatches();
            one.remove(); two.remove(); later.remove();
        });
    } finally {
        console.warn = originalWarn;
    }
    expect(calls).toEqual(["one", "two", "later"]);
});

test("runner computes and reads an ineffective marker but never writes it", () => {
    const root = document.createElement("div");
    root.className = "reused-root";
    document.body.append(root);
    let count = 0;
    withRegistry([{ view: ".reused-root", patch: () => count++ }], () => {
        applyRegisteredPatches();
        applyRegisteredPatches();
    });
    expect(count).toBe(2);
    expect(root.dataset.jalali_reusedroot).toBe(undefined);
    // Activating the dormant marker would suppress a needed refresh on a reused OWL root.
    root.dataset.jalali_reusedroot = "1";
    withRegistry([{ view: ".reused-root", patch: () => count++ }], applyRegisteredPatches);
    expect(count).toBe(2);
    root.remove();
});

test("returned promises are not awaited by the synchronous runner", async () => {
    let resolved = false;
    let release;
    const pending = new Promise((resolve) => { release = resolve; });
    const root = document.createElement("div");
    root.className = "async-root";
    document.body.append(root);
    withRegistry([{ view: ".async-root", patch: () => pending.then(() => { resolved = true; }) }], () => {
        expect(applyRegisteredPatches()).toBe(undefined);
        expect(resolved).toBe(false);
    });
    release();
    await pending;
    expect(resolved).toBe(true);
    root.remove();
});

test("KNOWN_CENTRAL_BUG_INVALID_SELECTOR_ISOLATION: selector failure aborts the pass", () => {
    let laterCalls = 0;
    expect(() => withRegistry([
        { view: "[", patch: () => {} },
        { view: "body", patch: () => laterCalls++ },
    ], applyRegisteredPatches)).toThrow();
    expect(laterCalls).toBe(0);
});

test("unrelated pages still pay for all selectors and broad roots enter callbacks", () => {
    const queried = [];
    const originalQuery = document.querySelectorAll;
    document.querySelectorAll = function (selector) {
        queried.push(selector);
        return originalQuery.call(this, selector);
    };
    const page = document.createElement("div");
    page.innerHTML = '<div class="o-main-components-container"></div><div class="o_list_renderer"></div><div class="o_form_sheet_bg"></div>';
    document.body.append(page);
    const entered = [];
    try {
        withRegistry(EXPECTED_SELECTORS.map((view) => ({ view, patch: () => entered.push(view) })), applyRegisteredPatches);
    } finally {
        document.querySelectorAll = originalQuery;
        page.remove();
    }
    expect(queried).toEqual(EXPECTED_SELECTORS);
    expect(entered).toEqual([".o-main-components-container", ".o_list_renderer", ".o_form_sheet_bg"]);
});
