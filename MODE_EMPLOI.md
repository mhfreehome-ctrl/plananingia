# Mode d'emploi — PlanningIA

> **Guide pratique complet** · Coordination IA des chantiers BTP
> Application web : [planningia.com](https://planningia.com)
> Dernière mise à jour : mars 2026

---

## Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Connexion & déconnexion](#2-connexion--déconnexion)
3. [Profils & niveaux d'accès](#3-profils--niveaux-daccès)
4. [Parcours Administrateur / Éditeur / Conducteur](#4-parcours-administrateur--éditeur--conducteur)
   - 4.1 [Tableau de bord](#41-tableau-de-bord)
   - 4.2 [Projets — Liste](#42-projets--liste)
   - 4.3 [Créer un nouveau projet](#43-créer-un-nouveau-projet)
   - 4.4 [Détail projet — Planning Gantt](#44-détail-projet--planning-gantt)
   - 4.5 [Détail projet — Lots](#45-détail-projet--lots)
   - 4.6 [Détail projet — Dépendances](#46-détail-projet--dépendances)
   - 4.7 [Planning global](#47-planning-global)
   - 4.8 [Clients / Maîtres d'ouvrage](#48-clients--maîtres-douvrage)
   - 4.9 [Utilisateurs](#49-utilisateurs)
   - 4.10 [Équipes](#410-équipes)
   - 4.11 [Entreprise](#411-entreprise)
   - 4.12 [Notifications](#412-notifications)
   - 4.13 [Mode d'emploi intégré](#413-mode-demploi-intégré)
5. [Parcours Sous-traitant (Salarié externe)](#5-parcours-sous-traitant-salarié-externe)
   - 5.1 [Tableau de bord](#51-tableau-de-bord)
   - 5.2 [Mes Lots](#52-mes-lots)
   - 5.3 [Planning personnel](#53-planning-personnel)
6. [Workflows clés](#6-workflows-clés)
   - 6.1 [Créer et planifier un chantier avec l'IA](#61-créer-et-planifier-un-chantier-avec-lia)
   - 6.2 [Inviter un collaborateur](#62-inviter-un-collaborateur)
   - 6.3 [Déclarer l'avancement d'un lot](#63-déclarer-lavancement-dun-lot)
   - 6.4 [Calculer le chemin critique (CPM)](#64-calculer-le-chemin-critique-cpm)
   - 6.5 [Exporter le planning en PDF](#65-exporter-le-planning-en-pdf)
7. [FAQ & astuces](#7-faq--astuces)

---

## 1. Présentation générale

**PlanningIA** est un outil de coordination de chantiers BTP assisté par intelligence artificielle. Il permet de :

- **Créer et gérer des chantiers** (projets) avec leurs lots de travaux
- **Générer automatiquement un planning** via l'IA selon le type de chantier (façade, ITE, ravalement…)
- **Calculer le chemin critique (CPM)** pour identifier les lots bloquants
- **Suivre l'avancement** en temps réel avec des barres de progression
- **Coordonner les équipes et sous-traitants** avec des notifications automatiques
- **Visualiser tous les chantiers** sur un planning global multi-projets

---

## 2. Connexion & déconnexion

### Se connecter

1. Rendez-vous sur **[planningia.com](https://planningia.com)**
2. Saisissez votre **adresse email** et votre **mot de passe**
3. Cliquez sur **Se connecter**

![Écran de connexion](./docs/screenshots/login.png)
> *L'interface s'adapte automatiquement à votre profil : les admins arrivent sur le Tableau de bord, les sous-traitants sur leur espace personnel.*

**Mot de passe oublié ?** Cliquez sur « Mot de passe oublié ? » sous le formulaire → saisissez votre email → un lien de réinitialisation vous sera envoyé par mail.

### Se déconnecter

Cliquez sur **Déconnexion** en bas du menu latéral gauche.

### Changer de langue

Deux langues disponibles : **FR** (français) et **TR** (turc). Les boutons sont visibles en bas du menu latéral.

---

## 3. Profils & niveaux d'accès

PlanningIA distingue **deux rôles** et **quatre niveaux de droits internes** :

### Rôles

| Rôle | Description | Interface |
|------|-------------|-----------|
| **Admin** (employé interne) | Accès à la gestion complète de l'entreprise | `/dashboard` et sous-pages |
| **Sous-traitant** | Accès limité à ses propres lots et son planning | `/sub` et sous-pages |

### Niveaux de droits (pour les admins internes)

| Niveau | Badge | Capacités |
|--------|-------|-----------|
| 🔑 **Admin** | Orange | Accès complet + gestion des droits utilisateurs. Max 2 par entreprise. |
| ✏️ **Éditeur** | Violet | Lecture + écriture de tout, sauf modification des droits utilisateurs. |
| 🎯 **Conducteur** | Jaune | Voit uniquement ses projets. Peut éditer, pas supprimer. Pas d'accès gestion droits. |
| 👁 **Salarié** | Gris | Lecture seule de ses chantiers et équipes. Aucune modification. |

> 💡 **Astuce** : La colonne **TYPE / DROITS** dans la liste Utilisateurs affiche deux badges : le type de personne (Salarié) et son niveau d'accès (Admin, Éditeur, etc.).

---

## 4. Parcours Administrateur / Éditeur / Conducteur

### 4.1 Tableau de bord

**Menu :** Tableau de bord

Le tableau de bord affiche une vue synthétique de l'activité :

- **Projets actifs** — nombre de chantiers en cours
- **Total projets** — tous les projets de l'entreprise
- **Utilisateurs** — total des collaborateurs invités
- **Notifications** — alertes non lues

![Tableau de bord admin](./docs/screenshots/dashboard_admin.png)
> *Exemple : DESIGN FACADES — 80 projets, 44 utilisateurs actifs*

La section **Projets récents** liste les derniers chantiers modifiés avec leur statut et leur avancement. Cliquez sur **Voir →** pour accéder directement au détail d'un projet.

---

### 4.2 Projets — Liste

**Menu :** Projets

![Liste des projets](./docs/screenshots/projects_list.png)

La liste affiche tous vos chantiers avec :
- Nom du chantier et nom du client
- Badge statut : `Devis` `Programmé` `En cours` `Livré` `SAV`
- Barre d'avancement globale (% calculé sur les lots)
- Date de début prévue
- Nombre de lots

**Filtres disponibles :**
- Par statut (Tous, Devis, Programmé, En cours…)
- Par plage de dates de début
- Par client
- Par ville

**Vues :** Basculez entre la vue **Cartes** (grille) et la vue **Liste** (tableau) via les icônes en haut à droite.

**Recherche :** La barre de recherche filtre par nom, référence, ville ou client.

**Tri :** Choisissez le critère de tri (Date de début, Nom, Statut…) et l'ordre (↑↓).

---

### 4.3 Créer un nouveau projet

**Menu :** Projets → Nouveau projet

![Formulaire nouveau projet](./docs/screenshots/project_new.png)

Remplissez les champs :

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| Nom du chantier | ✅ | Nom complet du projet |
| Client | ✅ | Maître d'ouvrage (sélectionnable depuis votre liste clients) |
| Statut | ✅ | Devis / Programmé / En cours / Livré / SAV |
| Date de début | ✅ | Date prévue de démarrage des travaux |
| Ville | — | Localisation du chantier |
| Adresse | — | Adresse complète |
| Description | — | Notes libres sur le projet |
| Type de chantier | — | Sélectionner pour guider l'IA (Façade, ITE, Ravalement…) |

Cliquez **Créer le projet** pour valider. Vous serez redirigé vers la page détail du projet.

---

### 4.4 Détail projet — Planning Gantt

**Navigation :** Projets → [cliquer un projet] → onglet **Planning Gantt**

![Planning Gantt](./docs/screenshots/project_gantt.png)

Le Gantt affiche tous les lots du projet sous forme de barres horizontales sur une timeline.

**Éléments visibles :**

| Élément | Description |
|---------|-------------|
| 🔴 **Chemin critique** | Lots en rouge : tout retard impacte la date de fin du projet |
| 🟢 **Terminé** | Lots avec avancement 100% |
| **Flèches FS** | Dépendance Fin→Début entre lots |
| **Flèches SS** | Dépendance Début→Début |
| ⚡ **Jalons** | Dates clés matérialisées par une ligne verticale |
| **Échéance** | Date limite individuelle d'un lot |

**Zoom :** Basculez entre Jour / Semaine / Mois selon la granularité souhaitée.

**Interactivité :**
- **Glisser** une barre pour déplacer le lot dans le temps
- **Étirer le bord droit** d'une barre pour modifier la durée
- Cliquer sur le **📊** d'un lot pour voir son historique d'avancement

**Export PDF :**
- **A4** ou **A3** — le planning est capturé automatiquement et converti en PDF téléchargeable

**Boutons d'action :**

| Bouton | Rôle |
|--------|------|
| 🤖 **Générer par IA** | Génère automatiquement les lots et dépendances selon le type de chantier |
| 🔵 **Calculer le planning (CPM)** | Recalcule les dates au plus tôt / plus tard et le chemin critique |
| ✏️ **Modifier** | Édite les informations générales du projet |
| 🗑️ **Supprimer** | Supprime définitivement le projet (admin uniquement) |

---

### 4.5 Détail projet — Lots

**Navigation :** Projets → [cliquer un projet] → onglet **Lots**

![Liste des lots](./docs/screenshots/project_lots.png)

L'onglet Lots affiche le tableau détaillé de tous les lots avec :

| Colonne | Description |
|---------|-------------|
| **Code** | Code alphanumérique du lot (ex : IT11, BA30…) |
| **Désignation** | Libellé du lot |
| **Durée (j)** | Durée prévue en jours ouvrés |
| **Sous-traitant** | Personne ou équipe assignée |
| **Statut** | À venir / En cours / Terminé / En pause |
| **Avancement** | Barre de progression + % |

**Actions par lot :**
- 📊 Voir l'historique d'avancement
- 📋 Voir les tâches du lot
- ✂️ Gérer les assignations
- **Modifier** les informations
- **Supprimer** le lot

**Ajouter des lots :**
- **Depuis le catalogue** — sélectionner des lots prédéfinis selon le corps d'état
- **+ Ajouter un lot** — créer un lot personnalisé

---

### 4.6 Détail projet — Dépendances

**Navigation :** Projets → [cliquer un projet] → onglet **Dépendances**

Gérez les liens de précédence entre lots. Chaque dépendance indique quel lot doit être terminé (ou démarré) avant qu'un autre puisse commencer.

**Types de dépendances :**
- **FS (Fin → Début)** : le lot B commence quand le lot A est terminé
- **SS (Début → Début)** : le lot B commence en même temps que le lot A

---

### 4.7 Planning global

**Menu :** Planning global

![Planning global](./docs/screenshots/planning_global.png)

Le planning global affiche **tous les chantiers de l'entreprise** sur une timeline partagée. Il permet d'avoir une vue d'ensemble de la charge de travail et d'anticiper les conflits de ressources.

**Fonctionnalités :**
- Vue **Mois** (défaut) ou **Semaine**
- Filtre par **statut** (Tous, En cours, Programmé…)
- **Recherche** par nom de chantier
- Légende des couleurs : Devis / Programmé / En cours / Livré / SAV

Chaque ligne représente un projet. Une barre colorée matérialise sa période d'intervention.

---

### 4.8 Clients / Maîtres d'ouvrage

**Menu :** Clients

![Page clients](./docs/screenshots/clients.png)

Gérez votre carnet de clients (maîtres d'ouvrage, promoteurs, collectivités…).

**Informations par client :**
- Nom / Raison sociale
- Email, Téléphone
- Adresse, Ville, Code postal
- Notes libres
- Nombre de chantiers associés

**Créer un client :**

1. Cliquez **+ Nouveau client**
2. Renseignez au minimum le **Nom / Raison sociale**
3. Cliquez **Créer le client**

![Modal nouveau client](./docs/screenshots/client_modal.png)

**Fiche client :** Cliquez sur un client pour accéder à sa fiche détaillée avec la liste de tous ses chantiers associés.

> 💡 Lors de la création d'un projet, vous pouvez sélectionner un client existant depuis cette liste. Le lien client ↔ projet permet d'accéder à tous les chantiers d'un donneur d'ordre depuis sa fiche.

---

### 4.9 Utilisateurs

**Menu :** Utilisateurs

![Liste utilisateurs](./docs/screenshots/users.png)

Gérez tous les collaborateurs de votre entreprise. La page affiche :

| Colonne | Description |
|---------|-------------|
| **Prénom / Nom** | Identité du collaborateur |
| **Email** | Adresse de connexion |
| **Entreprise** | Société d'appartenance |
| **TYPE / DROITS** | Double badge : type (Salarié) + niveau d'accès (Admin/Éditeur/Conducteur/Salarié) |
| **Actif** | Statut du compte |

**Filtres :** Tous / Salariés / Sous-traitants

**Inviter un utilisateur :**

1. Cliquez **+ Inviter un utilisateur**
2. Saisissez l'**email** du collaborateur
3. Choisissez son **profil** (Admin / Éditeur / Conducteur / Salarié)
4. Choisissez son **type** (Salarié / Sous-traitant)
5. Cliquez **Envoyer l'invitation**

→ Le collaborateur reçoit un email avec un lien pour créer son mot de passe.

**Modifier un utilisateur :**

Cliquez **Modifier** pour changer ses informations, son niveau d'accès ou son type. (Admin uniquement pour la modification des droits.)

**Réinitialiser le mot de passe :**

Cliquez sur l'icône 🔑 à droite du collaborateur pour lui envoyer un email de réinitialisation.

---

### 4.10 Équipes

**Menu :** Équipes

![Page équipes](./docs/screenshots/teams.png)

Les équipes regroupent des salariés par corps de métier ou par chantier.

**Informations d'une équipe :**
- Nom et couleur distinctive
- Chef d'équipe
- Liste des membres (onglet **Membres**)
- Charge de travail (onglet **Charge**)

**Créer une équipe :**

1. Cliquez **+ Créer une équipe**
2. Donnez un nom et choisissez une couleur
3. Désignez un chef d'équipe
4. Ajoutez des membres depuis la liste des salariés

**Affecter une équipe à un lot :**

Depuis l'onglet Lots d'un projet, cliquez sur l'icône ✂️ d'un lot pour ouvrir la fenêtre d'assignation et sélectionnez l'équipe.

> 💡 Les équipes et leur charge de travail sont visibles depuis la page **Équipes → Charge** — idéal pour vérifier qu'une équipe n'est pas suraffectée sur plusieurs chantiers simultanément.

---

### 4.11 Entreprise

**Menu :** Entreprise

![Fiche entreprise](./docs/screenshots/company.png)

Configurez les informations de votre entreprise :

| Champ | Description |
|-------|-------------|
| Nom de l'entreprise | Raison sociale officielle |
| Type d'entreprise | Entreprise générale / Métier / Maître d'œuvre / Promoteur |
| SIRET | Numéro d'identification |
| Adresse, Ville, Code postal | Coordonnées |
| Téléphone, Email | Contacts officiels |

> ⚠️ **Important pour la génération IA :** Pour les entreprises de façade, renseignez correctement le **type d'entreprise** et les **types de lots** pratiqués (ITE, Enduit, Bardage…). L'IA utilise ces informations pour générer un planning adapté à votre activité.

---

### 4.12 Notifications

**Menu :** Notifications (ou icône 🔔 en haut à droite)

Les notifications signalent automatiquement :
- Une modification d'avancement sur un lot que vous suivez
- Un nouveau sous-traitant assigné à un lot
- Une date de lot dépassée
- Des actions effectuées par vos collaborateurs

Cliquez sur une notification pour naviguer directement vers l'élément concerné.

**Tout marquer comme lu :** bouton disponible en haut de la liste.

---

### 4.13 Mode d'emploi intégré

**Menu :** Mode d'emploi (en bas du menu latéral)

L'application intègre un guide interactif accessible à tout moment. Il présente les workflows étape par étape selon votre profil (Administrateur, Éditeur/Conducteur, Salarié, Sous-traitant) avec des captures d'écran illustrées.

**Export PDF :** Bouton **Imprimer / PDF** en haut à droite pour sauvegarder le guide.

---

## 5. Parcours Sous-traitant (Salarié externe)

Le sous-traitant accède à une interface simplifiée, focalisée sur **ses propres lots**. Il ne voit jamais les informations d'autres entreprises.

### 5.1 Tableau de bord

**URL :** `/sub`

![Dashboard sous-traitant](./docs/screenshots/sub_dashboard.png)

Après connexion, le sous-traitant voit :

| Compteur | Description |
|----------|-------------|
| **Mes lots** | Nombre total de lots qui lui sont assignés |
| **En cours** | Lots actuellement en cours d'exécution |
| **Prochaines interventions** | Lots dont la date de début est proche |

---

### 5.2 Mes Lots

**Menu :** Mes Lots

![Mes lots sous-traitant](./docs/screenshots/sub_lots.png)

Liste de tous les lots assignés au sous-traitant, tous chantiers confondus.

**Informations par lot :**
- Code et désignation du lot
- Nom du chantier
- Durée et dates (début → fin)
- Statut (À venir / En cours / Terminé / En pause)
- Badge **⚠️ Chemin critique** si ce lot est sur le chemin critique
- Barre de progression avec pourcentage

**Déclarer l'avancement :**

1. Cliquez **Déclarer l'avancement** sur le lot concerné
2. Saisissez le pourcentage d'avancement (0 à 100%)
3. Ajoutez un commentaire si nécessaire
4. Validez

→ L'avancement est immédiatement visible dans le Gantt côté administrateur. Une notification est envoyée aux admins.

**Filtres rapides :** Tous / À venir / En cours / En pause / Terminé

---

### 5.3 Planning personnel

**Menu :** Planning

![Planning sous-traitant](./docs/screenshots/sub_planning.png)

Vue Gantt personnelle montrant les lots du sous-traitant replacés dans le contexte de chaque chantier.

**Lecture du planning :**
- Chaque projet est affiché en section avec ses lots assignés mis en évidence (surlignés en orange)
- Les autres lots du même chantier apparaissent en gris (contexte)
- Les dépendances (flèches) sont visibles
- Badge **⚠️ Chemin critique** visible sur les lots concernés

**Zoom :** Jour / Semaine / Mois

---

## 6. Workflows clés

### 6.1 Créer et planifier un chantier avec l'IA

C'est le workflow principal de PlanningIA — de la création à un planning complet en quelques clics.

```
1. Projets → Nouveau projet
   → Renseigner nom, client, statut, date de début, type de chantier

2. Page Détail → Cliquer "Générer par IA"
   → L'IA crée automatiquement les lots adaptés au type de chantier
   → Les dépendances logiques entre lots sont générées

3. Cliquer "Calculer le planning (CPM)"
   → Les dates au plus tôt sont calculées
   → Le chemin critique est identifié (barres rouges)

4. Ajuster manuellement si nécessaire
   → Glisser les barres dans le Gantt
   → Modifier les durées en étirant le bord droit

5. Assigner des sous-traitants aux lots
   → Onglet Lots → icône ✂️ → sélectionner sous-traitant
```

> ⏱ **Temps estimé** : 5 à 10 minutes pour un chantier de 15 lots.

---

### 6.2 Inviter un collaborateur

```
1. Utilisateurs → + Inviter un utilisateur

2. Renseigner :
   - Email du collaborateur
   - Profil : Admin / Éditeur / Conducteur / Salarié
   - Type : Salarié (interne) / Sous-traitant (externe)

3. Cliquer "Envoyer l'invitation"
   → Email automatique envoyé avec lien d'activation

4. Le collaborateur clique sur le lien
   → Il définit son mot de passe
   → Il se connecte directement

5. (Optionnel) Ajouter le salarié à une équipe
   → Équipes → sélectionner une équipe → Membres → Ajouter
```

---

### 6.3 Déclarer l'avancement d'un lot

**Côté sous-traitant :**
```
1. Mes Lots → Trouver le lot concerné
2. Cliquer "Déclarer l'avancement"
3. Saisir le % (ex: 35%)
4. Ajouter un commentaire (optionnel)
5. Valider
```

**Côté administrateur :**
- La barre de progression se met à jour dans le Gantt et l'onglet Lots
- Une notification apparaît dans le centre de notifications
- L'historique des déclarations est consultable via l'icône 📊 sur le lot

---

### 6.4 Calculer le chemin critique (CPM)

Le calcul CPM (Critical Path Method) détermine :
- **La date de fin au plus tôt** du projet
- **Les lots bloquants** (chemin critique) : tout retard sur ces lots retarde l'ensemble du projet

```
1. Depuis la page détail d'un projet
2. Cliquer "Calculer le planning (CPM)"
3. Les lots du chemin critique apparaissent avec un contour rouge
4. Les marges de chaque lot sont recalculées
```

> ⚠️ **À relancer après chaque modification** de durée ou de dépendance.

---

### 6.5 Exporter le planning en PDF

```
1. Ouvrir le Planning Gantt d'un projet
2. Choisir le zoom (Semaine recommandé pour un projet standard)
3. Cliquer "PDF A4" ou "PDF A3"
   → A4 : portrait, 1 à 3 mois visibles
   → A3 : paysage, 2 à 6 mois visibles (recommandé pour les gros chantiers)
4. Le PDF se télécharge automatiquement
```

---

## 7. FAQ & astuces

**Q : Comment l'IA choisit-elle les lots à générer ?**

Elle s'appuie sur le **type de chantier** sélectionné (ITE, Façade, Ravalement, etc.) et sur les **types de lots** configurés dans la fiche Entreprise. Plus ces informations sont précises, plus le planning généré est pertinent.

---

**Q : Le chemin critique n'apparaît pas, que faire ?**

Cliquez sur **Calculer le planning (CPM)** depuis la page détail du projet. Le calcul doit être relancé manuellement après chaque modification.

---

**Q : Un sous-traitant ne voit pas son lot, pourquoi ?**

Vérifiez que le sous-traitant a bien été **assigné au lot** (onglet Lots → icône ✂️). L'assignation doit utiliser son nom d'utilisateur enregistré dans PlanningIA (pas juste un texte libre).

---

**Q : Comment supprimer un projet ?**

Bouton **Supprimer** (rouge) en haut à droite de la page détail. Action réservée aux utilisateurs avec le niveau **Admin** ou **Éditeur**. Un projet avec des lots et des dépendances peut être supprimé — tout est effacé simultanément.

---

**Q : Peut-on avoir plusieurs entreprises sur la même plateforme ?**

Oui. Chaque entreprise dispose de son espace cloisonné. Les données d'une entreprise ne sont jamais visibles par une autre.

---

**Q : Différence entre Salarié (type) et Salarié (droits) ?**

- **Type "Salarié"** = employé interne de l'entreprise (par opposition au Sous-traitant externe)
- **Droits "Salarié"** = niveau d'accès en lecture seule (le plus restrictif)

Un même employé peut être de type "Salarié" avec des droits "Éditeur" — il voit tout mais ne peut pas modifier les droits d'autres utilisateurs.

---

**Q : Comment changer la langue ?**

Boutons **FR** / **TR** en bas du menu latéral gauche.

---

## Récapitulatif des URLs

| Page | URL | Accès |
|------|-----|-------|
| Connexion | `/login` | Tous |
| Tableau de bord admin | `/dashboard` | Admin/Éditeur/Conducteur/Salarié |
| Projets | `/projects` | Admin/Éditeur/Conducteur/Salarié |
| Nouveau projet | `/projects/new` | Admin/Éditeur/Conducteur |
| Détail projet | `/projects/:id` | Admin/Éditeur/Conducteur/Salarié |
| Planning global | `/planning` | Admin/Éditeur/Conducteur/Salarié |
| Clients | `/clients` | Admin/Éditeur |
| Utilisateurs | `/users` | Admin/Éditeur/Conducteur/Salarié |
| Équipes | `/teams` | Admin/Éditeur/Conducteur/Salarié |
| Entreprise | `/company` | Admin/Éditeur |
| Notifications | `/notifications` | Tous |
| Mode d'emploi | `/aide` | Tous |
| Dashboard sous-traitant | `/sub` | Sous-traitant |
| Mes lots | `/sub/lots` | Sous-traitant |
| Planning personnel | `/sub/planning` | Sous-traitant |
| Notifications ST | `/sub/notifications` | Sous-traitant |

---

## Index des screenshots pris en session

> Les captures ci-dessous ont été prises sur le site en production [planningia.com](https://planningia.com) en mars 2026.

| ID session | Page | Compte |
|------------|------|--------|
| `ss_2633elyse` | Page de connexion | — |
| `ss_9320a40k2` | Dashboard admin (compte demo) | admin@planningia.fr |
| `ss_0163dx638` | Dashboard DESIGN FACADES (80 projets, 44 users) | celebi.ozkan@designfacades.fr |
| `ss_5283ydo45` | Formulaire nouveau projet | admin@planningia.fr |
| `ss_6281diden` | Liste projets (vue cartes, vide) | admin@planningia.fr |
| `ss_419594enp` | Liste projets (80 chantiers réels) | celebi.ozkan@designfacades.fr |
| `ss_3147qdjpd` | Détail projet — Gantt (ITE COPRO BELGRADE) | celebi.ozkan@designfacades.fr |
| `ss_2137axcei` | Détail projet — Lots | celebi.ozkan@designfacades.fr |
| `ss_1140pra64` | Planning global (tous chantiers) | celebi.ozkan@designfacades.fr |
| `ss_0290fmnv9` | Planning global (compte demo) | admin@planningia.fr |
| `ss_51868vpq6` | Utilisateurs avec badges Type/Droits | celebi.ozkan@designfacades.fr |
| `ss_2324k5v04` | Utilisateurs (compte demo) | admin@planningia.fr |
| `ss_0324hubto` | Équipes (Bardage, Echafaudage…) | celebi.ozkan@designfacades.fr |
| `ss_4365upoks` | Équipes (compte demo) | admin@planningia.fr |
| `ss_7068fsxca` | Clients (liste vide) | admin@planningia.fr |
| `ss_3078dzrjn` | Clients — Modal création | admin@planningia.fr |
| `ss_5049sk7bq` | Entreprise | admin@planningia.fr |
| `ss_50803lhhf` | Notifications | admin@planningia.fr |
| `ss_41778ouzh` | Aide — Mode d'emploi intégré | admin@planningia.fr |
| `ss_711987u0p` | Dashboard sous-traitant (Servet GUCLU, 3 lots) | servet.guclu@designfacades.fr |
| `ss_5415ebw6e` | Mes Lots (3 lots avec chemin critique) | servet.guclu@designfacades.fr |
| `ss_4141r6wjv` | Planning sous-traitant (3 projets) | servet.guclu@designfacades.fr |

---

*Document généré automatiquement avec captures d'écran en production — PlanningIA © 2026*
