/** @odoo-module **/

import { DateTimeField } from "@web/views/fields/datetime/datetime_field";
import { registry } from "@web/core/registry";

import { jMonthName, toJalali } from "./jalali_service";

/**
 * Native Odoo DateTimeField with a read-only Jalali companion.
 *
 * The underlying DateTimeField remains responsible for formatting, parsing,
 * validation, editing, and RPC serialization.  This component only derives
 * presentation from the structured Luxon value already held by the record.
 */
export class JalaliSecondaryDateField extends DateTimeField {
    static template = "sale_shamsi_report.JalaliSecondaryDateField";

    get jalaliText() {
        const value = this.props.record?.data?.[this.props.name];
        if (!value || value.isValid === false) {
            return "";
        }
        const jalali = toJalali(value);
        if (!jalali || typeof jalali !== "object") {
            return "";
        }
        const { jy, jm, jd } = jalali;
        if (![jy, jm, jd].every((part) => Number.isInteger(part))) {
            return "";
        }
        return `| ${jd} ${jMonthName(jm)} ${jy}`;
    }
}

registry.category("fields").add("jalali_secondary_date", {
    component: JalaliSecondaryDateField,
    displayName: "Date with Jalali companion",
    supportedTypes: ["date"],
});
