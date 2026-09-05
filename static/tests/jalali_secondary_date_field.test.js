import { after, expect, test } from "@odoo/hoot";
import { mockTimeZone } from "@odoo/hoot-mock";
import {
    defineModels,
    fields,
    models,
    mountView,
} from "@web/../tests/web_test_helpers";


class SupplierInfo extends models.Model {
    _name = "product.supplierinfo";
    date_start = fields.Date();
    date_end = fields.Date();
    _records = [
        { id: 1, date_start: "2024-03-20", date_end: "2025-03-20" },
        { id: 2, date_start: false, date_end: false },
    ];
}
defineModels([SupplierInfo]);

const originalJalali = window.jalali;
after(() => {
    window.jalali = originalJalali;
});

function installConversion() {
    window.jalali = {
        toJalaali(year, month, day) {
            if (year === 2024 && month === 3 && day === 20) return { jy: 1403, jm: 1, jd: 1 };
            if (year === 2025 && month === 3 && day === 20) return { jy: 1403, jm: 12, jd: 30 };
            return { jy: year - 621, jm: month, jd: day };
        },
    };
}

test("supplier validity dates use the native widget and render Jalali companions", async () => {
    installConversion();
    mockTimeZone(0);
    await mountView({
        type: "form",
        resModel: "product.supplierinfo",
        resId: 1,
        arch: `<form><field name="date_start" widget="jalali_secondary_date"/><field name="date_end" widget="jalali_secondary_date"/></form>`,
    });

    expect(".o_jalali_secondary_date").toHaveCount(2);
    expect(".o_jalali_secondary_date").toHaveText("| 1 فروردین 1403");
    expect(".o_jalali_secondary_date:eq(1)").toHaveText("| 30 اسفند 1403");
    expect(".o_field_date button").toHaveCount(2);
});

test("empty validity dates have no stale companion in readonly mode", async () => {
    installConversion();
    await mountView({
        type: "form",
        resModel: "product.supplierinfo",
        resId: 2,
        arch: `<form><field name="date_start" widget="jalali_secondary_date" readonly="1"/><field name="date_end" widget="jalali_secondary_date" readonly="1"/></form>`,
    });
    expect(".o_jalali_secondary_date").toHaveCount(0);
    expect(".o_field_date").toHaveCount(2);
});

async function assertTimezone(zone) {
    installConversion();
    mockTimeZone(zone);
    await mountView({
        type: "form",
        resModel: "product.supplierinfo",
        resId: 1,
        arch: `<form><field name="date_start" widget="jalali_secondary_date"/></form>`,
    });
    expect(".o_jalali_secondary_date").toHaveText("| 1 فروردین 1403");
});

test("native companion conversion is timezone-invariant in UTC", () => assertTimezone(0));
test("native companion conversion is timezone-invariant in Tehran", () => assertTimezone(3.5));
test("native companion conversion is timezone-invariant in New York", () => assertTimezone(-5));
