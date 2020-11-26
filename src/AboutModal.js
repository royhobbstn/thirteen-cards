import * as React from 'react';
import { Modal } from 'semantic-ui-react';

export function AboutModal({ aboutModalOpen, updateAboutModalOpen }) {
  return (
    <Modal
      onClose={() => updateAboutModalOpen(false)}
      onOpen={() => updateAboutModalOpen(true)}
      open={aboutModalOpen}
      closeIcon
      size="small"
    >
      <Modal.Header>About this Page</Modal.Header>
      <Modal.Content>
        <Modal.Description>
          <p>Created by Daniel Trone</p>
          <a href="https://github.com/royhobbstn/thirteen-cards" target="_blank" rel="noreferrer">
            https://github.com/royhobbstn/thirteen-cards
          </a>
        </Modal.Description>
      </Modal.Content>
    </Modal>
  );
}
