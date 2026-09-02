/** @odoo-module **/

import { applyRegisteredPatches } from "./patch_runner";

/* -----------------------
   MutationObserver + Debounce
------------------------*/

let observerInstance = null;
let scheduled = false;
let timer = null;
let isApplying = false;

export function startObserver() {
    const target = document.body;

    // اگر body هنوز آماده نبود، دوباره تلاش کن
    if (!target) {
        setTimeout(startObserver, 200);
        return;
    }

    // اگر قبلاً observer ساخته شده، دوباره نساز
    if (observerInstance) {
        console.log("🔍 Jalali Patch Observer already started");
        return;
    }

    const schedulePatch = () => {
        // اگر الان در حال apply هستیم، از اجرای مجدد جلوگیری کن
        if (isApplying) return;

        // debounce
        if (scheduled) return;
        scheduled = true;

        clearTimeout(timer);
        timer = setTimeout(() => {
            isApplying = true;

            try {
                applyRegisteredPatches();
            } catch (err) {
                console.error("Jalali patch error:", err);
            } finally {
                isApplying = false;
                scheduled = false;
            }
        }, 80);
    };

    observerInstance = new MutationObserver(schedulePatch);

    observerInstance.observe(target, {
        childList: true,
        subtree: true
    });

    console.log("🔍 Jalali Patch Observer started");
}
