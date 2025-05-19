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

	// Cache pour stocker les noms des participants
	const participantNamesCache = {
		customers: {}, // { "CUSTOMER001": "Nom Client", ... }
		employees: {}, // { "EMP001": "Nom Employé", ... }
	};

	// Détection et gestion du thème pour ERPNext v15
	function applyTheme() {
		// Méthodes de détection pour ERPNext v15
		const isDarkTheme =
			$("body").hasClass("dark") ||
			(frappe.ui.theme && frappe.ui.theme.current_theme === "Dark") ||
			localStorage.getItem("desk_theme") === "Dark" ||
			(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);

		if (isDarkTheme && !$("body").hasClass("dark")) {
			$("body").addClass("dark");
		} else if (!isDarkTheme && $("body").hasClass("dark")) {
			$("body").removeClass("dark");
		}
	}

	// Observer les changements de thème
	function setupThemeObserver() {
		// Observer les changements de classe sur le body
		const observer = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				if (mutation.type === "attributes" && mutation.attributeName === "class") {
					applyTheme();
				}
			});
		});

		observer.observe(document.body, { attributes: true });

		// Observer les changements de préférences système
		if (window.matchMedia) {
			window
				.matchMedia("(prefers-color-scheme: dark)")
				.addEventListener("change", applyTheme);
		}

		// Pour ERPNext v15, suivre les changements de thème spécifiques
		$(document).on("theme-change", applyTheme);
	}

	// Appliquer le thème au chargement et configurer l'observateur
	applyTheme();
	setupThemeObserver();

	// Vérifier le thème périodiquement pour s'assurer qu'il reste synchronisé
	setInterval(applyTheme, 2000);

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
			renderTwoColumnDayView(currentDate, territory, employee);
		} else if (viewType === "Semaine") {
			renderWeekView(currentDate, territory, employee);
		} else {
			renderMonthView(currentYear, currentMonth, territory, employee);
		}
	}

	// Fonction pour récupérer les noms complets des participants
	async function fetchParticipantNames(participants) {
		if (!participants || !Array.isArray(participants)) {
			return { clientName: "", technicianName: "" };
		}

		let clientName = "";
		let technicianName = "";

		// Tableau pour stocker les promesses
		const fetchPromises = [];

		for (const participant of participants) {
			if (participant.reference_doctype === "Customer") {
				const customerId = participant.reference_docname;

				// Vérifier si le nom est déjà dans le cache
				if (participantNamesCache.customers[customerId]) {
					clientName = participantNamesCache.customers[customerId];
				} else {
					// Ajouter la promesse pour récupérer le nom du client
					const fetchCustomerPromise = new Promise((resolve) => {
						frappe.db.get_value("Customer", customerId, "customer_name", (r) => {
							if (r && r.message && r.message.customer_name) {
								participantNamesCache.customers[customerId] =
									r.message.customer_name;
								clientName = r.message.customer_name;
							} else {
								participantNamesCache.customers[customerId] = customerId; // Fallback au code
								clientName = customerId;
							}
							resolve();
						});
					});
					fetchPromises.push(fetchCustomerPromise);
				}
			} else if (participant.reference_doctype === "Employee") {
				const employeeId = participant.reference_docname;

				// Vérifier si le nom est déjà dans le cache
				if (participantNamesCache.employees[employeeId]) {
					technicianName = participantNamesCache.employees[employeeId];
				} else {
					// Ajouter la promesse pour récupérer le nom de l'employé
					const fetchEmployeePromise = new Promise((resolve) => {
						frappe.db.get_value("Employee", employeeId, "employee_name", (r) => {
							if (r && r.message && r.message.employee_name) {
								participantNamesCache.employees[employeeId] =
									r.message.employee_name;
								technicianName = r.message.employee_name;
							} else {
								participantNamesCache.employees[employeeId] = employeeId; // Fallback au code
								technicianName = employeeId;
							}
							resolve();
						});
					});
					fetchPromises.push(fetchEmployeePromise);
				}
			}
		}

		// Attendre que toutes les récupérations soient terminées
		if (fetchPromises.length > 0) {
			await Promise.all(fetchPromises);
		}

		return { clientName, technicianName };
	}

	// Fonction synchrone qui renvoie immédiatement les noms du cache ou les IDs si non trouvés
	function getParticipantNamesSync(participants) {
		if (!participants || !Array.isArray(participants)) {
			return { clientName: "", technicianName: "" };
		}

		let clientName = "";
		let technicianName = "";

		for (const participant of participants) {
			if (participant.reference_doctype === "Customer") {
				const customerId = participant.reference_docname;
				clientName = participantNamesCache.customers[customerId] || customerId;
			} else if (participant.reference_doctype === "Employee") {
				const employeeId = participant.reference_docname;
				technicianName = participantNamesCache.employees[employeeId] || employeeId;
			}
		}

		return { clientName, technicianName };
	}

	// Rendu de la vue journalière à deux colonnes
	function renderTwoColumnDayView(date, territory, employee) {
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

		// Créer le conteneur à deux colonnes
		const twoColumnContainer = $('<div class="two_column_calendar-container"></div>').appendTo(
			calendarContainer
		);

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
					console.log("Événements reçus:", events);

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

					// Charger tous les noms des participants en une seule fois
					const allParticipants = events.flatMap(
						(event) => event.event_participants || []
					);
					fetchParticipantNames(allParticipants).then(() => {
						// Ajouter les titres de section
						$('<div data-name="Matin">Matin</div>').appendTo(twoColumnContainer);

						// Ajouter les événements du matin
						if (morningEvents.length > 0) {
							morningEvents.forEach((event) =>
								renderTwoColumnEventCard(event, twoColumnContainer)
							);
						} else {
							$('<div class="no-events">Aucun événement le matin</div>').appendTo(
								twoColumnContainer
							);
						}

						// Ajouter la section après-midi
						$('<div data-name="Après-midi">Après-midi</div>').appendTo(
							twoColumnContainer
						);

						// Ajouter les événements de l'après-midi
						if (afternoonEvents.length > 0) {
							afternoonEvents.forEach((event) =>
								renderTwoColumnEventCard(event, twoColumnContainer)
							);
						} else {
							$(
								'<div class="no-events">Aucun événement l\'après-midi</div>'
							).appendTo(twoColumnContainer);
						}
					});

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

	// Fonction pour rendre une carte d'événement dans la vue à deux colonnes
	function renderTwoColumnEventCard(event, container) {
		// Déterminer la classe de couleur
		let eventClass = "";
		if (event.subject.includes("Entretien")) {
			eventClass = "event-entretien";
		} else if (event.subject.includes("EPGZ")) {
			eventClass = "event-epgz";
		} else {
			eventClass = "event-default";
		}

		// Récupérer les noms des participants depuis le cache
		const { clientName, technicianName } = getParticipantNamesSync(event.event_participants);

		// Créer la carte d'événement
		const eventCard = $(`
			<div class="${eventClass}" data-event-id="${event.name}">
				<span class="event-id">${event.name}</span>
				<span class="event-title">${event.subject}</span>
				${clientName ? `<div class="client-info"><i class="fa fa-user"></i> ${clientName}</div>` : ""}
				${
					technicianName
						? `<div class="technician-info"><i class="fa fa-user-tie"></i> ${technicianName}</div>`
						: ""
				}
			</div>
		`).appendTo(container);

		// Ajouter l'interaction au clic
		eventCard.on("click", function () {
			frappe.set_route("Form", "Event", event.name);
		});
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

		// Créer les cellules pour chaque jour du mois
		const dayCells = [];
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
					<div class="day-events" data-day="${day}"></div>
				</div>
			`).appendTo(calendarGrid);

			dayCells[day] = dayCell;
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

				if (r.message && r.message.length > 0) {
					const events = r.message;
					console.log("Événements du mois reçus:", events);

					// Organiser les événements par jour
					const eventsByDay = {};

					// Charger tous les noms des participants en une seule fois
					const allParticipants = events.flatMap(
						(event) => event.event_participants || []
					);
					fetchParticipantNames(allParticipants).then(() => {
						events.forEach((event) => {
							try {
								const eventDate = new Date(event.starts_on);
								console.log("Date brute:", event.starts_on);
								console.log("Date parsée:", eventDate);

								// Obtenir le jour du mois (1-31)
								const day = eventDate.getDate();
								console.log("Jour extrait:", day);

								if (!eventsByDay[day]) {
									eventsByDay[day] = [];
								}
								eventsByDay[day].push(event);
							} catch (error) {
								console.error(
									"Erreur lors du traitement de l'événement:",
									error,
									event
								);
							}
						});

						// Parcourir chaque jour et ajouter les événements
						for (let day = 1; day <= daysInMonth; day++) {
							const dayEvents = eventsByDay[day] || [];
							console.log(`Jour ${day}:`, dayEvents);

							if (dayEvents.length > 0) {
								const dayCell = dayCells[day];
								if (!dayCell) {
									console.error(`Cellule pour le jour ${day} non trouvée`);
									continue;
								}

								const eventsContainer = dayCell.find(".day-events");

								// Trier les événements par heure
								dayEvents.sort(
									(a, b) => new Date(a.starts_on) - new Date(b.starts_on)
								);

								// Ajouter chaque événement à la cellule du jour
								dayEvents.forEach((event) => {
									// Récupérer les noms des participants
									const { clientName, technicianName } = getParticipantNamesSync(
										event.event_participants
									);

									// Formater l'heure
									const eventTime = new Date(event.starts_on);
									const hours = eventTime.getHours().toString().padStart(2, "0");
									const minutes = eventTime
										.getMinutes()
										.toString()
										.padStart(2, "0");

									// Déterminer la classe de couleur
									let eventClass = "event-default";
									if (event.subject.includes("Entretien")) {
										eventClass = "event-entretien";
									} else if (event.subject.includes("EPGZ")) {
										eventClass = "event-epgz";
									}

									// Créer l'élément d'événement
									const eventElement = $(`
										<div class="event ${eventClass}" data-event-id="${event.name}">
											<div class="event-title">${event.subject}</div>
											${clientName ? `<div class="client-info"><i class="fa fa-user"></i> ${clientName}</div>` : ""}
										</div>
									`).appendTo(eventsContainer);

									// Ajouter l'interaction au clic
									eventElement.on("click", function () {
										frappe.set_route("Form", "Event", event.name);
									});
								});
							}
						}
					});
				} else {
					$(
						'<div class="no-events-message">Aucun événement pour ce mois</div>'
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
					console.log("Événements de la semaine reçus:", events);

					// Charger tous les noms des participants en une seule fois
					const allParticipants = events.flatMap(
						(event) => event.event_participants || []
					);
					fetchParticipantNames(allParticipants).then(() => {
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
									// Récupérer les noms des participants du cache
									const { clientName, technicianName } = getParticipantNamesSync(
										event.event_participants
									);

									// Déterminer la classe de couleur
									let eventClass = "event-default";
									if (event.subject.includes("Entretien")) {
										eventClass = "event-entretien";
									} else if (event.subject.includes("EPGZ")) {
										eventClass = "event-epgz";
									}

									// Créer l'élément d'événement
									const eventElement = $(`
										<div class="week-event ${eventClass}" data-event-id="${event.name}">
											<div class="event-title">${event.subject}</div>
											${clientName ? `<div class="client-info"><i class="fa fa-user"></i> ${clientName}</div>` : ""}
											${
												technicianName
													? `<div class="technician-info"><i class="fa fa-user-tie"></i> ${technicianName}</div>`
													: ""
											}
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
					});

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

	// Initialiser le calendrier
	refreshCalendar();
};
