from odoo import models, fields

class HrEmployee(models.Model):
    _inherit = 'hr.employee'

    allowed_product_categ_ids = fields.Many2many(
        'product.category',
        string='Allowed Product Categories'
    )
