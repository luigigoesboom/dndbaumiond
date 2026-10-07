import { useEffect, useState } from 'react';
import { CharacterList } from './CharacterList.tsx';
import { CustomClasses, CustomSpells } from './JsonLibraryPage.tsx';
import { RollProvider } from './roll/RollContext.tsx';
import { RollLog } from './roll/RollLog.tsx';
import { CharacterSheet } from './sheet/CharacterSheet.tsx';

// Minimal hash routing: "#/character/12", "#/classes", anything else shows the list.
type Route = { page: 'list' } | { page: 'classes' } | { page: 'spells' } | { page: 'character'; id: number };

function readRoute(): Route {
  const hash = window.location.hash;
  const match = /^#\/character\/(\d+)$/.exec(hash);
  if (match) return { page: 'character', id: Number(match[1]) };
  if (hash === '#/classes') return { page: 'classes' };
  if (hash === '#/spells') return { page: 'spells' };
  return { page: 'list' };
}

const go = (hash: string) => {
  window.location.hash = hash;
};

export function App() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <RollProvider>
      <div className="app">
        <main className="main">
          {route.page === 'character' ? (
            <CharacterSheet key={route.id} id={route.id} onBack={() => go('')} />
          ) : route.page === 'classes' ? (
            <CustomClasses onBack={() => go('')} />
          ) : route.page === 'spells' ? (
            <CustomSpells onBack={() => go('')} />
          ) : (
            <CharacterList onOpen={(id) => go(`/character/${id}`)} onClasses={() => go('/classes')} onSpells={() => go('/spells')} />
          )}
        </main>
        {route.page === 'character' && <RollLog />}
        <footer className="colophon">
          Rules text from the System Reference Document 5.1 and 5.2 by Wizards of the Coast LLC, licensed under{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noreferrer">
            CC-BY-4.0
          </a>
          . Data via 5e-bits/5e-database. Custom classes are entered by your group. Not affiliated with Wizards of the
          Coast or D&amp;D Beyond.
        </footer>
      </div>
    </RollProvider>
  );
}
