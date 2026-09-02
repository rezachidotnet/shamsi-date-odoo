from datetime import datetime
from freezegun import freeze_time
from lxml import etree

from odoo.tests import TransactionCase, tagged
from odoo.tools.misc import file_open


@tagged("shamsi_characterization", "-standard")
class TestSaleOrderShamsi(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.partner = cls.env["res.partner"].create({"name": "Shamsi characterization partner"})
        cls.product = cls.env["product.product"].create({
            "name": "Shamsi characterization product",
            "type": "consu",
        })

    def _create_order(self, **values):
        values.setdefault("partner_id", self.partner.id)
        return self.env["sale.order"].create(values)

    @freeze_time("2024-03-20 12:00:00")
    def test_all_populated_shamsi_fields_use_numeric_format(self):
        order = self._create_order(
            date_order=datetime(2024, 3, 20, 12, 0, 0),
            validity_date="2025-03-20",
            commitment_date=datetime(2025, 3, 21, 8, 30, 0),
            order_line=[(0, 0, {
                "product_id": self.product.id,
                "product_uom_qty": 1,
                "price_unit": 1,
                "customer_lead": 0,
            })],
        )

        self.assertEqual(order.date_order_shamsi, "1403/01/01")
        self.assertEqual(order.validity_date_shamsi, "1403/12/30")
        self.assertEqual(order.commitment_date_shamsi, "1404/01/01")
        self.assertEqual(order.expected_date_shamsi, "1403/01/01")

    def test_false_sources_produce_false_display_values(self):
        order = self.env["sale.order"].new({
            "partner_id": self.partner.id,
            "date_order": False,
            "validity_date": False,
            "commitment_date": False,
        })
        order._compute_shamsi_dates()

        self.assertFalse(order.date_order_shamsi)
        self.assertFalse(order.validity_date_shamsi)
        self.assertFalse(order.commitment_date_shamsi)
        self.assertFalse(order.expected_date_shamsi)

    def test_shamsi_fields_are_not_stored(self):
        for field_name in (
            "date_order_shamsi",
            "validity_date_shamsi",
            "commitment_date_shamsi",
            "expected_date_shamsi",
        ):
            with self.subTest(field=field_name):
                self.assertFalse(self.env["sale.order"]._fields[field_name].store)

    def test_source_field_types(self):
        fields = self.env["sale.order"]._fields
        self.assertEqual(fields["date_order"].type, "datetime")
        self.assertEqual(fields["validity_date"].type, "date")
        self.assertEqual(fields["commitment_date"].type, "datetime")
        self.assertEqual(fields["expected_date"].type, "datetime")

    def test_declared_dependencies_trigger_recomputation(self):
        order = self._create_order(
            date_order=datetime(2024, 3, 20, 12, 0, 0),
            validity_date="2024-03-19",
            commitment_date=datetime(2025, 3, 20, 12, 0, 0),
        )
        self.assertEqual(order.date_order_shamsi, "1403/01/01")
        self.assertEqual(order.validity_date_shamsi, "1402/12/29")
        self.assertEqual(order.commitment_date_shamsi, "1403/12/30")

        order.date_order = datetime(2025, 3, 21, 12, 0, 0)
        order.validity_date = "2025-03-21"
        order.commitment_date = datetime(2024, 3, 20, 12, 0, 0)

        self.assertEqual(order.date_order_shamsi, "1404/01/01")
        self.assertEqual(order.validity_date_shamsi, "1404/01/01")
        self.assertEqual(order.commitment_date_shamsi, "1403/01/01")

    def test_expected_date_is_in_dependency_graph(self):
        """Regression for KNOWN_BUG_EXPECTED_DATE_DEPENDS."""
        model = self.env["sale.order"]
        field = model._fields["expected_date_shamsi"]
        dependencies, _context_dependencies = field.get_depends(model)
        self.assertIn("expected_date", dependencies)

    @freeze_time("2024-03-20 12:00:00")
    def test_expected_date_change_recomputes_shamsi_value(self):
        """Regression for KNOWN_BUG_EXPECTED_DATE_DEPENDS at ORM cache level."""
        order = self._create_order(
            date_order=datetime(2024, 3, 20, 12, 0, 0),
            order_line=[(0, 0, {
                "product_id": self.product.id,
                "product_uom_qty": 1,
                "price_unit": 1,
                "customer_lead": 0,
            })],
        )
        self.assertEqual(order.expected_date_shamsi, "1403/01/01")

        order.order_line.customer_lead = 2

        self.assertEqual(order.expected_date_shamsi, "1403/01/03")

    def test_datetime_conversion_uses_user_timezone(self):
        """Regression for KNOWN_BUG_USER_TIMEZONE."""
        timestamp = datetime(2024, 3, 20, 0, 30, 0)
        expectations = {
            "UTC": "1403/01/01",
            "Asia/Tehran": "1403/01/01",
            "America/New_York": "1402/12/29",
        }
        for timezone, expected in expectations.items():
            with self.subTest(timezone=timezone):
                order = self.env["sale.order"].with_context(tz=timezone).new({
                    "partner_id": self.partner.id,
                    "date_order": timestamp,
                    "commitment_date": timestamp,
                })
                order._compute_shamsi_dates()
                self.assertEqual(order.date_order_shamsi, expected)
                self.assertEqual(order.commitment_date_shamsi, expected)

    def test_tehran_positive_offset_crosses_gregorian_date_boundary(self):
        timestamp = datetime(2024, 3, 19, 21, 0, 0)
        expectations = {
            "UTC": "1402/12/29",
            "Asia/Tehran": "1403/01/01",
            "America/New_York": "1402/12/29",
        }
        for timezone, expected in expectations.items():
            with self.subTest(timezone=timezone):
                order = self.env["sale.order"].with_context(tz=timezone).new({
                    "partner_id": self.partner.id,
                    "date_order": timestamp,
                    "commitment_date": timestamp,
                })
                order._compute_shamsi_dates()
                self.assertEqual(order.date_order_shamsi, expected)
                self.assertEqual(order.commitment_date_shamsi, expected)


@tagged("shamsi_characterization", "-standard")
class TestShamsiTemplateStructure(TransactionCase):
    @staticmethod
    def _parse(relative_path):
        with file_open(f"sale_shamsi_report/{relative_path}", "rb") as source:
            return etree.parse(source)

    def test_sale_report_template_structure(self):
        document = self._parse("views/sale_report_templates.xml")
        inherit_ids = document.xpath("//template/@inherit_id")
        self.assertIn("sale.report_saleorder_document", inherit_ids)
        self.assertIn("web.external_layout_bubble", inherit_ids)
        for field_name in ("date_order_shamsi", "validity_date_shamsi", "commitment_date_shamsi"):
            self.assertTrue(document.xpath(f"//*[@t-esc='doc.{field_name}'] | //*[@t-field='doc.{field_name}']"))
        self.assertTrue(document.xpath("//t[@t-else]"))

    def test_sale_portal_template_language_branches(self):
        document = self._parse("views/sale_portal_templates.xml")
        self.assertEqual(
            document.xpath("string(//template/@inherit_id)"),
            "sale.sale_order_portal_content",
        )
        self.assertTrue(document.xpath("//t[contains(@t-if, \"request.env.lang == 'fa_IR'\")]"))
        self.assertTrue(document.xpath("//t[@t-else]//*[@t-field='sale_order.date_order']"))
        self.assertTrue(document.xpath("//t[@t-else]//*[@t-field='sale_order.validity_date']"))
        self.assertTrue(document.xpath("//t[@t-else]//*[@t-field='sale_order.commitment_date']"))
        for field_name in ("date_order_shamsi", "validity_date_shamsi", "commitment_date_shamsi"):
            self.assertTrue(document.xpath(f"//*[@t-esc='sale_order.{field_name}']"))

    def test_expected_view_inheritance_references(self):
        expected = {
            "views/calendar_event_jalali.xml": "calendar.view_calendar_event_form",
            "views/sale_order_form_inherit.xml": "sale.view_order_form",
            "views/sale_portal_templates.xml": "sale.sale_order_portal_content",
            "views/sale_report_templates.xml": "sale.report_saleorder_document",
        }
        for path, inherit_id in expected.items():
            with self.subTest(path=path):
                document = self._parse(path)
                references = document.xpath("//field[@name='inherit_id']/@ref | //template/@inherit_id")
                self.assertIn(inherit_id, references)
