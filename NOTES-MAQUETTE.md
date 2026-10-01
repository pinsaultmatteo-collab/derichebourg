# Derichebourg — maquette de refonte du site (30 septembre 2026)

## Ouvrir la maquette

Le site est statique, dans le dossier `site/`. Il a besoin d'un petit serveur local (les données de carte sont chargées en `fetch`).

```bash
node tools/serve.js 8791
```

Puis ouvrir http://localhost:8791/. Dans Claude Code, la configuration `derichebourg-site` de `.claude/launch.json` lance ce serveur en un clic.

## Ce qui est livré

Huit pages, une seule identité (fusion recommandée de derichebourg.com et derichebourg-environnement.com) :

| Page | Contenu | Pièce maîtresse |
|---|---|---|
| `index.html` | Accueil : manifeste, chiffres, chaîne de valeur, publics, rayonnement, frise, innovation, engagements, actualités | Hero 3D (1 400 fragments métalliques qui s'assemblent en lingot au défilement), globe 3D des 455 sites, boucle SVG en 5 étapes, frise horizontale épinglée |
| `groupe.html` | Histoire, gouvernance, chiffres, implantations, valeurs | Carte interactive d3 (Europe / France / Monde, filtres pays et métier, sites phares) |
| `metiers.html` | 4 publics × 11 prestations, procédé, 10 filières | Schéma animé du procédé (réception → cisaillage → broyeur → magnétique → Foucault → 3 destinations) avec particules triées par nature |
| `innovation.html` | Thèse, 8 installations 2020-2027, 4 procédés, partenariats, marché | Pictogrammes animés, graphique du taux de valorisation |
| `engagements.html` | Climat, sécurité & qualité, social, éthique | ACV par métal, courbe du TF, 9 badges d'habilitations |
| `carrieres.html` | Pourquoi nous, familles de métiers, parcours, offres, alternance | |
| `investisseurs.html` | Action, chiffres, agenda, documents, contact IR | |
| `contact.html` | Formulaire segmenté par public, carte « trouver un site » | |

Stack : HTML/CSS/JS sans framework, GSAP + ScrollTrigger, Lenis (défilement lissé), Three.js (3D), d3-geo + TopoJSON (cartes). Polices Archivo / Inter / IBM Plex Mono. Charte : rouge `#D52B1E` (web) et `#ED1C24` (logo), noir, blanc. Logo vectoriel d'origine conservé, déclinaison blanche et emblème seul dans `site/assets/logo/`.

## Photos

- 32 photos réelles récupérées dans la médiathèque du site actuel (lingots d'aluminium, montagne de ferraille, camions siglés Derichebourg, ligne DEEE, balayeuses devant Notre-Dame, archives « Notre histoire »).
- 4 photos issues des sites des filiales : Derichebourg España (Lyrsa) et Scholz Recycling, pour la frise historique (`lyrsa-*`, `scholz-*`).
- 23 photos Unsplash (préfixe `u-`, plus `histoire-bourse.jpg`, le palais Brongniart) pour les ambiances aciérie, coulée, câbles, aérien. Licence Unsplash, libres d'usage ; à remplacer par les photos et vidéos drone du client.

## Données à valider avec le client avant présentation

- Positions des 455 sites et répartition par pays : générées pour la démonstration (`site/assets/data/sites.json`). Les 8 sites phares sont documentés.
- Actionnariat ≈ 41 % CFER : dernier chiffre public (2019).
- Taux de sites certifiés ISO, heures de formation 2025, points intermédiaires de la courbe du TF (2021, 2023).
- Offres d'emploi, agenda financier (dates « à confirmer »), module cours de bourse (flux Euronext à brancher).
- Versions EN / DE / ES : sélecteur présent, contenus à traduire.

## Pistes pour la phase suivante

Rendu serveur ou statique déjà acquis (SEO), connexion SIRH et base des implantations, module actualités alimenté par le flux investisseurs, vidéo drone dans le hero en alternative à la 3D, intégration de la marque Scholz.
