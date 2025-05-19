frappe.pages["two_column_calendar"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Calendrier des Interventions",
		single_column: true,
	});

	// État global
	let currentDate = new Date();
	let currentYear = currentDate.getFullYear();
	let currentMonth = currentDate.getMonth(); // 0-11

	// Ajouter des contrôles
	page.add_field({
		fieldtype: "Select",
		label: "Vue",
		fieldname: "view_type",
		options: "Mois\nSemaine\nJour",
		default: "Mois",
		change: function () {
			refreshCalendar();
		},
	});

	page.add_field({
		fieldtype: "Link",
		label: "Zone",
		fieldname: "territory",
		options: "Territory",
		change: function () {
			refreshCalendar();
		},
	});

	page.add_field({
		fieldtype: "Link",
		label: "Intervenant",
		fieldname: "employee",
		options: "Employee",
		change: function () {
			refreshCalendar();
		},
	});

	// Conteneur de calendrier
	let calendarContainer = $('<div class="custom-calendar-container"></div>').appendTo(page.body);

	// Navigation
	page.add_inner_button(__("Aujourd'hui"), () => {
		currentDate = new Date();
		currentYear = currentDate.getFullYear();
		currentMonth = currentDate.getMonth();
		refreshCalendar();
	});

	page.add_inner_button(__("Précédent"), () => {
		const viewType = page.fields_dict.view_type.get_value();

		if (viewType === "Jour") {
			currentDate.setDate(currentDate.getDate() - 1);
		} else if (viewType === "Semaine") {
			currentDate.setDate(currentDate.getDate() - 7);
		} else {
			currentMonth--;
			if (currentMonth < 0) {
				currentMonth = 11;
				currentYear--;
			}
		}

		refreshCalendar();
	});

	page.add_inner_button(__("Suivant"), () => {
		const viewType = page.fields_dict.view_type.get_value();

		if (viewType === "Jour") {
			currentDate.setDate(currentDate.getDate() + 1);
		} else if (viewType === "Semaine") {
			currentDate.setDate(currentDate.getDate() + 7);
		} else {
			currentMonth++;
			if (currentMonth > 11) {
				currentMonth = 0;
				currentYear++;
			}
		}

		refreshCalendar();
	});

	// Fonction principale pour rafraîchir le calendrier
	function refreshCalendar() {
		const viewType = page.fields_dict.view_type.get_value();
		const territory = page.fields_dict.territory.get_value();
		const employee = page.fields_dict.employee.get_value();

		calendarContainer.empty();

		if (viewType === "Jour") {
			renderDayView(currentDate, territory, employee);
		} else if (viewType === "Semaine") {
			renderWeekView(currentDate, territory, employee);
		} else {
			renderMonthView(currentYear, currentMonth, territory, employee);
		}
	}

	// Rendu de la vue mensuelle
	function renderMonthView(year, month, territory, employee) {
		// Créer l'en-tête du calendrier
		const monthNames = [
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

		const calendarHeader = $(`
            <div class="calendar-header">
                <h2>${monthNames[month]} ${year}</h2>
            </div>
        `).appendTo(calendarContainer);

		// Créer la grille de jours de la semaine
		const daysOfWeek = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

		const weekdaysHeader = $('<div class="weekdays-header"></div>').appendTo(
			calendarContainer
		);

		daysOfWeek.forEach((day) => {
			$(`<div class="weekday">${day}</div>`).appendTo(weekdaysHeader);
		});

		// Créer la grille du calendrier
		const calendarGrid = $('<div class="calendar-grid"></div>').appendTo(calendarContainer);

		// Obtenir les dates du mois
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();

		// Calculer le jour de la semaine du premier jour (0 = Dimanche, 1-6 = Lundi-Samedi)
		let firstDayOfWeek = firstDay.getDay();
		// Convertir dimanche (0) en 7 pour notre grille qui commence par lundi
		if (firstDayOfWeek === 0) firstDayOfWeek = 7;

		// Ajouter les jours vides avant le premier jour du mois
		for (let i = 1; i < firstDayOfWeek; i++) {
			$('<div class="calendar-day empty"></div>').appendTo(calendarGrid);
		}

		// Afficher le message de chargement
		const loadingMessage = $(
			'<div class="loading-message">Chargement des événements...</div>'
		).appendTo(calendarContainer);

		// Récupérer les événements pour ce mois
		frappe.call({
			method: "josseaume_energies.api.get_calendar_events",
			args: {
				year: year,
				month: month + 1, // API attend 1-12, JS utilise 0-11
				territory: territory,
				employee: employee,
			},
			callback: function (r) {
				loadingMessage.remove();

				if (r.message) {
					const events = r.message;

					// Créer un objet pour organiser les événements par jour
					const eventsByDay = {};

					events.forEach((event) => {
						const eventDate = new Date(event.starts_on);
						const eventDay = eventDate.getDate();

						if (!eventsByDay[eventDay]) {
							eventsByDay[eventDay] = [];
						}

						eventsByDay[eventDay].push(event);
					});

					// Créer les jours du mois avec leurs événements
					for (let day = 1; day <= daysInMonth; day++) {
						const isToday =
							new Date().getDate() === day &&
							new Date().getMonth() === month &&
							new Date().getFullYear() === year;

						const dayCell = $(`
                            <div class="calendar-day ${isToday ? "today" : ""}">
                                <div class="day-header">
                                    <span class="day-number">${day}</span>
                                </div>
                                <div class="day-events"></div>
                            </div>
                        `).appendTo(calendarGrid);

						// Ajouter les événements de ce jour
						const dayEvents = eventsByDay[day] || [];
						const eventsContainer = dayCell.find(".day-events");

						if (dayEvents.length > 0) {
							// Trier les événements par heure
							dayEvents.sort(
								(a, b) => new Date(a.starts_on) - new Date(b.starts_on)
							);

							dayEvents.forEach((event) => {
								// Formater l'heure
								const eventTime = new Date(event.starts_on);
								const hours = eventTime.getHours().toString().padStart(2, "0");
								const minutes = eventTime.getMinutes().toString().padStart(2, "0");

								// Déterminer la classe de couleur
								let eventClass = "";
								if (event.subject.includes("Entretien")) {
									eventClass = "event-entretien";
								} else if (event.subject.includes("EPGZ")) {
									eventClass = "event-epgz";
								} else {
									eventClass = "event-default";
								}

								// Créer l'élément d'événement
								const eventElement = $(`
                                    <div class="event ${eventClass}" data-event-id="${event.name}">
                                        <div class="event-time">${hours}:${minutes}</div>
                                        <div class="event-title">${event.subject}</div>
                                    </div>
                                `).appendTo(eventsContainer);

								// Ajouter l'interaction au clic
								eventElement.on("click", function () {
									frappe.set_route("Form", "Event", event.name);
								});
							});
						}
					}

					// Si aucun événement n'est trouvé pour le mois
					if (events.length === 0) {
						$(
							'<div class="no-events-message">Aucun événement pour ce mois</div>'
						).appendTo(calendarContainer);
					}
				} else {
					$(
						'<div class="error-message">Erreur lors du chargement des événements</div>'
					).appendTo(calendarContainer);
				}
			},
		});
	}

	// Rendu de la vue hebdomadaire
	function renderWeekView(date, territory, employee) {
		// Obtenir le premier jour de la semaine (lundi)
		const current = new Date(date);
		const day = current.getDay(); // 0-6 (dim-sam)
		const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour commencer le lundi

		const monday = new Date(current.setDate(diff));
		const sunday = new Date(monday);
		sunday.setDate(monday.getDate() + 6);

		// Formatage des dates pour l'affichage
		const formatDate = (date) => {
			return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
				.toString()
				.padStart(2, "0")}`;
		};

		// Créer l'en-tête
		const weekHeader = $(`
            <div class="calendar-header">
                <h2>Semaine du ${formatDate(monday)} au ${formatDate(sunday)}</h2>
            </div>
        `).appendTo(calendarContainer);

		// Créer la structure de la semaine
		const weekContainer = $('<div class="week-container"></div>').appendTo(calendarContainer);

		// En-tête des jours
		const daysHeader = $('<div class="week-days-header"></div>').appendTo(weekContainer);

		const daysOfWeek = [
			"Lundi",
			"Mardi",
			"Mercredi",
			"Jeudi",
			"Vendredi",
			"Samedi",
			"Dimanche",
		];

		// Créer les colonnes pour chaque jour
		for (let i = 0; i < 7; i++) {
			const dayDate = new Date(monday);
			dayDate.setDate(monday.getDate() + i);

			const isToday =
				new Date().getDate() === dayDate.getDate() &&
				new Date().getMonth() === dayDate.getMonth() &&
				new Date().getFullYear() === dayDate.getFullYear();

			$(`
                <div class="week-day-header ${isToday ? "today" : ""}">
                    <div class="day-name">${daysOfWeek[i]}</div>
                    <div class="day-date">${formatDate(dayDate)}</div>
                </div>
            `).appendTo(daysHeader);
		}

		// Container pour les événements
		const weekGrid = $('<div class="week-grid"></div>').appendTo(weekContainer);

		// Créer les colonnes des jours pour les événements
		for (let i = 0; i < 7; i++) {
			const dayDate = new Date(monday);
			dayDate.setDate(monday.getDate() + i);

			const isToday =
				new Date().getDate() === dayDate.getDate() &&
				new Date().getMonth() === dayDate.getMonth() &&
				new Date().getFullYear() === dayDate.getFullYear();

			$(`
                <div class="week-day-column ${isToday ? "today" : ""}">
                    <div class="day-events-container" id="day-${i}"></div>
                </div>
            `).appendTo(weekGrid);
		}

		// Afficher le message de chargement
		const loadingMessage = $(
			'<div class="loading-message">Chargement des événements...</div>'
		).appendTo(calendarContainer);

		// Récupérer les événements pour cette semaine
		frappe.call({
			method: "josseaume_energies.api.get_week_events",
			args: {
				start_date: frappe.datetime.obj_to_str(monday),
				end_date: frappe.datetime.obj_to_str(sunday),
				territory: territory,
				employee: employee,
			},
			callback: function (r) {
				loadingMessage.remove();

				if (r.message) {
					const events = r.message;

					// Organiser les événements par jour de la semaine
					const eventsByDay = Array(7)
						.fill()
						.map(() => []);

					events.forEach((event) => {
						const eventDate = new Date(event.starts_on);
						const dayOfWeek = (eventDate.getDay() + 6) % 7; // Convertir 0-6 (dim-sam) à 0-6 (lun-dim)
						eventsByDay[dayOfWeek].push(event);
					});

					// Ajouter les événements à chaque colonne
					for (let i = 0; i < 7; i++) {
						const dayEvents = eventsByDay[i];
						const dayContainer = $(`#day-${i}`);

						if (dayEvents.length > 0) {
							// Trier par heure
							dayEvents.sort(
								(a, b) => new Date(a.starts_on) - new Date(b.starts_on)
							);

							dayEvents.forEach((event) => {
								// Formater l'heure
								const eventTime = new Date(event.starts_on);
								const hours = eventTime.getHours().toString().padStart(2, "0");
								const minutes = eventTime.getMinutes().toString().padStart(2, "0");

								// Déterminer la classe de couleur
								let eventClass = "";
								if (event.subject.includes("Entretien")) {
									eventClass = "event-entretien";
								} else if (event.subject.includes("EPGZ")) {
									eventClass = "event-epgz";
								} else {
									eventClass = "event-default";
								}

								// Créer l'élément d'événement
								const eventElement = $(`
                                    <div class="week-event ${eventClass}" data-event-id="${event.name}">
                                        <div class="event-time">${hours}:${minutes}</div>
                                        <div class="event-title">${event.subject}</div>
                                    </div>
                                `).appendTo(dayContainer);

								// Ajouter l'interaction au clic
								eventElement.on("click", function () {
									frappe.set_route("Form", "Event", event.name);
								});
							});
						} else {
							$('<div class="no-events">Aucun événement</div>').appendTo(
								dayContainer
							);
						}
					}

					// Si aucun événement n'est trouvé pour la semaine
					if (events.length === 0) {
						$(
							'<div class="no-events-message">Aucun événement pour cette semaine</div>'
						).appendTo(calendarContainer);
					}
				} else {
					$(
						'<div class="error-message">Erreur lors du chargement des événements</div>'
					).appendTo(calendarContainer);
				}
			},
		});
	}

	// Rendu de la vue journalière
	function renderDayView(date, territory, employee) {
		const formatDate = (d) => {
			return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
				.toString()
				.padStart(2, "0")}/${d.getFullYear()}`;
		};

		// Créer l'en-tête
		const dayHeader = $(`
            <div class="calendar-header">
                <h2>Journée du ${formatDate(date)}</h2>
            </div>
        `).appendTo(calendarContainer);

		// Créer les conteneurs matin et après-midi
		const dayContainer = $(`
            <div class="day-view-container">
                <div class="day-section morning">
                    <div class="section-header">Matin</div>
                    <div class="section-events" id="morning-events"></div>
                </div>
                <div class="day-section afternoon">
                    <div class="section-header">Après-midi</div>
                    <div class="section-events" id="afternoon-events"></div>
                </div>
            </div>
        `).appendTo(calendarContainer);

		// Récupérer les événements pour cette journée
		const dateStr = frappe.datetime.obj_to_str(date);

		// Afficher le message de chargement
		const loadingMessage = $(
			'<div class="loading-message">Chargement des événements...</div>'
		).appendTo(calendarContainer);

		frappe.call({
			method: "josseaume_energies.api.get_day_events",
			args: {
				date: dateStr,
				territory: territory,
				employee: employee,
			},
			callback: function (r) {
				loadingMessage.remove();

				if (r.message) {
					const events = r.message;
					const morningEvents = [];
					const afternoonEvents = [];

					// Séparer les événements du matin et de l'après-midi
					events.forEach((event) => {
						const eventTime = new Date(event.starts_on);
						if (eventTime.getHours() < 12) {
							morningEvents.push(event);
						} else {
							afternoonEvents.push(event);
						}
					});

					// Trier par heure
					morningEvents.sort((a, b) => new Date(a.starts_on) - new Date(b.starts_on));
					afternoonEvents.sort((a, b) => new Date(a.starts_on) - new Date(b.starts_on));

					// Remplir la section matin
					const morningContainer = $("#morning-events");
					if (morningEvents.length > 0) {
						morningEvents.forEach((event) => renderEventCard(event, morningContainer));
					} else {
						$('<div class="no-events">Aucun événement</div>').appendTo(
							morningContainer
						);
					}

					// Remplir la section après-midi
					const afternoonContainer = $("#afternoon-events");
					if (afternoonEvents.length > 0) {
						afternoonEvents.forEach((event) =>
							renderEventCard(event, afternoonContainer)
						);
					} else {
						$('<div class="no-events">Aucun événement</div>').appendTo(
							afternoonContainer
						);
					}

					// Si aucun événement n'est trouvé pour la journée
					if (events.length === 0) {
						$(
							'<div class="no-events-message">Aucun événement pour cette journée</div>'
						).appendTo(calendarContainer);
					}
				} else {
					$(
						'<div class="error-message">Erreur lors du chargement des événements</div>'
					).appendTo(calendarContainer);
				}
			},
		});
	}

	// Fonction helper pour rendre une carte d'événement
	function renderEventCard(event, container) {
		// Formater l'heure
		const startTime = new Date(event.starts_on);
		const endTime = new Date(event.ends_on);

		const formatTime = (time) => {
			return `${time.getHours().toString().padStart(2, "0")}:${time
				.getMinutes()
				.toString()
				.padStart(2, "0")}`;
		};

		// Déterminer la classe de couleur
		let eventClass = "";
		if (event.subject.includes("Entretien")) {
			eventClass = "event-entretien";
		} else if (event.subject.includes("EPGZ")) {
			eventClass = "event-epgz";
		} else {
			eventClass = "event-default";
		}

		// Créer la carte
		const card = $(`
            <div class="event-card ${eventClass}" data-event-id="${event.name}">
                <div class="card-header">
                    <span class="event-time">${formatTime(startTime)} - ${formatTime(
			endTime
		)}</span>
                    <span class="event-title">${event.subject}</span>
                </div>
                <div class="card-details">
                    ${renderParticipants(event)}
                </div>
            </div>
        `).appendTo(container);

		// Ajouter l'interaction au clic
		card.on("click", function () {
			frappe.set_route("Form", "Event", event.name);
		});

		return card;
	}

	// Fonction helper pour rendre les participants
	function renderParticipants(event) {
		if (!event.event_participants || event.event_participants.length === 0) {
			return "";
		}

		let html = '<div class="participants">';

		event.event_participants.forEach((participant) => {
			if (participant.reference_doctype === "Customer") {
				html += `<div class="participant customer"><i class="fa fa-user"></i> ${participant.reference_docname}</div>`;
			} else if (participant.reference_doctype === "Employee") {
				html += `<div class="participant employee"><i class="fa fa-user-tie"></i> ${participant.reference_docname}</div>`;
			}
		});

		html += "</div>";
		return html;
	}

	// Initialiser le calendrier
	refreshCalendar();
};
