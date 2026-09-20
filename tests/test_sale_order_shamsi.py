import re
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

    def test_sale_report_cover_page_is_bounded(self):
        """Regression (2026-09-20): the cover block is a fixed 20cm box with page-break-after; its content
        (title, number, customer, date) must stay inside that box, otherwise the large date line spills past
        the page break and overlaps the document-information block at the top of page 2."""
        document = self._parse("views/sale_report_templates.xml")
        cover = document.xpath("//div[contains(@class, 'custom-full-page-cover')]")
        self.assertEqual(len(cover), 1)
        style = " ".join(cover[0].get("style").split())
        self.assertIn("height: 20cm;", style)
        self.assertIn("overflow: hidden;", style)
        self.assertIn("page-break-after: always;", style)
        markup = etree.tostring(cover[0], encoding="unicode")
        spacers = [int(px) for px in re.findall(r'style="height: (\d+)px;"', markup)]
        self.assertTrue(spacers)
        self.assertLessEqual(max(spacers), 100, "a single spacer must not push the cover date out of the 20cm box")
        self.assertLessEqual(sum(spacers), 320, "total spacer height must leave room for the cover text inside 20cm")
        # the document date is rendered exactly once on the cover; page 2 keeps the native informations block
        self.assertEqual(len(cover[0].xpath(".//*[@t-field='doc.date_order_shamsi']")), 1)

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


@tagged("shamsi_characterization", "-standard")
class TestSaleOrderPdfPagination(TransactionCase):
    """L-02 regression (2026-09-20) — multi-page body clipping and orphan pages.

    These checks read the *rendered* PDF, never the template source, so they keep
    holding if the markup is refactored. Each one renders the report body with the
    exact wkhtmltopdf arguments Odoo uses but with an empty header and footer
    document: pagination is unchanged (wkhtmltopdf lays header and footer out
    separately) while everything left on the page is body content by construction.
    That matters because RTL shaping makes "is this word part of the footer?"
    text heuristics unusable - poppler and pdfminer both emit Arabic presentation
    forms one glyph at a time.
    """

    TOL = 1.0          # pt, rasteriser rounding
    MIN_PAGES = 3      # the fixture must actually break across pages

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.partner = cls.env["res.partner"].create({"name": "L-02 pagination partner"})
        cls.product = cls.env["product.product"].create(
            {"name": "L-02 pagination product", "type": "consu"}
        )
        paragraph = (
            "Scope validation paragraph used only to force the quotation body across "
            "several printed pages so the page-break behaviour can be measured. "
        )
        lines = [(0, 0, {
            "product_id": cls.product.id,
            "product_uom_qty": 12,
            "price_unit": 2500000,
            "name": "L-02 pagination product\n" + paragraph * 6,
        })]
        for index in range(6):
            lines.append((0, 0, {
                "display_type": "line_note",
                "name": f"Customer note {index}: " + paragraph * 8,
            }))
        cls.order = cls.env["sale.order"].create({
            "partner_id": cls.partner.id,
            "order_line": lines,
            "note": "<p>" + paragraph * 10 + "</p>",
        })

    # ------------------------------------------------------------------ helpers
    def _printable_band(self, paperformat, page_height):
        """(top, bottom) of the printable body in pt, from the page top.

        Taken from the paperformat the report actually resolves to, so the test
        keeps measuring the real exclusion areas if the margins are reconfigured.
        """
        mm = 72.0 / 25.4
        return paperformat.margin_top * mm, page_height - paperformat.margin_bottom * mm

    def _render_body_only(self):
        import os
        import tempfile

        try:
            from odoo.addons.base.models.ir_actions_report import _run_wkhtmltopdf
        except ImportError:  # pragma: no cover - older base
            self.skipTest("wkhtmltopdf helper not available")

        report = self.env.ref("sale.action_report_saleorder").sudo()
        html = report._render_qweb_html(report.report_name, self.order.ids)[0]
        if isinstance(html, bytes):
            html = html.decode()
        bodies, _res_ids, _header, _footer, specific = report._prepare_html(
            html, report_model="sale.order"
        )
        paperformat = report.get_paperformat()
        args = report._build_wkhtmltopdf_args(
            paperformat, False, specific_paperformat_args=specific, set_viewport_size=False
        )
        with tempfile.TemporaryDirectory() as tmp:
            empty = os.path.join(tmp, "empty.html")
            body = os.path.join(tmp, "body.html")
            out = os.path.join(tmp, "out.pdf")
            with open(empty, "w", encoding="utf-8") as handle:
                handle.write('<html><head><meta charset="utf-8"/></head><body></body></html>')
            with open(body, "w", encoding="utf-8") as handle:
                handle.write(bodies[0])
            _run_wkhtmltopdf(args + ["--header-html", empty, "--footer-html", empty, body, out])
            if not os.path.exists(out) or not os.path.getsize(out):
                self.skipTest("wkhtmltopdf produced no PDF in this environment")
            return self._pages(out), paperformat

    @staticmethod
    def _pages(pdf_path):
        """[{height, chars, graphics, text}] with y measured from the page top."""
        from pdfminer.high_level import extract_pages
        from pdfminer.layout import LTChar, LTCurve, LTFigure, LTImage, LTLine, LTRect

        pages = []
        for layout in extract_pages(pdf_path):
            height = layout.height
            chars, graphics, images = [], [], []

            def walk(node):
                for element in node:
                    if isinstance(element, LTChar):
                        chars.append((height - element.y1, height - element.y0,
                                      element.x0, element.x1, element.get_text()))
                    elif isinstance(element, (LTRect, LTLine, LTCurve)):
                        graphics.append((height - element.y1, height - element.y0,
                                         element.x0, element.x1))
                    elif isinstance(element, (LTImage, LTFigure)):
                        images.append((height - element.y1, height - element.y0,
                                       element.x0, element.x1))
                    if hasattr(element, "__iter__"):
                        walk(element)

            walk(layout)
            pages.append({
                "height": height,
                "chars": chars,
                "graphics": graphics,
                "images": images,
                "text": "".join(c[4] for c in chars),
            })
        return pages

    def _rendered(self):
        pages, paperformat = self._render_body_only()
        if len(pages) < self.MIN_PAGES:
            self.skipTest(f"fixture rendered {len(pages)} page(s), needs >= {self.MIN_PAGES}")
        if not any(page["graphics"] for page in pages):
            # no table borders at all means the report assets never loaded over
            # report.url, so the geometry below would pass vacuously
            self.skipTest("report assets unreachable, rendered PDF carries no table borders")
        return pages, paperformat

    # -------------------------------------------------------------------- tests
    def test_no_text_enters_the_header_or_footer_exclusion_area(self):
        """No glyph may sit in, or straddle the edge of, the non-printable margins."""
        pages, paperformat = self._rendered()
        offenders = []
        for number, page in enumerate(pages, 1):
            top, bottom = self._printable_band(paperformat, page["height"])
            for y0, y1, _x0, _x1, text in page["chars"]:
                if y1 > bottom + self.TOL or y0 < top - self.TOL:
                    offenders.append((number, round(y0, 1), round(y1, 1), text))
        self.assertFalse(
            offenders[:20],
            "body text reaches into the header/footer exclusion area or starts "
            f"outside the printable body (band {top:.1f}..{bottom:.1f}pt): {offenders[:20]}",
        )

    def test_no_page_starts_or_ends_on_a_split_text_line(self):
        """A line of text must not be cut by a page boundary."""
        pages, paperformat = self._rendered()
        split = []
        for number, page in enumerate(pages, 1):
            top, bottom = self._printable_band(paperformat, page["height"])
            for y0, y1, _x0, _x1, text in page["chars"]:
                # pdfminer reports the full em box of a glyph, so allow the same
                # rounding tolerance as the band check before calling it a split
                for edge in (top, bottom):
                    if y0 < edge - self.TOL and y1 > edge + self.TOL:
                        split.append((number, round(y0, 1), round(y1, 1), text))
        self.assertFalse(split[:20], f"text line straddles a page boundary: {split[:20]}")

    def test_table_frame_is_paginated_with_its_rows(self):
        """The table box must be drawn per page, not as one stretched overlay.

        Odoo's bubble layout paints it with an absolutely positioned ::before
        covering the whole table; wkhtmltopdf does not break that overlay with
        the rows, so on a split table it is emitted with the full table height
        and merely clipped - leaving an empty bordered rectangle running down
        into the footer. A primitive reaching far outside the page box is that
        overlay.
        """
        pages, _paperformat = self._rendered()
        stretched = []
        for number, page in enumerate(pages, 1):
            for y0, y1, _x0, _x1 in page["graphics"]:
                if y1 > page["height"] + self.TOL or y0 < -self.TOL:
                    stretched.append((number, round(y0, 1), round(y1, 1),
                                      round(page["height"], 1)))
        self.assertFalse(
            stretched[:20],
            "a table frame is painted outside the page box instead of being "
            f"paginated with its rows: {stretched[:20]}",
        )

    def test_no_page_holds_marks_without_any_text(self):
        """No orphan page carrying only a frame or a lone signature image.

        Images count as marks: the defect this guards against is the signature
        image being torn off its caption onto a page of its own, and pdfminer
        reports an image as LTImage/LTFigure, never as a rect.
        """
        pages, _paperformat = self._rendered()
        blank = [number for number, page in enumerate(pages, 1)
                 if (page["graphics"] or page["images"]) and not page["chars"]]
        self.assertFalse(blank, f"page(s) {blank} carry marks but no text at all")

    def test_line_table_header_repeats_on_continuation_pages(self):
        """Every page the line table runs onto must show its column headers."""
        pages, _paperformat = self._rendered()
        # the layout uppercases thead, so compare case-insensitively
        header = "description"
        marker = "customer note 0"
        texts = [page["text"].lower() for page in pages]
        first = next((index for index, text in enumerate(texts) if marker in text), None)
        self.assertIsNotNone(first, "fixture did not render its line table")
        missing = [index + 1 for index, text in enumerate(texts[first:], first)
                   if "customer note" in text and header not in text]
        self.assertFalse(
            missing,
            f"page(s) {missing} continue the line table without repeating the "
            f"{header!r} column header",
        )
