frappe.pages["two_column_calendar"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Calendrier des Interventions",
		single_column: true,
	});

	// Ajouter les boutons de contrôle
	page.add_field({
		fieldtype: "Date",
		label: "Date",
		fieldname: "selected_date",
		default: frappe.datetime.get_today(),
		change: function () {
			calendar.refresh();
		},
	});

	// Ajouter des filtres supplémentaires si nécessaire
	page.add_field({
		fieldtype: "Link",
		label: "Zone",
		fieldname: "territory",
		options: "Territory",
		change: function () {
			calendar.refresh();
		},
	});

	page.add_field({
		fieldtype: "Link",
		label: "Intervenant",
		fieldname: "employee",
		options: "Employee",
		change: function () {
			calendar.refresh();
		},
	});

	// Créer le conteneur du calendrier
	let calendar_container = $('<div class="two_column_calendar-container"></div>').appendTo(
		page.body
	);

	// Initialiser le calendrier
	let calendar = new TwoColumnCalendar({
		wrapper: calendar_container,
		page: page,
	});

	// Ajouter des boutons de navigation
	page.add_inner_button(__("Aujourd'hui"), () => {
		page.fields_dict.selected_date.set_value(frappe.datetime.get_today());
		calendar.refresh();
	});

	page.add_inner_button(__("Précédent"), () => {
		let current_date = frappe.datetime.str_to_obj(page.fields_dict.selected_date.get_value());
		let previous_date = frappe.datetime.add_days(current_date, -1);
		page.fields_dict.selected_date.set_value(frappe.datetime.obj_to_str(previous_date));
		calendar.refresh();
	});

	page.add_inner_button(__("Suivant"), () => {
		let current_date = frappe.datetime.str_to_obj(page.fields_dict.selected_date.get_value());
		let next_date = frappe.datetime.add_days(current_date, 1);
		page.fields_dict.selected_date.set_value(frappe.datetime.obj_to_str(next_date));
		calendar.refresh();
	});

	// Attacher l'instance du calendrier à la page
	page.calendar = calendar;
};

class TwoColumnCalendar {
	constructor(opts) {
		$.extend(this, opts);
		this.make();
	}

	make() {
		const me = this;

		// Créer la structure du calendrier
		this.wrapper.html(`
            <div class="calendar-header">
                <h3 class="date-display"></h3>
            </div>
            <div class="calendar-body">
                <div class="calendar-columns">
                    <div class="calendar-column morning">
                        <div class="column-header">Matin</div>
                        <div class="column-events"></div>
                    </div>
                    <div class="calendar-column afternoon">
                        <div class="column-header">Après-midi</div>
                        <div class="column-events"></div>
                    </div>
                </div>
            </div>
        `);

		// Initialiser les éléments
		this.$date_display = this.wrapper.find(".date-display");
		this.$morning_events = this.wrapper.find(".morning .column-events");
		this.$afternoon_events = this.wrapper.find(".afternoon .column-events");

		// Charger les événements initiaux
		this.refresh();
	}

	refresh() {
		const me = this;
		const date = this.page.fields_dict.selected_date.get_value();
		const territory = this.page.fields_dict.territory.get_value();
		const employee = this.page.fields_dict.employee.get_value();

		// Mettre à jour l'affichage de la date
		const formatted_date = frappe.datetime.str_to_user(date);
		this.$date_display.text(formatted_date);

		// Vider les conteneurs d'événements
		this.$morning_events.empty();
		this.$afternoon_events.empty();

		// Afficher un indicateur de chargement
		let morning_loading = $('<div class="text-muted">Chargement...</div>').appendTo(
			this.$morning_events
		);
		let afternoon_loading = $('<div class="text-muted">Chargement...</div>').appendTo(
			this.$afternoon_events
		);

		// Charger les événements depuis le serveur
		frappe.call({
			method: "josseaume_energies.api.get_day_events",
			args: {
				date: date,
				territory: territory,
				employee: employee,
			},
			callback: function (r) {
				// Supprimer les indicateurs de chargement
				morning_loading.remove();
				afternoon_loading.remove();

				if (r.message) {
					// Afficher les événements
					me.display_events(r.message);
				}
			},
		});
	}

	display_events(events) {
		const me = this;

		if (!events.length) {
			this.$morning_events.html('<div class="text-muted">Aucun événement</div>');
			this.$afternoon_events.html('<div class="text-muted">Aucun événement</div>');
			return;
		}

		// Trier les événements par période (matin/après-midi)
		let morning_events = [];
		let afternoon_events = [];

		events.forEach(function (event) {
			// Déterminer si l'événement est le matin ou l'après-midi
			const event_hour = frappe.datetime.str_to_obj(event.starts_on).getHours();

			if (event_hour < 12) {
				morning_events.push(event);
			} else {
				afternoon_events.push(event);
			}
		});

		// Trier les événements par heure de début
		morning_events.sort((a, b) => new Date(a.starts_on) - new Date(b.starts_on));
		afternoon_events.sort((a, b) => new Date(a.starts_on) - new Date(b.starts_on));

		// Afficher les événements du matin
		if (morning_events.length) {
			morning_events.forEach((event) => {
				this.create_event_card(event).appendTo(this.$morning_events);
			});
		} else {
			this.$morning_events.html('<div class="text-muted">Aucun événement</div>');
		}

		// Afficher les événements de l'après-midi
		if (afternoon_events.length) {
			afternoon_events.forEach((event) => {
				this.create_event_card(event).appendTo(this.$afternoon_events);
			});
		} else {
			this.$afternoon_events.html('<div class="text-muted">Aucun événement</div>');
		}
	}

	create_event_card(event) {
		// Formater les heures
		const start_time = frappe.datetime.str_to_obj(event.starts_on);
		const end_time = frappe.datetime.str_to_obj(event.ends_on);

		const formatted_start = frappe.datetime.get_time(start_time);
		const formatted_end = frappe.datetime.get_time(end_time);

		// Créer la carte d'événement
		const $card = $(`
            <div class="event-card" data-event="${event.name}" style="border-left: 4px solid ${
			event.color || "#1976D2"
		}">
                <div class="event-header">
                    <span class="event-time">${formatted_start} - ${formatted_end}</span>
                    <span class="event-subject">${event.subject}</span>
                </div>
                <div class="event-details">
                    ${this.get_participants_html(event)}
                </div>
            </div>
        `);

		// Ajouter une interaction au clic
		$card.on("click", function () {
			frappe.set_route("Form", "Event", event.name);
		});

		return $card;
	}

	get_participants_html(event) {
		let html = "";

		if (event.event_participants && event.event_participants.length) {
			html += '<div class="participants">';

			event.event_participants.forEach(function (participant) {
				if (participant.reference_doctype === "Customer") {
					html += `<div class="participant customer"><i class="fa fa-user"></i> ${participant.reference_docname}</div>`;
				} else if (participant.reference_doctype === "Employee") {
					html += `<div class="participant employee"><i class="fa fa-user-tie"></i> ${participant.reference_docname}</div>`;
				}
			});

			html += "</div>";
		}

		return html;
	}
}
