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
			console.log("Calendrier personnalisé chargé");

			// Injecter ici ta logique "Matin" / "Après-midi"
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
						const morning = events.filter(
							(evt) => new Date(evt.start).getHours() < 13
						);
						const afternoon = events.filter(
							(evt) => new Date(evt.start).getHours() >= 13
						);

						$(".calendar-view").hide(); // Cache le fullcalendar

						const html = `
                            <div class="row" style="padding: 20px;">
                                <div class="col-md-6">
                                    <h4>Matin</h4>
                                    ${morning
										.map((e) => `<p>${e.title} - ${e.start}</p>`)
										.join("")}
                                </div>
                                <div class="col-md-6">
                                    <h4>Après-midi</h4>
                                    ${afternoon
										.map((e) => `<p>${e.title} - ${e.start}</p>`)
										.join("")}
                                </div>
                            </div>
                        `;
						$(".layout-main-section").append(html);
					},
				});
			}, 1000);
		},
	},
};
