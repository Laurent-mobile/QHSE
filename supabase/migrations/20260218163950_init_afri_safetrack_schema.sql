/*
  # Initialisation du schéma Afri SafeTrack
  
  ## Description
  Migration initiale pour l'application de gestion intégrée SST et Sûreté.
  Cette migration crée toutes les tables nécessaires avec leurs relations et leurs politiques de sécurité.
  
  ## Tables créées
  
  ### 1. profiles
  - `id` (uuid, clé primaire, référence auth.users)
  - `email` (text)
  - `full_name` (text) - Nom complet de l'utilisateur
  - `role` (text) - Rôle principal (administrateur, responsable_hse, responsable_surete, chef_site, agent_securite, employe, direction)
  - `avatar_url` (text) - URL de l'avatar
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 2. sites
  - `id` (uuid, clé primaire)
  - `name` (text) - Nom du site
  - `code` (text) - Code unique du site
  - `address` (text) - Adresse
  - `city` (text) - Ville
  - `country` (text) - Pays
  - `manager_id` (uuid) - Référence vers profiles (chef de site)
  - `is_active` (boolean) - Site actif ou non
  - `created_at` (timestamptz)
  
  ### 3. user_sites
  - `id` (uuid, clé primaire)
  - `user_id` (uuid) - Référence vers profiles
  - `site_id` (uuid) - Référence vers sites
  - `created_at` (timestamptz)
  
  ### 4. incidents
  - `id` (uuid, clé primaire)
  - `reference` (text) - Numéro d'incident (ex: INC-2024-001)
  - `type` (text) - Type: accident, presque_accident, incident, situation_dangereuse
  - `module` (text) - Module concerné: sst, incendie, surete, environnement, qualite
  - `title` (text) - Titre court
  - `description` (text) - Description détaillée
  - `location` (text) - Lieu de l'incident
  - `incident_date` (timestamptz) - Date et heure de l'incident
  - `severity` (text) - Gravité: faible, moyen, grave, critique
  - `status` (text) - Statut: ouvert, en_cours, cloture
  - `reporter_id` (uuid) - Référence vers profiles (déclarant)
  - `site_id` (uuid) - Référence vers sites
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 5. epi (Équipements de Protection Individuelle)
  - `id` (uuid, clé primaire)
  - `user_id` (uuid) - Référence vers profiles (bénéficiaire)
  - `equipment_type` (text) - Type d'équipement
  - `brand` (text) - Marque
  - `attribution_date` (date) - Date d'attribution
  - `expiry_date` (date) - Date d'expiration/renouvellement
  - `status` (text) - Statut: conforme, a_verifier, perime
  - `site_id` (uuid) - Référence vers sites
  - `created_at` (timestamptz)
  
  ### 6. formations
  - `id` (uuid, clé primaire)
  - `title` (text) - Titre de la formation
  - `type` (text) - Type: sst, incendie, surete, autre
  - `reference` (text) - Référence unique (ex: FOR-2025-01)
  - `date` (date) - Date de la formation
  - `duration_hours` (numeric) - Durée en heures
  - `trainer` (text) - Formateur/organisme
  - `location` (text) - Lieu
  - `max_participants` (integer) - Nombre maximum de participants
  - `status` (text) - Statut: planifiee, en_cours, terminee, annulee
  - `site_id` (uuid) - Référence vers sites
  - `created_at` (timestamptz)
  
  ### 7. formation_participants
  - `id` (uuid, clé primaire)
  - `formation_id` (uuid) - Référence vers formations
  - `user_id` (uuid) - Référence vers profiles
  - `attendance` (boolean) - Présence confirmée
  - `passed` (boolean) - Formation réussie
  - `certificate_url` (text) - URL du certificat
  - `created_at` (timestamptz)
  
  ### 8. actions_capa (Actions Correctives et Préventives)
  - `id` (uuid, clé primaire)
  - `reference` (text) - Référence unique (ex: CAPA-001)
  - `description` (text) - Description de l'action
  - `type` (text) - Type: corrective, preventive
  - `priority` (text) - Priorité: basse, moyenne, haute, critique
  - `status` (text) - Statut: ouverte, en_cours, terminee
  - `responsible_id` (uuid) - Référence vers profiles (responsable)
  - `due_date` (date) - Date d'échéance
  - `completion_date` (date) - Date de réalisation
  - `incident_id` (uuid) - Référence vers incidents (optionnel)
  - `site_id` (uuid) - Référence vers sites
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 9. equipements_incendie
  - `id` (uuid, clé primaire)
  - `reference` (text) - Référence unique (ex: EXT-B1-01)
  - `type` (text) - Type d'équipement
  - `location` (text) - Localisation
  - `last_inspection` (date) - Dernière inspection
  - `next_inspection` (date) - Prochaine inspection
  - `status` (text) - Statut: conforme, a_reviser, hors_service
  - `site_id` (uuid) - Référence vers sites
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 10. visiteurs
  - `id` (uuid, clé primaire)
  - `full_name` (text) - Nom complet
  - `company` (text) - Entreprise
  - `purpose` (text) - Motif de la visite
  - `host` (text) - Personne visitée
  - `badge_number` (text) - Numéro de badge
  - `entry_time` (timestamptz) - Heure d'entrée
  - `exit_time` (timestamptz) - Heure de sortie
  - `site_id` (uuid) - Référence vers sites
  - `created_at` (timestamptz)
  
  ### 11. audits
  - `id` (uuid, clé primaire)
  - `reference` (text) - Référence unique
  - `type` (text) - Type d'audit
  - `date` (date) - Date de l'audit
  - `auditor_id` (uuid) - Référence vers profiles (auditeur)
  - `score` (numeric) - Score en %
  - `status` (text) - Statut: planifie, en_cours, termine
  - `site_id` (uuid) - Référence vers sites
  - `created_at` (timestamptz)
  
  ### 12. non_conformites
  - `id` (uuid, clé primaire)
  - `reference` (text) - Référence unique (ex: NC-045)
  - `description` (text) - Description
  - `priority` (text) - Priorité: mineure, majeure, critique
  - `status` (text) - Statut: ouvert, en_cours, cloture
  - `audit_id` (uuid) - Référence vers audits (optionnel)
  - `responsible_id` (uuid) - Référence vers profiles
  - `due_date` (date) - Date limite
  - `site_id` (uuid) - Référence vers sites
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ## Sécurité
  
  - RLS activé sur toutes les tables
  - Les utilisateurs ne peuvent lire/modifier que les données de leurs sites assignés
  - Les administrateurs ont accès à toutes les données
  - Politiques spécifiques par rôle
*/

-- Extension pour générer des UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table profiles (profils utilisateurs)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'employe',
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('administrateur', 'responsable_hse', 'responsable_surete', 'chef_site', 'agent_securite', 'employe', 'direction'))
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Table sites
CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  address text,
  city text,
  country text DEFAULT 'Sénégal',
  manager_id uuid REFERENCES profiles(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sites"
  ON sites FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage sites"
  ON sites FOR ALL
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'administrateur');

-- 3. Table user_sites (relation utilisateurs-sites)
CREATE TABLE IF NOT EXISTS user_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, site_id)
);

ALTER TABLE user_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own site assignments"
  ON user_sites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage site assignments"
  ON user_sites FOR ALL
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'administrateur');

-- 4. Table incidents
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  type text NOT NULL,
  module text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  incident_date timestamptz NOT NULL,
  severity text NOT NULL DEFAULT 'moyen',
  status text NOT NULL DEFAULT 'ouvert',
  reporter_id uuid NOT NULL REFERENCES profiles(id),
  site_id uuid NOT NULL REFERENCES sites(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_type CHECK (type IN ('accident', 'presque_accident', 'incident', 'situation_dangereuse')),
  CONSTRAINT valid_module CHECK (module IN ('sst', 'incendie', 'surete', 'environnement', 'qualite')),
  CONSTRAINT valid_severity CHECK (severity IN ('faible', 'moyen', 'grave', 'critique')),
  CONSTRAINT valid_status CHECK (status IN ('ouvert', 'en_cours', 'cloture'))
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read incidents from their sites"
  ON incidents FOR SELECT
  TO authenticated
  USING (
    site_id IN (SELECT site_id FROM user_sites WHERE user_id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'administrateur'
  );

CREATE POLICY "Users can create incidents"
  ON incidents FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid() AND
    site_id IN (SELECT site_id FROM user_sites WHERE user_id = auth.uid())
  );

CREATE POLICY "HSE can update incidents"
  ON incidents FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('responsable_hse', 'administrateur')
  );

-- 5. Table epi (Équipements de Protection Individuelle)
CREATE TABLE IF NOT EXISTS epi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  equipment_type text NOT NULL,
  brand text,
  attribution_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date NOT NULL,
  status text NOT NULL DEFAULT 'conforme',
  site_id uuid NOT NULL REFERENCES sites(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_epi_status CHECK (status IN ('conforme', 'a_verifier', 'perime'))
);

ALTER TABLE epi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read epi from their sites"
  ON epi FOR SELECT
  TO authenticated
  USING (
    site_id IN (SELECT site_id FROM user_sites WHERE user_id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'administrateur'
  );

CREATE POLICY "HSE can manage epi"
  ON epi FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('responsable_hse', 'administrateur')
  );

-- 6. Table formations
CREATE TABLE IF NOT EXISTS formations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'sst',
  reference text UNIQUE NOT NULL,
  date date NOT NULL,
  duration_hours numeric DEFAULT 8,
  trainer text,
  location text,
  max_participants integer,
  status text NOT NULL DEFAULT 'planifiee',
  site_id uuid NOT NULL REFERENCES sites(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_formation_type CHECK (type IN ('sst', 'incendie', 'surete', 'autre')),
  CONSTRAINT valid_formation_status CHECK (status IN ('planifiee', 'en_cours', 'terminee', 'annulee'))
);

ALTER TABLE formations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read formations from their sites"
  ON formations FOR SELECT
  TO authenticated
  USING (
    site_id IN (SELECT site_id FROM user_sites WHERE user_id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'administrateur'
  );

CREATE POLICY "HSE can manage formations"
  ON formations FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('responsable_hse', 'administrateur')
  );

-- 7. Table formation_participants
CREATE TABLE IF NOT EXISTS formation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id uuid NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attendance boolean DEFAULT false,
  passed boolean DEFAULT false,
  certificate_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(formation_id, user_id)
);

ALTER TABLE formation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own formation participations"
  ON formation_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('responsable_hse', 'administrateur')
  );

CREATE POLICY "HSE can manage formation participations"
  ON formation_participants FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('responsable_hse', 'administrateur')
  );

-- 8. Table actions_capa
CREATE TABLE IF NOT EXISTS actions_capa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  description text NOT NULL,
  type text NOT NULL DEFAULT 'corrective',
  priority text NOT NULL DEFAULT 'moyenne',
  status text NOT NULL DEFAULT 'ouverte',
  responsible_id uuid NOT NULL REFERENCES profiles(id),
  due_date date NOT NULL,
  completion_date date,
  incident_id uuid REFERENCES incidents(id),
  site_id uuid NOT NULL REFERENCES sites(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_capa_type CHECK (type IN ('corrective', 'preventive')),
  CONSTRAINT valid_capa_priority CHECK (priority IN ('basse', 'moyenne', 'haute', 'critique')),
  CONSTRAINT valid_capa_status CHECK (status IN ('ouverte', 'en_cours', 'terminee'))
);

ALTER TABLE actions_capa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read capa from their sites"
  ON actions_capa FOR SELECT
  TO authenticated
  USING (
    site_id IN (SELECT site_id FROM user_sites WHERE user_id = auth.uid())
    OR responsible_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'administrateur'
  );

CREATE POLICY "HSE can create capa"
  ON actions_capa FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('responsable_hse', 'administrateur')
  );

CREATE POLICY "Responsible can update their capa"
  ON actions_capa FOR UPDATE
  TO authenticated
  USING (
    responsible_id = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('responsable_hse', 'administrateur')
  );

-- 9. Table equipements_incendie
CREATE TABLE IF NOT EXISTS equipements_incendie (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  type text NOT NULL,
  location text NOT NULL,
  last_inspection date,
  next_inspection date NOT NULL,
  status text NOT NULL DEFAULT 'conforme',
  site_id uuid NOT NULL REFERENCES sites(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_fire_equipment_status CHECK (status IN ('conforme', 'a_reviser', 'hors_service'))
);

ALTER TABLE equipements_incendie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read fire equipment from their sites"
  ON equipements_incendie FOR SELECT
  TO authenticated
  USING (
    site_id IN (SELECT site_id FROM user_sites WHERE user_id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'administrateur'
  );

CREATE POLICY "HSE can manage fire equipment"
  ON equipements_incendie FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('responsable_hse', 'administrateur')
  );

-- 10. Table visiteurs
CREATE TABLE IF NOT EXISTS visiteurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  company text NOT NULL,
  purpose text NOT NULL,
  host text NOT NULL,
  badge_number text,
  entry_time timestamptz DEFAULT now(),
  exit_time timestamptz,
  site_id uuid NOT NULL REFERENCES sites(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE visiteurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read visitors from their sites"
  ON visiteurs FOR SELECT
  TO authenticated
  USING (
    site_id IN (SELECT site_id FROM user_sites WHERE user_id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'administrateur'
  );

CREATE POLICY "Security agents can manage visitors"
  ON visiteurs FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('agent_securite', 'responsable_surete', 'administrateur')
  );

-- 11. Table audits
CREATE TABLE IF NOT EXISTS audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  type text NOT NULL,
  date date NOT NULL,
  auditor_id uuid NOT NULL REFERENCES profiles(id),
  score numeric CHECK (score >= 0 AND score <= 100),
  status text NOT NULL DEFAULT 'planifie',
  site_id uuid NOT NULL REFERENCES sites(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_audit_status CHECK (status IN ('planifie', 'en_cours', 'termine'))
);

ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read audits from their sites"
  ON audits FOR SELECT
  TO authenticated
  USING (
    site_id IN (SELECT site_id FROM user_sites WHERE user_id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'administrateur'
  );

CREATE POLICY "HSE can manage audits"
  ON audits FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('responsable_hse', 'administrateur')
  );

-- 12. Table non_conformites
CREATE TABLE IF NOT EXISTS non_conformites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'mineure',
  status text NOT NULL DEFAULT 'ouvert',
  audit_id uuid REFERENCES audits(id),
  responsible_id uuid NOT NULL REFERENCES profiles(id),
  due_date date NOT NULL,
  site_id uuid NOT NULL REFERENCES sites(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_nc_priority CHECK (priority IN ('mineure', 'majeure', 'critique')),
  CONSTRAINT valid_nc_status CHECK (status IN ('ouvert', 'en_cours', 'cloture'))
);

ALTER TABLE non_conformites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read non-conformities from their sites"
  ON non_conformites FOR SELECT
  TO authenticated
  USING (
    site_id IN (SELECT site_id FROM user_sites WHERE user_id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'administrateur'
  );

CREATE POLICY "HSE can manage non-conformities"
  ON non_conformites FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('responsable_hse', 'administrateur')
  );

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actions_capa_updated_at BEFORE UPDATE ON actions_capa
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipements_incendie_updated_at BEFORE UPDATE ON equipements_incendie
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_non_conformites_updated_at BEFORE UPDATE ON non_conformites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();