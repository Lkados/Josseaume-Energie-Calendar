frappe.views.calendar["Event"] = {
	field_map: {
		start: "starts_on",
		end: "ends_on",
		id: "name",
		title: "subject",
		allDay: "all_day",
	},
	options: {
		defaultView: "agendaDay",
		onload: function (calendar) {
			console.log("✅ Vue calendrier personnalisée chargée");

			// Attendre le rendu complet de FullCalendar
			setTimeout(() => {
				const today = frappe.datetime.get_today();
				frappe.call({
					method: "frappe.desk.calendar.get_events",
					args: {
						start: today,
						end: today,
						doctype: "Event",
					},
					callback: function (r) {
						const events = r.message || [];

						// Séparer matin / après-midi
						const morning = events.filter(
							(evt) => new Date(evt.start).getHours() < 13
						);
						const afternoon = events.filter(
							(evt) => new Date(evt.start).getHours() >= 13
						);

						// 🔒 Cache FullCalendar (agenda)
						$(".calendar").hide();

						// 🧼 Nettoyage si rechargement
						$(".custom-morning-afternoon-view").remove();

						// 🧱 Injection du DOM personnalisé
						const html = `
                            <div class="custom-morning-afternoon-view row" style="padding: 20px;">
                                <div class="col-md-6">
                                    <h4>🕗 Matin</h4>
                                    ${morning
										.map(
											(e) => `
                                        <div style="padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 6px;">
                                            <strong>${e.title}</strong><br>
                                            <small>${frappe.datetime.str_to_user(e.start)}</small>
                                        </div>
                                    `
										)
										.join("")}
                                </div>
                                <div class="col-md-6">
                                    <h4>🕑 Après-midi</h4>
                                    ${afternoon
										.map(
											(e) => `
                                        <div style="padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 6px;">
                                            <strong>${e.title}</strong><br>
                                            <small>${frappe.datetime.str_to_user(e.start)}</small>
                                        </div>
                                    `
										)
										.join("")}
                                </div>
                            </div>
                        `;
						$(".layout-main-section").append(html);
					},
				});
			}, 1000); // attendre que le DOM calendrier soit prêt
		},
	},
};
