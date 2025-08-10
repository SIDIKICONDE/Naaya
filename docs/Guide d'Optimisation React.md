# Guide d'Optimisation React - Éviter les Comportements "Grenades" 💣

## 1. Les Comportements "Grenades" à Éviter

### 🔴 Grenade #1: Création d'objets/fonctions inline
```typescript
// ❌ MAUVAIS - Nouvelle référence à chaque rendu
function Parent() {
  return (
    <Child 
      onClick={() => console.log('click')} // Nouvelle fonction
      style={{ color: 'red' }} // Nouvel objet
    />
  );
}

// ✅ BON - Références stables
const childStyle = { color: 'red' };

function Parent() {
  const handleClick = useCallback(() => {
    console.log('click');
  }, []);
  
  return <Child onClick={handleClick} style={childStyle} />;
}
```

### 🔴 Grenade #2: État mal structuré
```typescript
// ❌ MAUVAIS - Un seul état pour tout
const [state, setState] = useState({
  user: { name: '', email: '' },
  posts: [],
  ui: { isModalOpen: false, theme: 'dark' }
});

// ✅ BON - États séparés par domaine
const [user, setUser] = useState({ name: '', email: '' });
const [posts, setPosts] = useState([]);
const [isModalOpen, setIsModalOpen] = useState(false);
const [theme, setTheme] = useState('dark');
```

### 🔴 Grenade #3: Dépendances d'effet incorrectes
```typescript
// ❌ MAUVAIS - Dépendances manquantes ou excessives
useEffect(() => {
  fetchData(userId);
}, []); // userId manquant!

// ✅ BON - Dépendances correctes
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

## 2. React.memo - Mémorisation des Composants

### Usage basique
```typescript
// ✅ Composant mémorisé
const ExpensiveComponent = React.memo(({ data, onUpdate }) => {
  console.log('Rendu uniquement si props changent');
  return <div>{/* Contenu complexe */}</div>;
});

// ✅ Avec comparateur personnalisé
const OptimizedComponent = React.memo(
  ({ user, settings }) => {
    return <div>{user.name}</div>;
  },
  (prevProps, nextProps) => {
    // true = props égales = pas de re-rendu
    return prevProps.user.id === nextProps.user.id;
  }
);
```

### Pattern de séparation des composants
```typescript
// ✅ Séparer les parties statiques et dynamiques
const StaticHeader = React.memo(() => {
  return <header>Logo et navigation statique</header>;
});

const DynamicContent = ({ data }) => {
  return <main>{data.map(item => <Item key={item.id} {...item} />)}</main>;
};

function App() {
  const [data, setData] = useState([]);
  return (
    <>
      <StaticHeader /> {/* Ne se re-rend jamais */}
      <DynamicContent data={data} />
    </>
  );
}
```

## 3. useMemo - Mémorisation des Valeurs

### Calculs coûteux
```typescript
function DataTable({ items, filter }) {
  // ✅ Mémoriser les calculs coûteux
  const filteredItems = useMemo(() => {
    console.log('Recalcul uniquement si items ou filter change');
    return items.filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [items, filter]);

  const statistics = useMemo(() => {
    return {
      total: filteredItems.length,
      sum: filteredItems.reduce((acc, item) => acc + item.value, 0),
      average: filteredItems.length > 0 
        ? filteredItems.reduce((acc, item) => acc + item.value, 0) / filteredItems.length 
        : 0
    };
  }, [filteredItems]);

  return (
    <div>
      <Stats {...statistics} />
      <List items={filteredItems} />
    </div>
  );
}
```

### Objets de configuration
```typescript
function Chart({ data, theme }) {
  // ✅ Mémoriser les objets de configuration
  const chartConfig = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Chart' }
    },
    scales: {
      y: { beginAtZero: true }
    }
  }), []); // Dépendances vides si config statique

  return <ChartComponent data={data} options={chartConfig} />;
}
```

## 4. useCallback - Mémorisation des Fonctions

### Callbacks stables
```typescript
function TodoList({ todos }) {
  const [items, setItems] = useState(todos);

  // ✅ Callback stable pour éviter re-rendu des enfants
  const handleDelete = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleUpdate = useCallback((id: string, newText: string) => {
    setItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, text: newText } : item
      )
    );
  }, []);

  return (
    <>
      {items.map(item => (
        <TodoItem
          key={item.id}
          item={item}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      ))}
    </>
  );
}

// Le composant enfant peut être mémorisé efficacement
const TodoItem = React.memo(({ item, onDelete, onUpdate }) => {
  return (
    <div>
      <span>{item.text}</span>
      <button onClick={() => onDelete(item.id)}>Delete</button>
    </div>
  );
});
```

## 5. Gestion d'État Optimisée

### Séparation des états
```typescript
// ✅ États séparés pour éviter les re-rendus inutiles
function Dashboard() {
  // État UI local
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // État des données
  const [userData, setUserData] = useState(null);
  
  // État de chargement
  const [isLoading, setIsLoading] = useState(false);
  
  // Changer isMenuOpen ne re-rend pas les composants 
  // qui dépendent uniquement de userData
  return (
    <>
      <Menu isOpen={isMenuOpen} onToggle={setIsMenuOpen} />
      <UserProfile data={userData} />
      {isLoading && <Spinner />}
    </>
  );
}
```

### État dérivé vs État stocké
```typescript
// ❌ MAUVAIS - État redondant
function Cart({ items }) {
  const [cartItems, setCartItems] = useState(items);
  const [totalPrice, setTotalPrice] = useState(0); // État redondant!
  
  useEffect(() => {
    setTotalPrice(cartItems.reduce((sum, item) => sum + item.price, 0));
  }, [cartItems]);
}

// ✅ BON - État dérivé
function Cart({ items }) {
  const [cartItems, setCartItems] = useState(items);
  
  // Calculé à la volée, mémorisé si nécessaire
  const totalPrice = useMemo(() => 
    cartItems.reduce((sum, item) => sum + item.price, 0),
    [cartItems]
  );
}
```

## 6. Rendu Conditionnel Intelligent

### Lazy Loading des composants
```typescript
// ✅ Charger les composants uniquement quand nécessaire
const HeavyModal = lazy(() => import('./HeavyModal'));

function App() {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowModal(true)}>Open</button>
      {showModal && (
        <Suspense fallback={<Spinner />}>
          <HeavyModal onClose={() => setShowModal(false)} />
        </Suspense>
      )}
    </>
  );
}
```

### Virtualisation des listes
```typescript
// ✅ Pour de grandes listes, utiliser react-window ou react-virtualized
import { FixedSizeList } from 'react-window';

function VirtualList({ items }) {
  const Row = useCallback(({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  ), [items]);
  
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={35}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### Rendu progressif
```typescript
// ✅ Différer le rendu des parties non critiques
function Page() {
  const [showComments, setShowComments] = useState(false);
  
  useEffect(() => {
    // Afficher les commentaires après le rendu initial
    const timer = setTimeout(() => setShowComments(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <>
      <Header />
      <MainContent />
      {showComments && <Comments />}
    </>
  );
}
```

## 7. Patterns d'Optimisation Avancés

### Debounce et Throttle
```typescript
// ✅ Debounce pour les recherches
function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      fetch(`/api/search?q=${searchTerm}`)
        .then(res => res.json())
        .then(setResults);
    }, 300),
    []
  );
  
  useEffect(() => {
    if (query.length > 2) {
      debouncedSearch(query);
    }
  }, [query, debouncedSearch]);
  
  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );
}
```

### Context optimisé
```typescript
// ✅ Séparer les contextes par domaine
const ThemeContext = createContext();
const UserContext = createContext();
const CartContext = createContext();

// ✅ Diviser les contextes qui changent fréquemment
const CartStateContext = createContext();
const CartDispatchContext = createContext();

function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, []);
  
  return (
    <CartStateContext.Provider value={cart}>
      <CartDispatchContext.Provider value={dispatch}>
        {children}
      </CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}
```

## 8. Métriques et Monitoring

### React DevTools Profiler
```typescript
// ✅ Utiliser Profiler en développement
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Header />
      <MainContent />
    </Profiler>
  );
}
```

### Custom Hook de performance
```typescript
// ✅ Hook pour tracker les re-rendus
function useWhyDidYouUpdate(name: string, props: Record<string, any>) {
  const previousProps = useRef<Record<string, any>>();
  
  useEffect(() => {
    if (previousProps.current) {
      const changes = Object.entries(props).filter(
        ([key, val]) => previousProps.current![key] !== val
      );
      
      if (changes.length > 0) {
        console.log(`[${name}] Re-rendu causé par:`, changes);
      }
    }
    previousProps.current = props;
  });
}
```

## 9. Checklist d'Optimisation

### Avant déploiement
- [ ] Aucune fonction inline dans les props
- [ ] Aucun objet créé inline dans les props
- [ ] `React.memo` sur les composants coûteux
- [ ] `useMemo` pour les calculs complexes
- [ ] `useCallback` pour les callbacks passés aux enfants
- [ ] États séparés par domaine
- [ ] Pas d'état redondant (préférer l'état dérivé)
- [ ] Lazy loading des composants lourds
- [ ] Virtualisation des grandes listes
- [ ] Debounce/throttle sur les événements fréquents
- [ ] Context divisés par fréquence de changement
- [ ] Profiling effectué sur les pages critiques

## 10. Exemples de Refactoring

### Avant optimisation
```typescript
// ❌ Code non optimisé
function BadComponent({ data }) {
  const [filter, setFilter] = useState('');
  
  return (
    <div style={{ padding: 20 }}>
      <input onChange={(e) => setFilter(e.target.value)} />
      {data.filter(item => item.includes(filter)).map(item => (
        <Item 
          key={item.id} 
          item={item}
          onClick={() => console.log(item)}
        />
      ))}
    </div>
  );
}
```

### Après optimisation
```typescript
// ✅ Code optimisé
const containerStyle = { padding: 20 };

const Item = React.memo(({ item, onClick }) => {
  return <div onClick={() => onClick(item)}>{item.name}</div>;
});

function GoodComponent({ data }) {
  const [filter, setFilter] = useState('');
  
  const filteredData = useMemo(() => 
    data.filter(item => item.name.includes(filter)),
    [data, filter]
  );
  
  const handleItemClick = useCallback((item) => {
    console.log(item);
  }, []);
  
  const handleFilterChange = useCallback((e) => {
    setFilter(e.target.value);
  }, []);
  
  return (
    <div style={containerStyle}>
      <input onChange={handleFilterChange} />
      {filteredData.map(item => (
        <Item 
          key={item.id} 
          item={item}
          onClick={handleItemClick}
        />
      ))}
    </div>
  );
}
```

## Ressources

- [React Profiler](https://react.dev/reference/react/Profiler)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Web Vitals](https://web.dev/vitals/)
- [React Window](https://github.com/bvaughn/react-window)