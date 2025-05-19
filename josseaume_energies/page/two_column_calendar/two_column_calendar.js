frappe.pages["two_column_calendar"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Calendrier des Interventions",
		single_column: true,
	});

	// Ajouter des contrôles de filtrage
	let currentDate = frappe.datetime.get_today();
	let currentYear = parseInt(currentDate.split("-")[0]);
	let currentMonth = parseInt(currentDate.split("-")[1]);

	// Sélecteur de vue
	page.add_field({
		fieldtype: "Select",
		label: "Vue",
		fieldname: "view_type",
		options: "Jour\nSemaine\nMois",
		default: "Mois",
		change: function () {
			refreshView();
		},
	});

	// Sélecteur de date/mois
	page.add_field({
		fieldtype: "Date",
		label: "Date",
		fieldname: "selected_date",
		default: currentDate,
		change: function () {
			refreshView();
		},
	});

	// Autres filtres
	page.add_field({
		fieldtype: "Link",
		label: "Zone",
		fieldname: "territory",
		options: "Territory",
		change: function () {
			refreshView();
		},
	});

	page.add_field({
		fieldtype: "Link",
		label: "Intervenant",
		fieldname: "employee",
		options: "Employee",
		change: function () {
			refreshView();
		},
	});

	// Conteneur principal
	let calendar_container = $('<div class="calendar-container"></div>').appendTo(page.body);

	// Boutons de navigation
	page.add_inner_button(__("Aujourd'hui"), () => {
		page.fields_dict.selected_date.set_value(frappe.datetime.get_today());
		refreshView();
	});

	page.add_inner_button(__("Précédent"), () => {
		let view = page.fields_dict.view_type.get_value();
		let currentDate = frappe.datetime.str_to_obj(page.fields_dict.selected_date.get_value());

		if (view === "Jour") {
			currentDate.setDate(currentDate.getDate() - 1);
		} else if (view === "Semaine") {
			currentDate.setDate(currentDate.getDate() - 7);
		} else if (view === "Mois") {
			currentDate.setMonth(currentDate.getMonth() - 1);
		}

		page.fields_dict.selected_date.set_value(frappe.datetime.obj_to_str(currentDate));
		refreshView();
	});

	page.add_inner_button(__("Suivant"), () => {
		let view = page.fields_dict.view_type.get_value();
		let currentDate = frappe.datetime.str_to_obj(page.fields_dict.selected_date.get_value());

		if (view === "Jour") {
			currentDate.setDate(currentDate.getDate() + 1);
		} else if (view === "Semaine") {
			currentDate.setDate(currentDate.getDate() + 7);
		} else if (view === "Mois") {
			currentDate.setMonth(currentDate.getMonth() + 1);
		}

		page.fields_dict.selected_date.set_value(frappe.datetime.obj_to_str(currentDate));
		refreshView();
	});

	// Fonction pour rafraîchir la vue
	function refreshView() {
		let viewType = page.fields_dict.view_type.get_value();
		let selectedDate = page.fields_dict.selected_date.get_value();
		let territory = page.fields_dict.territory.get_value();
		let employee = page.fields_dict.employee.get_value();

		// Effacer le conteneur
		calendar_container.empty();

		if (viewType === "Mois") {
			// Vue mensuelle
			renderMonthView(selectedDate, territory, employee);
		} else if (viewType === "Jour") {
			// Vue journalière
			renderDayView(selectedDate, territory, employee);
		} else {
			// Vue hebdomadaire (par défaut)
			renderWeekView(selectedDate, territory, employee);
		}
	}

	// Afficher la vue mensuelle
	function renderMonthView(date, territory, employee) {
		let dateParts = date.split("-");
		let year = parseInt(dateParts[0]);
		let month = parseInt(dateParts[1]);

		// En-tête du mois
		let monthNames = [
			"Janvier",
			"Février",
			"Mars",
			"Avril",
			"Mai",
			"Juin",
			"Juillet",
			"Août",
			"Septembre",
			"Octobre",
			"Novembre",
			"Décembre",
		];
		let monthHeader = $(
			`<div class="month-header"><h3>${monthNames[month - 1]} ${year}</h3></div>`
		).appendTo(calendar_container);

		// Conteneur du calendrier mensuel
		let monthContainer = $('<div class="month-container"></div>').appendTo(calendar_container);

		// Récupérer les événements du mois
		frappe.call({
			method: "josseaume_energies.api.get_month_events",
			args: {
				month: month,
				year: year,
				territory: territory,
				employee: employee,
			},
			callback: function (r) {
				if (r.message) {
					let events = r.message;

					// En-tête des jours de la semaine
					let daysHeader = $('<div class="days-header"></div>').appendTo(monthContainer);
					let dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
					dayNames.forEach((day) => {
						$(`<div class="day-name">${day}</div>`).appendTo(daysHeader);
					});

					// Grille des jours
					let calendarGrid = $('<div class="calendar-grid"></div>').appendTo(
						monthContainer
					);

					// Obtenir le premier jour du mois et le nombre de jours
					let firstDay = new Date(year, month - 1, 1);
					let lastDay = new Date(year, month, 0);
					let numDays = lastDay.getDate();

					// Jour de la semaine du premier jour (0 = Dimanche)
					let startDayOfWeek = firstDay.getDay();
					if (startDayOfWeek === 0) startDayOfWeek = 7; // Convertir dimanche (0) en 7

					// Ajouter les cases vides pour les jours avant le premier du mois
					for (let i = 1; i < startDayOfWeek; i++) {
						$('<div class="day-cell empty"></div>').appendTo(calendarGrid);
					}

					// Ajouter les jours du mois
					for (let day = 1; day <= numDays; day++) {
						// Créer la cellule du jour
						let dayCell = $(`<div class="day-cell" data-date="${year}-${month
							.toString()
							.padStart(2, "0")}-${day.toString().padStart(2, "0")}">
                            <div class="day-number">${day}</div>
                            <div class="day-events"></div>
                        </div>`).appendTo(calendarGrid);

						// Ajouter la classe "today" si c'est aujourd'hui
						let today = new Date();
						if (
							year === today.getFullYear() &&
							month === today.getMonth() + 1 &&
							day === today.getDate()
						) {
							dayCell.addClass("today");
						}

						// Trouver les événements pour ce jour
						let dayEvents = events.filter((event) => {
							let eventDate = new Date(event.starts_on);
							return (
								eventDate.getDate() === day &&
								eventDate.getMonth() === month - 1 &&
								eventDate.getFullYear() === year
							);
						});

						// Ajouter les événements à la cellule
						let dayEventsContainer = dayCell.find(".day-events");
						dayEvents.forEach((event) => {
							// Formater l'heure
							let startTime = new Date(event.starts_on);
							let hours = startTime.getHours().toString().padStart(2, "0");
							let minutes = startTime.getMinutes().toString().padStart(2, "0");
							let timeStr = `${hours}:${minutes}`;

							// Déterminer le type d'événement pour la couleur
							let eventClass = "";
							if (event.subject.includes("EPGZ")) {
								eventClass = "event-type-epgz";
							} else if (event.subject.includes("Entretien")) {
								eventClass = "event-type-maintenance";
							} else {
								eventClass = "event-type-service";
							}

							// Créer l'élément d'événement
							let $event =
								$(`<div class="calendar-event ${eventClass}" data-event="${event.name}">
                                <span class="event-time">${timeStr}</span>
                                <span class="event-title">${event.subject}</span>
                            </div>`).appendTo(dayEventsContainer);

							// Ajouter l'interaction au clic
							$event.on("click", function () {
								frappe.set_route("Form", "Event", event.name);
							});
						});
					}

					// Si aucun événement n'est trouvé, afficher un message
					if (events.length === 0) {
						$('<div class="no-events">Aucun événement pour ce mois</div>').appendTo(
							monthContainer
						);
					}
				} else {
					$('<div class="no-events">Aucun événement trouvé</div>').appendTo(
						monthContainer
					);
				}
			},
		});
	}

	// Afficher la vue journalière
	function renderDayView(date, territory, employee) {
		// Utiliser la vue jour existante de Frappe
		frappe.set_route("List", "Event", "Calendar", {
			start: date,
			end: date,
			filters: JSON.stringify(buildFilters(territory, employee)),
		});
	}

	// Afficher la vue hebdomadaire
	function renderWeekView(date, territory, employee) {
		// Obtenir le premier et dernier jour de la semaine
		let currentDate = frappe.datetime.str_to_obj(date);
		let day = currentDate.getDay(); // 0 = dimanche, 1-6 = lundi-samedi
		if (day === 0) day = 7; // Convertir dimanche (0) en 7

		let diff = currentDate.getDate() - day + 1; // +1 car on commence la semaine le lundi
		let firstDay = new Date(currentDate.setDate(diff));
		let lastDay = new Date(firstDay);
		lastDay.setDate(lastDay.getDate() + 6);

		// Utiliser la vue semaine existante de Frappe
		frappe.set_route("List", "Event", "Calendar", {
			start: frappe.datetime.obj_to_str(firstDay),
			end: frappe.datetime.obj_to_str(lastDay),
			filters: JSON.stringify(buildFilters(territory, employee)),
		});
	}

	// Construire les filtres pour les vues existantes
	function buildFilters(territory, employee) {
		let filters = [];

		if (territory) {
			filters.push(["subject", "like", `%${territory}%`]);
		}

		if (employee) {
			// Note: ce filtre ne fonctionnera pas directement pour les participants
			// car Frappe ne peut pas filtrer sur des tables enfants par défaut
			filters.push(["owner", "=", employee]);
		}

		return filters;
	}

	// Initialiser la vue
	refreshView();
};
