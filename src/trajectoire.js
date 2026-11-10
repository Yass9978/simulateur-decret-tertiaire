/*!
 * Simulateur Trajectoire Décret Tertiaire — v1.0.0
 * Calcul de l'objectif 2030 / 2040 / 2050 du dispositif Éco Énergie Tertiaire (méthode relative).
 * Logique pure, sans dépendance ni accès au DOM : navigateur (global DecretTertiaire) et Node (require).
 * (c) 2026 Smart Tech Engineering — https://smteng.fr — Licence MIT
 */
(function (racine, fabrique) {
  if (typeof module === 'object' && module.exports) { module.exports = fabrique(); } else { racine.DecretTertiaire = fabrique(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function fmtKwh(n) { n = Math.round(n / 100) * 100; return n.toLocaleString('fr-FR') + ' kWh'; }
  function fmtPct(x) { return (Math.round(x * 1000) / 10).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'; }
  function fmtEntier(n) { return Math.round(n).toLocaleString('fr-FR'); }
  function parseNombre(s) {
    if (typeof s === 'number') return s;
    if (!s) return NaN;
    var t = String(s).replace(/\s| | /g, '').replace(',', '.');
    return t === '' ? NaN : Number(t);
  }
  function libelle(question, valeur) {
    var o = (question.options || []).filter(function (x) { return x.v === valeur; })[0];
    return o ? o.l : (valeur == null ? '' : String(valeur));
  }

  /* ---------------- Paramètres réglementaires (art. L174-1 CCH, décret n° 2019-771) */
  var CONFIG61 = { version_regles: '2026-10-30', objectifs_relatifs: { 2030: 0.40, 2040: 0.50, 2050: 0.60 }, annee_cible: 2030, marge_en_avance_points: 0.05, prochaine_declaration: '2027-09-30', verification_2030: '2031-12-31' };
  var Q61 = [
    { code: 'categorie', titre: 'Quelle est la catégorie d’activité principale ?', aide: 'Catégorie déclarée sur OPERAT. Elle détermine l’objectif en valeur absolue, que nous pouvons évaluer avec vous.',
      options: [['bureaux', 'Bureaux, services'], ['commerce', 'Commerce'], ['restauration', 'Restauration'], ['hotellerie', 'Hôtellerie'], ['logistique', 'Logistique, entreposage'], ['sante', 'Santé'], ['enseignement', 'Enseignement'], ['sport_loisirs', 'Sport, culture, loisirs'], ['banque', 'Banque, assurance'], ['autre', 'Autre'], ['nsp', 'Je ne sais pas']] },
    { code: 'surface_m2', titre: 'Quelle est la surface de plancher de l’entité (m²) ?', aide: 'Surface déclarée sur OPERAT pour cette entité fonctionnelle assujettie (EFA).', type: 'nombre', min: 1, max: 1000000, unite: 'm²' },
    { code: 'annee_ref', titre: 'Quelle est votre année de référence ?', aide: 'Année choisie entre 2010 et 2022. Elle figure sur votre attestation OPERAT.', type: 'liste',
      options: (function () { var o = []; for (var a = 2010; a <= 2022; a++) o.push([String(a), String(a)]); o.push(['nsp', 'Pas encore choisie']); return o; })() },
    { code: 'conso_ref_kwh', titre: 'Consommation de l’année de référence (kWh, toutes énergies)', aide: 'Somme de l’électricité, du gaz, du fioul, des réseaux de chaleur ou de froid, en kWh d’énergie finale.', type: 'nombre', min: 1, unite: 'kWh' },
    { code: 'annee_der', titre: 'Quelle est la dernière année de consommation déclarée ?', aide: 'Exemple : déclaration de septembre 2026 = consommations 2025.', type: 'liste', defaut: '2025',
      options: (function () { var o = []; for (var a = 2020; a <= 2025; a++) o.push([String(a), String(a)]); return o; })() },
    { code: 'conso_der_kwh', titre: 'Consommation de cette dernière année (kWh, toutes énergies)', aide: 'Même périmètre que l’année de référence.', type: 'nombre', min: 1, unite: 'kWh' }
  ];
  var T61 = {
    OBJECTIF_ATTEINT: ['En avance : objectif 2030 déjà atteint', 'Votre consommation {annee_der} est inférieure à l’objectif 2030. L’enjeu est désormais de maintenir ce niveau dans la durée et de préparer l’échéance 2040 (−50 %). Vérifiez que vos déclarations OPERAT reflètent ce résultat, la prochaine étant attendue avant le 30/09/2027.'],
    AVANCE: ['En avance sur la trajectoire', 'Vous avez déjà réduit votre consommation de {reduction_obtenue}, au-delà de la trajectoire linéaire vers 2030. Il vous reste {ecart_kwh} à économiser. Planifier dès maintenant les actions restantes permet de les réaliser au meilleur coût et de préparer 2040.'],
    DANS_TRAJECTOIRE: ['Dans la trajectoire', 'Votre réduction ({reduction_obtenue}) suit la trajectoire attendue. Pour atteindre l’objectif, il vous faut encore réduire votre consommation d’environ {effort_annuel_pct} par an jusqu’en 2030. Les gains les plus simples sont souvent déjà réalisés : la suite demande un plan d’actions chiffré.'],
    DECROCHE: ['Décroché de la trajectoire', 'Votre réduction ({reduction_obtenue}) est inférieure à la trajectoire attendue ({reduction_attendue} en {annee_der}). Pour atteindre l’objectif 2030, l’effort nécessaire est d’environ {effort_annuel_pct} par an, soit {effort_annuel_kwh} par an. Un plan d’actions est à engager rapidement ; un dossier de modulation peut être envisagé si l’objectif est hors d’atteinte.'],
    HAUSSE: ['Décroché : consommation en hausse', 'Votre consommation {annee_der} est supérieure à celle de l’année de référence. Avant tout, vérifiez le périmètre déclaré (surface, énergies, changement d’activité) : une évolution de l’activité peut justifier une modulation. Sinon, un plan d’actions est à engager sans attendre.']
  };
  function avertissements61(r) {
    var a = [];
    var surface = parseNombre(r.surface_m2), ref = parseNombre(r.conso_ref_kwh), der = parseNombre(r.conso_der_kwh);
    if (r.annee_ref === 'nsp') a.push('Sans année de référence, nous calculons avec l’année que vous jugez la plus représentative. Saisissez une année provisoire.');
    if (surface > 0 && surface < 1000) a.push('En dessous de 1 000 m², le décret tertiaire ne s’applique en principe pas. Le calcul reste possible.');
    if (r.annee_der === '2020' || r.annee_der === '2021') a.push('Les années 2020 et 2021 peuvent être atypiques (crise sanitaire). Le résultat est à interpréter avec prudence.');
    if (ref > 0 && der > 0 && (der < 0.2 * ref || der > 3 * ref)) a.push('Vérifiez vos saisies : l’écart entre les deux années est inhabituel.');
    return a;
  }
  function calculer61(r) {
    var C = CONFIG61;
    var ref = parseNombre(r.conso_ref_kwh), der = parseNombre(r.conso_der_kwh), surface = parseNombre(r.surface_m2);
    var annee_ref = Number(r.annee_ref_provisoire_valeur || r.annee_ref), annee_der = Number(r.annee_der);
    var provisoire = r.annee_ref === 'nsp' || !!r.annee_ref_provisoire;
    if (!(annee_ref >= 2010 && annee_ref <= 2022)) annee_ref = 2019;
    var obj = { 2030: ref * (1 - C.objectifs_relatifs[2030]), 2040: ref * (1 - C.objectifs_relatifs[2040]), 2050: ref * (1 - C.objectifs_relatifs[2050]) };
    var reduction_obtenue = (ref - der) / ref;
    var ecart_kwh = der - obj[2030];
    var ecart_pct = ecart_kwh / der;
    var ecart_points = C.objectifs_relatifs[2030] - reduction_obtenue;
    var annees_restantes = Math.max(1, C.annee_cible - annee_der);
    var effort_annuel_kwh = ecart_kwh > 0 ? ecart_kwh / annees_restantes : 0;
    var effort_annuel_pct = ecart_kwh > 0 ? 1 - Math.pow(obj[2030] / der, 1 / annees_restantes) : 0;
    var reduction_attendue = C.objectifs_relatifs[2030] * (annee_der - annee_ref) / (C.annee_cible - annee_ref);
    var cas, sous_cas = null;
    if (ecart_kwh <= 0) { cas = 'EN_AVANCE'; sous_cas = 'OBJECTIF_ATTEINT'; }
    else if (reduction_obtenue >= reduction_attendue + C.marge_en_avance_points) { cas = 'EN_AVANCE'; sous_cas = 'AVANCE'; }
    else if (reduction_obtenue >= reduction_attendue) { cas = 'DANS_TRAJECTOIRE'; }
    else { cas = 'DECROCHE'; if (reduction_obtenue < 0) sous_cas = 'HAUSSE'; }
    var cle = sous_cas || cas;
    var vals = { annee_der: annee_der, annee_ref: annee_ref, reduction_obtenue: fmtPct(reduction_obtenue), reduction_attendue: fmtPct(reduction_attendue), ecart_kwh: fmtKwh(ecart_kwh), effort_annuel_pct: fmtPct(effort_annuel_pct), effort_annuel_kwh: fmtKwh(effort_annuel_kwh) };
    var detail = T61[cle][1].replace(/\{(\w+)\}/g, function (_, k) { return vals[k]; });
    var cat = libelle(Q61[0], r.categorie);
    var mention = 'Calcul indicatif en méthode relative, sur les valeurs brutes saisies. OPERAT applique des ajustements, notamment climatiques. L’objectif en valeur absolue de votre catégorie (' + cat + ') n’est pas calculé ici : il dépend de nombreux paramètres et peut être plus favorable. Nous pouvons l’évaluer avec vous.' + (provisoire ? ' Votre année de référence n’est pas encore choisie : ce choix peut modifier sensiblement votre objectif.' : '');
    var chiffres = [
      ['Objectif 2030 (−40 %)', fmtKwh(obj[2030]) + ' — soit ' + fmtEntier(obj[2030] / surface) + ' kWh/m² par an'],
      ['Réduction déjà obtenue', fmtPct(reduction_obtenue) + ' (de ' + annee_ref + ' à ' + annee_der + ')'],
      ['Écart restant', ecart_kwh > 0 ? fmtKwh(ecart_kwh) + ', soit ' + fmtPct(ecart_pct) + ' de votre consommation ' + annee_der : 'Objectif atteint'],
      ['Effort annuel moyen jusqu’en 2030', ecart_kwh > 0 ? fmtKwh(effort_annuel_kwh) + ' par an, soit environ ' + fmtPct(effort_annuel_pct) + ' par an' : 'Aucun'],
      ['Pour information', 'objectifs 2040 (' + fmtKwh(obj[2040]) + ') et 2050 (' + fmtKwh(obj[2050]) + ')']
    ];
    return { id: '61-trajectoire-decret-tertiaire', version_regles: C.version_regles, cas: cas, sous_cas: sous_cas, statut: T61[cle][0], detail: detail, reference: 'Art. L174-1 CCH, décret n° 2019-771',
             couleur: cas === 'EN_AVANCE' ? 'vert' : (cas === 'DANS_TRAJECTOIRE' ? 'bleu' : 'rouge'), mention: mention, chiffres: chiffres,
             valeurs: { ref: ref, der: der, surface: surface, annee_ref: annee_ref, annee_der: annee_der, obj_2030: obj[2030], obj_2040: obj[2040], obj_2050: obj[2050], reduction_obtenue: reduction_obtenue, ecart_kwh: ecart_kwh, ecart_pct: ecart_pct, ecart_points: ecart_points, effort_annuel_kwh: effort_annuel_kwh, effort_annuel_pct: effort_annuel_pct, reduction_attendue: reduction_attendue, intensite_ref: ref / surface, intensite_der: der / surface, annee_ref_provisoire: provisoire },
             graphique: { points: [[annee_ref, ref], [C.annee_cible, obj[2030]]], situation: [annee_der, der], prolongement: [[2040, obj[2040]], [2050, obj[2050]]] },
             avertissements: avertissements61(r),
             resume: chiffres.map(function (c) { return c[0] + ' : ' + c[1]; }).concat(['Position : ' + T61[cle][0], detail]),
             resume: chiffres.map(function (c) { return c[0] + ' : ' + c[1]; }).concat(['Position : ' + T61[cle][0], detail]) };
  }

  return { CONFIG: CONFIG61, QUESTIONS: Q61, TEXTES: T61, calculer: calculer61, avertissements: avertissements61,
           parseNombre: parseNombre, libelle: libelle, fmtKwh: fmtKwh, fmtPct: fmtPct, fmtEntier: fmtEntier };
});
