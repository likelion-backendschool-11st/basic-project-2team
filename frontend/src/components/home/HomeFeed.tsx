import React from 'react';
import { homeText } from '../../data/homeData';
import SearchBar from './SearchBar';
import CreatePartyButton from './CreatePartyButton';
import PanelCard from './PanelCard';
import PopularPostCard from './PopularPostCard';
import UrgentPostCard from './UrgentPostCard';
import PanelMessage from './PanelMessage';
import { usePopularPosts, useUrgentPosts } from '../../hooks/useHomeData';
import { useHomeActions } from '../../hooks/useHomeActions';

interface HomeFeedProps {
  readonly onCreateParty?: () => void;
}

/** Center column of the home page: search, CTA, popular + closing-soon panels. */
export const HomeFeed: React.FC<HomeFeedProps> = ({ onCreateParty }) => {
  const actions = useHomeActions();
  const popular = usePopularPosts();
  const urgent = useUrgentPosts();
  return (
  <section className="col-span-12 md:col-span-9 lg:col-span-7 flex flex-col gap-5">
    <SearchBar placeholder={homeText.searchPlaceholder} />
    <CreatePartyButton label={homeText.createParty} onClick={onCreateParty ?? actions.createParty} />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
      <PanelCard
        title={homeText.popularTitle}
        marker={<span className="w-2.5 h-2.5 rounded-full bg-roseAccent animate-ping" />}
        moreLink={{ label: homeText.more, to: homeText.moreLink }}
      >
        {popular.loading && <PanelMessage>{homeText.loading}</PanelMessage>}
        {popular.error && <PanelMessage error>{popular.error}</PanelMessage>}
        {!popular.loading && !popular.error && popular.data.length === 0 && <PanelMessage>{homeText.popularEmpty}</PanelMessage>}
        {popular.data.map((p) => (
          <PopularPostCard key={p.id} post={p} onSelect={actions.openPost} />
        ))}
      </PanelCard>
      <PanelCard
        title={homeText.urgentTitle}
        marker={<span className="w-2.5 h-2.5 rounded-full bg-amberAccent animate-pulse" />}
        moreLink={{ label: homeText.more, to: homeText.moreLink }}
      >
        {urgent.loading && <PanelMessage>{homeText.loading}</PanelMessage>}
        {urgent.error && <PanelMessage error>{urgent.error}</PanelMessage>}
        {!urgent.loading && !urgent.error && urgent.data.length === 0 && <PanelMessage>{homeText.urgentEmpty}</PanelMessage>}
        {urgent.data.map((p) => (
          <UrgentPostCard key={p.id} post={p} onApply={actions.openPost} />
        ))}
      </PanelCard>
    </div>
  </section>
  );
};

export default HomeFeed;
