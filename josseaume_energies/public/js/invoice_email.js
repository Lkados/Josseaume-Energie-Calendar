// Script pour personnaliser l'envoi d'email des factures

frappe.ui.form.on('Sales Invoice', {
    refresh: function(frm) {
        // Désactivé temporairement pour éviter les boucles infinies
        // TODO: Réimplémenter avec une meilleure approche

        // La personnalisation des emails se fait maintenant uniquement
        // via l'extension de la classe CommunicationComposer ci-dessous
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