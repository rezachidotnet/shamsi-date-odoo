/** @odoo-module **/

import {
    injectColumnHeaders,
    injectDayNumbers,
    updateJalaliDates,
    injectPopoverJalali,
    injectSidebar
} from "./calendar_jalali_patch";

import {
    updateAllMailDates
} from "./discuss_jalali_patch"

import {
    updateMassMailingScheduleDate,
    updateNextDepartureToJalali,
    updateCalendarDateList
} from "./smsmarketing_jalali_patch"

import {
    updatePurchaseVendorPriceList
} from "./purchase1_jalali_patch"
/* -----------------------
   Patch Registry
------------------------*/
export const PatchRegistry = [

    {
        view: ".o_calendar_container",
        patch: (el) => {
            injectColumnHeaders(el);
            injectDayNumbers(el);
            // injectSidebar();
        }
    },

    {
        view: ".o_calendar_form_view",
        patch: (el) => {
            updateJalaliDates(el);
        }
    },

    {
        view: ".o_cw_popover",
        patch: (el) => {
            injectPopoverJalali(el);
        }
    }
    ,

    {
        view: ".o_datetime_picker",
        patch: (el) => {
            injectSidebar(el);
        }
    }
    ,
    
    {

        // view: ".o-mail-Discuss .o-mail-ChatterContainer",
        view: ".o-mail-Discuss, .o-mail-ChatterContainer",
        patch: (el) => {
            updateAllMailDates(el)
            
        }
    }
    ,

    {
        view: ".o-main-components-container",

        patch: (el) => {
            updateMassMailingScheduleDate(el);
        }
    }
    ,

    {
        view: ".o_mass_mailing_mailing_form",
        patch: (el) => {
            updateNextDepartureToJalali(el);
        }
    }
    ,
    
    {
        view: ".o_list_renderer",
        patch: (el) => {
            updateCalendarDateList(el);
        }


    }
    ,

    {
        // view: "o_content",
        view: ".o_form_sheet_bg",
        patch: (el) => {
            console.log("updatePurchaseVendorPriceList CALLED:");
            try {
                updatePurchaseVendorPriceList(el);
            } catch (err) {
                console.error("updatePurchaseVendorPriceList error:", err);
            }
    
        }


    },



    


];


