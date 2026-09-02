{
    'name': 'Sale Shamsi Dates',
    'version': '1.0',
    'category': 'Sales',
    'summary': 'Adds Shamsi dates to Sale Order PDF and Customer Portal',
     'author': 'SiPanel',
    'license': 'LGPL-3',
    'depends': ['sale', 'portal', 'website', 'sale_stock', 'mail', 'calendar'],
    'data': [
        # PDF Report Customization        
        'views/sale_report_templates.xml',

        # Portal Customization
        'views/sale_portal_templates.xml',
        
        # Form View (Jalali beside Gregorian)
        'views/sale_order_form_inherit.xml',

        'views/calendar_event_jalali.xml',

        # 'views/sale_order_report_override.xml'


        

    ],
    'installable': True,
    'application': False,
    'auto_install': False,
    'assets': {
    'web.assets_frontend': [
        'sale_shamsi_report/static/src/css/portal_fonts.css',
        'sale_shamsi_report/static/src/css/portal_fa.css',
    ],
    # 'web.assets_portal': [
    #     'sale_shamsi_report/static/src/css/portal_fonts.css',
    #     'sale_shamsi_report/static/src/css/portal_fa.css',
    # ],

    'web.report_assets_common': [
            "sale_shamsi_report/static/src/css/report_fonts.css",
    ],
    'web.assets_backend': [

        'sale_shamsi_report/static/src/css/backend_fonts.css',
        'sale_shamsi_report/static/src/css/calendar_jalali.css',
        'sale_shamsi_report/static/lib/jalaali-js.js',
        'sale_shamsi_report/static/src/js/jalali_service.js',

        'sale_shamsi_report/static/src/js/calendar_jalali_patch.js',
        'sale_shamsi_report/static/src/js/discuss_jalali_patch.js',

        'sale_shamsi_report/static/src/js/smsmarketing_jalali_patch.js',
        'sale_shamsi_report/static/src/js/purchase1_jalali_patch.js',



        'sale_shamsi_report/static/src/js/patch_registry.js',
        'sale_shamsi_report/static/src/js/patch_runner.js',
        'sale_shamsi_report/static/src/js/patch_observer.js',
        'sale_shamsi_report/static/src/js/patch_startup.js',

    ],
  
},
}
