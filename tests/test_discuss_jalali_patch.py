from odoo.tests import TransactionCase, tagged
from odoo.tools.misc import file_open


@tagged("shamsi_characterization", "-standard")
class TestDiscussJalaliPatch(TransactionCase):
    """Static characterization of the Discuss/Chatter DOM integration."""

    def _source(self):
        with file_open("sale_shamsi_report/static/src/js/discuss_jalali_patch.js", "r") as source:
            return source.read()

    def test_message_and_date_section_selectors_are_present(self):
        source = self._source()
        self.assertIn('.o-mail-DateSection span', source)
        self.assertIn('.o-mail-Message-date', source)
        self.assertIn('getAttribute("title")', source)

    def test_repeated_processing_is_guarded(self):
        source = self._source()
        self.assertGreaterEqual(source.count('dataset.jalaliPatched'), 4)
        self.assertIn('el.insertAdjacentElement("afterend", div);', source)

    def test_invalid_and_empty_values_return_without_injection(self):
        source = self._source()
        self.assertIn('if (!gDateText) return;', source)
        self.assertIn('if (isNaN(gDate)) return;', source)
        self.assertNotIn('console.log(', source)

    def test_discuss_and_chatter_share_message_timestamp_path(self):
        source = self._source()
        self.assertGreaterEqual(source.count('.o-mail-Message-date'), 1)
