from datetime import datetime

import jdatetime
import pytz

from odoo import fields
from odoo.tests import TransactionCase, tagged
from odoo.tools.misc import file_open


@tagged("shamsi_characterization", "-standard")
class TestCalendarJalaliPatch(TransactionCase):
    """Calendar-specific characterization and correctness regressions."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.source = cls._read("static/src/js/calendar_jalali_patch.js")

    @staticmethod
    def _read(path):
        with file_open(f"sale_shamsi_report/{path}", "r") as source:
            return source.read()

    @staticmethod
    def _jalali(value):
        return jdatetime.date.fromgregorian(date=value).strftime("%Y/%m/%d")

    def test_gregorian_to_jalali_day_mapping(self):
        self.assertEqual(self._jalali(datetime(2024, 3, 20).date()), "1403/01/01")

    def test_calendar_day_cells_use_structured_iso_date(self):
        self.assertIn('dayEl.closest("td")?.dataset.date', self.source)
        self.assertIn("parseISODate", self.source)

    def test_calendar_headers_use_structured_iso_date(self):
        self.assertIn('header.closest("th")?.dataset.date', self.source)
        self.assertIn("jalali-date-header", self.source)

    def test_picker_uses_locale_aware_luxon_parser(self):
        self.assertIn('parseLocalizedValue(text, "LLLL yyyy")', self.source)
        self.assertIn("locale: window.luxon.Settings.defaultLocale", self.source)
        self.assertNotIn("monthMap", self.source)

    def test_picker_reparse_excludes_injected_jalali_text(self):
        self.assertIn("function ownText(element)", self.source)
        self.assertIn("parsePickerMonth(ownText(header))", self.source)

    def test_popover_uses_odoo_luxon_locale(self):
        self.assertIn('parseLocalizedValue(value, "DDD")', self.source)
        self.assertNotIn("January:", self.source)

    def test_form_start_and_stop_use_numeric_tooltips(self):
        self.assertIn("field.dataset.tooltip", self.source)
        self.assertIn('allDay ? "start_date" : "start"', self.source)
        self.assertIn('allDay ? "stop_date" : "stop"', self.source)

    def test_repeated_execution_updates_existing_nodes(self):
        self.assertGreaterEqual(self.source.count("updateOrCreateElement"), 5)
        self.assertNotIn("insertAdjacentElement", self.source)

    def test_invalid_and_missing_inputs_are_safe(self):
        self.assertIn('if (!match) return null;', self.source)
        self.assertIn('if (!value || !format || !window.luxon?.DateTime) return null;', self.source)
        self.assertIn('if (!form) return;', self.source)

    def test_no_calendar_debug_logging_remains(self):
        self.assertNotIn("console.log(", self.source)
        self.assertNotIn("console.debug(", self.source)

    def test_timed_event_timezone_boundaries(self):
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

    def test_opposite_timezone_boundary(self):
        timestamp = pytz.UTC.localize(datetime(2024, 3, 19, 21, 0))
        expected = {"UTC": "1402/12/29", "Asia/Tehran": "1403/01/01", "America/New_York": "1402/12/29"}
        for timezone, jalali_date in expected.items():
            with self.subTest(timezone=timezone):
                self.assertEqual(self._jalali(timestamp.astimezone(pytz.timezone(timezone)).date()), jalali_date)

    def test_calendar_event_field_semantics(self):
        model_fields = self.env["calendar.event"]._fields
        self.assertEqual(model_fields["start"].type, "datetime")
        self.assertEqual(model_fields["stop"].type, "datetime")
        self.assertEqual(model_fields["start_date"].type, "date")
        self.assertEqual(model_fields["stop_date"].type, "date")
        self.assertEqual(model_fields["allday"].type, "boolean")

    def test_all_day_dates_do_not_shift_with_timezone(self):
        event = self.env["calendar.event"].new({
            "name": "All-day Shamsi characterization",
            "allday": True,
            "start_date": fields.Date.to_date("2024-03-20"),
            "stop_date": fields.Date.to_date("2024-03-20"),
        })
        for timezone in ("UTC", "Asia/Tehran", "America/New_York"):
            with self.subTest(timezone=timezone):
                local_event = event.with_context(tz=timezone)
                self.assertEqual(self._jalali(local_event.start_date), "1403/01/01")
                self.assertEqual(self._jalali(local_event.stop_date), "1403/01/01")
