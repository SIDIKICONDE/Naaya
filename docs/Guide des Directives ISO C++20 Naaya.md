# DIRECTIVE DE DÉVELOPPEMENT C++20
## Standards Obligatoires pour l'Équipe de Développement

---

## 🎯 PHILOSOPHIE FONDAMENTALE : QUALITÉ AVANT TOUT

**PRINCIPE DIRECTEUR** : La qualité prime sur la rapidité - Aucun compromis temporel autorisé.

⏰ **POLITIQUE TEMPS** :
- ✅ Prenez le temps nécessaire pour faire bien du premier coup
- ✅ Mieux vaut livrer tard avec une qualité parfaite que rapidement avec des défauts
- ✅ Investissement temps initial = Économies massives long terme
- ❌ **INTERDIT** : Pression temporelle justifiant une baisse de qualité
- ❌ **INTERDIT** : "Quick fixes" pour respecter des deadlines

**RÈGLE D'OR** : "Fait bien, fait une fois" - Chaque ligne de code doit être production-ready dès le premier commit.

## 1. RÈGLE DU ZÉRO - APPLICATION STRICTE

**OBLIGATOIRE** : Aucune définition manuelle d'opérations spéciales sauf nécessité absolue.

- ❌ **INTERDIT** : Définir des destructeurs, constructeurs de copie, ou opérateurs d'assignation custom sans justification
- ✅ **REQUIS** : Si une opération spéciale est définie, TOUTES les autres doivent l'être explicitement
- ✅ **RECOMMANDÉ** : Laisser le compilateur générer automatiquement ces opérations

---

## 2. ARCHITECTURE MODULAIRE - MIGRATION OBLIGATOIRE

**DEADLINE** : Tous les nouveaux composants DOIVENT utiliser les modules C++20.

### Standards techniques :
- ✅ Organisez le code en modules plutôt qu'en headers (#include)
- ✅ Séparez clairement interfaces publiques (export) et implémentation (private)
- ⚠️ **EXCEPTION TEMPORAIRE** : Headers classiques autorisés uniquement pour le code legacy en cours de migration

### Bénéfices attendus :
- Réduction des temps de compilation de 30-50%
- Élimination des conflits de macros
- Isolation des dépendances

---

## 3. CONTRAINTES DE TEMPLATES - CONCEPTS OBLIGATOIRES

**RÈGLE** : Tout paramètre de template DOIT être contraint par un concept.

```cpp
// ✅ CONFORME
template<typename Iter, typename Val>
  requires input_iterator<Iter> && 
          equality_comparable_with<iter_value_t<Iter>, Val>
Iter find(Iter first, Iter last, Val v);

// ❌ NON CONFORME
template<typename T>
void process(T data); // Pas de contrainte
```

### Conventions de nommage :
- Concepts : `snake_case` (ex: `swappable`, `random_access_range`)
- Pas de préfixes/suffixes inutiles

---

## 4. GESTION DES COLLECTIONS - RANGES OBLIGATOIRES

**MIGRATION IMMÉDIATE** : Remplacez les boucles manuelles par la bibliothèque `<ranges>`.

```cpp
// ✅ MODERNE
auto filtered = data | std::views::filter(predicate) 
                    | std::views::transform(mapper);

// ❌ OBSOLÈTE
for(auto it = data.begin(); it != data.end(); ++it) {
    if(predicate(*it)) {
        result.push_back(mapper(*it));
    }
}
```

### Bénéfices mesurables :
- Code 60% plus concis
- Réduction des erreurs d'itération de 80%
- Évaluation paresseuse = performance améliorée

---

## 5. GESTION DES RESSOURCES - RAII STRICT

**ZÉRO TOLÉRANCE** pour les fuites de ressources.

### Règles absolues :
- ❌ **INTERDIT** : `new`/`delete` nus dans le code
- ✅ **REQUIS** : `std::unique_ptr`, `std::shared_ptr`, `std::span`
- ✅ **OBLIGATOIRE** : Destructeurs automatiques pour toute ressource

### Contrôles qualité :
- Tests de fuite mémoire automatisés dans la CI/CD
- Validation avec Valgrind sur chaque merge request

---

## 6. GESTION D'ERREURS - EXCEPTIONS PRIORITAIRES

**STANDARD** : Les exceptions sont le mécanisme principal de gestion d'erreurs.

```cpp
// ✅ CONFORME
void process_file(const std::string& filename) {
    if (!file_exists(filename)) {
        throw std::invalid_argument("File not found: " + filename);
    }
    // traitement...
}

// ❌ OBSOLÈTE
int process_file(const char* filename) {
    if (!file_exists(filename)) {
        return ERROR_FILE_NOT_FOUND; // Codes de retour dépassés
    }
}
```

### Spécifications :
- Utilisez `noexcept` pour les fonctions garanties sans exception
- Attrapez des exceptions spécifiques, jamais `catch(...)`

---

## 7. EXPLOITATION DES NOUVEAUTÉS C++20

### Fonctionnalités OBLIGATOIRES à adopter :

**Évaluation à la compilation :**
- `constexpr` pour tous les calculs possibles à la compilation
- `consteval` pour forcer l'évaluation compile-time

**Formatage sécurisé :**
- `std::format` remplace `printf` et `stringstream`

**Comparaisons simplifiées :**
- Opérateur `<=>` (spaceship) pour générer automatiquement tous les opérateurs de comparaison

**Optimisations :**
- `[[likely]]` / `[[unlikely]]` sur les branches critiques

---

## 8. CONCURRENCE MODERNISÉE

**NOUVELLES PRIMITIVES OBLIGATOIRES** :

```cpp
// ✅ MODERNE
std::jthread worker([]{ /* travail */ }); 
// Jointure automatique à la destruction

// ✅ SYNCHRONISATION MODERNE
std::latch sync_point(thread_count);
std::barrier checkpoint(thread_count);
```

### Pour l'asynchrone avancé :
- Coroutines (`co_await`, `co_yield`) pour I/O non-bloquant
- `std::stop_token` pour l'annulation propre

---

## 9. CONTRÔLES QUALITÉ - CONFIGURATION CI/CD

### Outils OBLIGATOIRES dans la pipeline :

**Compilateurs requis :**
- GCC ≥ 11 OU Clang ≥ 12 OU MSVC ≥ 17.3

**Analyse statique automatique :**
- `clang-tidy` avec profil `cppcoreguidelines-check`
- Warnings élevés (`-Wall -Wextra -Wpedantic`)

### PROCÉDURE OBLIGATOIRE - RÉSOLUTION DES PROBLÈMES DE LINTER

**RÈGLE ABSOLUE : TOUS LES WARNINGS LINTER DOIVENT ÊTRE RÉSOLUS SIMULTANÉMENT**

⚠️ **INTERDICTION STRICTE** : Aucun commit/merge request avec warnings linter restants
⚠️ **POLITIQUE ZÉRO TOLÉRANCE** : La CI/CD DOIT échouer si warnings présents

**AVANT toute correction de linter/warning :**

1. **INVENTAIRE COMPLET OBLIGATOIRE** (45 min minimum - AUCUNE LIMITE DE TEMPS)
   - Listez TOUS les warnings linter du fichier/module
   - Classez les warnings par type et priorité
   - Identifiez les interdépendances entre corrections
   - Planifiez l'ordre de résolution optimal
   - **Prenez le temps qu'il faut - La qualité n'a pas de deadline**

2. **ANALYSE CONTEXTUELLE GLOBALE** (60 min minimum - ÉTENDEZ SI NÉCESSAIRE)
   - Lisez et comprenez le fichier complet concerné
   - Identifiez l'architecture et les responsabilités du module
   - Analysez l'historique Git du fichier (`git log --oneline`)
   - Vérifiez les dépendances et les fichiers liés
   - **Évaluez l'impact combiné de TOUTES les corrections**
   - **RÈGLE** : Ne commencez jamais sans compréhension totale

3. **RÉSOLUTION QUALITÉ MAXIMALE** (Temps illimité)
   - ✅ **REQUIS** : Résolvez TOUS les warnings avec la meilleure solution possible
   - ✅ **OBLIGATOIRE** : Tests exhaustifs après chaque groupe de corrections
   - ✅ **VALIDATION** : Suite de tests complète + tests edge cases
   - ✅ **PERFECTIONNEMENT** : Refactoring si amélioration possible
   - ❌ **INTERDIT** : Solutions "suffisantes" - Exigez l'excellence

4. **VALIDATION QUALITÉ INDUSTRIELLE MAXIMALE**
   - ❌ **INTERDIT** : Corrections aveugles pour "faire passer" le linter
   - ✅ **REQUIS** : Solution optimale qui améliore significativement la qualité
   - ✅ **OBLIGATOIRE** : Tests de non-régression exhaustifs + tests de charge
   - ✅ **VALIDATION** : Double revue (peer + senior) avant merge
   - ✅ **DOCUMENTATION** : Impact et justification de chaque modification

**Règle d'or** : "Excellence sans compromis" - Le temps investi en qualité aujourd'hui évite des semaines de debugging demain.

**Tests obligatoires :**
- Couverture de code ≥ 85%
- Tests unitaires (Google Test ou Catch2)
- Tests de performance sur fonctions critiques

---

## 10. STANDARDS DE CODE - NON NÉGOCIABLES

### Conventions de nommage :
- **Classes/Types** : `PascalCase`
- **Fonctions/Variables** : `camelCase`
- **Concepts** : `snake_case`

### Lisibilité et Auto-Documentation :
- Lignes ≤ 100 caractères
- `[[nodiscard]]` sur les fonctions dont le retour ne doit pas être ignoré
- **CODE AUTO-DOCUMENTÉ OBLIGATOIRE** - Évitez les commentaires excessifs

### RÈGLES STRICTES DE COMMENTAIRES

**INTERDICTIONS** :
- ❌ Commentaires qui répètent le code : `i++; // incrémente i`
- ❌ Commentaires évidents : `// constructeur` au-dessus d'un constructeur
- ❌ Commentaires obsolètes ou incohérents avec le code
- ❌ Commentaires expliquant "comment" au lieu de "pourquoi"

**AUTORISÉS UNIQUEMENT** :
- ✅ **Intention métier** : Pourquoi cette logique existe
- ✅ **Algorithmes complexes** : Références vers sources/papers
- ✅ **Contraintes non-évidentes** : Limitations performance, edge cases
- ✅ **APIs publiques** : Documentation contractuelle pour utilisateurs

**PRINCIPE FONDAMENTAL** : Le code doit être si clair qu'il n'a besoin d'aucun commentaire pour être compris.

```cpp
// ❌ COMMENTAIRES EXCESSIFS
class UserManager {
    // Cette fonction ajoute un utilisateur  
    void addUser(const User& user) {
        // Vérifier si l'utilisateur existe déjà
        if (userExists(user.getId())) {
            // Lancer une exception si il existe
            throw std::invalid_argument("User already exists");
        }
        // Ajouter l'utilisateur à la liste
        users.push_back(user);
    }
};

// ✅ CODE AUTO-DOCUMENTÉ  
class UserManager {
    void addUser(const User& user) {
        if (userExists(user.getId())) {
            throw std::invalid_argument("User already exists");
        }
        users.push_back(user);
    }
    
private:
    // Business rule: Maximum 10000 users due to legacy database constraints
    static constexpr size_t MAX_USERS = 10000;
};
```

---

## 📋 CHECKLIST DE VALIDATION

Avant tout merge request, vérifiez :

- [ ] Aucune opération spéciale définie manuellement (sauf justification)
- [ ] Modules utilisés pour nouveaux composants
- [ ] Templates contraints par des concepts
- [ ] Algorithms ranges utilisés (pas de boucles manuelles)
- [ ] Aucun `new`/`delete` nu
- [ ] Exceptions utilisées pour la gestion d'erreurs
- [ ] `std::format` utilisé pour le formatage de chaînes
- [ ] Tests unitaires couvrent ≥ 85% du code
- [ ] **ZÉRO WARNING LINTER** - tous résolus simultanément
- [ ] **ANALYSE CONTEXTUELLE GLOBALE** effectuée avant corrections
- [ ] **CODE AUTO-DOCUMENTÉ** - commentaires excessifs éliminés
- [ ] **VALIDATION senior pour modifications complexes**
- [ ] **TESTS DE SCALABILITÉ** - validation Big O et benchmarks
- [ ] **MONITORING PERFORMANCE** - métriques intégrées et seuils respectés
- [ ] **ARCHITECTURE ÉVOLUTIVE** - patterns haute scalabilité appliqués

---

## ⚡ RÉSULTATS ATTENDUS

**Objectifs mesurables d'ici 3 mois :**
- Temps de compilation réduits de 40%
- Bugs runtime réduits de 60%
- Maintenabilité améliorée (métriques de complexité cyclomatique)
- Code review time réduit de 50%
- **ZÉRO régression introduite par corrections de linter**
- **ZÉRO dette technique** - Qualité maximale dès le premier commit
- **SCALABILITÉ ILLIMITÉE** - Code conçu pour montée en charge massive
- **PERFORMANCE OPTIMALE** - Latences < 10ms, throughput > 10K ops/sec
- **MONITORING TEMPS RÉEL** - Métriques et alertes automatiques intégrées

**PRIORITÉ MANAGÉRIALE** : Accordez le temps nécessaire à vos équipes pour atteindre l'excellence.

---

## 💎 INVESTISSEMENT QUALITÉ = ROI LONG TERME

**COÛT INITIAL** : +40% temps développement  
**BÉNÉFICE 6 MOIS** : -70% temps debugging + maintenance  
**BÉNÉFICE 2 ANS** : -90% legacy debt + refactoring
**BÉNÉFICE SCALABILITÉ** : Support 100x charge sans refactoring majeur

**Message aux développeurs** : Prenez le temps qu'il faut. Votre manager préfère une livraison tardive et parfaite qu'une livraison rapide et défectueuse.

**Application immédiate obligatoire sur tous les nouveaux développements.**

---

## 🚨 SANCTIONS DISCIPLINAIRES

**Violations graves :**
- Commit avec warnings linter restants → **BLOCAGE AUTOMATIQUE CI/CD**
- Correction de linter partielle → **Revert automatique + formation obligatoire**
- **Pression temporelle appliquée sur qualité** → **Escalade direction + révision des process**
- Commentaires excessifs ou évidents → **Refactoring obligatoire**
- Nommage cryptique → **Renommage immédiat requis**
- Introduction de bug via "quick fix" → **Formation obligatoire + revue senior systématique**
- **Algorithme O(n²) sans justification** → **Refactoring immédiat obligatoire**
- **Absence de tests de scalabilité** → **Blocage release jusqu'à validation**
- **Dépassement seuils performance** → **Rollback automatique + optimisation requise**
- **Compromis qualité pour deadline** → **Réévaluation des priorités projet**
- Tentative de bypass des contrôles linter → **Sanctions disciplinaires**
- Non-respect répété des standards → **Réévaluation des responsabilités techniques**