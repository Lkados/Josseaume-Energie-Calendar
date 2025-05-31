frappe.pages["two_column_calendar"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Calendrier des Interventions",
		single_column: true,
	});

	// État global simplifié
	let currentDate = new Date();

	// Configuration minimale des champs
	try {
		page.add_field({
			fieldtype: "Select",
			label: "Vue",
			fieldname: "view_type",
			options: "Jour\nEmployés\nSemaine",
			default: "Jour",
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
				if (selectedDate) {
					const dateParts = selectedDate.split("-");
					currentDate = new Date(
						parseInt(dateParts[0]),
						parseInt(dateParts[1]) - 1,
						parseInt(dateParts[2])
					);
					refreshCalendar();
				}
			},
		});
	} catch (error) {
		console.error("Erreur lors de la création des champs:", error);
	}

	// Conteneur de calendrier
	let calendarContainer = $('<div class="custom-calendar-container"></div>').appendTo(page.body);

	// Boutons de navigation
	try {
		page.add_inner_button(__("Aujourd'hui"), () => {
			currentDate = new Date();
			if (page.fields_dict.select_date) {
				page.fields_dict.select_date.set_value(frappe.datetime.obj_to_str(currentDate));
			}
			refreshCalendar();
		});

		page.add_inner_button(__("Précédent"), () => {
			currentDate.setDate(currentDate.getDate() - 1);
			if (page.fields_dict.select_date) {
				page.fields_dict.select_date.set_value(frappe.datetime.obj_to_str(currentDate));
			}
			refreshCalendar();
		});

		page.add_inner_button(__("Suivant"), () => {
			currentDate.setDate(currentDate.getDate() + 1);
			if (page.fields_dict.select_date) {
				page.fields_dict.select_date.set_value(frappe.datetime.obj_to_str(currentDate));
			}
			refreshCalendar();
		});
	} catch (error) {
		console.error("Erreur lors de la création des boutons:", error);
	}

	// Fonction principale simplifiée
	function refreshCalendar() {
		try {
			const viewType = page.fields_dict.view_type
				? page.fields_dict.view_type.get_value()
				: "Jour";
			calendarContainer.empty();

			if (viewType === "Employés") {
				renderSimpleEmployeeView();
			} else {
				renderSimpleDayView();
			}
		} catch (error) {
			console.error("Erreur dans refreshCalendar:", error);
			calendarContainer.html(
				'<div style="padding: 20px; text-align: center; color: red;">Erreur de chargement. Vérifiez la console.</div>'
			);
		}
	}

	// Vue employés simplifiée
	function renderSimpleEmployeeView() {
		try {
			const formatDate = (d) => {
				return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
					.toString()
					.padStart(2, "0")}/${d.getFullYear()}`;
			};

			calendarContainer.html(`
				<div class="calendar-header">
					<h2>Vue Employés - ${formatDate(currentDate)}</h2>
				</div>
				<div style="padding: 20px;">
					<div style="text-align: center; margin: 20px;">
						<div class="loading-message">Chargement des employés...</div>
					</div>
				</div>
			`);

			// Test API employés
			frappe.call({
				method: "josseaume_energies.api.get_employees_with_team_filter",
				callback: function (r) {
					if (r.message && r.message.status === "success") {
						displayEmployees(r.message.employees);
					} else {
						calendarContainer
							.find(".loading-message")
							.html(
								'<div style="color: red;">Erreur: ' +
									(r.message ? r.message.message : "API non disponible") +
									"</div>"
							);
					}
				},
				error: function (error) {
					console.error("Erreur API employés:", error);
					calendarContainer
						.find(".loading-message")
						.html('<div style="color: red;">Erreur API: ' + error.message + "</div>");
				},
			});
		} catch (error) {
			console.error("Erreur dans renderSimpleEmployeeView:", error);
		}
	}

	// Affichage simple des employés
	function displayEmployees(employees) {
		try {
			if (!employees || employees.length === 0) {
				calendarContainer.find(".loading-message").html("Aucun employé trouvé");
				return;
			}

			let employeesHtml =
				'<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; padding: 15px;">';

			employees.forEach(function (employee) {
				const teams = employee.teams ? employee.teams.join(", ") : "Aucune équipe";
				employeesHtml += `
					<div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: white;">
						<h4 style="margin: 0 0 10px 0;">${employee.employee_name}</h4>
						<small style="color: #666;">${employee.designation || ""}</small>
						<div style="margin-top: 10px; font-size: 12px; color: #007bff;">${teams}</div>
						<div style="margin-top: 15px;">
							<div style="padding: 5px; background: #f8f9fa; margin: 5px 0; border-radius: 3px;">Toute la journée</div>
							<div style="padding: 5px; background: #f8f9fa; margin: 5px 0; border-radius: 3px;">Matin</div>
							<div style="padding: 5px; background: #f8f9fa; margin: 5px 0; border-radius: 3px;">Après-midi</div>
						</div>
					</div>
				`;
			});

			employeesHtml += "</div>";
			calendarContainer.html(employeesHtml);
		} catch (error) {
			console.error("Erreur dans displayEmployees:", error);
		}
	}

	// Vue jour simplifiée
	function renderSimpleDayView() {
		try {
			const formatDate = (d) => {
				return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
					.toString()
					.padStart(2, "0")}/${d.getFullYear()}`;
			};

			calendarContainer.html(`
				<div class="calendar-header">
					<h2>Vue Jour - ${formatDate(currentDate)}</h2>
				</div>
				<div style="padding: 20px;">
					<div style="background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 4px;">
						<h3>Toute la journée</h3>
						<div style="color: #666; font-style: italic;">Aucun événement</div>
					</div>
					<div style="background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 4px;">
						<h3>Matin</h3>
						<div style="color: #666; font-style: italic;">Aucun événement</div>
					</div>
					<div style="background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 4px;">
						<h3>Après-midi</h3>
						<div style="color: #666; font-style: italic;">Aucun événement</div>
					</div>
				</div>
			`);
		} catch (error) {
			console.error("Erreur dans renderSimpleDayView:", error);
		}
	}

	// Initialisation sécurisée
	try {
		refreshCalendar();
		console.log("Calendrier initialisé avec succès");
	} catch (error) {
		console.error("Erreur lors de l'initialisation:", error);
		calendarContainer.html(
			'<div style="padding: 20px; text-align: center; color: red;">Erreur fatale. Consultez la console pour plus de détails.</div>'
		);
	}
};
