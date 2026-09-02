/** @odoo-module **/

import { startObserver } from "./patch_observer";

/* -----------------------
   Startup: Begin patch system
------------------------*/

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Jalali Patch System Starting...");
    startObserver();
});
