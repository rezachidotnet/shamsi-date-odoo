from odoo import models, fields, api
import jdatetime


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    date_order_shamsi = fields.Char(
        string='Order Date (Shamsi)',
        compute='_compute_shamsi_dates'
    )

    validity_date_shamsi = fields.Char(
        string='Validity Date (Shamsi)',
        compute='_compute_shamsi_dates'
    )

    commitment_date_shamsi = fields.Char(
        string='Delivery Date (Shamsi)',
        compute='_compute_shamsi_dates'
    )

    expected_date_shamsi = fields.Char(
        string='Expected Date (Shamsi)',
        compute='_compute_shamsi_dates'
    )

    @api.depends('date_order', 'validity_date', 'commitment_date')
    def _compute_shamsi_dates(self):
        for order in self:
            # Convert date_order
            if order.date_order:
                g_date = fields.Date.to_date(order.date_order)
                j_date = jdatetime.date.fromgregorian(date=g_date)
                order.date_order_shamsi = j_date.strftime('%Y/%m/%d')
            else:
                order.date_order_shamsi = False

            # Convert validity_date
            if order.validity_date:
                g_date = fields.Date.to_date(order.validity_date)
                j_date = jdatetime.date.fromgregorian(date=g_date)
                order.validity_date_shamsi = j_date.strftime('%Y/%m/%d')
            else:
                order.validity_date_shamsi = False

            # Delivery Date
            if order.commitment_date:
                g_date = fields.Datetime.to_datetime(order.commitment_date).date()
                j_date = jdatetime.date.fromgregorian(date=g_date)
                order.commitment_date_shamsi = j_date.strftime('%Y/%m/%d')
            else:
                order.commitment_date_shamsi = False

            if order.expected_date:
                g_date = fields.Date.to_date(order.expected_date)
                j_date = jdatetime.date.fromgregorian(date=g_date)
                order.expected_date_shamsi = j_date.strftime('%Y/%m/%d')
            else:
                order.expected_date_shamsi = False