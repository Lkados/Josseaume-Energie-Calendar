frappe.pages['two_column_calendar'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Calendrier des interventions',
		single_column: true
	});
}