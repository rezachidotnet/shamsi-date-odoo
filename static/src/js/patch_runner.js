/** @odoo-module **/

import { PatchRegistry } from "./patch_registry";

export function applyRegisteredPatches() {

    PatchRegistry.forEach(entry => {

        document.querySelectorAll(entry.view).forEach(el => {

            const patchId = "jalali_" + entry.view.replace(/[^a-zA-Z0-9]/g, "");
            // prevent running same patch again
            if (el.dataset[patchId]) return;

            try {
                entry.patch(el);

                // mark element as patched
                // el.dataset[patchId] = "1";

            } catch (err) {
                console.warn("Patch failed for", entry.view, err);
            }

        });

    });

}