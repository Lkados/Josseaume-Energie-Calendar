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

	// Détection et gestion du thème pour ERPNext v15
	function applyTheme() {
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
		const observer = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				if (mutation.type === "attributes" && mutation.attributeName === "class") {
					applyTheme();
				}
			});
		});

		observer.observe(document.body, { attributes: true });

		if (window.matchMedia) {
			window
				.matchMedia("(prefers-color-scheme: dark)")
				.addEventListener("change", applyTheme);
		}

		$(document).on("theme-change", applyTheme);
	}

	applyTheme();
	setupThemeObserver();
	setInterval(applyTheme, 2000);

	// Ajouter des contrôles - Employés par défaut
	page.add_field({
		fieldtype: "Select",
		label: "Vue",
		fieldname: "view_type",
		options: "Employés\nJour\nSemaine\nMois",
		default: "Employés",
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

	// Champ pour filtrer par équipe (visible seulement en vue Employés)
	page.add_field({
		fieldtype: "Select",
		label: "Équipe",
		fieldname: "team_filter",
		options:
			"\nLivraisons\nInstallations\nEntretiens/Ramonages\nDépannages Poêles\nDépannages Chauffage\nÉlectricité\nPhotovoltaïque\nBureau\nCommercial\nRénovation",
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

	page.add_field({
		fieldtype: "Select",
		label: "Type d'intervention",
		fieldname: "event_type",
		options: "\nEntretien\nInstallation\nLivraison Granule\nLivraison Fuel",
		change: function () {
			refreshCalendar();
		},
	});

	page.add_field({
		fieldtype: "Date",
		label: "Date",
		fieldname: "select_date",
		default: frappe.datetime.get_today(),
		change: function () {
			const selectedDate = page.fields_dict.select_date.get_value();
			if (!selectedDate) return;

			const dateParts = selectedDate.split("-");
			const year = parseInt(dateParts[0]);
			const month = parseInt(dateParts[1]) - 1;
			const day = parseInt(dateParts[2]);

			currentDate = new Date(year, month, day);
			currentYear = year;
			currentMonth = month;

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

		if (page.fields_dict.select_date) {
			page.fields_dict.select_date.set_value(frappe.datetime.obj_to_str(currentDate));
		}
		refreshCalendar();
	});

	page.add_inner_button(__("Précédent"), () => {
		const viewType = page.fields_dict.view_type.get_value();

		if (viewType === "Jour" || viewType === "Employés") {
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

		if (page.fields_dict.select_date) {
			page.fields_dict.select_date.set_value(frappe.datetime.obj_to_str(currentDate));
		}
		refreshCalendar();
	});

	page.add_inner_button(__("Suivant"), () => {
		const viewType = page.fields_dict.view_type.get_value();

		if (viewType === "Jour" || viewType === "Employés") {
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

		if (page.fields_dict.select_date) {
			page.fields_dict.select_date.set_value(frappe.datetime.obj_to_str(currentDate));
		}
		refreshCalendar();
	});

	// Fonction pour créer une nouvelle commande avec employé pré-rempli
	function createNewSalesOrder(date, timeSlot, employeeId = null) {
		try {
			const territory = page.fields_dict.territory.get_value();
			const employee = employeeId || page.fields_dict.employee.get_value();
			const event_type = page.fields_dict.event_type.get_value();

			const formattedDate = frappe.datetime.obj_to_str(date).split(" ")[0];

			frappe.set_route("Form", "Sales Order", "new");

			frappe.after_ajax(() => {
				setTimeout(() => {
					if (cur_frm) {
						cur_frm.set_value("delivery_date", formattedDate);
						cur_frm.set_value("custom_horaire", timeSlot);

						if (territory) cur_frm.set_value("territory", territory);
						if (employee) cur_frm.set_value("custom_intervenant", employee);
						if (event_type) cur_frm.set_value("custom_type_de_commande", event_type);

						cur_frm.refresh_fields();

						frappe.show_alert(
							{
								message: __(
									`Formulaire ouvert pour ${timeSlot.toLowerCase()} le ${formattedDate}`
								),
								indicator: "blue",
							},
							3
						);
					}
				}, 1000);
			});
		} catch (error) {
			console.error("Erreur lors de l'ouverture du formulaire:", error);
			frappe.msgprint({
				title: __("Erreur"),
				indicator: "red",
				message: __("Impossible d'ouvrir le formulaire: ") + error.message,
			});
		}
	}

	// Ajouter les écouteurs de double-clic
	function addDoubleClickListeners() {
		$(document).off("dblclick.calendar");

		const viewType = page.fields_dict.view_type.get_value();

		if (viewType === "Employés") {
			$(document).on(
				"dblclick.calendar",
				".employee-section-title[data-name][data-employee]",
				function (e) {
					e.preventDefault();
					e.stopPropagation();

					const sectionName = $(this).attr("data-name");
					const employeeId = $(this).attr("data-employee");
					createNewSalesOrder(currentDate, sectionName, employeeId);
				}
			);
		} else {
			$(document).on("dblclick.calendar", '[data-name="Matin"]', function (e) {
				e.preventDefault();
				e.stopPropagation();
				createNewSalesOrder(currentDate, "Matin");
			});

			$(document).on("dblclick.calendar", '[data-name="Après-midi"]', function (e) {
				e.preventDefault();
				e.stopPropagation();
				createNewSalesOrder(currentDate, "Après-midi");
			});

			$(document).on("dblclick.calendar", '[data-name="Journée complète"]', function (e) {
				e.preventDefault();
				e.stopPropagation();
				createNewSalesOrder(currentDate, "Journée complète");
			});
		}

		if (!$("#calendar-doubleclick-styles").length) {
			$(`
				<style id="calendar-doubleclick-styles">
					[data-name="Matin"], 
					[data-name="Après-midi"], 
					[data-name="Journée complète"],
					.section-title[data-name],
					.employee-section-title[data-name] {
						cursor: pointer;
						transition: background-color 0.2s, transform 0.1s;
						user-select: none;
					}
					[data-name="Matin"]:hover, 
					[data-name="Après-midi"]:hover, 
					[data-name="Journée complète"]:hover,
					.section-title[data-name]:hover,
					.employee-section-title[data-name]:hover {
						background-color: rgba(0, 123, 255, 0.1) !important;
						transform: scale(1.02);
					}
					[data-name="Matin"]:active, 
					[data-name="Après-midi"]:active, 
					[data-name="Journée complète"]:active,
					.section-title[data-name]:active,
					.employee-section-title[data-name]:active {
						transform: scale(0.98);
					}
				</style>
			`).appendTo("head");
		}
	}

	// Fonction pour gérer la visibilité des champs
	function updateFieldVisibility() {
		const viewType = page.fields_dict.view_type.get_value();

		if (viewType === "Employés") {
			page.fields_dict.team_filter.wrapper.show();
			page.fields_dict.employee.wrapper.hide();
		} else {
			page.fields_dict.team_filter.wrapper.hide();
			page.fields_dict.employee.wrapper.show();
		}
	}

	// Fonction principale pour rafraîchir le calendrier
	function refreshCalendar() {
		const viewType = page.fields_dict.view_type.get_value();
		const territory = page.fields_dict.territory.get_value();
		const employee = page.fields_dict.employee.get_value();
		const event_type = page.fields_dict.event_type.get_value();
		const team_filter = page.fields_dict.team_filter.get_value();

		updateFieldVisibility();
		calendarContainer.empty();

		if (viewType === "Employés") {
			renderEmployeeDayView(currentDate, territory, team_filter, event_type);
		} else if (viewType === "Jour") {
			renderTwoColumnDayView(currentDate, territory, employee, event_type);
		} else if (viewType === "Semaine") {
			renderWeekViewWithSections(currentDate, territory, employee, event_type);
		} else {
			renderMonthView(currentYear, currentMonth, territory, employee, event_type);
		}
	}

	// VUE EMPLOYÉS - CORRIGÉE : Une colonne par employé
	function renderEmployeeDayView(date, territory, team_filter, event_type) {
		const formatDate = (d) => {
			return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
				.toString()
				.padStart(2, "0")}/${d.getFullYear()}`;
		};

		// Créer l'en-tête
		const dayHeader = $(`
            <div class="calendar-header">
                <h2>Employés - ${formatDate(date)} ${team_filter ? `(Équipe: ${team_filter})` : ""}
                    <small style="display: block; font-size: 12px; font-weight: normal; color: #666; margin-top: 5px;">
                        Double-cliquez sur une section pour créer une commande client
                    </small>
                </h2>
            </div>
        `).appendTo(calendarContainer);

		const loadingMessage = $(
			'<div class="loading-message">Chargement des employés et événements...</div>'
		).appendTo(calendarContainer);

		const dateStr = frappe.datetime.obj_to_str(date);

		frappe.call({
			method: "josseaume_energies.api.get_day_events_by_employees",
			args: {
				date: dateStr,
				team_filter: team_filter,
				territory: territory,
				event_type: event_type,
			},
			callback: function (r) {
				loadingMessage.remove();

				if (r.message && r.message.status === "success") {
					const data = r.message;
					const employees = data.employees;
					const eventsByEmployee = data.events_by_employee;

					if (employees.length === 0) {
						$(
							'<div class="no-events-message">Aucun employé trouvé pour cette équipe</div>'
						).appendTo(calendarContainer);
						return;
					}

					// Créer le conteneur en grille pour les employés
					const employeesGrid = $(`
						<div class="employees-grid" style="
							display: grid; 
							grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
							gap: 15px; 
							padding: 15px;
						"></div>
					`).appendTo(calendarContainer);

					// CRÉER UNE COLONNE POUR CHAQUE EMPLOYÉ
					employees.forEach((employee) => {
						const employeeEvents = eventsByEmployee[employee.name];

						// Créer la colonne employé
						const employeeColumn = $(`
							<div class="employee-column" style="
								border: 1px solid #dee2e6;
								border-radius: 8px;
								background-color: white;
								overflow: hidden;
								transition: background-color 0.3s;
							">
								<div class="employee-header" style="
									padding: 15px;
									background-color: #f8f9fa;
									border-bottom: 1px solid #dee2e6;
									text-align: center;
									transition: background-color 0.3s;
								">
									<h4 style="margin: 0; font-size: 16px; font-weight: 600;">${employee.employee_name}</h4>
									<small style="color: #6c757d;">${employee.designation || ""}</small>
									${
										employee.teams && employee.teams.length > 0
											? `<div style="margin-top: 5px; font-size: 11px; color: #007bff;">
											${employee.teams.join(", ")}
										</div>`
											: ""
									}
								</div>
								<div class="employee-events" style="padding: 10px;"></div>
							</div>
						`).appendTo(employeesGrid);

						const eventsContainer = employeeColumn.find(".employee-events");

						// Section Journée complète pour CET employé
						$(`<div class="employee-section-title" data-name="Journée complète" data-employee="${employee.name}" style="
							font-weight: 600;
							padding: 8px 15px;
							margin-top: 10px;
							margin-bottom: 5px;
							border-radius: 4px;
							color: var(--label-text-color);
							background-color: var(--label-bg-color);
							border-left: 4px solid var(--label-border-color);
						">Journée complète</div>`).appendTo(eventsContainer);

						// Événements toute la journée de CET employé
						if (employeeEvents.all_day && employeeEvents.all_day.length > 0) {
							employeeEvents.all_day.forEach((event) => {
								renderEmployeeEventCard(event, eventsContainer);
							});
						} else {
							$(
								'<div class="no-events" style="text-align: center; color: #adb5bd; font-style: italic; padding: 5px; font-size: 12px;">Aucun événement</div>'
							).appendTo(eventsContainer);
						}

						// Section Matin pour CET employé
						$(`<div class="employee-section-title" data-name="Matin" data-employee="${employee.name}" style="
							font-weight: 600;
							padding: 8px 15px;
							margin-top: 10px;
							margin-bottom: 5px;
							border-radius: 4px;
							color: var(--label-text-color);
							background-color: var(--label-bg-color);
							border-left: 4px solid var(--label-border-color);
						">Matin</div>`).appendTo(eventsContainer);

						// Événements du matin de CET employé
						if (employeeEvents.morning && employeeEvents.morning.length > 0) {
							employeeEvents.morning.forEach((event) => {
								renderEmployeeEventCard(event, eventsContainer);
							});
						} else {
							$(
								'<div class="no-events" style="text-align: center; color: #adb5bd; font-style: italic; padding: 5px; font-size: 12px;">Aucun événement</div>'
							).appendTo(eventsContainer);
						}

						// Section Après-midi pour CET employé
						$(`<div class="employee-section-title" data-name="Après-midi" data-employee="${employee.name}" style="
							font-weight: 600;
							padding: 8px 15px;
							margin-top: 10px;
							margin-bottom: 5px;
							border-radius: 4px;
							color: var(--label-text-color);
							background-color: var(--label-bg-color);
							border-left: 4px solid var(--label-border-color);
						">Après-midi</div>`).appendTo(eventsContainer);

						// Événements de l'après-midi de CET employé
						if (employeeEvents.afternoon && employeeEvents.afternoon.length > 0) {
							employeeEvents.afternoon.forEach((event) => {
								renderEmployeeEventCard(event, eventsContainer);
							});
						} else {
							$(
								'<div class="no-events" style="text-align: center; color: #adb5bd; font-style: italic; padding: 5px; font-size: 12px;">Aucun événement</div>'
							).appendTo(eventsContainer);
						}
					});

					// Appliquer le thème sombre si nécessaire
					if ($("body").hasClass("dark")) {
						$(".employee-column").css("background-color", "#2d2d2d");
						$(".employee-header").css("background-color", "#383838");
					}
				} else {
					$(
						'<div class="error-message">Erreur lors du chargement des employés</div>'
					).appendTo(calendarContainer);
				}

				addDoubleClickListeners();
			},
		});
	}

	// Fonction pour rendre une carte d'événement pour la vue employé
	function renderEmployeeEventCard(event, container) {
		let eventClass = "";
		if (event.subject.includes("Entretien")) {
			eventClass = "event-entretien";
		} else if (event.subject.includes("EPGZ")) {
			eventClass = "event-epgz";
		} else {
			eventClass = "event-default";
		}

		if (isAllDayEvent(event)) {
			eventClass += " event-all-day";
		}

		const { clientName, technicianName, comments } = getEventInfo(event);

		const eventCard = $(`
			<div class="${eventClass}" data-event-id="${event.name}" style="
				margin-bottom: 6px;
				padding: 8px 10px;
				border-radius: 4px;
				border-left: 4px solid;
				background-color: white;
				box-shadow: var(--shadow-sm);
				cursor: pointer;
				transition: all 0.2s;
				font-size: 12px;
			">
				<div style="font-weight: 600; margin-bottom: 3px;">${event.subject}</div>
				${
					isAllDayEvent(event)
						? '<div style="color: var(--color-allday); font-size: 10px; margin-bottom: 3px;"><i class="fa fa-calendar-day"></i> Toute la journée</div>'
						: ""
				}
				${
					clientName
						? `<div style="color: #2196f3; font-size: 11px;"><i class="fa fa-user"></i> ${clientName}</div>`
						: ""
				}
				${
					comments
						? `<div style="color: #6c757d; font-size: 10px; margin-top: 3px; font-style: italic;"><i class="fa fa-comment"></i> ${comments}</div>`
						: ""
				}
			</div>
		`).appendTo(container);

		eventCard.on("click", function () {
			frappe.set_route("Form", "Event", event.name);
		});

		eventCard
			.on("mouseenter", function () {
				$(this).css("transform", "translateY(-2px)").css("box-shadow", "var(--shadow-lg)");
			})
			.on("mouseleave", function () {
				$(this).css("transform", "translateY(0)").css("box-shadow", "var(--shadow-sm)");
			});

		if ($("body").hasClass("dark")) {
			eventCard.css("background-color", "#383838");
		}
	}

	// Fonctions utilitaires
	function getEventInfo(event) {
		let clientName = "";
		let technicianName = "";
		let comments = "";

		if (event.sales_order_info) {
			clientName = event.sales_order_info.customer_name || "";
			technicianName = event.sales_order_info.employee_name || "";
			comments = event.sales_order_info.comments || "";
		} else {
			if (event.event_participants && Array.isArray(event.event_participants)) {
				for (const participant of event.event_participants) {
					if (participant.reference_doctype === "Customer") {
						clientName = participant.full_name || participant.reference_docname;
					} else if (participant.reference_doctype === "Employee") {
						technicianName = participant.full_name || participant.reference_docname;
					}
				}
			}
		}

		return { clientName, technicianName, comments };
	}

	function isAllDayEvent(event) {
		return (
			event.all_day === 1 ||
			event.all_day === true ||
			event.all_day === "1" ||
			String(event.all_day).toLowerCase() === "true"
		);
	}

	// Vue jour (existante)
	function renderTwoColumnDayView(date, territory, employee, event_type) {
		const formatDate = (d) => {
			return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
				.toString()
				.padStart(2, "0")}/${d.getFullYear()}`;
		};

		const dayHeader = $(`
            <div class="calendar-header">
                <h2>Journée du ${formatDate(date)} 
                    <small style="display: block; font-size: 12px; font-weight: normal; color: #666; margin-top: 5px;">
                        Double-cliquez sur une section pour créer une commande client
                    </small>
                </h2>
            </div>
        `).appendTo(calendarContainer);

		const twoColumnContainer = $('<div class="two_column_calendar-container"></div>').appendTo(
			calendarContainer
		);

		const dateStr = frappe.datetime.obj_to_str(date);
		const loadingMessage = $(
			'<div class="loading-message">Chargement des événements...</div>'
		).appendTo(calendarContainer);

		frappe.call({
			method: "josseaume_energies.api.get_day_events",
			args: {
				date: dateStr,
				territory: territory,
				employee: employee,
				event_type: event_type,
			},
			callback: function (r) {
				loadingMessage.remove();

				if (r.message) {
					const events = r.message;
					const morningEvents = [];
					const afternoonEvents = [];
					const allDayEvents = [];

					events.forEach((event) => {
						if (isAllDayEvent(event)) {
							allDayEvents.push(event);
						} else {
							const eventTime = new Date(event.starts_on);
							if (eventTime.getHours() < 12) {
								morningEvents.push(event);
							} else {
								afternoonEvents.push(event);
							}
						}
					});

					morningEvents.sort((a, b) => new Date(a.starts_on) - new Date(b.starts_on));
					afternoonEvents.sort((a, b) => new Date(a.starts_on) - new Date(b.starts_on));

					if (allDayEvents.length > 0) {
						$('<div data-name="Journée complète">Journée complète</div>').appendTo(
							twoColumnContainer
						);
						allDayEvents.forEach((event) =>
							renderTwoColumnEventCard(event, twoColumnContainer)
						);
					}

					$('<div data-name="Matin">Matin</div>').appendTo(twoColumnContainer);
					if (morningEvents.length > 0) {
						morningEvents.forEach((event) =>
							renderTwoColumnEventCard(event, twoColumnContainer)
						);
					} else {
						$('<div class="no-events">Aucun événement le matin</div>').appendTo(
							twoColumnContainer
						);
					}

					$('<div data-name="Après-midi">Après-midi</div>').appendTo(twoColumnContainer);
					if (afternoonEvents.length > 0) {
						afternoonEvents.forEach((event) =>
							renderTwoColumnEventCard(event, twoColumnContainer)
						);
					} else {
						$('<div class="no-events">Aucun événement l\'après-midi</div>').appendTo(
							twoColumnContainer
						);
					}

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

				addDoubleClickListeners();
			},
		});
	}

	function renderTwoColumnEventCard(event, container) {
		let eventClass = "";
		if (event.subject.includes("Entretien")) {
			eventClass = "event-entretien";
		} else if (event.subject.includes("EPGZ")) {
			eventClass = "event-epgz";
		} else {
			eventClass = "event-default";
		}

		if (isAllDayEvent(event)) {
			eventClass += " event-all-day";
		}

		const { clientName, technicianName, comments } = getEventInfo(event);

		const eventCard = $(`
			<div class="${eventClass}" data-event-id="${event.name}">
				<span class="event-id">${event.name}</span>
				<span class="event-title">${event.subject}</span>
				${
					isAllDayEvent(event)
						? '<span class="event-all-day-indicator"><i class="fa fa-calendar-day"></i> Toute la journée</span>'
						: ""
				}
				${clientName ? `<div class="client-info"><i class="fa fa-user"></i> ${clientName}</div>` : ""}
				${
					technicianName
						? `<div class="technician-info"><i class="fa fa-user-tie"></i> ${technicianName}</div>`
						: ""
				}
				${comments ? `<div class="event-comments"><i class="fa fa-comment"></i> ${comments}</div>` : ""}
			</div>
		`).appendTo(container);

		eventCard.on("click", function () {
			frappe.set_route("Form", "Event", event.name);
		});
	}

	// Vues semaine et mois simplifiées
	function renderWeekViewWithSections() {
		$(`
			<div class="calendar-header">
				<h2>Vue semaine</h2>
			</div>
			<div style="padding: 20px; text-align: center;">
				<p>Vue semaine disponible.</p>
			</div>
		`).appendTo(calendarContainer);
	}

	function renderMonthView() {
		$(`
			<div class="calendar-header">
				<h2>Vue mensuelle non disponible</h2>
			</div>
			<div style="padding: 20px; text-align: center;">
				<p>La vue mensuelle n'est pas disponible actuellement.</p>
				<p>Veuillez utiliser la vue jour, semaine ou employés.</p>
			</div>
		`).appendTo(calendarContainer);
	}

	// Initialiser le calendrier
	refreshCalendar();
};
