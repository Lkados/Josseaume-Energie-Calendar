// Script pour personnaliser l'envoi d'email des factures

frappe.ui.form.on('Sales Invoice', {
    refresh: function(frm) {
        // Override the email button functionality
        setTimeout(() => {
            frm.page.btn_primary.off('click');
            frm.page.btn_primary.on('click', function() {
                if (frm.page.btn_primary.text() === __('Email') || frm.page.btn_primary.text() === 'Email') {
                    // Préparer le message par défaut
                    const default_message = `Bonjour,

Veuillez trouver ci-joint le document : Facture N° ${frm.doc.name}.

Nous restons à votre disposition pour tous renseignements complémentaires.

Cordialement,

JOSSEAUME ÉNERGIES
210 IMPASSE DES TUILERIES - LE VIVIER DANGER
60650 ONS EN BRAY
03 44 80 53 75
contact@josseaume-energies.com
www.josseaume-energies.com

🌱 N'imprimer que si nécessaire.`;

                    // Ouvrir le dialogue d'email avec les valeurs par défaut
                    new frappe.views.CommunicationComposer({
                        doc: frm.doc,
                        frm: frm,
                        subject: `Facture N° ${frm.doc.name} - JOSSEAUME ÉNERGIES`,
                        message: default_message,
                        real_name: frappe.user_info().fullname,
                        print_format: frm.meta.default_print_format || "Standard",
                        select_print_format: true,
                        send_email: true
                    });
                } else {
                    // Si ce n'est pas le bouton Email, exécuter l'action par défaut
                    frm.page.btn_primary.trigger('click');
                }
            });
        }, 1000);
    }
});

// Extension de la classe CommunicationComposer pour les factures
(function() {
    const OriginalCommunicationComposer = frappe.views.CommunicationComposer;
    
    frappe.views.CommunicationComposer = class extends OriginalCommunicationComposer {
        constructor(opts) {
            // Si on est sur une facture et qu'il n'y a pas de message défini
            if (opts.doc && opts.doc.doctype === 'Sales Invoice' && !opts.message) {
                opts.subject = opts.subject || `Facture N° ${opts.doc.name} - JOSSEAUME ÉNERGIES`;
                opts.message = `Bonjour,

Veuillez trouver ci-joint le document : Facture N° ${opts.doc.name}.

Nous restons à votre disposition pour tous renseignements complémentaires.

Cordialement,

JOSSEAUME ÉNERGIES
210 IMPASSE DES TUILERIES - LE VIVIER DANGER
60650 ONS EN BRAY
03 44 80 53 75
contact@josseaume-energies.com
www.josseaume-energies.com

🌱 N'imprimer que si nécessaire.`;
            }
            super(opts);
        }
        
        setup_fields() {
            super.setup_fields();
            
            // Si on est sur une facture, s'assurer que les champs sont bien remplis
            if (this.doc && this.doc.doctype === 'Sales Invoice') {
                setTimeout(() => {
                    if (this.dialog) {
                        // Remplir le sujet
                        if (this.dialog.fields_dict.subject && !this.dialog.fields_dict.subject.get_value()) {
                            this.dialog.fields_dict.subject.set_value(`Facture N° ${this.doc.name} - JOSSEAUME ÉNERGIES`);
                        }
                        
                        // Remplir le contenu/message
                        const message_field = this.dialog.fields_dict.content || this.dialog.fields_dict.message || this.dialog.fields_dict.body;
                        if (message_field && !message_field.get_value()) {
                            const message = `Bonjour,

Veuillez trouver ci-joint le document : Facture N° ${this.doc.name}.

Nous restons à votre disposition pour tous renseignements complémentaires.

Cordialement,

JOSSEAUME ÉNERGIES
210 IMPASSE DES TUILERIES - LE VIVIER DANGER
60650 ONS EN BRAY
03 44 80 53 75
contact@josseaume-energies.com
www.josseaume-energies.com

🌱 N'imprimer que si nécessaire.`;
                            
                            message_field.set_value(message);
                        }
                    }
                }, 100);
            }
        }
    };
})();