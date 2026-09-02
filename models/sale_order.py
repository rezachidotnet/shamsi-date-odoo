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

    def _date_to_shamsi(self, value):
        if not value:
            return False
        g_date = fields.Date.to_date(value)
        return jdatetime.date.fromgregorian(date=g_date).strftime('%Y/%m/%d')

    def _datetime_to_shamsi(self, value):
        if not value:
            return False
        g_datetime = fields.Datetime.to_datetime(value)
        local_datetime = fields.Datetime.context_timestamp(self, g_datetime)
        return self._date_to_shamsi(local_datetime.date())

    @api.depends('date_order', 'validity_date', 'commitment_date', 'expected_date')
    def _compute_shamsi_dates(self):
        for order in self:
            order.date_order_shamsi = order._datetime_to_shamsi(order.date_order)
            order.validity_date_shamsi = order._date_to_shamsi(order.validity_date)
            order.commitment_date_shamsi = order._datetime_to_shamsi(order.commitment_date)
            order.expected_date_shamsi = order._datetime_to_shamsi(order.expected_date)
