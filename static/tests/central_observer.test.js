import { advanceTime, expect, freezeTime, microTick, test } from "@odoo/hoot";
import { patchWithCleanup } from "@web/../tests/web_test_helpers";

import { PatchRegistry } from "@sale_shamsi_report/js/patch_registry";

test("observer config, fixed-window coalescing, startup, and KNOWN_CENTRAL_BUG_SELF_TRIGGER", async () => {
    freezeTime();
    const observations = [];
    let observerCallback;
    patchWithCleanup(window, {
        MutationObserver: class {
            constructor(callback) { observerCallback = callback; }
            observe(target, options) { observations.push({ target, options }); }
        },
    });
    const original = PatchRegistry.splice(0, PatchRegistry.length);
    const root = document.createElement("div");
    root.className = "self-trigger-root";
    document.body.append(root);
    let passes = 0;
    PatchRegistry.push({ view: ".self-trigger-root", patch: (element) => {
        passes++;
        element.textContent = "unchanged";
    } });
    try {
        // KNOWN_CENTRAL_BUG_LATE_STARTUP: the test bundle evaluated after the
        // real event, so existing DOM and later mutations remain idle.
        root.append(document.createElement("i"));
        await microTick();
        await advanceTime(80);
        expect(passes).toBe(0);
        expect(observations.length).toBe(0);

        // The listener starts observing, but performs no initial patch pass.
        document.dispatchEvent(new Event("DOMContentLoaded"));
        expect(observations.length).toBe(1);
        expect(observations[0].target).toBe(document.body);
        expect(observations[0].options).toEqual({ childList: true, subtree: true });
        expect(observations[0].options.attributes).toBe(undefined);
        expect(observations[0].options.characterData).toBe(undefined);
        expect(passes).toBe(0);

        observerCallback([{ type: "childList" }]);
        await advanceTime(40);
        observerCallback([{ type: "childList" }]);
        await advanceTime(39);
        expect(passes).toBe(0);
        await advanceTime(1);
        expect(passes).toBe(1);

        // The patch write is delivered after apply returns, scheduling feedback.
        await microTick();
        observerCallback([{ type: "childList" }]);
        await advanceTime(80);
        expect(passes).toBe(2);
        await microTick();
        observerCallback([{ type: "childList" }]);
        await advanceTime(80);
        expect(passes).toBe(3);

        // A second event at 60 ms does not reset the first event's timer.
        observerCallback([]);
        await advanceTime(60);
        observerCallback([]);
        await advanceTime(19);
        expect(passes).toBe(3);
        await advanceTime(1);
        expect(passes).toBe(4);
    } finally {
        PatchRegistry.splice(0, PatchRegistry.length, ...original);
        root.remove();
    }
});
