from datetime import date

import jdatetime

from odoo.tests import TransactionCase, tagged


@tagged("shamsi_characterization", "-standard")
class TestShamsiConversion(TransactionCase):
    """Lock the conversion behavior supplied by the current jdatetime runtime."""

    def test_gregorian_to_jalali_boundaries(self):
        fixtures = {
            date(2023, 3, 21): "1402/01/01",
            date(2024, 3, 19): "1402/12/29",
            date(2024, 3, 20): "1403/01/01",
            date(2024, 4, 19): "1403/01/31",
            date(2024, 9, 21): "1403/06/31",
            date(2025, 3, 20): "1403/12/30",
            date(2025, 3, 21): "1404/01/01",
        }

        for gregorian, expected in fixtures.items():
            with self.subTest(gregorian=gregorian):
                actual = jdatetime.date.fromgregorian(date=gregorian).strftime("%Y/%m/%d")
                self.assertEqual(actual, expected)
