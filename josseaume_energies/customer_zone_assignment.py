# josseaume_energies/customer_zone_assignment.py

import frappe
from frappe.utils import cstr

# Dictionnaire de mapping CP -> Commune -> Zone
ZONE_MAPPING = {
    "60000": {
        "GOINCOURT": "ZONE 1",
        "Saint-Martin-le-Noeud": "ZONE 1",
        "Aux Marais": "ZONE 1",
        "Frocourt": "ZONE 10",
        "Fouquenies": "ZONE 10",
        "BEAUVAIS": "ZONE 2",
        "ALLONNE": "ZONE 2",
        "TILLE": "ZONE 2"
    },
    "60155": {
        "Rainvillers": "ZONE 1",
        "Saint-Léger-en-Bray": "ZONE 1"
    },
    "60390": {
        "Auneuil": "ZONE 1",
        "Berneuil-en-Bray": "ZONE 103",
        "La Houssoye": "ZONE 1",
        "Auteuil": "ZONE 103",
        "Le Vauroux": "ZONE 1",
        "Beaumont-les-Nonains": "ZONE 103",
        "Porcheux": "ZONE 140",
        "Villotran": "ZONE 103",
        "La Neuville-Garnier": "ZONE 103",
        "Troussures": "ZONE 1"
    },
    "60650": {
        "ONS-EN-BRAY": "ZONE 1",
        "SAINT AUBIN EN BRAY": "ZONE 1",
        "BLACOURT": "ZONE 1",
        "ESPAUBOURG": "ZONE 1",
        "Lachapelle-aux-Pots": "ZONE 1",
        "Saint-Paul": "ZONE 1",
        "Savignies": "ZONE 1",
        "Senantes": "ZONE 1",
        "Hanvoile": "ZONE 1",
        "Le Mont-Saint-Adrien": "ZONE 1",
        "Villers-Saint-Barthélemy": "ZONE 1",
        "Hodenc-en-Bray": "ZONE 1",
        "Saint-Germain-la-Poterie": "ZONE 1",
        "Villers-sur-Auchy": "ZONE 1",
        "Villembray": "ZONE 1",
        "Glatigny": "ZONE 1",
        "Lhéraule": "ZONE 1",
        "Hannaches": "ZONE 1"
    },
    "60790": {
        "Valdampierre": "ZONE 103",
        "LA DRENNE": "ZONE 103",
        "Le Déluge": "ZONE 103",
        "La Neuville-d'Aumont": "ZONE 103",
        "Pouilly": "ZONE 103",
        "Montherlant": "ZONE 103",
        "Ressons-l'Abbaye": "ZONE 103",
        "Le Coudray-sur-Thelle": "ZONE 103"
    },
    "60120": {
        "Breteuil": "ZONE 1011",
        "Ansauvillers": "ZONE 1011",
        "Bonneuil-les-Eaux": "ZONE 1011",
        "Esquennoy": "ZONE 1011",
        "Paillart": "ZONE 1011",
        "Hardivillers": "ZONE 1011",
        "Vendeuil-Caply": "ZONE 1011",
        "Cormeilles": "ZONE 1011",
        "Troussencourt": "ZONE 1011",
        "Gannes": "ZONE 1011",
        "Croissy-sur-Celle": "ZONE 1011",
        "Beauvoir": "ZONE 1011",
        "Tartigny": "ZONE 1011",
        "Bonvillers": "ZONE 1011",
        "Le Mesnil-Saint-Firmin": "ZONE 1011",
        "Lavacquerie": "ZONE 1011",
        "Mory-Montcrux": "ZONE 1011"
    },
    "60480": {
        "Reuil-sur-Brêche": "ZONE 101",
        "Sainte-Eusoye": "ZONE 1011",
        "Oursel-Maison": "ZONE 1011",
        "Maulers": "ZONE 1011",
        "Lachaussée-du-Bois-d'Écu": "ZONE 1011",
        "Puits-la-Vallée": "ZONE 101",
        "La Neuville-Saint-Pierre": "ZONE 101",
        "Fontaine-Saint-Lucien": "ZONE 101",
        "Muidorge": "ZONE 101",
        "Froissy": "ZONE 101",
        "Noyers-Saint-Martin": "ZONE 1011",
        "Saint-André-Farivillers": "ZONE 1011",
        "Francastel": "ZONE 101",
        "Thieux": "ZONE 1011",
        "Campremy": "ZONE 1011",
        "Noirémont": "ZONE 101",
        "Abbeville-Saint-Lucien": "ZONE 101",
        "Maisoncelle-Tuilerie": "ZONE 1011",
        "Le Quesnel-Aubry": "ZONE 1011",
        "Bucamps": "ZONE 1011",
        "Montreuil-sur-Brêche": "ZONE 1011",
        "Guignecourt": "ZONE 2"
    },
    "60130": {
        "Saint-Just-en-Chaussée": "ZONE 1011",
        "Wavignies": "ZONE 11",
        "Avrechy": "ZONE 1011",
        "Catillon-Fumechon": "ZONE 1011",
        "Le Plessier-sur-Saint-Just": "ZONE 1011",
        "Fournival": "ZONE 1011",
        "Saint-Remy-en-l'Eau": "ZONE 1011",
        "Nourard-le-Franc": "ZONE 1011",
        "Le Plessier-sur-Bulles": "ZONE 1011"
    },
    "60510": {
        "Haudivillers": "ZONE 101",
        "Le Fay-Saint-Quentin": "ZONE 101",
        "Essuiles": "ZONE 101",
        "Lafraye": "ZONE 101",
        "Fouquerolles": "ZONE 101",
        "Rémérangles": "ZONE 101",
        "La Neuville-en-Hez": "ZONE 1021",
        "La Rue-Saint-Pierre": "ZONE 1021",
        "Bresles": "ZONE 2",
        "Laversines": "ZONE 2",
        "Rochy-Condé": "ZONE 2",
        "Therdonne": "ZONE 2",
        "Oroër": "ZONE 2",
        "Bonlier": "ZONE 2",
        "Nivillers": "ZONE 2",
        "Velennes": "ZONE 2"
    },
    "60110": {
        "Amblainville": "ZONE 1031",
        "Lormaison": "ZONE 103",
        "Esches": "ZONE 1031",
        "Corbeil-Cerf": "ZONE 103"
    },
    "60119": {
        "Hénonville": "ZONE 140",
        "Neuville-Bosc": "ZONE 140",
        "Monts": "ZONE 140"
    },
    "60149": {
        "Saint-Crépin-Ibouvillers": "ZONE 103"
    },
    "60173": {
        "Ivry-le-Temple": "ZONE 103"
    },
    "60530": {
        "Neuilly-en-Thelle": "ZONE 1031",
        "Le Mesnil-en-Thelle": "ZONE 1031",
        "Crouy-en-Thelle": "ZONE 1031",
        "Fresnoy-en-Thelle": "ZONE 1031",
        "Dieudonné": "ZONE 1031"
    },
    "60540": {
        "Bornel": "ZONE 1031",
        "Puiseux-le-Hauberger": "ZONE 1031",
        "Fosseuse": "ZONE 1031",
        "Belle-Église": "ZONE 1031",
        "Anserville": "ZONE 1031"
    },
    "60570": {
        "Andeville": "ZONE 103",
        "Laboissière-en-Thelle": "ZONE 103",
        "Mortefontaine-en-Thelle": "ZONE 103"
    },
    "95270": {
        "Viarmes": "ZONE 1031",
        "Asnières-sur-Oise": "ZONE 1031",
        "Luzarches": "ZONE 1031",
        "Chaumontel": "ZONE 1031",
        "Belloy-en-France": "ZONE 1031",
        "Seugy": "ZONE 1031"
    },
    "95340": {
        "Persan": "ZONE 1031",
        "Bernes-sur-Oise": "ZONE 1031",
        "Ronquerolles": "ZONE 1031"
    },
    "60175": {
        "Villeneuve-les-Sablons": "ZONE 103"
    },
    "60660": {
        "Cires-lès-Mello": "ZONE 1021",
        "CRAMOISY": "ZONE 18",
        "MAYSEL": "ZONE 18",
        "MELLO": "ZONE 18",
        "ROUSSELOY": "ZONE 18",
        "SAINT VAAST LES MELLO": "ZONE 18"
    },
    "60730": {
        "Sainte-Geneviève": "ZONE 103",
        "Ully-Saint-Georges": "ZONE 103",
        "Cauvigny": "ZONE 103",
        "Lachapelle-Saint-Pierre": "ZONE 103",
        "Novillers": "ZONE 103"
    },
    "95260": {
        "Beaumont-sur-Oise": "ZONE 1031"
    },
    "95430": {
        "Auvers-sur-Oise": "ZONE 1031"
    },
    "95540": {
        "Méry-sur-Oise": "ZONE 1031"
    },
    "95560": {
        "Montsoult": "ZONE 1031",
        "Baillet-en-France": "ZONE 1031"
    },
    "95570": {
        "Attainville": "ZONE 1031"
    },
    "95590": {
        "Presles": "ZONE 1031",
        "Nointel": "ZONE 1031"
    },
    "95620": {
        "Parmain": "ZONE 1031"
    },
    "95630": {
        "Mériel": "ZONE 1031"
    },
    "95660": {
        "Champagne-sur-Oise": "ZONE 1031"
    },
    "95690": {
        "Nesles-la-Vallée": "ZONE 1031",
        "Labbeville": "ZONE 1031",
        "Frouville": "ZONE 1031",
        "Hédouville": "ZONE 1031"
    },
    "95820": {
        "Bruyères-sur-Oise": "ZONE 1031"
    },
    "60360": {
        "Crèvecoeur-le-Grand": "ZONE 101",
        "Luchy": "ZONE 101",
        "Auchy-la-Montagne": "ZONE 101",
        "Lihus": "ZONE 101",
        "Hétomesnil": "ZONE 101",
        "Rotangy": "ZONE 101",
        "Prévillers": "ZONE 101",
        "Viefvillers": "ZONE 101",
        "Le Gallet": "ZONE 101",
        "Catheux": "ZONE 101",
        "Choqueuse-les-Bénards": "ZONE 101",
        "Conteville": "ZONE 101",
        "Fontaine-Bonneleau": "ZONE 101",
        "Doméliers": "ZONE 101",
        "Le Saulchoy": "ZONE 101"
    },
    "60690": {
        "Marseille-en-Beauvaisis": "ZONE 160",
        "Fontaine-Lavaganne": "ZONE 160",
        "Achy": "ZONE 160",
        "La Neuville-sur-Oudeuil": "ZONE 160",
        "Roy-Boissy": "ZONE 160",
        "Haute-Épine": "ZONE 160",
        "Rothois": "ZONE 160"
    },
    "60860": {
        "Saint-Omer-en-Chaussée": "ZONE 160",
        "Pisseleu": "ZONE 101",
        "Blicourt": "ZONE 101",
        "Oudeuil": "ZONE 101",
        "Villers-sur-Bonnières": "ZONE 3"
    },
    "60210": {
        "Grandvilliers": "ZONE 1601",
        "Cempuis": "ZONE 1601",
        "Halloy": "ZONE 1601",
        "Sommereux": "ZONE 1601",
        "Gaudechart": "ZONE 1601",
        "Saint-Maur": "ZONE 1601",
        "Thieuloy-Saint-Antoine": "ZONE 1601",
        "Sarnois": "ZONE 1601",
        "Briot": "ZONE 1601",
        "Sarcus": "ZONE 1601",
        "Grez": "ZONE 1601",
        "Brombos": "ZONE 1601",
        "Dargies": "ZONE 1601",
        "Daméraucourt": "ZONE 1601",
        "Le Hamel": "ZONE 1601",
        "Hautbos": "ZONE 1601",
        "Offoy": "ZONE 1601",
        "Le Mesnil-Conteville": "ZONE 1601",
        "Élencourt": "ZONE 1601",
        "Saint-Thibault": "ZONE 1601",
        "Beaudéduit": "ZONE 1601",
        "Laverrière": "ZONE 1601"
    },
    "60220": {
        "Formerie": "ZONE 1601",
        "Moliens": "ZONE 1601",
        "Campeaux": "ZONE 1601",
        "Blargies": "ZONE 1601",
        "Saint-Samson-la-Poterie": "ZONE 1601",
        "Broquiers": "ZONE 1601",
        "Canny-sur-Thérain": "ZONE 1601",
        "Monceaux-l'Abbaye": "ZONE 1601",
        "Saint-Arnoult": "ZONE 1601",
        "Bouvresse": "ZONE 1601",
        "Omécourt": "ZONE 1601",
        "Mureaumont": "ZONE 1601",
        "Boutavent": "ZONE 1601",
        "Abancourt": "ZONE 1601",
        "Romescamps": "ZONE 1601",
        "Lannoy-Cuillère": "ZONE 1601",
        "Escles-Saint-Pierre": "ZONE 1601",
        "Gourchelles": "ZONE 1601",
        "Saint-Valery": "ZONE 1601"
    },
    "60380": {
        "Songeons": "ZONE 160",
        "Morvillers": "ZONE 160",
        "Grémévillers": "ZONE 160",
        "Saint-Quentin-des-Prés": "ZONE 160",
        "Escames": "ZONE 160",
        "Thérines": "ZONE 160",
        "Ernemont-Boutavent": "ZONE 160",
        "Sully": "ZONE 160",
        "Lachapelle-sous-Gerberoy": "ZONE 160",
        "Hécourt": "ZONE 160",
        "Wambez": "ZONE 160",
        "Loueuse": "ZONE 160",
        "Buicourt": "ZONE 160",
        "Bazancourt": "ZONE 160",
        "Fontenay-Torcy": "ZONE 160",
        "Villers-Vermont": "ZONE 160",
        "Héricourt-sur-Thérain": "ZONE 160",
        "Saint-Deniscourt": "ZONE 160",
        "Gerberoy": "ZONE 160"
    },
    "60960": {
        "Feuquières": "ZONE 1601"
    },
    "60430": {
        "Noailles": "ZONE 103",
        "Ponchon": "ZONE 103",
        "Abbecourt": "ZONE 103",
        "Silly-Tillard": "ZONE 103",
        "Warluis": "ZONE 2",
        "Saint-Sulpice": "ZONE 103",
        "Hodenc-l'Évêque": "ZONE 103"
    },
    "60134": {
        "Villers-Saint-Sépulcre": "ZONE 102",
        "Montreuil-sur-Thérain": "ZONE 102"
    },
    "60250": {
        "Mouy": "ZONE 1021",
        "Bury": "ZONE 1021",
        "Angy": "ZONE 1021"
    },
    "60370": {
        "Hermes": "ZONE 102",
        "Berthecourt": "ZONE 102",
        "Saint-Félix": "ZONE 102"
    },
    "95300": {
        "Livilliers": "ZONE 1401",
        "Ennery": "ZONE 1401",
        "Hérouville-en-Vexin": "ZONE 1401"
    },
    "95420": {
        "Saint-Gervais": "ZONE 140",
        "Nucourt": "ZONE 140",
        "La Chapelle-en-Vexin": "ZONE 140",
        "Magny-en-Vexin": "ZONE 140",
        "Genainville": "ZONE 1401",
        "Cléry-en-Vexin": "ZONE 1401",
        "Wy-dit-Joli-Village": "ZONE 1401",
        "Omerville": "ZONE 1401",
        "Arthies": "ZONE 1401",
        "Hodent": "ZONE 1401",
        "Maudétour-en-Vexin": "ZONE 1401",
        "Banthelu": "ZONE 140",
        "Charmont": "ZONE 140"
    },
    "95450": {
        "Us": "ZONE 1401",
        "Sagy": "ZONE 1401",
        "Vigny": "ZONE 1401",
        "Ableiges": "ZONE 1401",
        "Avernes": "ZONE 1401",
        "Condécourt": "ZONE 1401",
        "Le Perchay": "ZONE 1401",
        "Longuesse": "ZONE 1401",
        "Frémainville": "ZONE 1401",
        "Commeny": "ZONE 1401",
        "Théméricourt": "ZONE 1401",
        "Gouzangrez": "ZONE 1401",
        "Guiry-en-Vexin": "ZONE 1401",
        "Gadancourt": "ZONE 1401"
    },
    "95510": {
        "Aincourt": "ZONE 1401",
        "Vétheuil": "ZONE 1401",
        "Amenucourt": "ZONE 1401",
        "Chérence": "ZONE 1401"
    },
    "95640": {
        "Marines": "ZONE 140",
        "Haravilliers": "ZONE 140",
        "Neuilly-en-Vexin": "ZONE 140",
        "Le Heaulme": "ZONE 140",
        "Santeuil": "ZONE 140",
        "Bréançon": "ZONE 140",
        "Brignancourt": "ZONE 140",
        "Moussy": "ZONE 140"
    },
    "95650": {
        "Génicourt": "ZONE 1401"
    },
    "95710": {
        "Bray-et-Lû": "ZONE 1401",
        "Chaussy": "ZONE 1401",
        "Ambleville": "ZONE 1401"
    },
    "95750": {
        "Chars": "ZONE 140",
        "Le Bellay-en-Vexin": "ZONE 140"
    },
    "95770": {
        "Saint-Clair-sur-Epte": "ZONE 140",
        "Montreuil-sur-Epte": "ZONE 140",
        "Buhy": "ZONE 140"
    },
    "95810": {
        "Arronville": "ZONE 1031",
        "Épiais-Rhus": "ZONE 1031",
        "Vallangoujard": "ZONE 1031",
        "Grisy-les-Plâtres": "ZONE 1031",
        "Menouville": "ZONE 1031",
        "Theuville": "ZONE 1031"
    },
    "95830": {
        "Cormeilles-en-Vexin": "ZONE 1401",
        "Frémécourt": "ZONE 1401"
    },
    "95180": {
        "Menucourt": "ZONE 1401"
    },
    "27440": {
        "Écouis": "ZONE 17",
        "Bacqueville": "ZONE 17",
        "Gaillardbois-Cressenville": "ZONE 17",
        "Lisors": "ZONE 17",
        "Touffreville": "ZONE 17",
        "Mesnil-Verclives": "ZONE 17",
        "Houville-en-Vexin": "ZONE 17"
    },
    "27480": {
        "Fleury-la-Forêt": "ZONE 17",
        "Bézu-la-Forêt": "ZONE 17",
        "Beauficel-en-Lyons": "ZONE 17",
        "Lorleau": "ZONE 17",
        "Bosquentin": "ZONE 17",
        "Lilly": "ZONE 17",
        "Lyons-la-Forêt": "ZONE 17",
        "Tronquay": "ZONE 17"
    },
    "27910": {
        "Perriers-sur-Andelle": "ZONE 17",
        "Les Hogues": "ZONE 17",
        "Perruel": "ZONE 17",
        "Vascoeuil": "ZONE 17",
        "Letteguives": "ZONE 17",
        "Renneville": "ZONE 17"
    },
    "60600": {
        "AGNETZ": "ZONE 18",
        "CLERMONT": "ZONE 18",
        "FITZ JAMES": "ZONE 18",
        "BREUIL LE VERT": "ZONE 18",
        "AIRION": "ZONE 18",
        "ERQUERY": "ZONE 18",
        "ETOUY": "ZONE 18",
        "LAMECOURT": "ZONE 18",
        "MAIMBEVILLE": "ZONE 18",
        "REMECOURT": "ZONE 18",
        "SAINT AUBIN SOUS ERQUERY": "ZONE 18"
    },
    "60840": {
        "BREUIL LE SEC": "ZONE 18",
        "NOINTEL": "ZONE 18",
        "CATENOY": "ZONE 18"
    },
    "60140": {
        "BAILLEVAL": "ZONE 18",
        "LABRUYERE": "ZONE 18",
        "LIANCOURT": "ZONE 18",
        "MOGNEVILLE": "ZONE 18",
        "ROSOY": "ZONE 18",
        "VERDERONNE": "ZONE 18"
    },
    "60290": {
        "CAMBRONNE LES CLERMONT": "ZONE 18",
        "CAUFFRY": "ZONE 18",
        "LAIGNEVILLE": "ZONE 18",
        "MONCHY SAINT ELOI": "ZONE 18",
        "NEUILLY SOUS CLERMONT": "ZONE 18",
        "RANTIGNY": "ZONE 18"
    },
    "60870": {
        "RIEUX": "ZONE 18",
        "BRENOUILLE": "ZONE 18",
        "VILLERS SAINT PAUL": "ZONE 18"
    },
    "60940": {
        "MONCEAUX": "ZONE 18",
        "CINQUEUX": "ZONE 18",
        "ANGICOURT": "ZONE 18"
    },
    "60700": {
        "BAZICOURT": "ZONE 18",
        "BEAUREPAIRE": "ZONE 18",
        "FLEURINES": "ZONE 18",
        "LES AGEUX": "ZONE 18",
        "PONT SAINTE MAXENCE": "ZONE 18",
        "PONTPOINT": "ZONE 18",
        "SACY LE GRAND": "ZONE 18",
        "SAINT MARTIN LONGUEAU": "ZONE 18"
    },
    "60190": {
        "Arsy": "ZONE 18",
        "Avrigny": "ZONE 18",
        "Bailleul le Soc": "ZONE 18",
        "Baugy": "ZONE 18",
        "Blincourt": "ZONE 18",
        "Cernoy": "ZONE 18",
        "Choisy la Victoire": "ZONE 18",
        "Cressonsacq": "ZONE 18",
        "Epineuse": "ZONE 18",
        "Estrées-Saint-Denis": "ZONE 18",
        "Fouilleuse": "ZONE 18",
        "Francières": "ZONE 18",
        "Gournay sur Aronde": "ZONE 18",
        "Grandvillers aux Bois": "ZONE 18",
        "Hémévillers": "ZONE 18",
        "Lachelle": "ZONE 18",
        "Laneuvilleroy": "ZONE 18",
        "Montiers": "ZONE 18",
        "Montmartin": "ZONE 18",
        "Moyenneville": "ZONE 18",
        "Moyvillers": "ZONE 18",
        "Neufvy sur Aronde": "ZONE 18",
        "Pronleroy": "ZONE 18",
        "Rémy": "ZONE 18",
        "Rouvillers": "ZONE 18",
        "Sacy le Petit": "ZONE 18"
    },
    "60930": {
        "Bailleul-sur-Thérain": "ZONE 2"
    },
    "60112": {
        "Milly-sur-Thérain": "ZONE 3",
        "Troissereux": "ZONE 3",
        "Herchies": "ZONE 3",
        "Crillon": "ZONE 3",
        "Pierrefitte-en-Beauvaisis": "ZONE 3",
        "Bonnières": "ZONE 3",
        "Haucourt": "ZONE 3",
        "Martincourt": "ZONE 3",
        "Vrocourt": "ZONE 3",
        "Verderel-lès-Sauqueuse": "ZONE 3",
        "Juvignies": "ZONE 3",
        "La Neuville-Vault": "ZONE 3",
        "Maisoncelle-Saint-Pierre": "ZONE 3"
    },
    "60590": {
        "Sérifontaine": "ZONE 4",
        "Trie-Château": "ZONE 4",
        "Talmontiers": "ZONE 4",
        "Flavacourt": "ZONE 4",
        "Lalande-en-Son": "ZONE 4",
        "Éragny-sur-Epte": "ZONE 4",
        "Labosse": "ZONE 4",
        "Villers-sur-Trie": "ZONE 4",
        "Le Vaumain": "ZONE 4",
        "Trie-la-Ville": "ZONE 4",
        "Boutencourt": "ZONE 4",
        "Énencourt-Léage": "ZONE 4"
    },
    "60850": {
        "Saint-Pierre-es-Champs": "ZONE 4",
        "Lalandelle": "ZONE 4",
        "Puiseux-en-Bray": "ZONE 4",
        "Saint-Germer-de-Fly": "ZONE 5",
        "Cuigy-en-Bray": "ZONE 5",
        "Le Coudray-Saint-Germer": "ZONE 5"
    },
    "76220": {
        "Gournay-en-Bray": "ZONE 5",
        "Ferrières-en-Bray": "ZONE 5",
        "Neuf-Marché": "ZONE 5",
        "Cuy-Saint-Fiacre": "ZONE 5",
        "Beauvoir-en-Lyons": "ZONE 5",
        "Brémontier-Merval": "ZONE 5",
        "Dampierre-en-Bray": "ZONE 5",
        "Bosc-Hyons": "ZONE 5",
        "Elbeuf-en-Bray": "ZONE 5",
        "La Feuillie": "ZONE 7"
    },
    "60240": {
        "Chaumont-en-Vexin": "ZONE 6",
        "Jouy-sous-Thelle": "ZONE 6",
        "Le Mesnil-Théribus": "ZONE 6",
        "Monneville": "ZONE 6",
        "Fresneaux-Montchevreuil": "ZONE 6",
        "Montagny-en-Vexin": "ZONE 6",
        "Liancourt-Saint-Pierre": "ZONE 6",
        "Fleury": "ZONE 6",
        "Delincourt": "ZONE 6",
        "Lavilletertre": "ZONE 6",
        "Montjavoult": "ZONE 6",
        "Fresne-Léguillon": "ZONE 6",
        "Bachivillers": "ZONE 6",
        "Fay-les-Étangs": "ZONE 6",
        "Boubiers": "ZONE 6",
        "Hadancourt-le-Haut-Clocher": "ZONE 6",
        "Bouconvillers": "ZONE 6",
        "Parnes": "ZONE 6",
        "Loconville": "ZONE 6",
        "Senots": "ZONE 6",
        "Jaméricourt": "ZONE 6",
        "Serans": "ZONE 6",
        "Lierville": "ZONE 6",
        "Thibivillers": "ZONE 6",
        "Énencourt-le-Sec": "ZONE 6",
        "Boissy-le-Bois": "ZONE 6",
        "Vaudancourt": "ZONE 6",
        "Tourly": "ZONE 6",
        "Chavençon": "ZONE 6",
        "Reilly": "ZONE 6",
        "Hardivillers-en-Vexin": "ZONE 6",
        "Boury-en-Vexin": "ZONE 8",
        "Chambors": "ZONE 8",
        "Lattainville": "ZONE 8",
        "Courcelles-lès-Gisors": "ZONE 8"
    },
    "76440": {
        "Saumont-la-Poterie": "ZONE 7",
        "Forges-les-Eaux": "ZONE 7",
        "Serqueux": "ZONE 7",
        "Sommery": "ZONE 7",
        "Le Fossé": "ZONE 7",
        "Beaubec-la-Rosière": "ZONE 7",
        "Grumesnil": "ZONE 7",
        "Roncherolles-en-Bray": "ZONE 7",
        "La Ferté-Saint-Samson": "ZONE 7"
    },
    "76780": {
        "Sigy-en-Bray": "ZONE 7",
        "Croisy-sur-Andelle": "ZONE 7",
        "Nolléval": "ZONE 7",
        "Elbeuf-sur-Andelle": "ZONE 7"
    },
    "27140": {
        "Gisors": "ZONE 8",
        "Bazincourt-sur-Epte": "ZONE 8",
        "Saint-Denis-le-Ferment": "ZONE 8",
        "Amécourt": "ZONE 8"
    },
    "27150": {
        "Étrépagny": "ZONE 8",
        "Boisemont": "ZONE 8",
        "Longchamps": "ZONE 8",
        "Hébécourt": "ZONE 8",
        "Morgny": "ZONE 8",
        "Puchay": "ZONE 8",
        "Hacqueville": "ZONE 8",
        "Mainneville": "ZONE 8",
        "Le Thil": "ZONE 8",
        "Chauvincourt-Provemont": "ZONE 8",
        "La Neuve-Grange": "ZONE 8",
        "Gamaches-en-Vexin": "ZONE 8",
        "Nojeon-en-Vexin": "ZONE 8",
        "Doudeauville-en-Vexin": "ZONE 8",
        "Sancourt": "ZONE 8",
        "Martagny": "ZONE 8",
        "Mesnil-sous-Vienne": "ZONE 8",
        "Bouchevilliers": "ZONE 8",
        "Saussay-la-Campagne": "ZONE 8",
        "Farceaux": "ZONE 8",
        "Sainte-Marie-de-Vatimesnil": "ZONE 8",
        "Coudray": "ZONE 8"
    },
    "27420": {
        "Les Thilliers-en-Vexin": "ZONE 8",
        "Villers-en-Vexin": "ZONE 8",
        "Richeville": "ZONE 8",
        "Mouflaines": "ZONE 8",
        "Cantiers": "ZONE 8",
        "Château-sur-Epte": "ZONE 8",
        "Authevernes": "ZONE 8",
        "Cahaignes": "ZONE 8",
        "Suzay": "ZONE 8"
    },
    "27510": {
        "Tourny": "ZONE 8",
        "Mézières-en-Vexin": "ZONE 8",
        "Forêt-la-Folie": "ZONE 8",
        "Panilleuse": "ZONE 8",
        "Fontenay": "ZONE 8",
        "Guitry": "ZONE 8"
    },
    "27610": {
        "Romilly-sur-Andelle": "ZONE 8"
    },
    "27620": {
        "Gasny": "ZONE 8",
        "Bois-Jérôme-Saint-Ouen": "ZONE 8",
        "Sainte-Geneviève-lès-Gasny": "ZONE 8",
        "Giverny": "ZONE 8"
    },
    "27630": {
        "Écos": "ZONE 8",
        "Fourges": "ZONE 8",
        "Heubécourt-Haricourt": "ZONE 8",
        "Bus-Saint-Rémy": "ZONE 8",
        "Berthenonville": "ZONE 8",
        "Civières": "ZONE 8",
        "Dampsmesnil": "ZONE 8",
        "Fours-en-Vexin": "ZONE 8"
    },
    "27660": {
        "Bézu-Saint-Éloi": "ZONE 8",
        "Bernouville": "ZONE 8"
    },
    "27720": {
        "Dangu": "ZONE 8",
        "Guerny": "ZONE 8",
        "Noyers": "ZONE 8"
    },
    "27830": {
        "Neaufles-Saint-Martin": "ZONE 8"
    },
    "27850": {
        "Ménesqueville": "ZONE 8"
    },
    "27860": {
        "Heudicourt": "ZONE 8"
    },
    "27870": {
        "Vesly": "ZONE 8"
    }
}

def get_zone_from_postal_code_and_city(postal_code, city):
    """
    Retourne la zone correspondant au code postal et à la commune

    Args:
        postal_code (str): Code postal
        city (str): Nom de la commune

    Returns:
        str: Zone (ex: "ZONE 1") ou None si non trouvé
    """
    if not postal_code or not city:
        return None

    # Nettoyer les entrées
    postal_code = cstr(postal_code).strip()
    city = cstr(city).strip()

    # Vérifier si le code postal existe dans le mapping
    if postal_code in ZONE_MAPPING:
        commune_mapping = ZONE_MAPPING[postal_code]

        # Recherche exacte d'abord
        if city in commune_mapping:
            return commune_mapping[city]

        # Recherche insensible à la casse
        city_upper = city.upper()
        for commune_name, zone in commune_mapping.items():
            if commune_name.upper() == city_upper:
                return zone

        # Recherche partielle (contient)
        for commune_name, zone in commune_mapping.items():
            if city_upper in commune_name.upper() or commune_name.upper() in city_upper:
                return zone

    return None

def auto_assign_zone_to_customer(doc, method):
    """
    Fonction appelée automatiquement lors de la création/modification d'un client
    Assigne automatiquement la zone basée sur le code postal et la commune
    """
    try:
        # Récupérer le code postal et la ville depuis l'adresse principale
        postal_code = None
        city = None

        # Méthode 1: Depuis les champs custom du client
        if hasattr(doc, 'custom_postal_code') and hasattr(doc, 'custom_city'):
            postal_code = doc.custom_postal_code
            city = doc.custom_city

        # Méthode 2: Depuis la première adresse liée au client
        if not postal_code or not city:
            customer_addresses = frappe.get_all(
                "Dynamic Link",
                filters={
                    "link_doctype": "Customer",
                    "link_name": doc.name,
                    "parenttype": "Address"
                },
                fields=["parent"]
            )

            if customer_addresses:
                # Prendre la première adresse
                address_name = customer_addresses[0].parent
                address = frappe.get_doc("Address", address_name)

                if not postal_code:
                    postal_code = address.pincode
                if not city:
                    city = address.city

        # Si on a un code postal et une ville, chercher la zone
        if postal_code and city:
            zone = get_zone_from_postal_code_and_city(postal_code, city)

            if zone:
                # Assigner la zone au champ territory du client
                doc.territory = zone

                frappe.msgprint(
                    f"Zone automatiquement assignée: {zone} (basée sur {postal_code} - {city})",
                    indicator="green"
                )

                # Log pour debug
                frappe.log_error(
                    f"Zone auto-assignée pour client {doc.name}: {zone} ({postal_code} - {city})",
                    "Auto Zone Assignment"
                )
            else:
                frappe.msgprint(
                    f"Aucune zone trouvée pour {postal_code} - {city}",
                    indicator="orange"
                )

    except Exception as e:
        frappe.log_error(
            f"Erreur lors de l'assignation automatique de zone pour {doc.name}: {str(e)}",
            "Auto Zone Assignment Error"
        )

@frappe.whitelist()
def manual_assign_zone(customer_name, postal_code, city):
    """
    Fonction manuelle pour assigner une zone à un client
    """
    try:
        zone = get_zone_from_postal_code_and_city(postal_code, city)

        if zone:
            frappe.db.set_value("Customer", customer_name, "territory", zone)
            frappe.db.commit()

            return {
                "status": "success",
                "message": f"Zone {zone} assignée au client {customer_name}",
                "zone": zone
            }
        else:
            return {
                "status": "error",
                "message": f"Aucune zone trouvée pour {postal_code} - {city}"
            }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@frappe.whitelist()
def search_zone(postal_code, city):
    """
    Fonction pour rechercher une zone sans l'assigner
    """
    try:
        zone = get_zone_from_postal_code_and_city(postal_code, city)

        return {
            "status": "success",
            "zone": zone,
            "message": f"Zone trouvée: {zone}" if zone else "Aucune zone trouvée"
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }