# Afri SafeTrack - Plateforme QHSE Intégrée

Application web de gestion intégrée Santé-Sécurité au Travail (SST) et Sûreté pour l'Afrique.

## 🎯 Fonctionnalités

### Modules QHSE Complets

1. **Dashboard**
   - Vue d'ensemble des statistiques QHSE
   - Incidents récents
   - Indicateurs clés de performance

2. **Santé & Sécurité au Travail (SST)**
   - Gestion des incidents et accidents
   - Suivi des EPI (Équipements de Protection Individuelle)
   - Planification des formations
   - Actions correctives et préventives (CAPA)

3. **Sécurité Incendie**
   - Registre des équipements incendie
   - Suivi des extincteurs, RIA, alarmes
   - Planification des exercices d'évacuation
   - Alertes de maintenance

4. **Sûreté**
   - Gestion des visiteurs
   - Contrôle d'accès (badges, QR codes)
   - Incidents de sûreté
   - Main courante numérique

5. **Environnement**
   - Gestion des déchets
   - Suivi des consommations (eau, énergie)
   - Indicateurs environnementaux
   - Objectifs de réduction CO2

6. **Qualité**
   - Audits et inspections
   - Non-conformités
   - GED (Gestion Électronique de Documents)
   - Suivi ISO 9001

7. **Rapports & Analytics**
   - Génération de rapports PDF/Excel
   - Tableaux de bord personnalisables
   - Export de données
   - Rapports planifiés automatiques

8. **Gestion des Utilisateurs**
   - Rôles et permissions
   - Gestion multi-sites
   - Profils utilisateurs

9. **Paramètres**
   - Configuration entreprise
   - Notifications
   - Synchronisation
   - Langue et région

## 🚀 Technologies

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Base de données**: Supabase (PostgreSQL)
- **Authentification**: Supabase Auth
- **Icons**: Lucide React

## 📋 Prérequis

- Node.js 18+
- npm ou yarn
- Compte Supabase

## 🛠️ Installation

1. Cloner le repository
```bash
git clone <repository-url>
cd afri-safetrack
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement
Le fichier `.env` est déjà configuré avec :
```
VITE_SUPABASE_URL=https://gurppvuzceqprnezvexj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. Lancer l'application en développement
```bash
npm run dev
```

5. Builder pour la production
```bash
npm run build
```

## 👤 Connexion

### Compte Administrateur
- **Email**: tamaretech@gmail.com
- **Mot de passe**: Admin@3

## 📊 Base de données

La base de données Supabase inclut les tables suivantes :

- `profiles` - Profils utilisateurs avec rôles
- `sites` - Sites/Établissements
- `user_sites` - Affectation utilisateurs-sites
- `incidents` - Incidents SST, incendie, sûreté, environnement
- `epi` - Équipements de protection individuelle
- `formations` - Sessions de formation
- `formation_participants` - Participants aux formations
- `actions_capa` - Actions correctives et préventives
- `equipements_incendie` - Équipements de sécurité incendie
- `visiteurs` - Registre des visiteurs
- `audits` - Audits et inspections
- `non_conformites` - Non-conformités qualité

### Sécurité

- Row Level Security (RLS) activé sur toutes les tables
- Politiques de sécurité par rôle
- Authentification sécurisée

## 🌍 Localisation

L'application est configurée pour le **Burkina Faso** avec :
- Site par défaut : Usine Ouagadougou Zone Industrielle
- Langue : Français
- Fuseau horaire : GMT (Ouagadougou)
- Format de date : JJ/MM/AAAA

## 🎨 Design

- Design moderne et professionnel
- Thème vert émeraude
- Interface responsive (mobile, tablette, desktop)
- Dark mode ready
- Animations et transitions fluides

## 📱 Fonctionnalités mobiles

- Sidebar mobile avec overlay
- Bouton FAB pour actions rapides
- Navigation tactile optimisée
- Mode hors ligne (à venir)

## 🔒 Rôles et Permissions

1. **Administrateur** - Accès complet
2. **Responsable HSE** - Gestion SST, audits
3. **Responsable Sûreté** - Gestion sûreté, visiteurs
4. **Chef de Site** - Supervision locale
5. **Agent de Sécurité** - Rondes, rapports terrain
6. **Employé** - Déclaration d'incidents
7. **Direction** - Consultation tableaux de bord

## 📈 Données de démonstration

L'application inclut des données de test pour tous les modules :
- 3 incidents SST
- 3 équipements EPI
- 2 formations planifiées
- 3 actions CAPA
- 8 équipements incendie
- 4 visiteurs
- 3 audits
- 3 non-conformités

## 🤝 Support

Pour toute question ou support, contactez :
- Email: tamaretech@gmail.com

## 📄 Licence

© 2025 Afri SafeTrack - Tous droits réservés
