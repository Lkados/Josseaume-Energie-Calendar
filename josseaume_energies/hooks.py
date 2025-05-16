app_name = "josseaume_energies"
app_title = "Josseaume Energies"
app_publisher = "Josseaume Energies"
app_description = "Application pour Josseaume Energies ERP"
app_email = "info@josseaume-energies.com"
app_license = "MIT"

# Includes in <head>
# ------------------

# Retirer ou commenter les lignes existantes
# doctype_js = {"Event": "public/js/event_calendar.js"}
# doctype_list_js = {"Event": "public/js/event_calendar.js"}

# Utiliser le hook spécifique pour la vue Calendrier
doctype_calendar_js = {
    "Event": "public/js/event_calendar.js"
}

# Garder cette ligne pour inclure le CSS
app_include_css = ["/assets/josseaume_energies/css/calendar_custom.css"]

# include js, css files in header of web template
# web_include_css = "/assets/josseaume_energies/css/josseaume_energies.css"
# web_include_js = "/assets/josseaume_energies/js/josseaume_energies.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "josseaume_energies/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}


# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
#	"methods": "josseaume_energies.utils.jinja_methods",
#	"filters": "josseaume_energies.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "josseaume_energies.install.before_install"
# after_install = "josseaume_energies.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "josseaume_energies.uninstall.before_uninstall"
# after_uninstall = "josseaume_energies.uninstall.after_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "josseaume_energies.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
#	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
#	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
#	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
#	"*": {
#		"on_update": "method",
#		"on_cancel": "method",
#		"on_trash": "method"
#	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
#	"all": [
#		"josseaume_energies.tasks.all"
#	],
#	"daily": [
#		"josseaume_energies.tasks.daily"
#	],
#	"hourly": [
#		"josseaume_energies.tasks.hourly"
#	],
#	"weekly": [
#		"josseaume_energies.tasks.weekly"
#	],
#	"monthly": [
#		"josseaume_energies.tasks.monthly"
#	],
# }

# Testing
# -------

# before_tests = "josseaume_energies.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
#	"frappe.desk.doctype.event.event.get_events": "josseaume_energies.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
#	"Task": "josseaume_energies.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["josseaume_energies.utils.before_request"]
# after_request = ["josseaume_energies.utils.after_request"]

# Job Events
# ----------
# before_job = ["josseaume_energies.utils.before_job"]
# after_job = ["josseaume_energies.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
#	{
#		"doctype": "{doctype_1}",
#		"filter_by": "{filter_by}",
#		"redact_fields": ["{field_1}", "{field_2}"],
#		"partial": 1,
#	},
#	{
#		"doctype": "{doctype_2}",
#		"filter_by": "{filter_by}",
#		"partial": 1,
#	},
#	{
#		"doctype": "{doctype_3}",
#		"strict": False,
#	},
#	{
#		"doctype": "{doctype_4}"
#	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
#	"josseaume_energies.auth.validate"
# ]