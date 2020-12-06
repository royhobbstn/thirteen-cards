import * as React from 'react';
import { Tab } from 'semantic-ui-react';
import { Chat } from './Chat';

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
        content: <p>Hi</p>,
      },
    },
    {
      menuItem: 'Rules',
      pane: {
        key: 'tab3',
        content: <p>Rules</p>,
      },
    },
  ];

  return <Tab panes={panes} renderActiveOnly={false} />;
};

export default TabContainer;
