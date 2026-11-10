# Simulateur Décret Tertiaire : trajectoire 2030, 2040, 2050

Simulateur **gratuit et open source** pour calculer sa trajectoire **Décret Tertiaire** (dispositif **Éco Énergie Tertiaire**, déclarations **OPERAT**) en méthode relative :

- objectifs de réduction **−40 % en 2030**, **−50 % en 2040**, **−60 % en 2050** par rapport à l’année de référence (2010–2022) ;
- réduction déjà obtenue et réduction attendue à date (trajectoire linéaire) ;
- **écart restant** en kWh et en % ;
- **effort annuel** moyen à fournir jusqu’en 2030 (kWh/an et %/an) ;
- position : *objectif atteint*, *en avance*, *dans la trajectoire*, *décroché*, *consommation en hausse* ;
- avertissements de saisie (surface < 1 000 m², années Covid 2020–2021, écarts incohérents).

👉 **Démo en ligne** : [yass9978.github.io/simulateur-decret-tertiaire](https://yass9978.github.io/simulateur-decret-tertiaire/)
👉 **Version complète avec accompagnement** : [smteng.fr — simulateur trajectoire décret tertiaire](https://smteng.fr/simulateurs/trajectoire-decret-tertiaire/)

Aucune dépendance, aucun appel réseau : le calcul tourne entièrement dans le navigateur (ou sous Node).

## Utilisation

### Dans une page web

```html
<script src="src/trajectoire.js"></script>
<script>
  const r = DecretTertiaire.calculer({
    categorie: 'bureaux',
    surface_m2: '5 000',
    annee_ref: '2019',
    conso_ref_kwh: '1 000 000',
    annee_der: '2025',
    conso_der_kwh: '850 000'
  });
  console.log(r.statut);   // « Décroché de la trajectoire »
  console.log(r.chiffres); // objectif 2030, réduction obtenue, écart, effort annuel…
</script>
```

### Sous Node.js

```js
const DecretTertiaire = require('./src/trajectoire.js');
const r = DecretTertiaire.calculer({ surface_m2: 5000, annee_ref: '2019', conso_ref_kwh: 1e6, annee_der: '2025', conso_der_kwh: 850000 });
console.log(r.valeurs.obj_2030); // 600000
```

Les nombres acceptent le format français (`"1 000 000"`, `"1234,5"`).

### Résultat renvoyé

| Champ | Contenu |
|---|---|
| `cas` / `sous_cas` | `EN_AVANCE` (`OBJECTIF_ATTEINT`, `AVANCE`), `DANS_TRAJECTOIRE`, `DECROCHE` (`HAUSSE`) |
| `statut`, `detail` | Libellé et explication rédigés |
| `valeurs` | `obj_2030`, `obj_2040`, `obj_2050`, `reduction_obtenue`, `reduction_attendue`, `ecart_kwh`, `effort_annuel_kwh`, `effort_annuel_pct`, intensités kWh/m²… |
| `chiffres` | Tableau prêt à afficher |
| `graphique` | Points de la trajectoire et position actuelle |
| `avertissements`, `mention` | Alertes de saisie et limites du calcul |

## Méthode de calcul

- Objectif année N = consommation de référence × (1 − taux N), avec 40 % / 50 % / 60 % (art. L174-1 du CCH, décret n° 2019-771).
- Réduction attendue à date = 40 % × (année déclarée − année de référence) / (2030 − année de référence).
- « En avance » si la réduction obtenue dépasse la réduction attendue de plus de 5 points.
- Effort annuel en % = 1 − (objectif 2030 / consommation actuelle)^(1 / années restantes).

**Limites** : calcul indicatif sur valeurs brutes. OPERAT applique des ajustements (climat, intensité d’usage) et permet l’**objectif en valeur absolue** par catégorie, qui peut être plus favorable. Pour un calcul complet, une modulation ou un plan d’actions (GTB, décret BACS, CEE), contactez [Smart Tech Engineering](https://smteng.fr/contact/).

## Tests

```bash
npm test
```

## Ressources

- [Décret tertiaire : obligations, échéances, OPERAT](https://smteng.fr/decret-tertiaire/)
- [Simulateurs réglementaires Smart Tech Engineering](https://smteng.fr/simulateurs/)
- [Smart Tech Engineering, bureau d’études GTB et efficacité énergétique](https://smteng.fr/)

## Licence

MIT © 2026 [Smart Tech Engineering](https://smteng.fr/). Réutilisation libre, une mention avec lien vers smteng.fr est appréciée.
