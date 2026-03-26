import { createClient } from '@blinkdotnew/sdk';

const projectId = import.meta.env.VITE_BLINK_PROJECT_ID;

if (!projectId) {
  console.warn('⚠️ VITE_BLINK_PROJECT_ID is not set. Falling back to default project ID (Not recommended for production). Create a .env file to override this.');
}

export const blink = createClient({
  projectId: projectId || 'doneanddone-web-app-c5z8fd9j',
  authRequired: false,
  auth: {
    mode: 'managed'
  }
});
