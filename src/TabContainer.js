import * as React from 'react';
import { Tab } from 'semantic-ui-react';
import { Chat } from './Chat';
import { Stats } from './Stats';
import { Rules } from './Rules';

const TabContainer = ({ socketRef, gameData }) => {
  const panes = [
    {
      menuItem: 'Chat',
      pane: {
        key: 'tab1',
        content: <Chat socketRef={socketRef} />,
      },
    },
    {
      menuItem: 'Stats',
      pane: {
        key: 'tab2',
        content: <Stats socketRef={socketRef} gameData={gameData} />,
      },
    },
    {
      menuItem: 'Rules',
      pane: {
        key: 'tab3',
        content: <Rules />,
      },
    },
  ];

  return <Tab style={{ marginRight: '10px' }} panes={panes} renderActiveOnly={false} />;
};

export default TabContainer;
