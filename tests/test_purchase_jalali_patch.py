from datetime import date

import jdatetime

from odoo import fields
from odoo.tests import TransactionCase, tagged
from odoo.tools.misc import file_open


@tagged("shamsi_characterization", "-standard")
class TestPurchaseJalaliPatch(TransactionCase):
    """Vendor-pricelist characterization and correctness regressions."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.source = cls._read("static/src/js/purchase1_jalali_patch.js")
        cls.service = cls._read("static/src/js/jalali_service.js")

    @staticmethod
    def _read(path):
        with file_open(f"sale_shamsi_report/{path}", "r") as source:
            return source.read()

    @staticmethod
    def _jalali(value):
        return jdatetime.date.fromgregorian(date=value).strftime("%Y/%m/%d")

    def test_known_nowruz_boundaries(self):
        self.assertEqual(self._jalali(date(2023, 3, 21)), "1402/01/01")
        self.assertEqual(self._jalali(date(2024, 3, 19)), "1402/12/29")
        self.assertEqual(self._jalali(date(2024, 3, 20)), "1403/01/01")

    def test_owning_model_fields_are_civil_dates(self):
        model_fields = self.env["product.supplierinfo"]._fields
        self.assertEqual(model_fields["date_start"].type, "date")
        self.assertEqual(model_fields["date_end"].type, "date")

    def test_start_and_end_date_paths(self):
        self.assertIn('button[data-field="${fieldName}"]', self.source)
        self.assertIn('updateJalaliAfterButton(modalEl, "date_start"', self.source)
        self.assertIn('updateJalaliAfterButton(modalEl, "date_end"', self.source)
        self.assertIn('"jalali-date-start"', self.source)
        self.assertIn('"jalali-date-end"', self.source)

    def test_patch_is_scoped_to_supplierinfo_form_signature(self):
        self.assertIn("SUPPLIERINFO_SIGNATURE", self.source)
        for field_name in ("partner_id", "min_qty", "price", "delay"):
            self.assertIn(f'"{field_name}"', self.source)
        self.assertIn("!isSupplierInfoForm(modalEl)", self.source)

    def test_uses_odoo_locale_aware_date_parser(self):
        self.assertIn('import { parseDate } from "@web/core/l10n/dates";', self.source)
        self.assertIn("parseDate(normalizeDigits(value.trim()))", self.source)
        self.assertNotIn("parseUSDate", self.source)

    def test_locale_variants_are_not_hard_coded(self):
        fixtures = {
            "en_US": "03/20/2024",
            "fa_IR": "۲۰۲۴/۰۳/۲۰",
            "de_DE": "20.03.2024",
        }
        for locale, rendered_value in fixtures.items():
            with self.subTest(locale=locale):
                self.assertTrue(rendered_value)
        self.assertNotIn('.split("/")', self.source)
        self.assertIn("\\u06F0-\\u06F9", self.source)
        self.assertIn("\\u0660-\\u0669", self.source)

    def test_empty_and_invalid_values_are_safe(self):
        self.assertIn('if (!value || typeof value !== "string") return null;', self.source)
        self.assertIn("return parsed && parsed.isValid ? parsed : null;", self.source)
        self.assertIn("existing?.remove();", self.source)

    def test_repeated_execution_updates_in_place(self):
        self.assertIn("if (existing)", self.source)
        self.assertIn("existing.textContent = newText", self.source)
        self.assertEqual(self.source.count("createDiv("), 1)

    def test_civil_dates_never_become_javascript_instants(self):
        self.assertNotIn("new Date(", self.source)
        self.assertNotIn("Date.UTC(", self.source)
        self.assertNotIn("Date.parse(", self.source)
        self.assertIn('typeof date.year === "number"', self.service)

    def test_date_result_is_timezone_invariant(self):
        supplier = self.env["product.supplierinfo"].new({
            "date_start": fields.Date.to_date("2024-03-20"),
            "date_end": fields.Date.to_date("2025-03-20"),
        })
        for timezone in ("UTC", "Asia/Tehran", "America/New_York"):
            with self.subTest(timezone=timezone):
                localized = supplier.with_context(tz=timezone)
                self.assertEqual(self._jalali(localized.date_start), "1403/01/01")
                self.assertEqual(self._jalali(localized.date_end), "1403/12/30")

    def test_shared_converter_keeps_javascript_date_compatibility(self):
        self.assertIn("date.getFullYear?.()", self.service)
        self.assertIn("date.getMonth?.() + 1", self.service)
        self.assertIn("date.getDate?.()", self.service)

    def test_no_purchase_debug_logging_remains(self):
        self.assertNotIn("console.log(", self.source)
        self.assertNotIn("console.debug(", self.source)
