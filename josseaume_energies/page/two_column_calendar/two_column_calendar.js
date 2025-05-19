frappe.pages["two_column_calendar"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Calendrier des Interventions",
		single_column: true,
	});

	// Ajouter les filtres et contrôles
	page.add_field({
		fieldtype: "Select",
		label: "Vue",
		fieldname: "view_type",
		options: "Jour\nSemaine\nMois",
		default: "Semaine",
		change: function () {
			calendar.changeView(page.fields_dict.view_type.get_value().toLowerCase());
		},
	});

	page.add_field({
		fieldtype: "Date",
		label: "Date",
		fieldname: "selected_date",
		default: frappe.datetime.get_today(),
		change: function () {
			calendar.goToDate(page.fields_dict.selected_date.get_value());
		},
	});

	page.add_field({
		fieldtype: "Link",
		label: "Zone",
		fieldname: "territory",
		options: "Territory",
		change: function () {
			calendar.refetchEvents();
		},
	});

	page.add_field({
		fieldtype: "Link",
		label: "Intervenant",
		fieldname: "employee",
		options: "Employee",
		change: function () {
			calendar.refetchEvents();
		},
	});

	// Créer le conteneur du calendrier
	let calendar_container = $(
		'<div id="fullcalendar-container" style="height: calc(100vh - 200px);"></div>'
	).appendTo(page.body);

	// Ajouter des boutons de navigation
	page.add_inner_button(__("Aujourd'hui"), () => {
		calendar.today();
		page.fields_dict.selected_date.set_value(frappe.datetime.get_today());
	});

	page.add_inner_button(__("Précédent"), () => {
		calendar.prev();
		let newDate = calendar.getDate();
		page.fields_dict.selected_date.set_value(frappe.datetime.obj_to_str(newDate.toDate()));
	});

	page.add_inner_button(__("Suivant"), () => {
		calendar.next();
		let newDate = calendar.getDate();
		page.fields_dict.selected_date.set_value(frappe.datetime.obj_to_str(newDate.toDate()));
	});

	// Charger FullCalendar
	let calendar;
	frappe.require(
		[
			"assets/frappe/node_modules/fullcalendar/dist/fullcalendar.min.css",
			"assets/frappe/node_modules/fullcalendar/dist/fullcalendar.min.js",
		],
		function () {
			initializeCalendar();
		}
	);

	function initializeCalendar() {
		calendar = new FullCalendar.Calendar(document.getElementById("fullcalendar-container"), {
			header: false,
			plugins: ["dayGrid", "timeGrid", "interaction"],
			defaultView: "timeGridWeek",
			firstDay: 1, // Commence par lundi
			height: "auto",
			locale: "fr",
			timeZone: "local",
			slotDuration: "01:00:00", // Intervalles d'une heure
			slotLabelFormat: {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
			},
			businessHours: {
				daysOfWeek: [1, 2, 3, 4, 5], // Lun-Ven
				startTime: "08:00",
				endTime: "18:00",
			},
			nowIndicator: true,
			eventTimeFormat: {
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
			},
			events: function (info, successCallback, failureCallback) {
				// Récupérer la plage de dates
				const start = frappe.datetime.obj_to_str(info.start);
				const end = frappe.datetime.obj_to_str(info.end);
				const territory = page.fields_dict.territory.get_value();
				const employee = page.fields_dict.employee.get_value();

				frappe.call({
					method: "josseaume_energies.api.get_events_for_calendar",
					args: {
						start: start,
						end: end,
						territory: territory,
						employee: employee,
					},
					callback: function (r) {
						if (r.message) {
							// Transformer les événements au format FullCalendar
							const events = r.message.map((event) => {
								// Déterminer la couleur en fonction du type d'événement
								let backgroundColor;
								if (event.subject.includes("EPGZ")) {
									backgroundColor = "#FFA000"; // Ambre
								} else if (event.subject.includes("Entretien")) {
									backgroundColor = "#43A047"; // Vert
								} else {
									backgroundColor = "#1E88E5"; // Bleu
								}

								return {
									id: event.name,
									title: event.subject,
									start: event.starts_on,
									end: event.ends_on,
									allDay: event.all_day,
									backgroundColor: event.color || backgroundColor,
									borderColor: event.color || backgroundColor,
									extendedProps: {
										doctype: "Event",
										description: event.description || "",
										participants: event.event_participants || [],
									},
								};
							});
							successCallback(events);
						} else {
							successCallback([]);
						}
					},
				});
			},
			eventClick: function (info) {
				frappe.set_route("Form", "Event", info.event.id);
			},
			eventRender: function (info) {
				// Personnaliser l'affichage des événements
				let $ = jQuery;
				let element = $(info.el);

				// Ajouter les participants comme info-bulle
				let tooltip = "";
				if (
					info.event.extendedProps.participants &&
					info.event.extendedProps.participants.length
				) {
					tooltip += "<strong>Participants:</strong><br>";
					info.event.extendedProps.participants.forEach(function (participant) {
						tooltip += participant.reference_docname + "<br>";
					});
				}

				if (tooltip) {
					element.tooltip({
						title: tooltip,
						html: true,
						placement: "top",
						container: "body",
					});
				}
			},
			datesRender: function (info) {
				// Mettre à jour la date dans le champ de date lorsque la vue change
				let date = info.view.calendar.getDate();
				page.fields_dict.selected_date.set_value(
					frappe.datetime.obj_to_str(date.toDate())
				);
			},
		});

		calendar.render();
	}

	// Accès au calendrier depuis la page
	page.calendar = calendar;
};
