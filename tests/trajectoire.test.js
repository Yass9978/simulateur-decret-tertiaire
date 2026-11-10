/* Tests du simulateur. Lancer : npm test (ou node --test tests/) */
const test = require('node:test');
const assert = require('node:assert/strict');
const DT = require('../src/trajectoire.js');

const base = { categorie: 'bureaux', surface_m2: '5000', annee_ref: '2019', conso_ref_kwh: '1 000 000', annee_der: '2025' };

test('objectif 2030 = -40 % de la référence', () => {
  const r = DT.calculer({ ...base, conso_der_kwh: '590 000' });
  assert.equal(r.valeurs.obj_2030, 600000);
  assert.equal(r.valeurs.obj_2040, 500000);
  assert.equal(r.valeurs.obj_2050, 400000);
  assert.equal(r.sous_cas, 'OBJECTIF_ATTEINT');
});

test('positions sur la trajectoire', () => {
  // réduction attendue en 2025 : 40 % × 6/11 = 21,8 % ; marge « en avance » : +5 points
  assert.equal(DT.calculer({ ...base, conso_der_kwh: '700 000' }).sous_cas, 'AVANCE');
  assert.equal(DT.calculer({ ...base, conso_der_kwh: '770 000' }).cas, 'DANS_TRAJECTOIRE');
  const dec = DT.calculer({ ...base, conso_der_kwh: '900 000' });
  assert.equal(dec.cas, 'DECROCHE');
  assert.equal(dec.sous_cas, null);
  assert.equal(Math.round(dec.valeurs.effort_annuel_kwh), 60000);
  const hausse = DT.calculer({ ...base, conso_der_kwh: '1 100 000' });
  assert.equal(hausse.sous_cas, 'HAUSSE');
  assert.ok(hausse.resume.join(' ').includes('consommation en hausse'));
});

test('avertissements et année de référence provisoire', () => {
  const r = DT.calculer({ categorie: 'nsp', surface_m2: '800', annee_ref: 'nsp', annee_ref_provisoire_valeur: '2018', conso_ref_kwh: '100000', annee_der: '2020', conso_der_kwh: '10000' });
  assert.equal(r.valeurs.annee_ref, 2018);
  assert.equal(r.valeurs.annee_ref_provisoire, true);
  assert.equal(r.avertissements.length, 4);
  assert.ok(r.mention.includes('pas encore choisie'));
  assert.ok(r.chiffres[0][1].includes('kWh/m²'));
});

test('saisie au format français', () => {
  assert.equal(DT.parseNombre('1 234,5'), 1234.5);
  assert.ok(Number.isNaN(DT.parseNombre('')));
});
