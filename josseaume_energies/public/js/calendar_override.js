frappe.views.CalendarView = class CustomCalendarView extends frappe.views.CalendarView {
	setup_options(defaults) {
		super.setup_options(defaults);
		// Par exemple, forcer la vue quotidienne au lieu de la vue mensuelle
		defaults.defaultView = "agendaDay";
	}
	render() {
		// Appeler le rendu standard, puis ajouter vos colonnes personnalisées
		super.render();
		// Ici, vous pouvez appeler personalizeCalendar() ou modifier le DOM
	}
};
