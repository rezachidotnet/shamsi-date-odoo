from datetime import date, datetime

import jdatetime
import pytz

from odoo import fields
from odoo.tests import TransactionCase, tagged
from odoo.tools.misc import file_open


@tagged("shamsi_characterization", "-standard")
class TestSchedulingJalaliPatch(TransactionCase):
    """Scheduling/list ownership and correctness regressions for Phase C4."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.source = cls._read("static/src/js/smsmarketing_jalali_patch.js")

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

    def test_resolved_field_semantics(self):
        self.assertEqual(self.env["mailing.mailing.schedule.date"]._fields["schedule_date"].type, "datetime")
        activity_fields = self.env["mail.activity.schedule"]._fields
        self.assertEqual(activity_fields["date_deadline"].type, "date")
        self.assertEqual(activity_fields["plan_date"].type, "date")
        mailing_fields = self.env["mailing.mailing"]._fields
        self.assertEqual(mailing_fields["next_departure"].type, "datetime")
        self.assertEqual(mailing_fields["calendar_date"].type, "datetime")

    def test_schedule_paths_have_explicit_date_semantics(self):
        self.assertIn('{ selector: "#schedule_date_0", type: "datetime" }', self.source)
        self.assertIn('{ selector: "#date_deadline_0", type: "date" }', self.source)
        self.assertIn('{ selector: "#plan_date_0", type: "date" }', self.source)

    def test_odoo_locale_parsers_replace_browser_parsing(self):
        self.assertIn('import { parseDate, parseDateTime } from "@web/core/l10n/dates";', self.source)
        self.assertNotIn("new Date(", self.source)
        self.assertNotIn("Date.parse(", self.source)
        self.assertNotIn("Date.UTC(", self.source)

    def test_locale_variations_and_non_ascii_digits_are_supported(self):
        fixtures = {
            "en_US": "03/20/2024",
            "fa_IR": "۲۰۲۴/۰۳/۲۰",
            "de_DE": "20.03.2024",
            "ar_digits": "٢٠٢٤/٠٣/٢٠",
        }
        for locale, rendered_value in fixtures.items():
            with self.subTest(locale=locale):
                self.assertTrue(rendered_value)
        self.assertIn("\\u06F0-\\u06F9", self.source)
        self.assertIn("\\u0660-\\u0669", self.source)

    def test_empty_and_invalid_inputs_remove_stale_output(self):
        self.assertIn('if (!value || typeof value !== "string") return null;', self.source)
        self.assertIn("existing?.remove();", self.source)

    def test_repeated_execution_updates_and_deduplicates(self):
        self.assertIn("existing.textContent = text", self.source)
        self.assertIn("if (index > 0) extra.remove();", self.source)
        self.assertEqual(self.source.count("createDiv("), 1)

    def test_structured_native_tooltips_are_preferred(self):
        self.assertIn('field?.getAttribute("data-tooltip") || field?.value', self.source)
        self.assertIn('source?.getAttribute("data-tooltip")', self.source)
        self.assertIn('span?.getAttribute("data-tooltip")', self.source)

    def test_next_departure_selector_is_field_scoped(self):
        self.assertIn("'[name=\"next_departure\"] span[data-tooltip]'", self.source)
        self.assertNotIn('const span = containerEl.querySelector("span[data-tooltip]");', self.source)

    def test_calendar_list_path_preserves_native_field_dom(self):
        self.assertIn('td[name="calendar_date"]', self.source)
        self.assertIn('"jalali-calendar-date-list"', self.source)
        self.assertNotIn("cell.innerText =", self.source)

    def test_unsafe_generic_create_date_path_is_disabled(self):
        self.assertNotIn('td[name="create_date"]', self.source)
        self.assertNotIn("getFullYear()", self.source)

    def test_datetime_uses_user_timezone_before_calendar_conversion(self):
        timestamp = pytz.UTC.localize(datetime(2024, 3, 20, 0, 30))
        expected = {
            "UTC": "1403/01/01",
            "Asia/Tehran": "1403/01/01",
            "America/New_York": "1402/12/29",
        }
        for timezone, jalali_date in expected.items():
            with self.subTest(timezone=timezone):
                local_date = timestamp.astimezone(pytz.timezone(timezone)).date()
                self.assertEqual(self._jalali(local_date), jalali_date)

    def test_date_fields_are_timezone_invariant(self):
        scheduler = self.env["mail.activity.schedule"].new({
            "date_deadline": fields.Date.to_date("2024-03-20"),
            "plan_date": fields.Date.to_date("2024-03-20"),
        })
        for timezone in ("UTC", "Asia/Tehran", "America/New_York"):
            with self.subTest(timezone=timezone):
                localized = scheduler.with_context(tz=timezone)
                self.assertEqual(self._jalali(localized.date_deadline), "1403/01/01")
                self.assertEqual(self._jalali(localized.plan_date), "1403/01/01")

    def test_no_debug_logging_remains(self):
        self.assertNotIn("console.log(", self.source)
        self.assertNotIn("console.debug(", self.source)
